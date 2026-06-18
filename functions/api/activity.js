/* GET /api/activity?user=<id>&limit=<n>
   Activity timeline for the Live Ops Room (extended-monitoring view).
   Auth: admin/manager (monitorOthers) can read anyone; others only self.
   Returns coarse activity_log rows — never coordinates/keystrokes/screenshots. */
import { json, bad, unauthorized, forbidden, serverError } from "../_lib/response.js";
import { all } from "../_lib/db.js";
import { getUser, can } from "../_lib/auth.js";

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    if (!env.DB) return json({ items: [], ready: false });
    const user = await getUser(request, env);
    if (!user) return unauthorized();

    const url = new URL(request.url);
    const target = url.searchParams.get("user") || user.id;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10) || 100, 500);

    if (target !== user.id && !can(user, "monitorOthers")) return forbidden();

    const items = await all(
      env,
      "SELECT id, user_id, ts, kind, meta FROM activity_log WHERE user_id = ? ORDER BY ts DESC LIMIT ?",
      target, limit
    );
    return json({ items });
  } catch (e) {
    return serverError(e);
  }
}
