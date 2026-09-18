import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { readSecurityPolicy, renderHeaders, renderWorker } from "../scripts/security-policy.mjs";

test("Cloudflare output contains advanced worker and headers at its root", async () => {
  await access(new URL("../dist/index.html", import.meta.url));

  const policy = await readSecurityPolicy();
  const outputWorker = await readFile(new URL("../dist/_worker.js", import.meta.url), "utf8");
  assert.equal(outputWorker, renderWorker(policy));

  const outputHeaders = await readFile(new URL("../dist/_headers", import.meta.url), "utf8");
  assert.equal(outputHeaders, renderHeaders(policy));

  const deployment = JSON.parse(await readFile(new URL("../dist/deployment.json", import.meta.url), "utf8"));
  assert.match(deployment.sha, /^[0-9a-f]{40}$/);
  assert.deepEqual(Object.keys(deployment), ["sha"]);
});
