/* GET /api/sync -> { tasks, content, owners, users, ts }
   One-shot cache fill for the client. Requires a valid session.
   users[] is minimal: id, name, role, active, monitor_level. */
import { json, unauthorized, serverError, noContent } from "../_lib/response.js";
import { all } from "../_lib/db.js";
import { getUser } from "../_lib/auth.js";
import { listResource, TASKS, CONTENT, OWNERS } from "../_lib/resource.js";

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

    return json({
      tasks,
      content,
      owners,
      users: users.map((u) => ({ ...u, active: !!u.active })),
      ts: Date.now(),
    });
  } catch (e) {
    return serverError(e);
  }
}
