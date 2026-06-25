/* POST /api/assets/upload  — stream a file into R2 + record metadata.
   Headers: X-Folder-Id, X-File-Name (URL-encoded), Content-Type.
   Body: raw file bytes. Requires write permission and the R2 binding. */
import { json, bad, unauthorized, forbidden, serverError, noContent } from "../../_lib/response.js";
import { getUser, can } from "../../_lib/auth.js";
import { uid } from "../../_lib/db.js";
import { createResource, ASSETS } from "../../_lib/resource.js";

export function onRequestOptions() { return noContent(); }

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const me = await getUser(request, env);
    if (!me) return unauthorized();
    if (!can(me, "write")) return forbidden();
    if (!env.ASSETS) return bad("assets_storage_unavailable", 503);

    const folderId = request.headers.get("X-Folder-Id") || "";
    let name = "file";
    try { name = decodeURIComponent(request.headers.get("X-File-Name") || "file"); } catch (_) {}
    const type = request.headers.get("Content-Type") || "application/octet-stream";
    if (!folderId) return bad("missing_folder");
    if (!request.body) return bad("empty_body");

    const fileId = uid("as");
    const key = `assets/${folderId}/${fileId}/${name}`;
    const put = await env.ASSETS.put(key, request.body, { httpMetadata: { contentType: type } });
    const size = (put && put.size) || Number(request.headers.get("Content-Length") || 0);

    const row = await createResource(env, ASSETS, { folderId, name, type, size, r2Key: key });
    return json({ item: row }, { status: 201 });
  } catch (e) { return serverError(e); }
}
