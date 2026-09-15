import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

test("submits only the contact API fields when Turnstile injects a response field", async () => {
  const values = new Map([
    ["name", "Ada Lovelace"],
    ["email", "ada@example.com"],
    ["phone", ""],
    ["urgency", "General question"],
    ["message", "Please help with our security plan."],
    ["company", ""],
    ["cf-turnstile-response", "automatically-injected-token"],
  ]);
  const button = { disabled: false };
  const status = { textContent: "" };
  let submit;
  let requestBody;
  const form = {
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
    },
    fetch: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return { ok: true };
    },
    window: {
      turnstile: {
        getResponse() { return "verified-token"; },
        reset() {},
      },
    },
  };

  const script = await readFile(new URL("../assets/contact-form.js", import.meta.url), "utf8");
  vm.runInNewContext(script, context);
  await submit({ preventDefault() {} });

  assert.deepEqual(Object.keys(requestBody).sort(), [
    "company", "email", "message", "name", "phone", "turnstileToken", "urgency",
  ]);
  assert.equal(requestBody.turnstileToken, "verified-token");
  assert.equal(requestBody["cf-turnstile-response"], undefined);
});
