import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

test("keeps the native FormSubmit fallback available without JavaScript", async () => {
  const html = await readFile(new URL("../contact.html", import.meta.url), "utf8");
  const form = html.match(/<form\b[^>]*id="contact-form"[^>]*>[\s\S]*?<\/form>/)?.[0];
  const submitButton = form?.match(/<button\b[^>]*type="submit"[^>]*>/)?.[0];

  assert.ok(form, "contact form should be present");
  assert.match(form, /action="https:\/\/formsubmit\.co\/contact@irondillo\.com"/);
  assert.ok(submitButton, "submit button should be present");
  assert.doesNotMatch(submitButton, /\bdisabled\b/i);
});

test("enhances the form with an AJAX submission when JavaScript is available", async () => {
  const values = new Map([
    ["name", "Ada Lovelace"],
    ["email", "ada@example.com"],
    ["phone", ""],
    ["urgency", "General question"],
    ["message", "Please help with our security plan."],
    ["_honey", ""],
  ]);
  const button = { disabled: false };
  const status = { textContent: "" };
  let submit;
  let requestUrl;
  let requestOptions;
  const form = {
    action: "https://formsubmit.co/contact@irondillo.com",
    addEventListener(type, listener) {
      if (type === "submit") submit = listener;
    },
    querySelector() { return button; },
    reportValidity() { return true; },
    reset() {},
  };
  const context = {
    document: {
      getElementById(id) { return id === "contact-form" ? form : status; },
    },
    FormData: class {
      constructor(receivedForm) { assert.equal(receivedForm, form); }
      get(name) { return values.get(name); }
      forEach(callback) { values.forEach(callback); }
    },
    fetch: async (url, options) => {
      requestUrl = url.toString();
      requestOptions = options;
      return { ok: true, json: async () => ({ success: true }) };
    },
    URL,
    URLSearchParams,
  };

  const script = await readFile(new URL("../assets/contact-form.js", import.meta.url), "utf8");
  vm.runInNewContext(script, context);
  await submit({ preventDefault() {} });

  assert.equal(requestUrl, "https://formsubmit.co/ajax/contact@irondillo.com");
  assert.equal(requestOptions.method, "POST");
  assert.equal(requestOptions.body, "name=Ada+Lovelace&email=ada%40example.com&phone=&urgency=General+question&message=Please+help+with+our+security+plan.&_honey=");
  assert.equal(button.disabled, false);
  assert.match(status.textContent, /sent successfully/);
});
