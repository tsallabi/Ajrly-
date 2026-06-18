/* ============================================================
   Ajrly OS — Cloudflare Pages Function: Email notify (STUB)
   Path: POST /api/notify-email

   OPTIONAL enhancement. The web app works fully without this:
   the UI generates mailto: links that open the user's mail client
   with subject + body prefilled — no server, no secrets needed.

   This endpoint exists so that, once you configure an email API
   (Resend, SendGrid, Mailgun, …), you can send mail server-side
   (e.g. from a Cron Trigger for scheduled owner reminders).

   Required Cloudflare Pages secrets (Settings → Environment variables):
     EMAIL_API_KEY  — provider API key (e.g. Resend "re_...")
     EMAIL_FROM     — verified sender, e.g. "Ajrly <team@ajrly.ly>"
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

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let payload = {};
  try { payload = await request.json(); } catch (_) { payload = {}; }
  const { to, subject, html, test } = payload;

  // Graceful degradation: 501 when not configured → client falls back to mailto.
  const apiKey = env.EMAIL_API_KEY;
  const from = env.EMAIL_FROM || "Ajrly <onboarding@resend.dev>";
  if (!apiKey) {
    return json({
      configured: false,
      ok: false,
      error: "Email API not configured. Set EMAIL_API_KEY (and EMAIL_FROM). Direct mailto links still work.",
    }, 501);
  }

  // Connectivity test from the UI: report configured without sending.
  if (test || !to || !subject) {
    return json({ configured: true, ok: true, test: true });
  }

  // ---- Real send (example: Resend HTTP API) ----
  // Swap the URL/body for SendGrid/Mailgun if preferred.
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject: String(subject),
        html: String(html || subject),
      }),
    });
    const data = await res.json().catch(() => ({}));
    return json({ configured: true, ok: res.ok, status: res.status, data }, res.ok ? 200 : 502);
  } catch (err) {
    return json({ configured: true, ok: false, error: String(err && err.message || err) }, 502);
  }
}
