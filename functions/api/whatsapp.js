/* ============================================================
   Ajrly OS — Cloudflare Pages Function: WhatsApp send (STUB)
   Path: POST /api/whatsapp

   OPTIONAL enhancement. The web app works fully without this:
   the UI generates wa.me links that open WhatsApp directly with a
   prefilled message — no server, no secrets, no token needed.

   This endpoint exists so that, once you configure the WhatsApp
   Cloud API, you can send templated/automated messages server-side
   (e.g. from a Cron Trigger for scheduled owner reminders).

   Required Cloudflare Pages secrets (Settings → Environment variables):
     WHATSAPP_TOKEN   — permanent/system-user access token
     WHATSAPP_PHONE_ID — the WhatsApp Business phone number ID
   NEVER hardcode these. They are read from context.env only.
   ============================================================ */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

/* Preflight */
export function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Parse the request body defensively.
  let payload = {};
  try { payload = await request.json(); } catch (_) { payload = {}; }
  const { to, message, test } = payload;

  // Graceful degradation: if secrets are not configured, signal 501 so the
  // client falls back to wa.me links. Never throws, never leaks anything.
  const token = env.WHATSAPP_TOKEN;
  const phoneId = env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    return json({
      configured: false,
      ok: false,
      error: "WhatsApp Cloud API not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID. Direct wa.me links still work.",
    }, 501);
  }

  // A connectivity test from the UI: report configured without sending.
  if (test || !to || !message) {
    return json({ configured: true, ok: true, test: true });
  }

  // ---- Real send (WhatsApp Cloud API v20.0) ----
  // Shape shown/guarded so it is obvious how to wire a live integration.
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: String(to).replace(/[^\d]/g, ""), // E.164 digits only
        type: "text",
        text: { body: String(message) },
      }),
    });
    const data = await res.json().catch(() => ({}));
    return json({ configured: true, ok: res.ok, status: res.status, data }, res.ok ? 200 : 502);
  } catch (err) {
    return json({ configured: true, ok: false, error: String(err && err.message || err) }, 502);
  }
}
