import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("production smoke test reads the canonical CSP from _headers", async () => {
  const headers = await readFile(new URL("../_headers", import.meta.url), "utf8");
  const smoke = await readFile(new URL("../scripts/smoke-production.sh", import.meta.url), "utf8");
  const canonical = headers.match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1];

  assert.ok(canonical, "_headers must define a canonical Content-Security-Policy");
  assert.match(smoke, /EXPECTED_CSP="\$\(awk '[\s\S]+?' "\$\{REPO_ROOT\}\/_headers"\)"/);
  assert.doesNotMatch(smoke, /readonly EXPECTED_CSP="default-src/);
});
