import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("production smoke test validates stable CSP guarantees without requiring deployment synchronization", async () => {
  const headers = await readFile(new URL("../_headers", import.meta.url), "utf8");
  const smoke = await readFile(new URL("../scripts/smoke-production.sh", import.meta.url), "utf8");
  const canonical = headers.match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1];

  assert.ok(canonical, "_headers must define a canonical Content-Security-Policy");
  for (const directive of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "upgrade-insecure-requests"]) {
    assert.ok(canonical.includes(directive), `_headers must include ${directive}`);
  }
  assert.match(smoke, /for directive in "default-src 'self'"[\s\S]+"upgrade-insecure-requests"/);
  assert.doesNotMatch(smoke, /EXPECTED_CSP|does not match _headers/);
});
