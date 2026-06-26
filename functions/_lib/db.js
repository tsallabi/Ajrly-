/* ============================================================
   Ajrly OS — Cloud API: D1 helpers (WS-A, shared _lib)
   Thin wrappers over the D1 prepared-statement API. ALWAYS use
   parameterized binds — never string-concatenate user input into SQL.
   ============================================================ */

import { ensureSchema } from "./schema.js";

/* Return all matching rows as plain objects. */
export async function all(env, sql, ...binds) {
  await ensureSchema(env); // self-heal: create any missing tables on first use
  const res = await env.DB.prepare(sql).bind(...binds).all();
  return res.results || [];
}

/* Return the first matching row, or null. */
export async function first(env, sql, ...binds) {
  await ensureSchema(env);
  const row = await env.DB.prepare(sql).bind(...binds).first();
  return row || null;
}

/* Execute a write (INSERT/UPDATE/DELETE). Returns D1 meta. */
export async function run(env, sql, ...binds) {
  await ensureSchema(env);
  const res = await env.DB.prepare(sql).bind(...binds).run();
  return res;
}

/* Collision-resistant short id with a type prefix (t/c/o/u…). */
export function uid(prefix = "") {
  const rand = crypto.getRandomValues(new Uint8Array(8));
  let s = "";
  for (const b of rand) s += b.toString(36).padStart(2, "0");
  return prefix + Date.now().toString(36) + s.slice(0, 10);
}

/* Current timestamp in the same shape D1's datetime('now') uses
   (UTC, "YYYY-MM-DD HH:MM:SS") so stamped values sort consistently. */
export function now() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}
