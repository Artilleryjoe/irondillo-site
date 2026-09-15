import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const script = await readFile(new URL("../assets/contact-form.js", import.meta.url), "utf8");

test("uses a secure fallback endpoint and appropriate autofill tokens", async () => {
  const html = await readFile(new URL("../contact.html", import.meta.url), "utf8");
  const form = html.match(/<form\b[^>]*id="contact-form"[^>]*>[\s\S]*?<\/form>/)?.[0];

  assert.ok(form, "contact form should be present");
  const action = form.match(/action="([^"]+)"/)?.[1];
  assert.equal(action, "https://irondillo.com/api/contact");
  assert.equal(new URL(action, "http://irondillo.com/contact.html").protocol, "https:");
  assert.match(form, /name="name"[^>]*autocomplete="name"/);
  assert.match(form, /name="email"[^>]*autocomplete="email"/);
  assert.match(form, /name="phone"[^>]*autocomplete="tel"/);
  assert.match(form, /name="company"[^>]*autocomplete="off"/);
  assert.doesNotMatch(form, /formsubmit\.co|name="_honey"/i);
});

async function runSubmission(contactStatus = 202) {
  const values = new Map([
    ["name", " Ada Lovelace "], ["email", "ada@example.com"], ["phone", ""],
    ["urgency", "General question"], ["message", "Please help with our security plan."], ["company", ""],
  ]);
  const button = { disabled: false };
  const status = { textContent: "" };
  const widget = { textContent: "" };
  let submit;
  let reset = false;
  const requests = [];
  const form = {
    action: "/api/contact",
    addEventListener(type, listener) { if (type === "submit") submit = listener; },
    querySelector() { return button; },
    reportValidity() { return true; },
    reset() { reset = true; },
  };
  const turnstile = {
    render(element, options) {
      assert.equal(element, widget);
      assert.equal(options.sitekey, "public-site-key");
      options.callback("verified-token");
      return "widget-id";
    },
    execute(id) { assert.equal(id, "widget-id"); },
  };
  const context = {
    window: { turnstile },
    document: {
      head: { appendChild(node) { node.onload(); } },
      createElement() { return {}; },
      getElementById(id) { return id === "contact-form" ? form : id === "form-status" ? status : widget; },
    },
    FormData: class {
      constructor(receivedForm) { assert.equal(receivedForm, form); }
      get(name) { return values.get(name); }
    },
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (url === "/api/contact-config") return { ok: true, json: async () => ({ turnstileSiteKey: "public-site-key" }) };
      return { status: contactStatus };
    },
  };

  vm.runInNewContext(script, context);
  await submit({ preventDefault() {} });
  return { button, requests, reset, status };
}

test("loads Turnstile configuration and posts the expected same-origin JSON", async () => {
  const { button, requests, reset, status } = await runSubmission();
  assert.equal(requests[0].url, "/api/contact-config");
  assert.deepEqual({ ...requests[0].options.headers }, { Accept: "application/json" });
  assert.equal(requests[1].url, "/api/contact");
  assert.equal(requests[1].options.method, "POST");
  assert.equal(requests[1].options.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(requests[1].options.body), {
    name: "Ada Lovelace", email: "ada@example.com", phone: "", urgency: "General question",
    message: "Please help with our security plan.", company: "", turnstileToken: "verified-token",
  });
  assert.equal(reset, true);
  assert.equal(button.disabled, false);
  assert.match(status.textContent, /accepted/);
});

for (const [code, expected] of [[400, /check the fields/], [429, /wait a few minutes/], [503, /temporarily unavailable/], [502, /could not be delivered/]]) {
  test(`handles a ${code} response without exposing server details`, async () => {
    const { reset, status } = await runSubmission(code);
    assert.equal(reset, false);
    assert.match(status.textContent, expected);
    assert.doesNotMatch(status.textContent, /Turnstile|Resend|provider|configuration/i);
  });
}

test("restricts forms to same-origin and the secure canonical origin", async () => {
  const [html, headers] = await Promise.all([
    readFile(new URL("../contact.html", import.meta.url), "utf8"),
    readFile(new URL("../_headers", import.meta.url), "utf8"),
  ]);
  for (const policy of [html, headers]) {
    assert.match(policy, /script-src[^;]*https:\/\/challenges\.cloudflare\.com/);
    assert.match(policy, /frame-src[^;]*https:\/\/challenges\.cloudflare\.com/);
    assert.match(policy, /connect-src 'self' https:\/\/challenges\.cloudflare\.com/);
    assert.match(policy, /form-action 'self' https:\/\/irondillo\.com;/);
    assert.doesNotMatch(policy, /formsubmit\.co/i);
  }
});
