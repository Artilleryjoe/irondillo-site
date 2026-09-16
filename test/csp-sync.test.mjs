import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("production smoke test expects the canonical CSP from _headers", async () => {
  const headers = await readFile(new URL("../_headers", import.meta.url), "utf8");
  const smoke = await readFile(new URL("../scripts/smoke-production.sh", import.meta.url), "utf8");
  const canonical = headers.match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1];
  const expected = smoke.match(/^readonly EXPECTED_CSP="([^"]+)"$/m)?.[1];

  assert.ok(canonical, "_headers must define a canonical Content-Security-Policy");
  assert.ok(expected, "production smoke test must define EXPECTED_CSP");
  assert.equal(expected, canonical);
});
