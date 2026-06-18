/* /api/users
   GET  -> { users:[...] }   (admin | manager)
   POST -> { user }          (admin) — create a user with any role */
import { json, bad, unauthorized, forbidden, serverError, noContent } from "../../_lib/response.js";
import { all, first, run, uid } from "../../_lib/db.js";
import { getUser, can, newSalt, hashPassword, publicUser } from "../../_lib/auth.js";

const ROLES = ["admin", "manager", "member", "viewer"];
const norm = (e) => String(e || "").trim().toLowerCase();

export function onRequestOptions() { return noContent(); }

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const me = await getUser(request, env);
    if (!me) return unauthorized();
    if (!(can(me, "manageUsers") || me.role === "manager")) return forbidden();
    const rows = await all(env,
      "SELECT id, name, email, role, active, monitor_level, tz, created_at FROM users ORDER BY created_at ASC");
    return json({ users: rows.map(publicUser) });
  } catch (e) {
    return serverError(e);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const me = await getUser(request, env);
    if (!me) return unauthorized();
    if (!can(me, "manageUsers")) return forbidden();

    let body;
    try { body = await request.json(); } catch (_) { return bad("invalid_json"); }
    const name = String(body.name || "").trim();
    const email = norm(body.email);
    const password = String(body.password || "");
    const role = ROLES.includes(body.role) ? body.role : "member";

    if (!name || !email || !password) return bad("missing");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad("invalid_email");
    if (password.length < 6) return bad("weak");

    const exists = await first(env, "SELECT id FROM users WHERE email = ?", email);
    if (exists) return bad("exists", 409);

    const id = uid("u");
    const salt = newSalt();
    const passHash = await hashPassword(password, salt);
    await run(env,
      "INSERT INTO users (id, name, email, pass_hash, salt, role, active, monitor_level) VALUES (?,?,?,?,?,?,1,'standard')",
      id, name, email, passHash, salt, role
    );
    const user = await first(env, "SELECT * FROM users WHERE id = ?", id);
    return json({ user: publicUser(user) }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
