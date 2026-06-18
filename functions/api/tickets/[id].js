/* ============================================================
   Ajrly OS — Cloud API: Single ticket (WS-C Customer Service)
   Path:  PATCH /api/tickets/:id  { status?, assignee?, priority? }  (auth)
   Side effects:
     - status -> 'resolved'|'closed'  stamps resolved_at (once)
     - status reopened to 'open'/'pending' clears resolved_at
     - first agent action may carry first_response handled in messages.js
   ============================================================ */
import { getUser, can } from "../../_lib/auth.js";
import { json, bad, unauthorized, forbidden, serverError, noContent } from "../../_lib/response.js";
import { first, run, now } from "../../_lib/db.js";

const STATUSES = new Set(["open", "pending", "resolved", "closed"]);
const PRIORITIES = new Set(["High", "Medium", "Low"]);

export function onRequestOptions() { return noContent(); }

export async function onRequestPatch(context) {
  const { request, env, params } = context;
  try {
    const user = await getUser(request, env);
    if (!user) return unauthorized();

    const id = String(params.id || "");
    if (!id) return bad("missing_id");

    const ticket = await first(env, "SELECT * FROM tickets WHERE id = ?", id);
    if (!ticket) return bad("not_found", 404);

    let p = {};
    try { p = await request.json(); } catch (_) { p = {}; }

    const sets = [];
    const binds = [];

    if (p.status !== undefined) {
      const status = String(p.status);
      if (!STATUSES.has(status)) return bad("bad_status");
      sets.push("status = ?"); binds.push(status);
      // resolved/closed -> stamp resolved_at once; reopen -> clear it
      if (status === "resolved" || status === "closed") {
        if (!ticket.resolved_at) { sets.push("resolved_at = ?"); binds.push(now()); }
      } else {
        if (ticket.resolved_at) { sets.push("resolved_at = NULL"); }
      }
    }

    if (p.assignee !== undefined) {
      if (!can(user, "assign")) return forbidden();
      const assignee = p.assignee ? String(p.assignee).slice(0, 64) : null;
      sets.push("assignee = ?"); binds.push(assignee);
    }

    if (p.priority !== undefined) {
      const priority = String(p.priority);
      if (!PRIORITIES.has(priority)) return bad("bad_priority");
      sets.push("priority = ?"); binds.push(priority);
    }

    if (!sets.length) return bad("nothing_to_update");

    sets.push("updated_at = ?"); binds.push(now());
    binds.push(id);

    await run(env, `UPDATE tickets SET ${sets.join(", ")} WHERE id = ?`, ...binds);

    const updated = await first(env, "SELECT * FROM tickets WHERE id = ?", id);
    return json({ ticket: updated });
  } catch (e) {
    return serverError(e);
  }
}
