import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const script = await readFile(new URL("../assets/contact-form.js", import.meta.url), "utf8");

test("includes an explicitly rendered Turnstile container and secure form fields", async () => {
  const html = await readFile(new URL("../contact.html", import.meta.url), "utf8");
  const form = html.match(/<form\b[^>]*id="contact-form"[^>]*>[\s\S]*?<\/form>/)?.[0];
  assert.ok(form);
  assert.match(form, /<form\b[^>]*\bmethod="post"[^>]*\baction="\/api\/contact"/i);
  assert.match(form, /<fieldset\b[^>]*data-contact-fields[^>]*\bdisabled\b/i);
  assert.match(form, /<noscript>[\s\S]*href="tel:19039331342"[\s\S]*href="mailto:contact@irondillo\.com"[\s\S]*<\/noscript>/i);
  assert.match(form, /id="contact-turnstile"/);
  assert.match(html, /https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?render=explicit/);
  assert.match(form, /name="company"[^>]*autocomplete="off"/);
  assert.doesNotMatch(form, /_gotcha|Formspree/i);
});

function harness(contactStatus = 202, holdContact = false) {
  const values = new Map([
    ["name", " Ada Lovelace "], ["email", "ada@example.com"], ["phone", ""],
    ["urgency", "General question"], ["message", "Please help with our security plan."], ["company", ""],
  ]);
  const button = { disabled: false };
  const fields = { disabled: true };
  const status = { textContent: "" };
  const container = {};
  let submit;
  let resetForm = false;
  let releaseContact;
  const requests = [];
  const turnstileCalls = [];
  let callbacks;
  const form = {
    addEventListener(type, listener) { if (type === "submit") submit = listener; },
    querySelector(selector) { return selector === "[data-contact-fields]" ? fields : button; }, reportValidity() { return true; }, reset() { resetForm = true; },
  };
  class FormDataMock { constructor(received) { assert.equal(received, form); } get(name) { return values.get(name); } }
  const turnstile = {
    ready(callback) { callback(); },
    render(received, options) { assert.equal(received, container); callbacks = options; turnstileCalls.push(["render", options.sitekey]); return "widget-1"; },
    reset(id) { turnstileCalls.push(["reset", id]); },
    execute(id) { turnstileCalls.push(["execute", id]); callbacks.callback("fresh-token"); },
  };
  const fetch = async (url, options = {}) => {
    requests.push({ url, options });
    if (url === "/api/contact-config") return { ok: true, async json() { return { turnstileSiteKey: "public-key" }; } };
    if (holdContact) await new Promise((resolve) => { releaseContact = resolve; });
    return { status: contactStatus };
  };
  const context = {
    document: { getElementById(id) { return id === "contact-form" ? form : id === "form-status" ? status : container; } },
    FormData: FormDataMock, fetch, window: { turnstile }, Error, JSON, String,
  };
  vm.runInNewContext(script, context);
  return { button, fields, requests, get resetForm() { return resetForm; }, status, submit, turnstileCalls, release() { releaseContact(); } };
}

test("fetches configuration and posts only accepted JSON fields to the same-origin endpoint", async () => {
  const run = harness();
  assert.equal(run.fields.disabled, false);
  await run.submit({ preventDefault() {} });
  assert.equal(run.requests[0].url, "/api/contact-config");
  assert.equal(run.requests[1].url, "/api/contact");
  assert.equal(run.requests[1].options.method, "POST");
  assert.deepEqual({ ...run.requests[1].options.headers }, { Accept: "application/json", "Content-Type": "application/json" });
  assert.deepEqual(JSON.parse(run.requests[1].options.body), {
    name: "Ada Lovelace", email: "ada@example.com", phone: "", urgency: "General question",
    message: "Please help with our security plan.", company: "", turnstileToken: "fresh-token",
  });
  assert.deepEqual(run.turnstileCalls, [["render", "public-key"], ["reset", "widget-1"], ["execute", "widget-1"], ["reset", "widget-1"]]);
  assert.equal(run.resetForm, true);
  assert.match(run.status.textContent, /sent successfully/);
});

test("prevents concurrent submissions", async () => {
  const run = harness(202, true);
  const first = run.submit({ preventDefault() {} });
  await new Promise((resolve) => setImmediate(resolve));
  await run.submit({ preventDefault() {} });
  assert.equal(run.requests.filter(({ url }) => url === "/api/contact").length, 1);
  assert.equal(run.button.disabled, true);
  run.release();
  await first;
});

for (const [code, expected] of [
  [400, /check the fields/], [403, /could not be verified/], [415, /refresh the page/],
  [429, /wait a few minutes/], [502, /temporarily unavailable/], [503, /temporarily unavailable/],
]) {
  test(`handles ${code}, preserves fields, and resets Turnstile`, async () => {
    const run = harness(code);
    await run.submit({ preventDefault() {} });
    assert.equal(run.resetForm, false);
    assert.equal(run.button.disabled, false);
    assert.match(run.status.textContent, expected);
    assert.doesNotMatch(run.status.textContent, /Formspree|Resend|provider|configuration/i);
    assert.deepEqual(run.turnstileCalls.slice(-1), [["reset", "widget-1"]]);
  });
}

test("CSP permits only the Turnstile origins needed by the widget", async () => {
  const headers = await readFile(new URL("../_headers", import.meta.url), "utf8");
  assert.match(headers, /script-src 'self' https:\/\/challenges\.cloudflare\.com/);
  assert.match(headers, /connect-src 'self';/);
  assert.match(headers, /frame-src https:\/\/challenges\.cloudflare\.com/);
  assert.match(headers, /form-action 'self'/);
  assert.doesNotMatch(headers, /formspree\.io/i);
});
