/* ============================================================
   Ajrly OS — Remote data adapter (Supabase)
   Async mirror of the localStorage `db` API in data.js.
   Maps snake_case (Postgres) <-> camelCase (app shapes).

   This is a PARALLEL adapter — data.js is untouched. The
   coordinator can swap the app onto this layer; see
   docs/INTEGRATION-backend.md for wiring.

   Every method is null-safe: when Supabase is not configured the
   list methods resolve to [] and mutations resolve to null, so
   callers can fall back to the local db.
   ============================================================ */

import { getSupabase, isConfigured } from "./supabaseClient.js";

export { isConfigured };

/* ---------------- field mappers ---------------- */

function rowToTask(r) {
  return {
    id: r.id,
    title: r.title || "",
    description: r.description || "",
    priority: r.priority || "Medium",
    status: r.status || "pending",
    assignedBy: r.assigned_by || "",
    delegateTo: r.delegate_to || "",
    dueDate: r.due_date || "",
    duration: r.duration || "",
    date: r.date || "",
    notes: r.notes || "",
  };
}
function taskToRow(t) {
  const row = {};
  if ("title" in t) row.title = t.title;
  if ("description" in t) row.description = t.description;
  if ("priority" in t) row.priority = t.priority;
  if ("status" in t) row.status = t.status;
  if ("assignedBy" in t) row.assigned_by = t.assignedBy;
  if ("delegateTo" in t) row.delegate_to = t.delegateTo;
  if ("dueDate" in t) row.due_date = emptyToNull(t.dueDate);
  if ("duration" in t) row.duration = t.duration;
  if ("date" in t) row.date = emptyToNull(t.date);
  if ("notes" in t) row.notes = t.notes;
  return row;
}

function rowToContent(r) {
  return {
    id: r.id,
    day: r.day || "",
    date: r.date || "",
    goal: r.goal || "",
    platform: Array.isArray(r.platform) ? r.platform : [],
    pillar: r.pillar || "",
    type: r.type || "",
    description: r.description || "",
    hook: r.hook || "",
    caption: r.caption || "",
    time: r.time || "",
    budget: r.budget || "",
  };
}
function contentToRow(c) {
  const row = {};
  if ("day" in c) row.day = c.day;
  if ("date" in c) row.date = emptyToNull(c.date);
  if ("goal" in c) row.goal = c.goal;
  if ("platform" in c) row.platform = Array.isArray(c.platform) ? c.platform : [];
  if ("pillar" in c) row.pillar = c.pillar;
  if ("type" in c) row.type = c.type;
  if ("description" in c) row.description = c.description;
  if ("hook" in c) row.hook = c.hook;
  if ("caption" in c) row.caption = c.caption;
  if ("time" in c) row.time = c.time;
  if ("budget" in c) row.budget = c.budget;
  return row;
}

function rowToOwner(r) {
  return {
    id: r.id,
    name: r.name || "",
    phone: r.phone || "",
    email: r.email || "",
    listings: r.listings ?? 0,
    lastContact: r.last_contact || "",
    stage: r.stage || "recruitment",
    notes: r.notes || "",
    status: r.status || "",
  };
}
function ownerToRow(o) {
  const row = {};
  if ("name" in o) row.name = o.name;
  if ("phone" in o) row.phone = o.phone;
  if ("email" in o) row.email = o.email;
  if ("listings" in o) row.listings = numOrNull(o.listings);
  if ("lastContact" in o) row.last_contact = emptyToNull(o.lastContact);
  if ("stage" in o) row.stage = o.stage;
  if ("notes" in o) row.notes = o.notes;
  if ("status" in o) row.status = o.status;
  return row;
}

const emptyToNull = (v) => (v === "" || v === undefined ? null : v);
const numOrNull = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

/* ---------------- low-level helpers ---------------- */

async function stampCreatedBy(sb, row) {
  // Best-effort: stamp created_by so member RLS works on insert.
  try {
    const { data } = await sb.auth.getUser();
    if (data && data.user) row.created_by = data.user.id;
  } catch (e) { /* ignore */ }
  return row;
}

async function selectAll(table, mapper, orderCol) {
  const sb = await getSupabase();
  if (!sb) return [];
  let q = sb.from(table).select("*");
  if (orderCol) q = q.order(orderCol, { ascending: false });
  const { data, error } = await q;
  if (error) { console.error(`[Ajrly] ${table} select:`, error.message); return []; }
  return (data || []).map(mapper);
}

async function insertRow(table, row, mapper) {
  const sb = await getSupabase();
  if (!sb) return null;
  await stampCreatedBy(sb, row);
  const { data, error } = await sb.from(table).insert(row).select().single();
  if (error) { console.error(`[Ajrly] ${table} insert:`, error.message); throw error; }
  return mapper(data);
}

async function updateRow(table, id, row, mapper) {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from(table).update(row).eq("id", id).select().single();
  if (error) { console.error(`[Ajrly] ${table} update:`, error.message); throw error; }
  return mapper(data);
}

async function deleteRow(table, id) {
  const sb = await getSupabase();
  if (!sb) return false;
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) { console.error(`[Ajrly] ${table} delete:`, error.message); throw error; }
  return true;
}

/* ---------------- public async API ---------------- */
/* Mirrors db.* from data.js but every method returns a Promise. */

export const dbRemote = {
  isConfigured,

  // Tasks
  listTasks() { return selectAll("tasks", rowToTask, "created_at"); },
  addTask(t)  { return insertRow("tasks", taskToRow(t), rowToTask); },
  updateTask(id, patch) { return updateRow("tasks", id, taskToRow(patch), rowToTask); },
  removeTask(id) { return deleteRow("tasks", id); },

  // Content
  listContent() { return selectAll("content_posts", rowToContent, "date"); },
  addContent(c) { return insertRow("content_posts", contentToRow(c), rowToContent); },
  updateContent(id, patch) { return updateRow("content_posts", id, contentToRow(patch), rowToContent); },
  removeContent(id) { return deleteRow("content_posts", id); },

  // Owners
  listOwners() { return selectAll("owners", rowToOwner, "created_at"); },
  addOwner(o) { return insertRow("owners", ownerToRow(o), rowToOwner); },
  updateOwner(id, patch) { return updateRow("owners", id, ownerToRow(patch), rowToOwner); },
  removeOwner(id) { return deleteRow("owners", id); },

  /** Convenience: load all three collections at once. */
  async loadAll() {
    const [tasks, content, owners] = await Promise.all([
      this.listTasks(), this.listContent(), this.listOwners(),
    ]);
    return { tasks, content, owners };
  },
};

export default dbRemote;
