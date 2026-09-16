import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
test("offers direct phone and email links without a contact form", async () => {
  const html = await readFile(new URL("../contact.html", import.meta.url), "utf8");
  assert.match(html, /href="tel:19039331342"/);
  assert.match(html, /href="mailto:contact@irondillo\.com"/);
  assert.doesNotMatch(html, /<form\b|contact-form\.js|turnstile|\/api\/contact/i);
});
test("CSP does not allow form submission or third-party frames", async () => {
  const headers = await readFile(new URL("../_headers", import.meta.url), "utf8");
  assert.match(headers, /frame-src 'none'/);
  assert.match(headers, /form-action 'none'/);
  assert.doesNotMatch(headers, /turnstile|challenges\.cloudflare\.com/i);
});
