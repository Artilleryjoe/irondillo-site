import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readSecurityPolicy, renderHeaders, renderWorker } from "../scripts/security-policy.mjs";

test("production smoke test waits for its release and compares the complete header policy", async () => {
  const policy = await readSecurityPolicy();
  const headers = await readFile(new URL("../dist/_headers", import.meta.url), "utf8");
  const smoke = await readFile(new URL("../scripts/smoke-production.sh", import.meta.url), "utf8");
  const workerSource = await readFile(new URL("../dist/_worker.js", import.meta.url), "utf8");
  const policyHeaders = [...headers.matchAll(/^\s{2}([^:\n]+):\s*(.+)$/gm)];

  assert.equal(headers, renderHeaders(policy));
  assert.equal(workerSource, renderWorker(policy));
  assert.deepEqual(Object.fromEntries(policyHeaders.map((match) => [match[1], match[2]])), policy);
  assert.ok(policyHeaders.length > 0, "_headers must define the production security policy");
  assert.match(smoke, /EXPECTED_DEPLOYMENT_SHA/);
  assert.match(smoke, /deployment\.json/);
  assert.match(smoke, /active_deployment_sha/);
  assert.match(smoke, /while IFS=\$'\\t' read -r header_name expected_value/);
  assert.match(smoke, /actual_value="\$\(header_value "\$header_name"\)"/);
  assert.match(smoke, /config\/security-headers\.json/);
  assert.doesNotMatch(smoke, /for directive in/);

  const worker = await import(`data:text/javascript,${encodeURIComponent(workerSource)}`);
  const response = await worker.default.fetch(new Request("https://irondillo.com/contact.html"), {
    ASSETS: { fetch: async () => new Response("contact", { status: 200, headers: { "Cache-Control": "public, max-age=60" } }) },
  });
  for (const [name, value] of Object.entries(policy)) {
    assert.equal(response.headers.get(name), value, `worker must enforce ${name}`);
  }
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "public, max-age=60");
  assert.equal(await response.text(), "contact");
});
