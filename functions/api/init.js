/* ============================================================
   GET/POST /api/init — ensure the D1 schema exists.
   Idempotent: creates any missing tables/indexes (CREATE ... IF NOT
   EXISTS) and reports the current table list. Safe to call anytime;
   it never drops or modifies existing data. Also runs automatically
   on the first DB query after each deploy (see _lib/schema.js), so
   this endpoint is mainly for manual verification.
   ============================================================ */
import { json, bad } from "../_lib/response.js";
import { all } from "../_lib/db.js";
import { ensureSchema } from "../_lib/schema.js";

async function handle(context) {
  const env = (context && context.env) || {};
  if (!env.DB) return bad("no_database", 503);
  try {
    await ensureSchema(env);
    const rows = await all(env, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    const tables = rows.map((r) => r.name).filter((n) => n && !n.startsWith("sqlite_") && n !== "_cf_KV");
    return json({ ok: true, tables, count: tables.length });
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, { status: 500 });
  }
}

export const onRequestGet = handle;
export const onRequestPost = handle;
export function onRequestOptions() {
  return new Response(null, { status: 204 });
}
