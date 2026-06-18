/* ============================================================
   Ajrly OS — Self-contained Auth, Users, Roles & Permissions
   100% local (localStorage + Web Crypto). NO backend required.
   - First registered user becomes the system Admin (owner).
   - Passwords are salted + SHA-256 hashed (never stored in plain text).
   - Roles: admin | manager | member | viewer.
   ============================================================ */

const USERS_KEY = "ajrly_users_v1";
const SESSION_KEY = "ajrly_session_v1";

export const ROLES = ["admin", "manager", "member", "viewer"];

/* Capability matrix per role */
const PERMS = {
  admin:   { manageUsers: true,  write: true,  assign: true,  del: true,  settings: true },
  manager: { manageUsers: false, write: true,  assign: true,  del: true,  settings: true },
  member:  { manageUsers: false, write: true,  assign: false, del: false, settings: false },
  viewer:  { manageUsers: false, write: false, assign: false, del: false, settings: false },
};

/* ---------- storage ---------- */
function load() { try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch (e) { return []; } }
function save(list) { try { localStorage.setItem(USERS_KEY, JSON.stringify(list)); } catch (e) {} }
const uid = () => "u" + Math.random().toString(36).slice(2, 9);
const norm = (e) => String(e || "").trim().toLowerCase();

/* ---------- password hashing (Web Crypto, with graceful fallback) ---------- */
function genSalt() { return Math.random().toString(36).slice(2, 14); }
async function hashPw(pw, salt) {
  const data = new TextEncoder().encode(salt + "::" + pw);
  if (crypto && crypto.subtle && crypto.subtle.digest) {
    const buf = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback (non-secure contexts): simple string hash so the app still works.
  let h = 0; const s = salt + "::" + pw;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return "f" + (h >>> 0).toString(16);
}

/* ---------- session ---------- */
function setSession(userId) { try { localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, ts: Date.now() })); } catch (e) {} }
export function logout() { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} }
export function currentUser() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (!s) return null;
    const u = load().find(x => x.id === s.userId);
    return (u && u.active) ? u : null;
  } catch (e) { return null; }
}

/* ---------- queries ---------- */
export function users() { return load(); }
export function hasUsers() { return load().length > 0; }
export function role() { const u = currentUser(); return u ? u.role : null; }
export function can(action, user) {
  user = user || currentUser();
  if (!user) return false;
  const p = PERMS[user.role] || PERMS.viewer;
  return !!p[action];
}
export function publicUser(u) { return u ? { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active } : null; }

/* ---------- auth flows ---------- */
export async function register({ name, email, password, role: r }) {
  const list = load();
  name = (name || "").trim(); email = norm(email);
  if (!name || !email || !password) return { error: "missing" };
  if (password.length < 4) return { error: "weak" };
  if (list.some(u => u.email === email)) return { error: "exists" };
  const salt = genSalt();
  const passHash = await hashPw(password, salt);
  const isFirst = list.length === 0;
  const user = {
    id: uid(), name, email, salt, passHash,
    role: isFirst ? "admin" : (ROLES.includes(r) ? r : "member"),
    active: true, createdAt: new Date().toISOString(),
  };
  list.push(user); save(list); setSession(user.id);
  return { user };
}

export async function login(email, password) {
  email = norm(email);
  const u = load().find(x => x.email === email);
  if (!u) return { error: "invalid" };
  if (!u.active) return { error: "disabled" };
  const h = await hashPw(password, u.salt);
  if (h !== u.passHash) return { error: "invalid" };
  setSession(u.id);
  return { user: u };
}

/* ---------- admin user management ---------- */
export async function addUser({ name, email, password, role: r }) {
  // Like register but never logs in / never auto-admin.
  const list = load();
  name = (name || "").trim(); email = norm(email);
  if (!name || !email || !password) return { error: "missing" };
  if (list.some(u => u.email === email)) return { error: "exists" };
  const salt = genSalt();
  const passHash = await hashPw(password, salt);
  const user = { id: uid(), name, email, salt, passHash, role: ROLES.includes(r) ? r : "member", active: true, createdAt: new Date().toISOString() };
  list.push(user); save(list);
  return { user };
}

export function updateUser(id, patch) {
  const list = load();
  const i = list.findIndex(u => u.id === id);
  if (i < 0) return { error: "notfound" };
  // protect: keep at least one active admin
  const next = { ...list[i], ...patch };
  if ((list[i].role === "admin") && (patch.role && patch.role !== "admin" || patch.active === false)) {
    const otherAdmins = list.filter(u => u.id !== id && u.role === "admin" && u.active);
    if (!otherAdmins.length) return { error: "lastadmin" };
  }
  list[i] = next; save(list);
  return { user: next };
}

export async function setPassword(id, password) {
  if (!password || password.length < 4) return { error: "weak" };
  const list = load();
  const i = list.findIndex(u => u.id === id);
  if (i < 0) return { error: "notfound" };
  const salt = genSalt();
  list[i] = { ...list[i], salt, passHash: await hashPw(password, salt) };
  save(list);
  return { user: list[i] };
}

export function removeUser(id) {
  const list = load();
  const u = list.find(x => x.id === id);
  if (!u) return { error: "notfound" };
  if (u.role === "admin") {
    const otherAdmins = list.filter(x => x.id !== id && x.role === "admin" && x.active);
    if (!otherAdmins.length) return { error: "lastadmin" };
  }
  save(list.filter(x => x.id !== id));
  return { ok: true };
}

/* Names for assignment dropdowns (active users) */
export function teamNames() { return load().filter(u => u.active).map(u => u.name); }
