import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readSecurityPolicy } from "../scripts/security-policy.mjs";

test("README documents the deployed GitHub Pages meta policy", async () => {
  const policy = await readSecurityPolicy();
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

  assert.ok(readme.includes(`\`${policy["Content-Security-Policy"]}\``), "README must document the canonical CSP");

  assert.match(readme, /GitHub Pages does not provide repository-level configuration for custom HTTP\s+response headers/);
  for (const name of ["X-Content-Type-Options", "X-Frame-Options", "Strict-Transport-Security", "Permissions-Policy"]) {
    assert.match(readme, new RegExp(`\\b${name}\\b`));
  }
});
