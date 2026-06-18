/* ============================================================
   Ajrly OS — Cloud <-> local cache bridge (WS-A)
   Mirrors cloud data into the existing in-memory `db` (from data.js)
   so all current synchronous views keep working unchanged. Does NOT
   edit data.js. Everything is a guarded no-op when cloud is off.

   Usage (coordinator wires this in app.js boot — see WS-A summary):
     import cloud from "./cloud.js";
     import { hydrateFromCloud, wireWriteThrough } from "./dataCloud.js";
     if (await cloud.detect()) { await hydrateFromCloud(db); render(); }
   ============================================================ */

import cloud from "./cloud.js";

/* Must match data.js STORE_KEY so hydrated data survives reloads and
   the existing local views read the same shape. */
const STORE_KEY = "ajrly_os_v1";

/* Replace the contents of db arrays *in place* so existing references
   held by views stay valid, then persist to the same localStorage key
   data.js uses. */
function replaceInPlace(arr, next) {
  if (!Array.isArray(arr)) return;
  arr.length = 0;
  for (const x of next) arr.push(x);
}

function persistSnapshot(db) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      tasks: db.tasks, content: db.content, owners: db.owners,
    }));
  } catch (_) { /* ignore quota/availability */ }
}

/* Pull /api/sync and mirror tasks/content/owners into db. Returns the
   raw pull payload (incl. users) so callers can use the team list.
   On failure throws (caller should fall back to local + keep going). */
export async function hydrateFromCloud(db) {
  if (!cloud.isCloud()) return null; // guarded no-op when cloud off
  const data = await cloud.pull();
  replaceInPlace(db.tasks, data.tasks);
  replaceInPlace(db.content, data.content);
  replaceInPlace(db.owners, data.owners);
  persistSnapshot(db);
  return data;
}

/* Optional: make db mutators write-through to the cloud. We wrap the
   existing methods so local optimistic update happens first (instant
   UI), then the server call runs; on success the server row is merged
   back (authoritative id/timestamps). On cloud error we keep the local
   change (offline-tolerant) and surface the error via onError.
   Idempotent: safe to call once after hydrate. No-op when cloud off. */
export function wireWriteThrough(db, onError) {
  if (!cloud.isCloud()) return false;
  if (db.__cloudWired) return true;

  const report = (e) => { try { onError && onError(e); } catch (_) {} };
  const findById = (arr, id) => arr.find((x) => x && x.id === id);
  const mergeServerRow = (arr, localId, row) => {
    if (!row) return;
    const it = findById(arr, localId);
    if (it) Object.assign(it, row);
    persistSnapshot(db);
  };

  const wrap = (name, fn) => {
    const orig = db[name].bind(db);
    db[name] = (...args) => { const r = orig(...args); try { fn(...args); } catch (e) { report(e); } return r; };
  };

  /* Creates: data.js assigns a local uid then unshift/push. After the
     local add, send to cloud and replace the local row with the server
     row (the just-added item is the newest). */
  const newest = (arr) => arr[0] || arr[arr.length - 1];

  wrap("addTask", (t) => {
    const local = db.tasks[0]; // addTask unshifts
    cloud.createTask(t).then((row) => mergeServerRow(db.tasks, local && local.id, row)).catch(report);
  });
  wrap("updateTask", (id, patch) => {
    cloud.updateTask(id, patch).then((row) => mergeServerRow(db.tasks, id, row)).catch(report);
  });
  wrap("removeTask", (id) => { cloud.removeTask(id).catch(report); });

  wrap("addContent", (c) => {
    const local = newest(db.content);
    cloud.createContent(c).then((row) => mergeServerRow(db.content, local && local.id, row)).catch(report);
  });
  wrap("updateContent", (id, patch) => {
    cloud.updateContent(id, patch).then((row) => mergeServerRow(db.content, id, row)).catch(report);
  });
  wrap("removeContent", (id) => { cloud.removeContent(id).catch(report); });

  wrap("addOwner", (o) => {
    const local = newest(db.owners);
    cloud.createOwner(o).then((row) => mergeServerRow(db.owners, local && local.id, row)).catch(report);
  });
  wrap("updateOwner", (id, patch) => {
    cloud.updateOwner(id, patch).then((row) => mergeServerRow(db.owners, id, row)).catch(report);
  });
  wrap("removeOwner", (id) => { cloud.removeOwner(id).catch(report); });

  try { Object.defineProperty(db, "__cloudWired", { value: true, enumerable: false }); } catch (_) {}
  return true;
}

export default { hydrateFromCloud, wireWriteThrough };
