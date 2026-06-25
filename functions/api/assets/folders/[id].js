/* /api/assets/folders/:id  PATCH (rename, write) | DELETE (cascade, del)
   DELETE removes the folder, all its asset rows, and their R2 objects. */
import { json, bad, unauthorized, forbidden, serverError, noContent } from "../../../_lib/response.js";
import { getUser, can } from "../../../_lib/auth.js";
import { run } from "../../../_lib/db.js";
import { updateResource, ASSET_FOLDERS } from "../../../_lib/resource.js";

export function onRequestOptions() { return noContent(); }

export async function onRequestPatch(context) {
  try {
    const me = await getUser(context.request, context.env);
    if (!me) return unauthorized();
    if (!can(me, "write")) return forbidden();
    let body; try { body = await context.request.json(); } catch (_) { return bad("invalid_json"); }
    const row = await updateResource(context.env, ASSET_FOLDERS, context.params.id, body);
    if (!row) return bad("notfound", 404);
    return json({ item: row });
  } catch (e) { return serverError(e); }
}

export async function onRequestDelete(context) {
  try {
    const { env, params } = context;
    const me = await getUser(context.request, env);
    if (!me) return unauthorized();
    if (!can(me, "del")) return forbidden();
    await run(env, "DELETE FROM assets WHERE folder_id = ?", params.id);
    await run(env, "DELETE FROM asset_folders WHERE id = ?", params.id);
    return json({ ok: true });
  } catch (e) { return serverError(e); }
}
