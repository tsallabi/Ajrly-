/* ============================================================
   Ajrly OS — /api/realtime  (WebSocket → PresenceRoom DO)  [WS-B]
   ------------------------------------------------------------
   GET /api/realtime  with  Upgrade: websocket
     1. authenticate the session cookie via the shared auth lib,
     2. forward the upgrade to the single global PresenceRoom DO,
        passing the resolved identity as trusted X-User-* headers
        (the DO never trusts client-supplied identity).
   Anything else → 426 (need upgrade) / 400.

   Re-exports the DO class so wrangler can bind it from this module
   if the project references the class here.
   ============================================================ */
import { getUser } from "../_lib/auth.js";
import { unauthorized } from "../_lib/response.js";

export { PresenceRoom } from "../_do/PresenceRoom.js";

export async function onRequest(context) {
  const { request, env } = context;

  const upgrade = request.headers.get("Upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    // Not a WS handshake → tell the client to upgrade.
    return new Response("expected websocket upgrade", { status: 426 });
  }

  if (!env || !env.PRESENCE) {
    return new Response("presence_unavailable", { status: 503 });
  }

  // Cookie-based auth (shared lib). No session → 401, client stays local.
  let user = null;
  try { user = await getUser(request, env); } catch (_) { user = null; }
  if (!user || !user.id) return unauthorized();

  // Route everyone to one global room.
  const id = env.PRESENCE.idFromName("global");
  const stub = env.PRESENCE.get(id);

  // Forward the original request but inject trusted identity headers.
  const headers = new Headers(request.headers);
  headers.set("X-User-Id", String(user.id));
  headers.set("X-User-Name", String(user.name || user.id));
  headers.set("X-User-Role", String(user.role || "member"));
  headers.set("X-User-Monitor", String(user.monitor_level || "standard"));

  const forwarded = new Request(request.url, {
    method: request.method,
    headers,
  });

  return stub.fetch(forwarded);
}
