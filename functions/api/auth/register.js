/* POST /api/auth/register  { name, email, password } -> { user } (+cookie)
   First registered user becomes 'admin'; subsequent self-registrations
   default to 'member'. (Admins create privileged users via /api/users.) */
import { json, bad, serverError, noContent } from "../../_lib/response.js";
import { first, run, uid } from "../../_lib/db.js";
import { newSalt, hashPassword, createSession, sessionCookie, publicUser } from "../../_lib/auth.js";

const norm = (e) => String(e || "").trim().toLowerCase();

export function onRequestOptions() { return noContent(); }

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    let body;
    try { body = await request.json(); } catch (_) { return bad("invalid_json"); }
    const name = String(body.name || "").trim();
    const email = norm(body.email);
    const password = String(body.password || "");

    if (!name || !email || !password) return bad("missing");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad("invalid_email");
    if (password.length < 6) return bad("weak");

    const exists = await first(env, "SELECT id FROM users WHERE email = ?", email);
    if (exists) return bad("exists", 409);

    const countRow = await first(env, "SELECT COUNT(*) AS n FROM users");
    const isFirst = !countRow || Number(countRow.n) === 0;
    const role = isFirst ? "admin" : "member";

    const id = uid("u");
    const salt = newSalt();
    const passHash = await hashPassword(password, salt);

    await run(env,
      "INSERT INTO users (id, name, email, pass_hash, salt, role, active, monitor_level) VALUES (?,?,?,?,?,?,1,'standard')",
      id, name, email, passHash, salt, role
    );

    const user = await first(env, "SELECT * FROM users WHERE id = ?", id);
    const token = await createSession(env, id);
    return json({ user: publicUser(user) }, { headers: { "Set-Cookie": sessionCookie(token) } });
  } catch (e) {
    return serverError(e);
  }
}
