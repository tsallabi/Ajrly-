/* ============================================================
   Ajrly OS — Cloud API: Email-to-ticket webhook (WS-C) — PUBLIC
   Path:  POST /api/webhooks/email
   Accepts an inbound-email provider payload (Resend / SendGrid Inbound
   Parse / Mailgun / Postmark style). Normalises sender/subject/body,
   then finds an open ticket by email (channel 'email') or creates one
   and appends the message. Guards when unconfigured (501).
   ============================================================ */
import { run, first, uid, now } from "../../_lib/db.js";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

export async function onRequestPost(context) {
  const { request, env } = context;

  // Guard: email-to-ticket requires the email integration to be configured.
  if (!env || !env.EMAIL_API_KEY) {
    return new Response(JSON.stringify({ configured: false, error: "email_not_configured" }),
      { status: 501, headers: JSON_HEADERS });
  }
  if (!env.DB) {
    return new Response(JSON.stringify({ error: "cloud_unavailable" }), { status: 503, headers: JSON_HEADERS });
  }

  let p = {};
  const ctype = request.headers.get("content-type") || "";
  try {
    if (ctype.includes("application/json")) p = await request.json();
    else { const fd = await request.formData(); p = Object.fromEntries(fd.entries()); }
  } catch (_) { p = {}; }

  try {
    const norm = normalize(p);
    if (!norm.from) {
      return new Response(JSON.stringify({ ok: false, error: "no_sender" }), { status: 200, headers: JSON_HEADERS });
    }
    const id = await ingest(env, norm);
    return new Response(JSON.stringify({ ok: true, id }), { status: 200, headers: JSON_HEADERS });
  } catch (e) {
    try { console.error("[email] ingest_error", e && (e.stack || e.message)); } catch (_) {}
    // Acknowledge so the provider does not retry-storm.
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });
  }
}

/* Normalise common inbound-parse payload shapes into {from, name, subject, text}. */
function normalize(p) {
  // SendGrid Inbound Parse: from, subject, text/html, envelope JSON
  // Mailgun: sender, subject, body-plain
  // Postmark: From / FromName / Subject / TextBody
  // Resend inbound (webhook): data.from / data.subject / data.text
  const d = (p && p.data) || p || {};
  const rawFrom = d.from || d.From || d.sender || (p.envelope && tryParse(p.envelope).from) || "";
  const subject = d.subject || d.Subject || "";
  const text = d.text || d["body-plain"] || d.TextBody || d["stripped-text"] ||
               stripHtml(d.html || d.HtmlBody || "") || "";
  const parsed = parseAddress(String(rawFrom));
  return { from: parsed.email, name: parsed.name, subject: String(subject || ""), text: String(text || "") };
}

function tryParse(s) { try { return JSON.parse(s); } catch (_) { return {}; } }
function stripHtml(h) { return String(h || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }

/* "Display Name <a@b.com>" -> {name, email} */
function parseAddress(s) {
  const m = s.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim(), email: m[2].trim().toLowerCase() };
  const e = s.trim().toLowerCase();
  return { name: "", email: /@/.test(e) ? e : "" };
}

async function ingest(env, m) {
  const email = m.from.slice(0, 200);
  const ts = now();
  const subject = (m.subject || "").trim().slice(0, 200);
  const body = (m.text || "").trim().slice(0, 8000) || subject || "[empty email]";

  let ticket = await first(env,
    `SELECT * FROM tickets WHERE channel = 'email' AND customer_contact = ?
       AND status IN ('open','pending') ORDER BY datetime(updated_at) DESC LIMIT 1`,
    email);

  if (!ticket) {
    const id = uid("tk_");
    await run(env,
      `INSERT INTO tickets (id, subject, customer_name, customer_contact, channel, status, priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'email', 'open', 'Medium', ?, ?)`,
      id, subject || body.slice(0, 60), (m.name || email).slice(0, 120), email, ts, ts);
    ticket = { id };
  } else {
    await run(env, "UPDATE tickets SET updated_at = ?, status = CASE WHEN status='resolved' OR status='closed' THEN 'pending' ELSE status END WHERE id = ?", ts, ticket.id);
  }

  await run(env,
    `INSERT INTO ticket_messages (id, ticket_id, sender, agent_id, body, created_at)
     VALUES (?, ?, 'customer', NULL, ?, ?)`,
    uid("msg_"), ticket.id, body, ts);

  notifyDO(env, { body: `New email from ${m.name || email}`, link: `#/support?ticket=${ticket.id}` });
  return ticket.id;
}

function notifyDO(env, payload) {
  try {
    if (!env || !env.PRESENCE) return;
    const stub = env.PRESENCE.get(env.PRESENCE.idFromName("global"));
    stub.fetch("https://do/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "notify", ...payload }),
    }).catch(() => {});
  } catch (_) {}
}
