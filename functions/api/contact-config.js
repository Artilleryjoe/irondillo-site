export function onRequestGet({ env }) {
  if (!env.TURNSTILE_SITE_KEY) return Response.json({ error: "Unavailable" }, { status: 503 });
  return Response.json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY }, {
    headers: { "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" },
  });
}
