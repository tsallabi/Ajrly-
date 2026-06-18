/* GET /api/auth/me -> { user } | 401 */
import { json, unauthorized, serverError, noContent } from "../../_lib/response.js";
import { getUser, publicUser } from "../../_lib/auth.js";

export function onRequestOptions() { return noContent(); }

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const user = await getUser(request, env);
    if (!user) return unauthorized();
    return json({ user: publicUser(user) });
  } catch (e) {
    return serverError(e);
  }
}
