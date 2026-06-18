/* ============================================================
   Ajrly OS — Presence client (live heartbeat)            [WS-B]
   ------------------------------------------------------------
   Opens a WebSocket to /api/realtime after login and keeps the
   "Live Ops Room" fed with real-time presence.

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

   Degrades gracefully: if the WS never connects (local mode), every
   getter returns empty and the UI falls back to a "cloud not enabled"
   note. Never throws into the app.
   ============================================================ */

const HEARTBEAT_MS = 30_000;     // send hb every 30s
const ACTIVE_WINDOW_MS = 30_000; // "active" if input within last 30s
const MAX_BACKOFF_MS = 30_000;

const state = {
  ws: null,
  started: false,
  wantOpen: false,
  connected: false,
  lastInput: 0,
  hbTimer: null,
  backoff: 1000,
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
    if (document.visibilityState === "visible") { markActive(); sendFocus("focus"); }
    else sendFocus("blur");
  });
  window.addEventListener("focus", () => sendFocus("focus"));
  window.addEventListener("blur", () => sendFocus("blur"));
}

/* ---------------- current route → taskId/section ---------------- */
function currentSection() {
  return (location.hash || "#/dashboard").replace(/^#\//, "").split("?")[0] || "dashboard";
}

/* ---------------- socket ---------------- */
function wsURL() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/api/realtime`;
}

function connect() {
  if (!state.wantOpen) return;
  if (state.ws && (state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING)) return;

  let ws;
  try { ws = new WebSocket(wsURL()); } catch (_) { scheduleReconnect(); return; }
  state.ws = ws;

  ws.addEventListener("open", () => {
    state.connected = true;
    state.backoff = 1000;
    markActive();
    sendHeartbeat();        // immediate first beat
    startHeartbeat();
  });

  ws.addEventListener("message", (ev) => {
    let msg = null;
    try { msg = JSON.parse(ev.data); } catch (_) { return; }
    handleMessage(msg);
  });

  ws.addEventListener("close", () => {
    state.connected = false;
    stopHeartbeat();
    scheduleReconnect();
  });
  ws.addEventListener("error", () => {
    try { ws.close(); } catch (_) {}
  });
}

function scheduleReconnect() {
  if (!state.wantOpen) return;
  const delay = state.backoff;
  state.backoff = Math.min(MAX_BACKOFF_MS, Math.round(state.backoff * 1.8));
  setTimeout(connect, delay);
}

function send(obj) {
  const ws = state.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  try { ws.send(JSON.stringify(obj)); } catch (_) {}
}

function sendHeartbeat() {
  send({ type: "hb", active: isActive(), taskId: state.taskId || "", section: currentSection() });
}
function sendFocus(kind) { send({ type: kind }); }

function startHeartbeat() {
  stopHeartbeat();
  state.hbTimer = setInterval(sendHeartbeat, HEARTBEAT_MS);
}
function stopHeartbeat() {
  if (state.hbTimer) { clearInterval(state.hbTimer); state.hbTimer = null; }
}

/* ---------------- message handling ---------------- */
function handleMessage(msg) {
  if (!msg || typeof msg.type !== "string") return;
  if (msg.type === "hello") {
    state.self = msg.self || null;
    if (Array.isArray(msg.users)) { state.users = msg.users; emitPresence(); }
    // GDPR: if this user is under extended monitoring, disclose once.
    if (state.self && state.self.monitor === "extended") {
      setMonitorDisclosure("extended");
    }
    return;
  }
  if (msg.type === "presence" && Array.isArray(msg.users)) {
    state.users = msg.users;
    emitPresence();
    return;
  }
  if (msg.type === "notify") {
    state.notifySubs.forEach((cb) => { try { cb(msg); } catch (_) {} });
    return;
  }
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
  state.backoff = 1000;
  connect();
}

function stop() {
  state.wantOpen = false;
  stopHeartbeat();
  if (state.ws) { try { state.ws.close(); } catch (_) {} state.ws = null; }
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
function isConnected() { return state.connected; }
function setTask(taskId) { state.taskId = String(taskId || ""); sendHeartbeat(); }

const AjrlyPresence = {
  start, stop, onPresence, onNotify, getPresence,
  isConnected, setTask, setMonitorDisclosure,
};

// expose globally for non-module callers (modules/team.js, app.js boot hook)
try { window.AjrlyPresence = AjrlyPresence; } catch (_) {}

export default AjrlyPresence;
export { start, stop, onPresence, onNotify, getPresence, isConnected, setTask, setMonitorDisclosure };
