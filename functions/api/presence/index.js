/* ============================================================
   Ajrly OS — /api/presence  (KV-backed live presence)     [WS-B]
   ------------------------------------------------------------
   Durable-Object-free presence so the Live Ops Room works with the
   already-provisioned D1 + KV bindings (the PresenceRoom DO cannot be
   enabled — the Pages build rejects its migration).

   POST /api/presence  { active, taskId, section }
     Writes the caller's heartbeat to KV under `pres:<userId>` with a
     short TTL, accumulates today's active seconds, and returns the
     current roster. Identity is ALWAYS taken from the session — the
     client's body never carries identity.

   GET /api/presence
     Returns the live roster (everyone seen within the idle window).

   PRIVACY: only a boolean `active`, the current task id and the app
   section are stored. Never keystrokes, coordinates or screenshots.
   ============================================================ */
import { getUser } from "../../_lib/auth.js";
import { json, bad, unauthorized, noContent, serverError } from "../../_lib/response.js";

const PRES_TTL = 75;            // seconds a heartbeat stays "live" in KV
const ONLINE_MS = 60_000;       // active + seen within 60s → online
const IDLE_MS = 150_000;        // seen within 150s → idle; older is dropped
const BEAT_SEC = 30;            // assumed active span credited per active beat
const MIN_TTL = 60 * 60 * 36;   // daily active-seconds counter lifetime

const today = () => new Date().toISOString().slice(0, 10);
const minKey = (id) => `presmin:${id}:${today()}`;

/* Collect every live heartbeat into the roster shape the Live Ops Room
   cards expect (status / currentTask / activeMinutes …). Uses KV list
   metadata so it's one list call, no per-key gets in the common case. */
async function roster(env) {
  const out = [];
  const now = Date.now();
  let cursor;
  do {
    const page = await env.KV.list({ prefix: "pres:", cursor });
    for (const k of page.keys) {
      let rec = k.metadata;
      if (!rec) {
        const raw = await env.KV.get(k.name);
        if (raw) { try { rec = JSON.parse(raw); } catch (_) { rec = null; } }
      }
      if (!rec || !rec.userId) continue;
      const age = now - (rec.ts || 0);
      if (age > IDLE_MS) continue; // expired but not yet evicted
      const status = (rec.active && age < ONLINE_MS) ? "online" : "idle";
      out.push({
        userId: rec.userId,
        name: rec.name || "",
        role: rec.role || "member",
        status,
        currentTask: rec.taskId || "",
        section: rec.section || "",
        activeMinutes: rec.activeMinutes || 0,
        monitor: rec.monitor || "standard",
      });
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return out;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env || !env.KV) return bad("presence_unavailable", 503);
  let user; try { user = await getUser(request, env); } catch (_) { user = null; }
  if (!user || !user.id) return unauthorized();
  try { return json({ ok: true, users: await roster(env) }); }
  catch (e) { return serverError(e); }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env || !env.KV) return bad("presence_unavailable", 503);
  let user; try { user = await getUser(request, env); } catch (_) { user = null; }
  if (!user || !user.id) return unauthorized();

  let body = {};
  try { body = await request.json(); } catch (_) { body = {}; }
  const active = !!body.active;

  // Accumulate today's active seconds. Only the user writes their own
  // counter, so the read-add-write has no cross-writer race.
  let activeMinutes = 0;
  try {
    const mk = minKey(user.id);
    let secs = 0;
    const raw = await env.KV.get(mk);
    if (raw) { const n = parseInt(raw, 10); if (!Number.isNaN(n)) secs = n; }
    if (active) { secs += BEAT_SEC; await env.KV.put(mk, String(secs), { expirationTtl: MIN_TTL }); }
    activeMinutes = Math.round(secs / 60);
  } catch (_) { /* metric is best-effort */ }

  const rec = {
    userId: user.id,
    name: user.name || user.id,
    role: user.role || "member",
    monitor: user.monitor_level || "standard",
    active,
    taskId: String(body.taskId || ""),
    section: String(body.section || ""),
    activeMinutes,
    ts: Date.now(),
  };
  try {
    await env.KV.put("pres:" + user.id, JSON.stringify(rec), { expirationTtl: PRES_TTL, metadata: rec });
    return json({ ok: true, self: rec, users: await roster(env) });
  } catch (e) { return serverError(e); }
}

export function onRequestOptions() { return noContent(); }
