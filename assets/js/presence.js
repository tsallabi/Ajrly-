/* ============================================================
   Ajrly OS — Presence client (live heartbeat)            [WS-B]
   ------------------------------------------------------------
   Keeps the "Live Ops Room" fed with near-real-time presence by
   polling /api/presence (KV-backed). No WebSocket / Durable Object —
   the heartbeat is a plain POST every BEAT_MS that also returns the
   current roster; we merge our own record in so the caller sees
   themselves online immediately.

   PRIVACY (hard rules):
     • We derive a single `active` BOOLEAN from mousemove/keydown/
       scroll/click within the last 30s. We store NOTHING else.
     • NEVER mouse coordinates, key values, scroll positions,
       screenshots or page content. Only true/false leaves the tab.

   Public API (window.AjrlyPresence):
     start({ getToken? })  — begin (idempotent); call after login.
     stop()                — close + clear timers (call on logout).
     onPresence(cb)        — subscribe; cb(usersArray). returns unsub.
     onNotify(cb)          — subscribe to {body,link} notifications.
     getPresence()         — last known users array (sync).
     isConnected()         — boolean.
     setMonitorDisclosure(level) — show one-time GDPR banner if
                              the current user is under extended.

   Degrades gracefully: if the API is unreachable (local mode) every
   getter returns empty and the UI falls back to a "cloud not enabled"
   note. Never throws into the app.
   ============================================================ */

const BEAT_MS = 20_000;          // POST a heartbeat (and refresh roster) every 20s
const ACTIVE_WINDOW_MS = 30_000; // "active" if input within last 30s
const STALE_MS = 65_000;         // no successful beat within this → disconnected

const state = {
  started: false,
  wantOpen: false,
  connected: false,
  lastInput: 0,
  lastBeatOk: 0,
  beatTimer: null,
  inFlight: false,
  users: [],
  taskId: "",
  presenceSubs: new Set(),
  notifySubs: new Set(),
  self: null,
};

/* ---------------- input activity (boolean only) ---------------- */
function markActive() { state.lastInput = Date.now(); }
function isActive() { return Date.now() - state.lastInput < ACTIVE_WINDOW_MS; }

function bindActivityListeners() {
  // passive listeners; we read only the *timestamp*, never the event data.
  const opts = { passive: true, capture: true };
  ["mousemove", "keydown", "scroll", "click", "touchstart"].forEach((ev) =>
    window.addEventListener(ev, markActive, opts)
  );
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") { markActive(); beat(); }
  });
  window.addEventListener("focus", () => { markActive(); beat(); });
}

/* ---------------- current route → section ---------------- */
function currentSection() {
  return (location.hash || "#/dashboard").replace(/^#\//, "").split("?")[0] || "dashboard";
}

/* ---------------- heartbeat (POST → roster) ---------------- */
async function beat() {
  if (!state.wantOpen || state.inFlight) return;
  state.inFlight = true;
  try {
    const res = await fetch("/api/presence", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: isActive(), taskId: state.taskId || "", section: currentSection() }),
    });
    if (!res.ok) throw new Error("hb_" + res.status);
    const data = await res.json();
    state.connected = true;
    state.lastBeatOk = Date.now();
    state.self = data.self || state.self;
    applyRoster(Array.isArray(data.users) ? data.users : []);
    // GDPR: disclose once if this user is under extended monitoring.
    if (state.self && state.self.monitor === "extended") setMonitorDisclosure("extended");
  } catch (_) {
    if (Date.now() - state.lastBeatOk > STALE_MS) state.connected = false;
  } finally {
    state.inFlight = false;
  }
}

/* Merge our own record into the roster (KV list is eventually
   consistent, so a fresh self-beat may not be listed yet). */
function applyRoster(users) {
  const merged = users.slice();
  if (state.self && state.self.userId) {
    const i = merged.findIndex((u) => u.userId === state.self.userId);
    const mine = {
      userId: state.self.userId, name: state.self.name, role: state.self.role,
      status: state.self.active ? "online" : "idle",
      currentTask: state.self.taskId || "", section: state.self.section || "",
      activeMinutes: state.self.activeMinutes || 0, monitor: state.self.monitor || "standard",
    };
    if (i >= 0) merged[i] = mine; else merged.push(mine);
  }
  state.users = merged;
  emitPresence();
}

function startBeating() {
  stopBeating();
  beat(); // immediate first beat
  state.beatTimer = setInterval(beat, BEAT_MS);
}
function stopBeating() {
  if (state.beatTimer) { clearInterval(state.beatTimer); state.beatTimer = null; }
}

function emitPresence() {
  state.presenceSubs.forEach((cb) => { try { cb(state.users); } catch (_) {} });
}

/* ---------------- GDPR one-time disclosure banner ---------------- */
const DISCLOSURE_KEY = "ajrly_monitor_consent_v1";

function setMonitorDisclosure(level) {
  if (level !== "extended") return;
  try { if (localStorage.getItem(DISCLOSURE_KEY) === "ack") return; } catch (_) {}
  if (document.getElementById("ajrly-monitor-banner")) return;

  const ar = (localStorage.getItem("ajrly_lang") || "ar") === "ar";
  const title = ar ? "إشعار مراقبة موسّعة" : "Extended monitoring notice";
  const body = ar
    ? "فعّل المدير مراقبة موسّعة لحسابك: يُسجَّل خطّ زمني للنشاط/الخمول والتركيز والقسم المستخدم لأغراض قياس الأداء. لا يتم تسجيل ضغطات المفاتيح أو مؤشّر الفأرة أو لقطات الشاشة إطلاقاً."
    : "Your admin enabled extended monitoring: an active/idle, focus and app-section timeline is recorded for performance metrics. No keystrokes, mouse coordinates or screenshots are ever captured.";
  const ok = ar ? "فهمت" : "I understand";

  const el = document.createElement("div");
  el.id = "ajrly-monitor-banner";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-live", "polite");
  el.style.cssText =
    "position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;" +
    "background:var(--surface,#fff);color:var(--text,#111);border:1px solid var(--border,#e5e7eb);" +
    "border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.18);padding:16px 18px;font-size:13.5px;line-height:1.7";
  el.innerHTML =
    `<div style="font-weight:700;margin-bottom:6px">🔒 ${title}</div>` +
    `<div style="opacity:.85;margin-bottom:12px">${body}</div>` +
    `<div style="text-align:${ar ? "left" : "right"}">` +
    `<button id="ajrly-monitor-ok" style="cursor:pointer;border:none;border-radius:10px;padding:8px 16px;` +
    `background:var(--brand,#2563eb);color:#fff;font-weight:600">${ok}</button></div>`;
  document.body.appendChild(el);
  const btn = el.querySelector("#ajrly-monitor-ok");
  if (btn) btn.onclick = () => {
    try { localStorage.setItem(DISCLOSURE_KEY, "ack"); } catch (_) {}
    el.remove();
  };
}

/* ---------------- public API ---------------- */
function start(opts) {
  opts = opts || {};
  if (!state.started) { bindActivityListeners(); state.started = true; }
  state.wantOpen = true;
  markActive();
  startBeating();
}

function stop() {
  state.wantOpen = false;
  stopBeating();
  state.connected = false;
}

function onPresence(cb) {
  if (typeof cb !== "function") return () => {};
  state.presenceSubs.add(cb);
  // fire immediately with what we have
  try { cb(state.users); } catch (_) {}
  return () => state.presenceSubs.delete(cb);
}

function onNotify(cb) {
  if (typeof cb !== "function") return () => {};
  state.notifySubs.add(cb);
  return () => state.notifySubs.delete(cb);
}

function getPresence() { return state.users.slice(); }
function isConnected() { return state.connected && (Date.now() - state.lastBeatOk < STALE_MS); }
function setTask(taskId) { state.taskId = String(taskId || ""); beat(); }

const AjrlyPresence = {
  start, stop, onPresence, onNotify, getPresence,
  isConnected, setTask, setMonitorDisclosure,
};

// expose globally for non-module callers (modules/team.js, app.js boot hook)
try { window.AjrlyPresence = AjrlyPresence; } catch (_) {}

export default AjrlyPresence;
export { start, stop, onPresence, onNotify, getPresence, isConnected, setTask, setMonitorDisclosure };
