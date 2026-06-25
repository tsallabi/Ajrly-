/* ============================================================
   Ajrly OS — Cloud API: generic CRUD resource mapper (WS-A, _lib)
   Maps DB snake_case rows <-> client camelCase, builds parameterized
   INSERT/UPDATE, and stamps updated_at. Used by tasks/content/owners.
   ============================================================ */

import { all, first, run, uid, now } from "./db.js";

/* Per-resource config:
   table   : D1 table name
   prefix  : id prefix for uid()
   fields  : [{ col, key, json? }]  col=DB column, key=client key,
             json=true means stored as JSON string <-> array/object.
   order   : ORDER BY clause (without "ORDER BY")
*/

/* Row (snake) -> client object (camel), with JSON fields parsed. */
export function toClient(cfg, row) {
  if (!row) return null;
  const out = { id: row.id };
  for (const f of cfg.fields) {
    let v = row[f.col];
    if (f.json) {
      if (typeof v === "string") {
        try { v = JSON.parse(v); } catch (_) { v = v ? [v] : []; }
      } else if (v == null) {
        v = [];
      }
    }
    out[f.key] = v == null ? (f.json ? [] : "") : v;
  }
  out.createdAt = row.created_at || null;
  out.updatedAt = row.updated_at || null;
  return out;
}

/* Pick a DB-ready value from a client body for a field. */
function dbValue(f, body) {
  let v = body[f.key];
  if (f.json) return JSON.stringify(Array.isArray(v) ? v : (v == null ? [] : [v]));
  if (v === undefined || v === null) return null;
  return typeof v === "string" ? v : String(v);
}

export async function listResource(env, cfg) {
  const order = cfg.order ? ` ORDER BY ${cfg.order}` : "";
  const rows = await all(env, `SELECT * FROM ${cfg.table}${order}`);
  return rows.map((r) => toClient(cfg, r));
}

export async function getResource(env, cfg, id) {
  const row = await first(env, `SELECT * FROM ${cfg.table} WHERE id = ?`, id);
  return toClient(cfg, row);
}

export async function createResource(env, cfg, body) {
  const id = uid(cfg.prefix);
  const cols = ["id"];
  const placeholders = ["?"];
  const binds = [id];
  for (const f of cfg.fields) {
    cols.push(f.col);
    placeholders.push("?");
    binds.push(dbValue(f, body));
  }
  cols.push("updated_at"); placeholders.push("?"); binds.push(now());
  await run(env,
    `INSERT INTO ${cfg.table} (${cols.join(", ")}) VALUES (${placeholders.join(", ")})`,
    ...binds
  );
  return getResource(env, cfg, id);
}

export async function updateResource(env, cfg, id, body) {
  const existing = await first(env, `SELECT id FROM ${cfg.table} WHERE id = ?`, id);
  if (!existing) return null;
  const sets = [];
  const binds = [];
  for (const f of cfg.fields) {
    if (body[f.key] === undefined) continue;
    sets.push(`${f.col} = ?`);
    binds.push(dbValue(f, body));
  }
  sets.push("updated_at = ?"); binds.push(now());
  binds.push(id);
  await run(env, `UPDATE ${cfg.table} SET ${sets.join(", ")} WHERE id = ?`, ...binds);
  return getResource(env, cfg, id);
}

export async function deleteResource(env, cfg, id) {
  const existing = await first(env, `SELECT id FROM ${cfg.table} WHERE id = ?`, id);
  if (!existing) return false;
  await run(env, `DELETE FROM ${cfg.table} WHERE id = ?`, id);
  return true;
}

/* ---- Resource definitions (single source of field mapping) ---- */
export const TASKS = {
  table: "tasks",
  prefix: "t",
  order: "created_at DESC",
  fields: [
    { col: "title", key: "title" },
    { col: "description", key: "description" },
    { col: "priority", key: "priority" },
    { col: "status", key: "status" },
    { col: "assigned_by", key: "assignedBy" },
    { col: "delegate_to", key: "delegateTo" },
    { col: "due_date", key: "dueDate" },
    { col: "date", key: "date" },
    { col: "duration", key: "duration" },
    { col: "notes", key: "notes" },
    { col: "created_by", key: "createdBy" },
  ],
};

export const CONTENT = {
  table: "content",
  prefix: "c",
  order: "created_at DESC",
  fields: [
    { col: "day", key: "day" },
    { col: "date", key: "date" },
    { col: "goal", key: "goal" },
    { col: "platform", key: "platform", json: true },
    { col: "pillar", key: "pillar" },
    { col: "type", key: "type" },
    { col: "description", key: "description" },
    { col: "hook", key: "hook" },
    { col: "caption", key: "caption" },
    { col: "time", key: "time" },
    { col: "budget", key: "budget" },
  ],
};

export const OWNERS = {
  table: "owners",
  prefix: "o",
  order: "created_at DESC",
  fields: [
    { col: "name", key: "name" },
    { col: "gender", key: "gender" },
    { col: "phone", key: "phone" },
    { col: "email", key: "email" },
    { col: "city", key: "city" },
    { col: "listings", key: "listings" },
    { col: "signed_up", key: "signedUp" },
    { col: "last_contact", key: "lastContact" },
    { col: "stage", key: "stage" },
    { col: "notes", key: "notes" },
    { col: "status", key: "status" },
  ],
};
