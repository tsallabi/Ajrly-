/* /api/users/:id
   PATCH  { role?, active?, monitor_level?, name? } (admin)
   DELETE (admin) — both protect the last active admin. */
import { json, bad, unauthorized, forbidden, serverError, noContent } from "../../_lib/response.js";
import { first, run, all } from "../../_lib/db.js";
import { getUser, can, publicUser } from "../../_lib/auth.js";

const ROLES = ["admin", "manager", "member", "viewer"];
const LEVELS = ["standard", "extended"];

export function onRequestOptions() { return noContent(); }

async function otherActiveAdmins(env, excludeId) {
  const rows = await all(env,
    "SELECT id FROM users WHERE role='admin' AND active=1 AND id != ?", excludeId);
  return rows.length;
}

export async function onRequestPatch(context) {
  const { request, env, params } = context;
  try {
    const me = await getUser(request, env);
    if (!me) return unauthorized();
    if (!can(me, "manageUsers")) return forbidden();

    const id = params.id;
    const target = await first(env, "SELECT * FROM users WHERE id = ?", id);
    if (!target) return bad("notfound", 404);

    let body;
    try { body = await request.json(); } catch (_) { return bad("invalid_json"); }

    const sets = [];
    const binds = [];
    if (body.name !== undefined) {
      const name = String(body.name || "").trim();
      if (!name) return bad("missing");
      sets.push("name = ?"); binds.push(name);
    }
    if (body.role !== undefined) {
      if (!ROLES.includes(body.role)) return bad("invalid_role");
      sets.push("role = ?"); binds.push(body.role);
    }
    if (body.active !== undefined) {
      sets.push("active = ?"); binds.push(body.active ? 1 : 0);
    }
    if (body.monitor_level !== undefined) {
      if (!LEVELS.includes(body.monitor_level)) return bad("invalid_level");
      sets.push("monitor_level = ?"); binds.push(body.monitor_level);
    }
    if (!sets.length) return bad("nothing_to_update");

    // Protect the last active admin from being demoted/deactivated.
    const demoting = (body.role !== undefined && body.role !== "admin") || body.active === false;
    if (target.role === "admin" && demoting) {
      if ((await otherActiveAdmins(env, id)) === 0) return bad("last_admin", 409);
    }

    binds.push(id);
    await run(env, `UPDATE users SET ${sets.join(", ")} WHERE id = ?`, ...binds);
    const updated = await first(env, "SELECT * FROM users WHERE id = ?", id);
    return json({ user: publicUser(updated) });
  } catch (e) {
    return serverError(e);
  }
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  try {
    const me = await getUser(request, env);
    if (!me) return unauthorized();
    if (!can(me, "manageUsers")) return forbidden();

    const id = params.id;
    const target = await first(env, "SELECT id, role FROM users WHERE id = ?", id);
    if (!target) return bad("notfound", 404);

    if (target.role === "admin" && (await otherActiveAdmins(env, id)) === 0) {
      return bad("last_admin", 409);
    }
    await run(env, "DELETE FROM users WHERE id = ?", id);
    return json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
