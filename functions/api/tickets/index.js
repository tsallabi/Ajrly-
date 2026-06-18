/* ============================================================
   Ajrly OS — Cloud API: Tickets collection (WS-C Customer Service)
   Path:  GET  /api/tickets   ?status=&assignee=&channel=   (auth)
          POST /api/tickets   { subject, customer_name, customer_contact,
                                channel?, priority?, assignee?, body? }  (auth)
   Web APIs only. Parameterized binds only.
   ============================================================ */
import { getUser, can } from "../../_lib/auth.js";
import { json, bad, unauthorized, forbidden, serverError, noContent } from "../../_lib/response.js";
import { all, first, run, uid, now } from "../../_lib/db.js";

const CHANNELS = new Set(["form", "whatsapp", "email", "chat"]);
const STATUSES = new Set(["open", "pending", "resolved", "closed"]);
const PRIORITIES = new Set(["High", "Medium", "Low"]);

export function onRequestOptions() { return noContent(); }

/* ---- GET list, with optional filters ---- */
export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const user = await getUser(request, env);
    if (!user) return unauthorized();

    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "";
    const assignee = url.searchParams.get("assignee") || "";
    const channel = url.searchParams.get("channel") || "";

    const where = [];
    const binds = [];
    if (status && STATUSES.has(status)) { where.push("status = ?"); binds.push(status); }
    if (channel && CHANNELS.has(channel)) { where.push("channel = ?"); binds.push(channel); }
    if (assignee) {
      if (assignee === "unassigned") { where.push("(assignee IS NULL OR assignee = '')"); }
      else if (assignee === "me") { where.push("assignee = ?"); binds.push(user.id); }
      else { where.push("assignee = ?"); binds.push(assignee); }
    }

    const sql =
      "SELECT * FROM tickets" +
      (where.length ? " WHERE " + where.join(" AND ") : "") +
      " ORDER BY (status='open') DESC, datetime(updated_at) DESC LIMIT 500";

    const tickets = await all(env, sql, ...binds);
    return json({ tickets });
  } catch (e) {
    return serverError(e);
  }
}

/* ---- POST create (agent-created ticket) ---- */
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const user = await getUser(request, env);
    if (!user) return unauthorized();
    if (!can(user, "write")) return forbidden();

    let p = {};
    try { p = await request.json(); } catch (_) { p = {}; }

    const subject = String(p.subject || "").trim().slice(0, 200);
    const customer_name = String(p.customer_name || "").trim().slice(0, 120);
    const customer_contact = String(p.customer_contact || "").trim().slice(0, 200);
    const body = String(p.body || "").trim().slice(0, 5000);

    if (!subject && !body) return bad("subject_or_body_required");

    const channel = CHANNELS.has(p.channel) ? p.channel : "form";
    const priority = PRIORITIES.has(p.priority) ? p.priority : "Medium";
    const assignee = p.assignee ? String(p.assignee).slice(0, 64) : null;

    const id = uid("tk_");
    const ts = now();
    await run(env,
      `INSERT INTO tickets (id, subject, customer_name, customer_contact, channel, status, priority, assignee, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)`,
      id, subject || (body.slice(0, 60)), customer_name, customer_contact, channel, priority, assignee, ts, ts);

    if (body) {
      await run(env,
        `INSERT INTO ticket_messages (id, ticket_id, sender, agent_id, body, created_at)
         VALUES (?, ?, 'customer', NULL, ?, ?)`,
        uid("msg_"), id, body, ts);
    }

    const ticket = await first(env, "SELECT * FROM tickets WHERE id = ?", id);
    return json({ ticket }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
