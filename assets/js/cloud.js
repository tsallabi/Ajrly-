/* ============================================================
   Ajrly OS — Cloud client driver (WS-A)
   Talks to the Pages Functions API. Detects cloud mode via
   /api/health; mirrors data via /api/sync; write-through helpers
   POST/PATCH/DELETE and return the server row. On any network /
   501 / non-ok response it throws a typed CloudError so callers can
   fall back to local mode. All fetches use credentials:'include'.
   Pure Web APIs — safe to import even when the backend is absent.
   ============================================================ */

const HEALTH_TIMEOUT = 2500; // ms

export class CloudError extends Error {
  constructor(code, status) {
    super(code || "cloud_error");
    this.name = "CloudError";
    this.code = code || "cloud_error";
    this.status = status || 0;
  }
}

let _cloud = null; // cached detection result (null = unknown)

function withTimeout(ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(t) };
}

/* Core fetch wrapper: always include cookies, parse JSON, normalize
   errors into CloudError. 501 (Not Implemented / no bindings) and any
   network failure are treated as "cloud unavailable". */
async function api(path, { method = "GET", body, timeout } = {}) {
  let to = null;
  const init = {
    method,
    credentials: "include",
    headers: {},
  };
  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  if (timeout) { to = withTimeout(timeout); init.signal = to.signal; }

  let res;
  try {
    res = await fetch(path, init);
  } catch (e) {
    if (to) to.clear();
    throw new CloudError("network", 0);
  }
  if (to) to.clear();

  if (res.status === 501) throw new CloudError("not_implemented", 501);

  let data = null;
  try { data = await res.json(); } catch (_) { data = null; }

  if (!res.ok) {
    const code = (data && data.error) || ("http_" + res.status);
    throw new CloudError(code, res.status);
  }
  return data == null ? {} : data;
}

/* ---- detection ---- */
export function isCloud() { return _cloud === true; }

export async function detect() {
  try {
    const data = await api("/api/health", { timeout: HEALTH_TIMEOUT });
    // cloud is "on" only when the backend is actually provisioned (D1+KV bound)
    _cloud = !!(data && data.ok && data.ready);
  } catch (_) {
    _cloud = false;
  }
  return _cloud;
}

/* ---- auth ---- */
export async function me() {
  const data = await api("/api/auth/me");
  return data.user || null;
}
export async function login(email, password) {
  const data = await api("/api/auth/login", { method: "POST", body: { email, password } });
  return data.user || null;
}
export async function register(name, email, password) {
  const data = await api("/api/auth/register", { method: "POST", body: { name, email, password } });
  return data.user || null;
}
export async function logout() {
  await api("/api/auth/logout", { method: "POST" });
  return true;
}

/* ---- users (admin/manager) ---- */
export async function listUsers() {
  const data = await api("/api/users");
  return data.users || [];
}
export async function createUser(payload) {
  const data = await api("/api/users", { method: "POST", body: payload });
  return data.user || null;
}
export async function updateUser(id, patch) {
  const data = await api("/api/users/" + encodeURIComponent(id), { method: "PATCH", body: patch });
  return data.user || null;
}
export async function removeUser(id) {
  await api("/api/users/" + encodeURIComponent(id), { method: "DELETE" });
  return true;
}

/* ---- bulk pull (cache fill) ---- */
export async function pull() {
  const data = await api("/api/sync");
  return {
    tasks: data.tasks || [],
    content: data.content || [],
    owners: data.owners || [],
    finance: data.finance,             // may be undefined (table absent) — caller guards
    assetFolders: data.assetFolders,
    assets: data.assets,
    activity: data.activity,
    contentPosts: data.contentPosts,
    contentOpts: data.contentOpts,
    notebook: data.notebook,
    users: data.users || [],
    ts: data.ts || Date.now(),
  };
}

/* ---- generic write-through, returns the server row ---- */
function makeCrud(resource) {
  const base = "/api/" + resource;
  return {
    create: async (payload) => (await api(base, { method: "POST", body: payload })).item || null,
    update: async (id, patch) =>
      (await api(base + "/" + encodeURIComponent(id), { method: "PATCH", body: patch })).item || null,
    remove: async (id) => {
      await api(base + "/" + encodeURIComponent(id), { method: "DELETE" });
      return true;
    },
  };
}

const _tasks = makeCrud("tasks");
const _content = makeCrud("content");
const _owners = makeCrud("owners");
const _finance = makeCrud("finance");
const _assetFolders = makeCrud("assets/folders");
const _assets = makeCrud("assets");
const _activity = makeCrud("activity");
const _contentPosts = makeCrud("content-posts");
const _contentOpts = makeCrud("content-opts");
const _notebook = makeCrud("notebook");

/* Tasks */
export const createTask = (p) => _tasks.create(p);
export const updateTask = (id, p) => _tasks.update(id, p);
export const removeTask = (id) => _tasks.remove(id);
/* Content */
export const createContent = (p) => _content.create(p);
export const updateContent = (id, p) => _content.update(id, p);
export const removeContent = (id) => _content.remove(id);
/* Owners */
export const createOwner = (p) => _owners.create(p);
export const updateOwner = (id, p) => _owners.update(id, p);
export const removeOwner = (id) => _owners.remove(id);
/* Finance */
export const createFinance = (p) => _finance.create(p);
export const updateFinance = (id, p) => _finance.update(id, p);
export const removeFinance = (id) => _finance.remove(id);
/* Business Assets — folders + link items */
export const createAssetFolder = (p) => _assetFolders.create(p);
export const updateAssetFolder = (id, p) => _assetFolders.update(id, p);
export const removeAssetFolder = (id) => _assetFolders.remove(id);
export const createAsset = (p) => _assets.create(p);
export const updateAsset = (id, p) => _assets.update(id, p);
export const removeAsset = (id) => _assets.remove(id);
/* Activity (attendance days) — create only */
export const createActivity = (p) => _activity.create(p);
/* Owner content calendar — posts + editable options/links */
export const createContentPost = (p) => _contentPosts.create(p);
export const updateContentPost = (id, p) => _contentPosts.update(id, p);
export const removeContentPost = (id) => _contentPosts.remove(id);
export const createContentOpt = (p) => _contentOpts.create(p);
export const updateContentOpt = (id, p) => _contentOpts.update(id, p);
export const removeContentOpt = (id) => _contentOpts.remove(id);
/* Notebook pages */
export const createNotebookPage = (p) => _notebook.create(p);
export const updateNotebookPage = (id, p) => _notebook.update(id, p);
export const removeNotebookPage = (id) => _notebook.remove(id);

/* Clean default export for ergonomic importing. */
const cloud = {
  CloudError,
  isCloud, detect,
  me, login, register, logout,
  listUsers, createUser, updateUser, removeUser,
  pull,
  createTask, updateTask, removeTask,
  createContent, updateContent, removeContent,
  createOwner, updateOwner, removeOwner,
  createFinance, updateFinance, removeFinance,
  createAssetFolder, updateAssetFolder, removeAssetFolder,
  createAsset, updateAsset, removeAsset,
  createActivity,
  createContentPost, updateContentPost, removeContentPost,
  createContentOpt, updateContentOpt, removeContentOpt,
  createNotebookPage, updateNotebookPage, removeNotebookPage,
};
export default cloud;
