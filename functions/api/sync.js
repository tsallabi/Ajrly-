/* GET /api/sync -> { tasks, content, owners, finance, assetFolders, assets, users, ts }
   One-shot cache fill for the client. Requires a valid session.
   Optional tables (finance/assets) are OMITTED from the payload when their
   query fails (e.g. not migrated yet) so the client never wipes local data. */
import { json, unauthorized, serverError, noContent } from "../_lib/response.js";
import { all } from "../_lib/db.js";
import { getUser } from "../_lib/auth.js";
import { listResource, TASKS, CONTENT, OWNERS, FINANCE, ASSET_FOLDERS, ASSETS, ACTIVITY, CONTENT_POSTS, CONTENT_OPTS, NOTEBOOK } from "../_lib/resource.js";

export function onRequestOptions() { return noContent(); }

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const me = await getUser(request, env);
    if (!me) return unauthorized();

    const [tasks, content, owners, users] = await Promise.all([
      listResource(env, TASKS),
      listResource(env, CONTENT),
      listResource(env, OWNERS),
      all(env, "SELECT id, name, role, active, monitor_level FROM users ORDER BY created_at ASC"),
    ]);

    const out = {
      tasks, content, owners,
      users: users.map((u) => ({ ...u, active: !!u.active })),
      ts: Date.now(),
    };
    // optional tables: include only when present (a missing key tells the
    // client to keep its local copy instead of replacing it with [])
    await Promise.all([
      listResource(env, FINANCE).then((r) => { out.finance = r; }).catch(() => {}),
      listResource(env, ASSET_FOLDERS).then((r) => { out.assetFolders = r; }).catch(() => {}),
      listResource(env, ASSETS).then((r) => { out.assets = r; }).catch(() => {}),
      listResource(env, ACTIVITY).then((r) => { out.activity = r; }).catch(() => {}),
      listResource(env, CONTENT_POSTS).then((r) => { out.contentPosts = r; }).catch(() => {}),
      listResource(env, CONTENT_OPTS).then((r) => { out.contentOpts = r; }).catch(() => {}),
      listResource(env, NOTEBOOK).then((r) => { out.notebook = r; }).catch(() => {}),
    ]);

    return json(out);
  } catch (e) {
    return serverError(e);
  }
}
