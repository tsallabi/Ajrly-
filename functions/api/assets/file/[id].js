/* GET /api/assets/file/:id  — stream a stored file back from R2.
   Auth via session cookie (same-origin). Returns the original bytes
   with its content type so the browser can preview or download it. */
import { bad, unauthorized, serverError, noContent } from "../../../_lib/response.js";
import { getUser } from "../../../_lib/auth.js";
import { first } from "../../../_lib/db.js";

export function onRequestOptions() { return noContent(); }

export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const me = await getUser(context.request, env);
    if (!me) return unauthorized();
    if (!env.ASSETS) return bad("assets_storage_unavailable", 503);
    const row = await first(env, "SELECT name, type, r2_key FROM assets WHERE id = ?", params.id);
    if (!row) return bad("notfound", 404);
    const obj = await env.ASSETS.get(row.r2_key);
    if (!obj) return bad("notfound", 404);
    const headers = new Headers();
    headers.set("Content-Type", row.type || (obj.httpMetadata && obj.httpMetadata.contentType) || "application/octet-stream");
    headers.set("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(row.name || "file")}`);
    headers.set("Cache-Control", "private, max-age=60");
    if (obj.size != null) headers.set("Content-Length", String(obj.size));
    return new Response(obj.body, { headers });
  } catch (e) { return serverError(e); }
}
