import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("production smoke test waits for its release and compares the complete header policy", async () => {
  const headers = await readFile(new URL("../_headers", import.meta.url), "utf8");
  const smoke = await readFile(new URL("../scripts/smoke-production.sh", import.meta.url), "utf8");
  const workerSource = await readFile(new URL("../_worker.js", import.meta.url), "utf8");
  const policyHeaders = [...headers.matchAll(/^\s{2}([^:\n]+):\s*(.+)$/gm)];

  assert.ok(policyHeaders.length > 0, "_headers must define the production security policy");
  assert.match(smoke, /EXPECTED_DEPLOYMENT_SHA/);
  assert.match(smoke, /deployment\.json/);
  assert.match(smoke, /active_deployment_sha/);
  assert.match(smoke, /while IFS=\$'\\t' read -r header_name expected_value/);
  assert.match(smoke, /actual_value="\$\(header_value "\$header_name"\)"/);
  assert.doesNotMatch(smoke, /for directive in/);

  const worker = await import(`data:text/javascript,${encodeURIComponent(workerSource)}`);
  const response = await worker.default.fetch(new Request("https://irondillo.com/contact.html"), {
    ASSETS: { fetch: async () => new Response("contact", { status: 200, headers: { "Cache-Control": "public, max-age=60" } }) },
  });
  for (const match of policyHeaders) {
    assert.equal(response.headers.get(match[1]), match[2], `worker must enforce ${match[1]}`);
  }
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "public, max-age=60");
  assert.equal(await response.text(), "contact");
});
