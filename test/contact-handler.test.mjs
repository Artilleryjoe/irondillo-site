import assert from "node:assert/strict";
import test from "node:test";
import { handleContact } from "../server/contact-handler.mjs";

const valid = { name: "Ada Lovelace", email: "ada@example.com", phone: "", urgency: "General question", message: "Hello\r\nthere", company: "", turnstileToken: "verified-token" };

function request(body = valid, headers = {}) {
  return new Request("https://irondillo.com/api/contact", { method: "POST", headers: { origin: "https://irondillo.com", "content-type": "application/json", "cf-connecting-ip": "192.0.2.1", ...headers }, body: JSON.stringify(body) });
}

function dependencies({ limited = false, bot = true, mail = true } = {}) {
  const sent = [];
  return {
    env: { TURNSTILE_SECRET_KEY: "secret", RESEND_API_KEY: "secret", CONTACT_RATE_LIMITER: { async limit() { return { success: !limited }; } } },
    sent,
    fetch: async (url, init) => {
      if (url.includes("siteverify")) return Response.json({ success: bot, hostname: "irondillo.com" });
      sent.push(JSON.parse(init.body));
      return new Response("", { status: mail ? 200 : 500 });
    },
  };
}

async function submit(body = valid, settings) {
  const deps = dependencies(settings);
  return { response: await handleContact(request(body), deps.env, { fetch: deps.fetch }), ...deps };
}

test("accepts a valid submission and normalizes line endings", async () => {
  const { response, sent } = await submit();
  assert.equal(response.status, 202);
  assert.match(sent[0].text, /Hello\nthere/);
  assert.equal(sent[0].reply_to, undefined);
});
test("rejects an invalid email", async () => assert.equal((await submit({ ...valid, email: "not-email" })).response.status, 400));
test("rejects an unknown urgency", async () => assert.equal((await submit({ ...valid, urgency: "Emergency" })).response.status, 400));
test("rejects oversized input", async () => assert.equal((await submit({ ...valid, message: "x".repeat(17_000) })).response.status, 400));
test("rejects a populated honeypot", async () => assert.equal((await submit({ ...valid, company: "spam ltd" })).response.status, 400));
test("rejects malformed content type", async () => {
  const deps = dependencies();
  const response = await handleContact(request(valid, { "content-type": "text/plain" }), deps.env, { fetch: deps.fetch });
  assert.equal(response.status, 415);
});
test("rate limits clients", async () => assert.equal((await submit(valid, { limited: true })).response.status, 429));
test("rejects bot-verification failure", async () => assert.equal((await submit(valid, { bot: false })).response.status, 400));
test("returns a generic error on mail-provider failure", async () => {
  const { response } = await submit(valid, { mail: false });
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { ok: false, error: "Unable to submit the form." });
});
