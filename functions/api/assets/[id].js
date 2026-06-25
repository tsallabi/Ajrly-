/* /api/assets/:id  DELETE — remove the R2 object and its metadata row. */
import { json, bad, unauthorized, forbidden, serverError, noContent } from "../../_lib/response.js";
import { getUser, can } from "../../_lib/auth.js";
import { first, run } from "../../_lib/db.js";

export function onRequestOptions() { return noContent(); }

export async function onRequestDelete(context) {
  try {
    const { env, params } = context;
    const me = await getUser(context.request, env);
    if (!me) return unauthorized();
    if (!can(me, "del")) return forbidden();
    const row = await first(env, "SELECT r2_key FROM assets WHERE id = ?", params.id);
    if (!row) return bad("notfound", 404);
    if (env.ASSETS) { try { await env.ASSETS.delete(row.r2_key); } catch (_) {} }
    await run(env, "DELETE FROM assets WHERE id = ?", params.id);
    return json({ ok: true });
  } catch (e) { return serverError(e); }
}
