/* GET /api/health — liveness probe. MUST NOT touch D1/KV so it works
   before bindings exist; the client uses it to detect cloud mode. */
import { json, noContent } from "../_lib/response.js";

export function onRequestGet(context) {
  const env = (context && context.env) || {};
  const ready = !!(env.DB && env.KV);
  return json({ ok: true, ready, ts: Date.now() });
}

export function onRequestOptions() {
  return noContent();
}
