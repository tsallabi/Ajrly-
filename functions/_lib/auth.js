/* ============================================================
   Ajrly OS — Cloud API: Auth, sessions, password hashing (WS-A)
   Web Crypto only. Passwords: PBKDF2-HMAC-SHA-256 + per-user salt.
   Sessions: random token in KV (sess:<token> -> {userId}) w/ TTL.
   ============================================================ */

import { first } from "./db.js";

const COOKIE_NAME = "ajrly_sess";
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days, seconds
const PBKDF2_ITER = 100000;

/* ---- helpers ---- */
const enc = new TextEncoder();

function toHex(buf) {
  const b = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, "0");
  return s;
}

function randHex(bytes = 16) {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)));
}

/* ---- password hashing ---- */
export function newSalt() {
  return randHex(16);
}

/* PBKDF2(SHA-256) -> hex. Falls back to plain SHA-256 only if the
   PBKDF2 path is unavailable (shouldn't happen on Workers runtime). */
export async function hashPassword(pw, salt) {
  const password = String(pw == null ? "" : pw);
  const s = String(salt == null ? "" : salt);
  try {
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: enc.encode(s), iterations: PBKDF2_ITER, hash: "SHA-256" },
      key, 256
    );
    return "pbkdf2$" + toHex(bits);
  } catch (_) {
    const buf = await crypto.subtle.digest("SHA-256", enc.encode(s + "::" + password));
    return "sha256$" + toHex(buf);
  }
}

/* Constant-time-ish string compare for hashes. */
export function safeEqual(a, b) {
  a = String(a || ""); b = String(b || "");
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ---- cookies ---- */
function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return null;
}

export function sessionToken(request) {
  return readCookie(request, COOKIE_NAME);
}

export function sessionCookie(token) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL}`;
}

export function clearCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

/* ---- sessions ---- */
export async function createSession(env, userId) {
  const token = randHex(24);
  await env.KV.put("sess:" + token, JSON.stringify({ userId }), { expirationTtl: SESSION_TTL });
  return token;
}

export async function destroySession(env, token) {
  if (token) await env.KV.delete("sess:" + token);
}

/* Resolve the current request to a user row (or null). Reads the
   session cookie -> KV -> userId -> D1 users row. Inactive users
   are treated as not logged in. */
export async function getUser(request, env) {
  const token = sessionToken(request);
  if (!token) return null;
  let raw;
  try { raw = await env.KV.get("sess:" + token); } catch (_) { return null; }
  if (!raw) return null;
  let userId;
  try { userId = JSON.parse(raw).userId; } catch (_) { return null; }
  if (!userId) return null;
  const user = await first(env, "SELECT * FROM users WHERE id = ?", userId);
  if (!user || !user.active) return null;
  return user;
}

/* ---- role capabilities (mirrors the contract role table) ---- */
const PERMS = {
  admin:   { manageUsers: true,  write: true,  assign: true,  del: true,  monitorOthers: true },
  manager: { manageUsers: false, write: true,  assign: true,  del: true,  monitorOthers: true },
  member:  { manageUsers: false, write: true,  assign: false, del: false, monitorOthers: false },
  viewer:  { manageUsers: false, write: false, assign: false, del: false, monitorOthers: false },
};

export function can(user, action) {
  if (!user) return false;
  const p = PERMS[user.role] || PERMS.viewer;
  return !!p[action];
}

/* Strip secrets before returning a user to the client. NEVER send
   pass_hash or salt over the wire. */
export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: !!u.active,
    monitor_level: u.monitor_level || "standard",
    tz: u.tz || null,
    created_at: u.created_at || null,
  };
}

export { COOKIE_NAME, SESSION_TTL };
