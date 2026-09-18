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
];
const responseOnlyMetaNames = [
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "x-frame-options",
  "strict-transport-security",
];

async function rootHtmlFiles() {
  return (await readdir(root)).filter((name) => name.endsWith(".html"));
}

test("canonical meta policy contains only supported directives and approved origins", async () => {
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
  for (const responseOnlyDirective of ["frame-ancestors", "report-uri", "report-to", "sandbox"]) {
    assert.doesNotMatch(csp, new RegExp(`(?:^|;\\s*)${responseOnlyDirective}\\b`));
  }
});

test("every root page applies the canonical CSP before governed resources", async () => {
  const canonicalCsp = (await readSecurityPolicy())["Content-Security-Policy"];
  for (const name of await rootHtmlFiles()) {
    const html = await readFile(new URL(name, root), "utf8");
    const cspTags = [...html.matchAll(/<meta\b[^>]*\bhttp-equiv=["']content-security-policy["'][^>]*\bcontent="([^"]*)"[^>]*>/gi)];
    assert.equal(cspTags.length, 1, `${name} must contain exactly one CSP meta tag`);
    assert.equal(cspTags[0][1], canonicalCsp, `${name} CSP must match the canonical policy`);
    const firstGovernedResource = html.search(/<(?:link|script|style)\b/i);
    assert.ok(firstGovernedResource === -1 || cspTags[0].index < firstGovernedResource, `${name} CSP must precede governed resources`);

    const httpEquivValues = [...html.matchAll(/<meta\b[^>]*\bhttp-equiv=["']([^"']+)["'][^>]*>/gi)]
      .map((match) => match[1].toLowerCase());
    for (const header of responseOnlyMetaNames) {
      assert.ok(!httpEquivValues.includes(header), `${name} must not emulate the ${header} response header with metadata`);
    }
    for (const origin of forbiddenOrigins) {
      assert.ok(!html.includes(origin), `${name} loads unauthorized origin ${origin}`);
    }
  }
});
