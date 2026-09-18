import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("GitHub Pages artifact contains the site and deployment metadata", async () => {
  await access(new URL("../dist/index.html", import.meta.url));
  assert.equal(await readFile(new URL("../dist/CNAME", import.meta.url), "utf8"), "irondillo.com");

  const deployment = JSON.parse(await readFile(new URL("../dist/deployment.json", import.meta.url), "utf8"));
  assert.match(deployment.sha, /^[0-9a-f]{40}$/);
  assert.deepEqual(Object.keys(deployment), ["sha"]);
});
