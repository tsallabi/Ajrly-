/* POST /api/auth/logout -> { ok:true } (+clears cookie) */
import { json, serverError, noContent } from "../../_lib/response.js";
import { sessionToken, destroySession, clearCookie } from "../../_lib/auth.js";

export function onRequestOptions() { return noContent(); }

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    await destroySession(env, sessionToken(request));
    return json({ ok: true }, { headers: { "Set-Cookie": clearCookie() } });
  } catch (e) {
    return serverError(e);
  }
}
