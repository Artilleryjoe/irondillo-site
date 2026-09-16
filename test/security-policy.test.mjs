import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const forbiddenOrigins = [
  "https://formspree.io",
  "https://cdn.tailwindcss.com",
  "https://unpkg.com",
  "https://www.google.com",
  "https://www.gstatic.com",
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

test("_headers contains only approved CSP origins", async () => {
  const headers = await readFile(new URL("../_headers", import.meta.url), "utf8");
  const csp = headers.match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1];
  assert.ok(csp, "_headers must define the production CSP");

  for (const origin of forbiddenOrigins) {
    assert.ok(!csp.includes(origin), `${origin} is not authorized`);
  }
  assert.match(csp, /script-src 'self' https:\/\/challenges\.cloudflare\.com(?:;|$)/);
  assert.match(csp, /connect-src 'self' https:\/\/challenges\.cloudflare\.com(?:;|$)/);
  assert.match(csp, /frame-src https:\/\/challenges\.cloudflare\.com(?:;|$)/);
  assert.doesNotMatch(csp, /\bmailto:/);
});

test("root HTML neither duplicates security headers nor loads forbidden origins", async () => {
  for (const name of await rootHtmlFiles()) {
    const html = await readFile(new URL(name, root), "utf8");
    const httpEquivValues = [...html.matchAll(/<meta\b[^>]*\bhttp-equiv=["']([^"']+)["'][^>]*>/gi)]
      .map((match) => match[1].toLowerCase());

    for (const header of securityMetaNames) {
      assert.ok(!httpEquivValues.includes(header), `${name} must rely on _headers for ${header}`);
    }
    for (const origin of forbiddenOrigins) {
      assert.ok(!html.includes(origin), `${name} loads unauthorized origin ${origin}`);
    }
  }
});
