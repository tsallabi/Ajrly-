/* POST /api/auth/login  { email, password } -> { user } (+cookie) */
import { json, bad, unauthorized, serverError, noContent } from "../../_lib/response.js";
import { first } from "../../_lib/db.js";
import { hashPassword, safeEqual, createSession, sessionCookie, publicUser } from "../../_lib/auth.js";

const norm = (e) => String(e || "").trim().toLowerCase();

export function onRequestOptions() { return noContent(); }

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    let body;
    try { body = await request.json(); } catch (_) { return bad("invalid_json"); }
    const email = norm(body.email);
    const password = String(body.password || "");
    if (!email || !password) return bad("missing");

    const user = await first(env, "SELECT * FROM users WHERE email = ?", email);
    if (!user) return unauthorized();
    if (!user.active) return bad("disabled", 403);

    const h = await hashPassword(password, user.salt);
    if (!safeEqual(h, user.pass_hash)) return unauthorized();

    const token = await createSession(env, user.id);
    return json({ user: publicUser(user) }, { headers: { "Set-Cookie": sessionCookie(token) } });
  } catch (e) {
    return serverError(e);
  }
}
