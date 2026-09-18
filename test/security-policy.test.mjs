import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { readSecurityPolicy } from "../scripts/security-policy.mjs";

const root = new URL("../", import.meta.url);
const forbiddenOrigins = [
  "https://formspree.io",
  "https://cdn.tailwindcss.com",
  "https://unpkg.com",
  "https://www.google.com",
  "https://www.gstatic.com",
  "https://challenges.cloudflare.com",
];
const securityMetaNames = [
  "content-security-policy",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "x-frame-options",
  "strict-transport-security",
];

async function rootHtmlFiles() {
  return (await readdir(root)).filter((name) => name.endsWith(".html"));
}

test("canonical policy contains only approved CSP origins", async () => {
  const policy = await readSecurityPolicy();
  const csp = policy["Content-Security-Policy"];
  assert.ok(csp, "canonical policy must define the production CSP");

  for (const origin of forbiddenOrigins) {
    assert.ok(!csp.includes(origin), `${origin} is not authorized`);
  }
  assert.match(csp, /script-src 'self'(?:;|$)/);
  assert.match(csp, /connect-src 'self'(?:;|$)/);
  assert.match(csp, /frame-src 'none'(?:;|$)/);
  assert.match(csp, /form-action 'none'(?:;|$)/);
  assert.doesNotMatch(csp, /\bmailto:/);
});

test("root HTML neither duplicates security headers nor loads forbidden origins", async () => {
  for (const name of await rootHtmlFiles()) {
    const html = await readFile(new URL(name, root), "utf8");
    const httpEquivValues = [...html.matchAll(/<meta\b[^>]*\bhttp-equiv=["']([^"']+)["'][^>]*>/gi)]
      .map((match) => match[1].toLowerCase());

    for (const header of securityMetaNames) {
      assert.ok(!httpEquivValues.includes(header), `${name} must rely on the generated response headers for ${header}`);
    }
    for (const origin of forbiddenOrigins) {
      assert.ok(!html.includes(origin), `${name} loads unauthorized origin ${origin}`);
    }
  }
});
