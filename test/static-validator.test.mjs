import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const validator = new URL("../scripts/validate-static.mjs", import.meta.url);

test("reports malformed percent-encoding without crashing", async (t) => {
  const fixture = await mkdtemp(path.join(tmpdir(), "irondillo-static-validator-"));
  t.after(() => rm(fixture, { recursive: true, force: true }));

  await writeFile(
    path.join(fixture, "index.html"),
    `<!doctype html>
<html lang="en">
  <head>
    <title>Test page</title>
    <meta name="description" content="Validator regression fixture">
  </head>
  <body>
    <h1>Test page</h1>
    <a href="/%E0%A4%A">Broken encoded link</a>
  </body>
</html>`,
  );

  const result = spawnSync(process.execPath, [validator.pathname], {
    cwd: fixture,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.equal(result.signal, null);
  assert.match(result.stderr, /index\.html: href has invalid percent-encoding: \/%E0%A4%A/);
  assert.doesNotMatch(result.stderr, /URIError|at decodeURIComponent/);
});
