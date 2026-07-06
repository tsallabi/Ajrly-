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
    // Column not present in this table (e.g. not migrated yet): omit the key
    // entirely so the client keeps its local value instead of having it wiped.
    if (!(f.col in row)) continue;
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

/* Columns that actually exist in a table, so we never INSERT/UPDATE a
   column a not-yet-migrated DB is missing (which would throw and cause
   data loss on the client). Table names come from our own cfg, not user
   input. Returns a Set, or null if it can't be determined (then we
   include all configured columns as before). */
async function existingCols(env, table) {
  try {
    const rows = await all(env, `PRAGMA table_info(${table})`);
    const s = new Set(rows.map((r) => r.name));
    return s.size ? s : null;
  } catch (_) { return null; }
}

export async function createResource(env, cfg, body) {
  const id = uid(cfg.prefix);
  const have = await existingCols(env, cfg.table);
  const cols = ["id"];
  const placeholders = ["?"];
  const binds = [id];
  for (const f of cfg.fields) {
    if (have && !have.has(f.col)) continue; // skip columns the DB doesn't have yet
    cols.push(f.col);
    placeholders.push("?");
    binds.push(dbValue(f, body));
  }
  if (!have || have.has("updated_at")) { cols.push("updated_at"); placeholders.push("?"); binds.push(now()); }
  await run(env,
    `INSERT INTO ${cfg.table} (${cols.join(", ")}) VALUES (${placeholders.join(", ")})`,
    ...binds
  );
  return getResource(env, cfg, id);
}

export async function updateResource(env, cfg, id, body) {
  const existing = await first(env, `SELECT id FROM ${cfg.table} WHERE id = ?`, id);
  if (!existing) return null;
  const have = await existingCols(env, cfg.table);
  const sets = [];
  const binds = [];
  for (const f of cfg.fields) {
    if (body[f.key] === undefined) continue;
    if (have && !have.has(f.col)) continue; // skip columns the DB doesn't have yet
    sets.push(`${f.col} = ?`);
    binds.push(dbValue(f, body));
  }
  if (!have || have.has("updated_at")) { sets.push("updated_at = ?"); binds.push(now()); }
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
    { col: "owner_id", key: "ownerId" },
    { col: "owner_name", key: "ownerName" },
    { col: "contact_method", key: "contactMethod" },
    { col: "time_log", key: "timeLog", json: true },
    { col: "timer_start", key: "timerStart" },
    { col: "timer_by", key: "timerBy" },
    { col: "repeat", key: "repeat" },
    { col: "series_id", key: "seriesId" },
  ],
};

export const FINANCE = {
  table: "finance",
  prefix: "f",
  order: "date DESC, created_at DESC",
  fields: [
    { col: "kind", key: "kind" },
    { col: "name", key: "name" },
    { col: "date", key: "date" },
    { col: "amount", key: "amount" },
    { col: "currency", key: "currency" },
    { col: "rate", key: "rate" },
    { col: "category", key: "category" },
    { col: "paid_to", key: "paidTo" },
    { col: "description", key: "description" },
    { col: "attachment", key: "attachment" },
    { col: "attachment_name", key: "attachmentName" },
  ],
};

export const ASSET_FOLDERS = {
  table: "asset_folders",
  prefix: "af",
  order: "created_at DESC",
  fields: [
    { col: "name", key: "name" },
  ],
};

export const CONTENT_POSTS = {
  table: "content_posts",
  prefix: "cp",
  order: "created_at DESC",
  fields: [
    { col: "day", key: "day" },
    { col: "date", key: "date" },
    { col: "goal", key: "goal" },
    { col: "post_to", key: "postTo" },
    { col: "idea", key: "idea" },
    { col: "type", key: "type" },
    { col: "caption", key: "caption" },
    { col: "pub_time", key: "pubTime" },
    { col: "attachment", key: "attachment" },
    { col: "attachment_name", key: "attachmentName" },
  ],
};

export const CONTENT_OPTS = {
  table: "content_opts",
  prefix: "co",
  order: "created_at ASC",
  fields: [
    { col: "field", key: "field" },
    { col: "value", key: "value" },
    { col: "url", key: "url" },
  ],
};

export const NOTEBOOK = {
  table: "notebook",
  prefix: "nb",
  order: "created_at ASC",     // pages in the order they were added
  fields: [
    { col: "title", key: "title" },
    { col: "date", key: "date" },
    { col: "body", key: "body" },   // HTML content (text + inline images)
  ],
};

export const BUDGETS = {
  table: "budgets",
  prefix: "bg",
  order: "created_at DESC",
  fields: [
    { col: "name", key: "name" },
    { col: "description", key: "description" },
    { col: "planner", key: "planner" },
    { col: "status", key: "status" },              // pending|approved|denied
    { col: "denial_note", key: "denialNote" },
    { col: "currency", key: "currency" },
    { col: "assigned", key: "assigned" },          // assigned/planned budget
    { col: "actual", key: "actual" },              // actual spending
    { col: "costs", key: "costs", json: true },    // [{name,description,estimatedCost,currency,rate,duration,provider,importance,attachment,attachmentName}]
  ],
};

/* Cities distribution buckets — drives the dashboard pie chart. */
export const CITY_TARGETS = {
  table: "city_targets",
  prefix: "ct",
  order: "created_at DESC",
  fields: [
    { col: "city", key: "city" },
    { col: "count", key: "count" },               // number of properties in this city
    { col: "color", key: "color" },               // pie-slice colour
  ],
};

export const COLLABS = {
  table: "collaborations",
  prefix: "cl",
  order: "created_at DESC",
  fields: [
    { col: "company_name", key: "companyName" },
    { col: "company_location", key: "companyLocation" },
    { col: "owner_name", key: "ownerName" },
    { col: "company_email", key: "companyEmail" },
    { col: "company_phone", key: "companyPhone" },
    { col: "owner_phone", key: "ownerPhone" },
    { col: "details", key: "details" },
    { col: "replied", key: "replied" },
    { col: "stage", key: "stage" },                 // contacted|pending|agreed|rejected
    { col: "offer_type", key: "offerType" },
    { col: "offer_amount", key: "offerAmount" },
    { col: "offer_unit", key: "offerUnit" },        // % or a currency code
    { col: "offer_valid_type", key: "offerValidType" }, // unending|until
    { col: "offer_valid_until", key: "offerValidUntil" },
    { col: "agreed_at", key: "agreedAt" },
    { col: "rejected_at", key: "rejectedAt" },
  ],
};

export const ACTIVITY = {
  table: "activity_days",
  prefix: "ac",
  order: "day DESC",
  fields: [
    { col: "user_id", key: "userId" },
    { col: "user_name", key: "userName" },
    { col: "day", key: "day" },
  ],
};

export const ASSETS = {
  table: "assets",
  prefix: "as",
  order: "created_at DESC",
  fields: [
    { col: "folder_id", key: "folderId" },
    { col: "name", key: "name" },
    { col: "url", key: "url" },
    { col: "type", key: "type" },
    { col: "size", key: "size" },
    { col: "r2_key", key: "r2Key" },
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
    { col: "social", key: "social" },
    { col: "registered_by", key: "registeredBy" },
    { col: "stage", key: "stage" },
    { col: "priority", key: "priority" },
    { col: "community", key: "community" },
    { col: "contact_log", key: "contactLog", json: true },
    { col: "notes", key: "notes" },
    { col: "status", key: "status" },
  ],
};
