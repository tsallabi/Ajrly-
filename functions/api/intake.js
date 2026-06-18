/* ============================================================
   Ajrly OS — Cloud API: Public intake (WS-C)  — NO AUTH
   Path:  POST /api/intake
   Body:  { name, message, subject?, contact?, email?, phone?, company? }
   The website contact form posts here. Creates a ticket (channel 'form')
   + the customer's first message. Basic anti-abuse only.
   ============================================================ */
import { json, bad, noContent, serverError } from "../_lib/response.js";
import { run, uid, now } from "../_lib/db.js";

const MAX_NAME = 120;
const MAX_SUBJECT = 200;
const MAX_MSG = 5000;
const MAX_CONTACT = 200;

export function onRequestOptions() { return noContent(); }

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!env || !env.DB) return bad("cloud_unavailable", 503);

    let p = {};
    const ctype = request.headers.get("content-type") || "";
    if (ctype.includes("application/json")) {
      try { p = await request.json(); } catch (_) { p = {}; }
    } else {
      // Support classic HTML form posts (application/x-www-form-urlencoded / multipart).
      try {
        const fd = await request.formData();
        p = Object.fromEntries(fd.entries());
      } catch (_) { p = {}; }
    }

    // Honeypot: bots fill hidden fields. Pretend success, drop silently.
    if (p.website || p.url || p._hp) return json({ ok: true });

    const name = String(p.name || "").trim().slice(0, MAX_NAME);
    const message = String(p.message || "").trim().slice(0, MAX_MSG);
    const subject = String(p.subject || "").trim().slice(0, MAX_SUBJECT);
    const email = String(p.email || "").trim().slice(0, MAX_CONTACT);
    const phone = String(p.phone || "").trim().slice(0, MAX_CONTACT);
    const contact = String(p.contact || email || phone || "").trim().slice(0, MAX_CONTACT);

    // Anti-abuse: require name + message, with sane minimum lengths.
    if (name.length < 2) return bad("name_required");
    if (message.length < 5) return bad("message_required");

    const id = uid("tk_");
    const ts = now();
    const subj = subject || message.slice(0, 60);

    await run(env,
      `INSERT INTO tickets (id, subject, customer_name, customer_contact, channel, status, priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'form', 'open', 'Medium', ?, ?)`,
      id, subj, name, contact, ts, ts);

    await run(env,
      `INSERT INTO ticket_messages (id, ticket_id, sender, agent_id, body, created_at)
       VALUES (?, ?, 'customer', NULL, ?, ?)`,
      uid("msg_"), id, message, ts);

    // Best-effort notify the team room (non-fatal).
    notifyDO(env, { body: `New contact-form ticket: ${subj}`, link: `#/support?ticket=${id}` });

    return json({ ok: true, id }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
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
