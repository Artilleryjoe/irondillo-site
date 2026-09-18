import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readSecurityPolicy } from "../scripts/security-policy.mjs";

test("documented security policy stays complete for GitHub Pages", async () => {
  const policy = await readSecurityPolicy();
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

  for (const [name, value] of Object.entries(policy)) {
    assert.ok(readme.includes(`- \`${name}: ${value}\``), `README must document ${name}`);
  }

  assert.match(readme, /GitHub Pages does not provide repository-level configuration for custom HTTP\s+response headers/);
});
