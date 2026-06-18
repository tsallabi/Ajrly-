/* ============================================================
   Ajrly OS — Cloud API: Ticket message thread (WS-C)
   Path:  GET  /api/tickets/:id/messages                 (auth) -> thread
          POST /api/tickets/:id/messages  { body }       (auth) -> agent reply
   On the first agent reply, stamps tickets.first_response_at.
   Broadcasts a {type:"notify"} to the PresenceRoom DO (best-effort).
   ============================================================ */
import { getUser, can } from "../../../_lib/auth.js";
import { json, bad, unauthorized, forbidden, serverError, noContent } from "../../../_lib/response.js";
import { all, first, run, uid, now } from "../../../_lib/db.js";

export function onRequestOptions() { return noContent(); }

/* ---- GET thread ---- */
export async function onRequestGet(context) {
  const { request, env, params } = context;
  try {
    const user = await getUser(request, env);
    if (!user) return unauthorized();

    const id = String(params.id || "");
    if (!id) return bad("missing_id");

    const ticket = await first(env, "SELECT * FROM tickets WHERE id = ?", id);
    if (!ticket) return bad("not_found", 404);

    const messages = await all(env,
      "SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY datetime(created_at) ASC, id ASC",
      id);
    return json({ ticket, messages });
  } catch (e) {
    return serverError(e);
  }
}

/* ---- POST agent reply ---- */
export async function onRequestPost(context) {
  const { request, env, params } = context;
  try {
    const user = await getUser(request, env);
    if (!user) return unauthorized();
    if (!can(user, "write")) return forbidden();

    const id = String(params.id || "");
    if (!id) return bad("missing_id");

    const ticket = await first(env, "SELECT * FROM tickets WHERE id = ?", id);
    if (!ticket) return bad("not_found", 404);

    let p = {};
    try { p = await request.json(); } catch (_) { p = {}; }
    const body = String(p.body || "").trim().slice(0, 5000);
    if (!body) return bad("empty_message");

    const ts = now();
    const msgId = uid("msg_");
    await run(env,
      `INSERT INTO ticket_messages (id, ticket_id, sender, agent_id, body, created_at)
       VALUES (?, ?, 'agent', ?, ?, ?)`,
      msgId, id, user.id, body, ts);

    // Stamp first_response_at on the first agent reply.
    const sets = ["updated_at = ?"];
    const binds = [ts];
    if (!ticket.first_response_at) {
      sets.push("first_response_at = ?"); binds.push(ts);
    }
    // An agent reply on a resolved/closed ticket reopens it to 'pending'.
    if (ticket.status === "resolved" || ticket.status === "closed") {
      sets.push("status = 'pending'");
    }
    binds.push(id);
    await run(env, `UPDATE tickets SET ${sets.join(", ")} WHERE id = ?`, ...binds);

    // Best-effort realtime notify via the PresenceRoom Durable Object.
    notifyDO(env, {
      body: `Reply on ticket: ${ticket.subject || id}`,
      link: `#/support?ticket=${id}`,
    });

    const message = await first(env, "SELECT * FROM ticket_messages WHERE id = ?", msgId);
    const updated = await first(env, "SELECT * FROM tickets WHERE id = ?", id);
    return json({ message, ticket: updated }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}

/* Fire-and-forget broadcast to the global presence room. Never throws. */
function notifyDO(env, payload) {
  try {
    if (!env || !env.PRESENCE) return;
    const idObj = env.PRESENCE.idFromName("global");
    const stub = env.PRESENCE.get(idObj);
    // The DO exposes an internal POST /notify that broadcasts {type:"notify"}.
    stub.fetch("https://do/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "notify", ...payload }),
    }).catch(() => {});
  } catch (_) { /* presence unavailable — non-fatal */ }
}
