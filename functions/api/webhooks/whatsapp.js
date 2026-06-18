/* ============================================================
   Ajrly OS — Cloud API: WhatsApp Cloud API webhook (WS-C) — PUBLIC
   Path:  GET  /api/webhooks/whatsapp   -> verification handshake
          POST /api/webhooks/whatsapp   -> inbound message -> ticket/message
   Inbound: find an OPEN ticket by phone (channel 'whatsapp') or create one,
   then append the customer's message. Guards when secrets are missing (501).
   ============================================================ */
import { run, first, uid, now } from "../../_lib/db.js";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

/* ---- GET: Meta webhook verification ----
   Meta sends hub.mode=subscribe, hub.verify_token, hub.challenge.
   Echo the challenge as text/plain when the token matches. */
export async function onRequestGet(context) {
  const { request, env } = context;
  const verifyToken = env && env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    return new Response("not_configured", { status: 501 });
  }
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge || "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("forbidden", { status: 403 });
}

/* ---- POST: inbound message events ---- */
export async function onRequestPost(context) {
  const { request, env } = context;

  // Guard: require WhatsApp configuration before accepting inbound traffic.
  if (!env || !env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_ID) {
    return new Response(JSON.stringify({ configured: false, error: "whatsapp_not_configured" }),
      { status: 501, headers: JSON_HEADERS });
  }
  if (!env.DB) {
    return new Response(JSON.stringify({ error: "cloud_unavailable" }), { status: 503, headers: JSON_HEADERS });
  }

  let payload = {};
  try { payload = await request.json(); } catch (_) { payload = {}; }

  try {
    const msgs = extractMessages(payload);
    for (const m of msgs) {
      await ingest(env, m);
    }
  } catch (e) {
    // Always 200 to Meta so it does not retry-storm; log server-side.
    try { console.error("[whatsapp] ingest_error", e && (e.stack || e.message)); } catch (_) {}
  }
  // Meta requires a prompt 200 acknowledgement.
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });
}

/* Pull a flat list of {from, name, text} out of the Cloud API webhook shape. */
function extractMessages(payload) {
  const out = [];
  const entries = (payload && payload.entry) || [];
  for (const entry of entries) {
    const changes = (entry && entry.changes) || [];
    for (const ch of changes) {
      const value = (ch && ch.value) || {};
      const contacts = value.contacts || [];
      const nameByWa = {};
      for (const c of contacts) {
        if (c && c.wa_id) nameByWa[c.wa_id] = (c.profile && c.profile.name) || "";
      }
      const messages = value.messages || [];
      for (const msg of messages) {
        if (!msg || !msg.from) continue;
        let text = "";
        if (msg.type === "text" && msg.text) text = msg.text.body || "";
        else if (msg.type === "button" && msg.button) text = msg.button.text || "";
        else if (msg.type === "interactive" && msg.interactive) {
          const i = msg.interactive;
          text = (i.button_reply && i.button_reply.title) || (i.list_reply && i.list_reply.title) || "";
        } else {
          text = `[${msg.type || "media"} message]`;
        }
        out.push({ from: String(msg.from), name: nameByWa[msg.from] || "", text: String(text || "") });
      }
    }
  }
  return out;
}

/* Find an open whatsapp ticket for this phone, else create one; append message. */
async function ingest(env, m) {
  const phone = m.from.replace(/[^\d]/g, "");
  if (!phone) return;
  const ts = now();
  const body = (m.text || "").slice(0, 5000) || "[empty message]";

  let ticket = await first(env,
    `SELECT * FROM tickets WHERE channel = 'whatsapp' AND customer_contact = ?
       AND status IN ('open','pending') ORDER BY datetime(updated_at) DESC LIMIT 1`,
    phone);

  if (!ticket) {
    const id = uid("tk_");
    await run(env,
      `INSERT INTO tickets (id, subject, customer_name, customer_contact, channel, status, priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'whatsapp', 'open', 'Medium', ?, ?)`,
      id, body.slice(0, 60), (m.name || "WhatsApp user").slice(0, 120), phone, ts, ts);
    ticket = { id };
  } else {
    await run(env, "UPDATE tickets SET updated_at = ?, status = CASE WHEN status='resolved' OR status='closed' THEN 'pending' ELSE status END WHERE id = ?", ts, ticket.id);
  }

  await run(env,
    `INSERT INTO ticket_messages (id, ticket_id, sender, agent_id, body, created_at)
     VALUES (?, ?, 'customer', NULL, ?, ?)`,
    uid("msg_"), ticket.id, body, ts);

  notifyDO(env, { body: `New WhatsApp message from ${m.name || phone}`, link: `#/support?ticket=${ticket.id}` });
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
