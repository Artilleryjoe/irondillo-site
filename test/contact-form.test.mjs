import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const script = await readFile(new URL("../assets/contact-form.js", import.meta.url), "utf8");
const endpoint = "https://formspree.io/f/xldnbpdg";

test("uses the Formspree endpoint and appropriate autofill tokens", async () => {
  const html = await readFile(new URL("../contact.html", import.meta.url), "utf8");
  const form = html.match(/<form\b[^>]*id="contact-form"[^>]*>[\s\S]*?<\/form>/)?.[0];

  assert.ok(form, "contact form should be present");
  assert.equal(form.match(/action="([^"]+)"/)?.[1], endpoint);
  assert.match(form, /method="POST"/);
  assert.match(form, /name="name"[^>]*autocomplete="name"/);
  assert.match(form, /name="email"[^>]*autocomplete="email"/);
  assert.match(form, /name="phone"[^>]*autocomplete="tel"/);
  assert.match(form, /name="_gotcha"[^>]*autocomplete="off"/);
});

test("uses HTTP response headers for document security policies", async () => {
  const [html, headers] = await Promise.all([
    readFile(new URL("../contact.html", import.meta.url), "utf8"),
    readFile(new URL("../_headers", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(html, /http-equiv="(?:Content-Security-Policy|X-Frame-Options)"/i);
  assert.match(headers, /Content-Security-Policy:[^\n]*frame-ancestors 'none'/);
  assert.match(headers, /X-Frame-Options: DENY/);
});

async function runSubmission(contactStatus = 200) {
  const values = new Map([
    ["name", " Ada Lovelace "], ["email", "ada@example.com"], ["phone", ""],
    ["urgency", "General question"], ["message", "Please help with our security plan."], ["_gotcha", ""],
  ]);
  const button = { disabled: false };
  const status = { textContent: "" };
  let submit;
  let reset = false;
  const requests = [];
  const form = {
    action: endpoint,
    addEventListener(type, listener) { if (type === "submit") submit = listener; },
    querySelector() { return button; },
    reportValidity() { return true; },
    reset() { reset = true; },
  };
  class FormDataMock {
    constructor(receivedForm) {
      this.fields = [];
      if (receivedForm) assert.equal(receivedForm, form);
    }
    get(name) { return values.get(name); }
    append(name, value) { this.fields.push([name, value]); }
  }
  const context = {
    document: { getElementById(id) { return id === "contact-form" ? form : status; } },
    FormData: FormDataMock,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: contactStatus >= 200 && contactStatus < 300, status: contactStatus };
    },
  };

  vm.runInNewContext(script, context);
  await submit({ preventDefault() {} });
  return { button, requests, reset, status };
}

test("posts cleaned form data to Formspree", async () => {
  const { button, requests, reset, status } = await runSubmission();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, endpoint);
  assert.equal(requests[0].options.method, "POST");
  assert.deepEqual({ ...requests[0].options.headers }, { Accept: "application/json" });
  assert.deepEqual(requests[0].options.body.fields, [
    ["name", "Ada Lovelace"], ["email", "ada@example.com"], ["phone", ""],
    ["urgency", "General question"], ["message", "Please help with our security plan."], ["_gotcha", ""],
  ]);
  assert.equal(reset, true);
  assert.equal(button.disabled, false);
  assert.match(status.textContent, /sent successfully/);
});

for (const [code, expected] of [[400, /check the fields/], [429, /wait a few minutes/], [503, /temporarily unavailable/]]) {
  test(`handles a ${code} response without exposing provider details`, async () => {
    const { reset, status } = await runSubmission(code);
    assert.equal(reset, false);
    assert.match(status.textContent, expected);
    assert.doesNotMatch(status.textContent, /Formspree|provider|configuration/i);
  });
}

test("allows only the configured Formspree origin for contact submissions", async () => {
  const headers = await readFile(new URL("../_headers", import.meta.url), "utf8");
  assert.match(headers, /connect-src 'self' https:\/\/formspree\.io/);
  assert.match(headers, /form-action 'self' https:\/\/formspree\.io/);
  assert.doesNotMatch(headers, /challenges\.cloudflare\.com|formsubmit\.co/i);
});
