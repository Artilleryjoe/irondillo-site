const MAX_BODY_BYTES = 16_384;
const ALLOWED_ORIGIN = "https://irondillo.com";
const URGENCIES = new Set(["General question", "Within 48 hours", "Immediate"]);

const limits = Object.freeze({ name: 100, email: 254, phone: 32, urgency: 32, message: 4_000, company: 200, turnstileToken: 2_048 });

function genericError(status = 400) {
  return Response.json({ ok: false, error: "Unable to submit the form." }, { status, headers: { "Cache-Control": "no-store" } });
}

function normalize(value) {
  return value.replace(/\r\n?/g, "\n").trim();
}

function parseSubmission(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const allowed = new Set(Object.keys(limits));
  if (Object.keys(value).some((key) => !allowed.has(key))) return null;

  const result = {};
  for (const [field, max] of Object.entries(limits)) {
    const optional = field === "phone" || field === "company";
    if (!(field in value) && optional) {
      result[field] = "";
      continue;
    }
    if (typeof value[field] !== "string") return null;
    result[field] = normalize(value[field]);
    if ((!optional && !result[field]) || result[field].length > max) return null;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) return null;
  if (!URGENCIES.has(result.urgency) || result.company) return null;
  return result;
}

async function readJson(request) {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw new RangeError();
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_BODY_BYTES) throw new RangeError();
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

async function verifyTurnstile(token, ip, secret, fetchImpl) {
  if (!secret) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  const response = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true && result.hostname === "irondillo.com";
}

async function sendMail(submission, apiKey, fetchImpl) {
  if (!apiKey) return false;
  const text = [
    `Name: ${submission.name}`,
    `Email: ${submission.email}`,
    `Phone: ${submission.phone || "Not provided"}`,
    `Urgency: ${submission.urgency}`,
    "",
    submission.message,
  ].join("\n");
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Iron Dillo Website <contact-form@irondillo.com>",
      to: ["contact@irondillo.com"],
      subject: "New website contact request",
      text,
    }),
  });
  return response.ok;
}

export async function handleContact(request, env, options = {}) {
  const fetchImpl = options.fetch || fetch;
  if (request.method !== "POST") return genericError(405);
  if (new URL(request.url).protocol !== "https:") return genericError(400);
  if (request.headers.get("origin") !== (env.PRODUCTION_ORIGIN || ALLOWED_ORIGIN)) return genericError(403);
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") return genericError(415);

  let raw;
  try { raw = await readJson(request); } catch { return genericError(400); }
  const submission = parseSubmission(raw);
  if (!submission) return genericError(400);

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  try {
    if (!env.CONTACT_RATE_LIMITER || !(await env.CONTACT_RATE_LIMITER.limit({ key: ip })).success) return genericError(429);
  } catch {
    return genericError(503);
  }

  try {
    if (!(await verifyTurnstile(submission.turnstileToken, ip, env.TURNSTILE_SECRET_KEY, fetchImpl))) return genericError(400);
    if (!(await sendMail(submission, env.RESEND_API_KEY, fetchImpl))) return genericError(502);
  } catch {
    // Do not log the submission or provider response: both may contain personal data.
    return genericError(502);
  }
  return Response.json({ ok: true }, { status: 202 });
}

export { MAX_BODY_BYTES };
