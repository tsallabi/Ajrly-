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
      tasks: db.tasks, content: db.content, owners: db.owners, finance: db.finance,
      assetFolders: db.assetFolders, assets: db.assets, activity: db.activity,
      contentPosts: db.contentPosts, contentOpts: db.contentOpts, notebook: db.notebook,
      collabs: db.collabs, budgets: db.budgets, cityTargets: db.cityTargets,
    }));
  } catch (_) { /* ignore quota/availability */ }
}

/* Pull /api/sync and mirror tasks/content/owners into db. Returns the
   raw pull payload (incl. users) so callers can use the team list.
   On failure throws (caller should fall back to local + keep going). */
/* Merge server rows into local WITHOUT losing locally-created rows. The server
   row wins on id conflicts (latest edits), but any local row whose id the server
   doesn't have is kept — so a refresh never deletes data that was logged locally
   but hasn't reached the backend yet (e.g. the first hydrate after cloud turns
   on, or a write that failed). Returns a fresh array (caller replaceInPlace's). */
function mergeById(local, server) {
  if (!Array.isArray(server)) return Array.isArray(local) ? local.slice() : [];
  const serverIds = new Set(server.map((r) => r && r.id));
  const localOnly = (local || []).filter((r) => r && r.id && !serverIds.has(r.id));
  return [...localOnly, ...server]; // local-only (newest, unsynced) on top
}

export async function hydrateFromCloud(db) {
  if (!cloud.isCloud()) return null; // guarded no-op when cloud off
  const data = await cloud.pull();
  // snapshot the local copy before any merge so a bad sync is always recoverable
  try { if (db.backup) db.backup("before-sync"); } catch (_) {}
  // Preserve live task-timer fields the backend may not store yet. When the
  // timer_start / time_log columns aren't migrated, the server omits them
  // (key absent → undefined); restoring the local value keeps a running task
  // timer alive across a refresh instead of stopping it and zeroing the total.
  const timerSnap = {};
  (db.tasks || []).forEach((tk) => { if (tk && tk.id) timerSnap[tk.id] = { timerStart: tk.timerStart, timeLog: tk.timeLog, timerBy: tk.timerBy }; });
  replaceInPlace(db.tasks, mergeById(db.tasks, data.tasks));
  db.tasks.forEach((tk) => {
    const s = timerSnap[tk.id]; if (!s) return;
    if (tk.timerStart === undefined && s.timerStart !== undefined) tk.timerStart = s.timerStart;
    if (tk.timeLog === undefined && s.timeLog !== undefined) tk.timeLog = s.timeLog;
    if (tk.timerBy === undefined && s.timerBy !== undefined) tk.timerBy = s.timerBy;
  });
  replaceInPlace(db.content, mergeById(db.content, data.content));
  replaceInPlace(db.owners, mergeById(db.owners, data.owners));
  // optional tables: only merge when the server actually sent them, so a
  // missing/not-yet-migrated table never wipes the local copy on refresh.
  if (Array.isArray(data.finance)) replaceInPlace(db.finance, mergeById(db.finance, data.finance));
  if (Array.isArray(data.assetFolders)) replaceInPlace(db.assetFolders, mergeById(db.assetFolders, data.assetFolders));
  if (Array.isArray(data.assets)) replaceInPlace(db.assets, mergeById(db.assets, data.assets));
  if (Array.isArray(data.activity)) replaceInPlace(db.activity, mergeById(db.activity, data.activity));
  if (Array.isArray(data.contentPosts)) replaceInPlace(db.contentPosts, mergeById(db.contentPosts, data.contentPosts));
  if (Array.isArray(data.contentOpts)) replaceInPlace(db.contentOpts, mergeById(db.contentOpts, data.contentOpts));
  if (Array.isArray(data.notebook)) replaceInPlace(db.notebook, mergeById(db.notebook, data.notebook));
  if (Array.isArray(data.collabs)) replaceInPlace(db.collabs, mergeById(db.collabs, data.collabs));
  if (Array.isArray(data.budgets)) replaceInPlace(db.budgets, mergeById(db.budgets, data.budgets));
  if (Array.isArray(data.cityTargets)) replaceInPlace(db.cityTargets, mergeById(db.cityTargets, data.cityTargets));
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
  const rerender = () => { try { if (window.AjrlyOS && window.AjrlyOS.render) window.AjrlyOS.render(); } catch (_) {} };
  const findById = (arr, id) => arr.find((x) => x && x.id === id);
  const mergeServerRow = (arr, localId, row) => {
    if (!row) return;
    const it = findById(arr, localId);
    if (it) {
      // when the server assigns a new id (after a create), the rendered DOM
      // still references the temporary local id — re-render so edit/delete/
      // timer buttons point at the authoritative id.
      const idChanged = row.id && row.id !== it.id;
      Object.assign(it, row);
      persistSnapshot(db);
      if (idChanged) rerender();
    } else {
      persistSnapshot(db);
    }
  };

  const wrap = (name, fn) => {
    const orig = db[name].bind(db);
    db[name] = (...args) => { const r = orig(...args); try { fn(...args); } catch (e) { report(e); } return r; };
  };

  /* Self-heal: if an update targets a row the server doesn't have (a stale/
     local id left over from an earlier mis-link), recreate it there from the
     full local record and relink the id — so edits (city, stage, …) actually
     persist instead of being wiped on the next hydrate. */
  const notFound = (e) => e && (e.status === 404 || e.code === "notfound" || e.code === "http_404");
  const recreateOnServer = (createFn, arr, id) => {
    const full = findById(arr, id);
    if (full) createFn(full).then((created) => mergeServerRow(arr, id, created)).catch(report);
  };

  /* Creates: data.js assigns a local uid then unshift/push. After the local
     add, send to cloud and replace the local row with the server row.
     `newest` is for stores that UNSHIFT (new item at index 0). Stores that
     PUSH (owners, content — and notebook) must instead take the LAST element,
     otherwise the server id/fields get merged onto the wrong row and the new
     record never links to its server copy (causing dup rows / fields reverting
     on the next hydrate). */
  const newest = (arr) => arr[0];
  const lastAdded = (arr) => arr[arr.length - 1];

  wrap("addTask", (t) => {
    const local = db.tasks[0]; // addTask unshifts
    cloud.createTask(t).then((row) => mergeServerRow(db.tasks, local && local.id, row)).catch(report);
  });
  wrap("updateTask", (id, patch) => {
    cloud.updateTask(id, patch).then((row) => mergeServerRow(db.tasks, id, row)).catch(report);
  });
  wrap("removeTask", (id) => { cloud.removeTask(id).catch(report); });

  wrap("addContent", (c) => {
    const local = lastAdded(db.content); // addContent pushes
    cloud.createContent(c).then((row) => mergeServerRow(db.content, local && local.id, row)).catch(report);
  });
  wrap("updateContent", (id, patch) => {
    cloud.updateContent(id, patch).then((row) => mergeServerRow(db.content, id, row)).catch(report);
  });
  wrap("removeContent", (id) => { cloud.removeContent(id).catch(report); });

  wrap("addOwner", (o) => {
    const local = lastAdded(db.owners); // addOwner pushes
    cloud.createOwner(o).then((row) => mergeServerRow(db.owners, local && local.id, row)).catch(report);
  });
  wrap("updateOwner", (id, patch) => {
    cloud.updateOwner(id, patch)
      .then((row) => { if (row) mergeServerRow(db.owners, id, row); else recreateOnServer(cloud.createOwner, db.owners, id); })
      .catch((e) => { if (notFound(e)) recreateOnServer(cloud.createOwner, db.owners, id); else report(e); });
  });
  wrap("removeOwner", (id) => { cloud.removeOwner(id).catch(report); });

  wrap("addFinance", (f) => {
    const local = newest(db.finance);
    cloud.createFinance(f).then((row) => mergeServerRow(db.finance, local && local.id, row)).catch(report);
  });
  wrap("updateFinance", (id, patch) => {
    cloud.updateFinance(id, patch).then((row) => mergeServerRow(db.finance, id, row)).catch(report);
  });
  wrap("removeFinance", (id) => { cloud.removeFinance(id).catch(report); });

  wrap("addAssetFolder", (f) => {
    const local = newest(db.assetFolders);
    cloud.createAssetFolder(f).then((row) => mergeServerRow(db.assetFolders, local && local.id, row)).catch(report);
  });
  wrap("updateAssetFolder", (id, patch) => {
    cloud.updateAssetFolder(id, patch).then((row) => mergeServerRow(db.assetFolders, id, row)).catch(report);
  });
  wrap("removeAssetFolder", (id) => { cloud.removeAssetFolder(id).catch(report); });

  wrap("addAsset", (a) => {
    const local = newest(db.assets);
    cloud.createAsset(a).then((row) => mergeServerRow(db.assets, local && local.id, row)).catch(report);
  });
  wrap("updateAsset", (id, patch) => {
    cloud.updateAsset(id, patch).then((row) => mergeServerRow(db.assets, id, row)).catch(report);
  });
  wrap("removeAsset", (id) => { cloud.removeAsset(id).catch(report); });

  wrap("addActivity", (a) => {
    const local = newest(db.activity);
    cloud.createActivity(a).then((row) => mergeServerRow(db.activity, local && local.id, row)).catch(report);
  });

  wrap("addContentPost", (p) => {
    const local = newest(db.contentPosts);
    cloud.createContentPost(p).then((row) => mergeServerRow(db.contentPosts, local && local.id, row)).catch(report);
  });
  wrap("updateContentPost", (id, patch) => {
    cloud.updateContentPost(id, patch).then((row) => mergeServerRow(db.contentPosts, id, row)).catch(report);
  });
  wrap("removeContentPost", (id) => { cloud.removeContentPost(id).catch(report); });

  wrap("addContentOpt", (o) => {
    const local = newest(db.contentOpts);
    cloud.createContentOpt(o).then((row) => mergeServerRow(db.contentOpts, local && local.id, row)).catch(report);
  });
  wrap("updateContentOpt", (id, patch) => {
    cloud.updateContentOpt(id, patch).then((row) => mergeServerRow(db.contentOpts, id, row)).catch(report);
  });
  wrap("removeContentOpt", (id) => { cloud.removeContentOpt(id).catch(report); });

  wrap("addNotebookPage", (p) => {
    const local = db.notebook[db.notebook.length - 1]; // addNotebookPage appends
    cloud.createNotebookPage(p).then((row) => mergeServerRow(db.notebook, local && local.id, row)).catch(report);
  });
  wrap("updateNotebookPage", (id, patch) => {
    cloud.updateNotebookPage(id, patch).then((row) => mergeServerRow(db.notebook, id, row)).catch(report);
  });
  wrap("removeNotebookPage", (id) => { cloud.removeNotebookPage(id).catch(report); });

  wrap("addCollab", (c) => {
    const local = newest(db.collabs);
    cloud.createCollab(c).then((row) => mergeServerRow(db.collabs, local && local.id, row)).catch(report);
  });
  wrap("updateCollab", (id, patch) => {
    cloud.updateCollab(id, patch).then((row) => mergeServerRow(db.collabs, id, row)).catch(report);
  });
  wrap("removeCollab", (id) => { cloud.removeCollab(id).catch(report); });

  wrap("addBudget", (b) => {
    const local = newest(db.budgets);
    cloud.createBudget(b).then((row) => mergeServerRow(db.budgets, local && local.id, row)).catch(report);
  });
  wrap("updateBudget", (id, patch) => {
    cloud.updateBudget(id, patch).then((row) => mergeServerRow(db.budgets, id, row)).catch(report);
  });
  wrap("removeBudget", (id) => { cloud.removeBudget(id).catch(report); });

  wrap("addCityTarget", (c) => {
    const local = newest(db.cityTargets);
    cloud.createCityTarget(c).then((row) => mergeServerRow(db.cityTargets, local && local.id, row)).catch(report);
  });
  wrap("updateCityTarget", (id, patch) => {
    cloud.updateCityTarget(id, patch).then((row) => mergeServerRow(db.cityTargets, id, row)).catch(report);
  });
  wrap("removeCityTarget", (id) => { cloud.removeCityTarget(id).catch(report); });

  try { Object.defineProperty(db, "__cloudWired", { value: true, enumerable: false }); } catch (_) {}
  return true;
}

export default { hydrateFromCloud, wireWriteThrough };
