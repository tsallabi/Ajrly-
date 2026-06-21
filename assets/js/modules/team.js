/* ============================================================
   Ajrly OS — Live Ops Room (team presence + monitoring)  [WS-B]
   ------------------------------------------------------------
   Routed module (#/team). Self-registers via registry.js.
   Shows every team member as a live card:
     • avatar + name + role
     • status dot 🟢online / 🟡idle / ⚪offline (pulse on online)
     • "working on: <task>"
     • active-minutes today
     • today's completed task count (from window.AjrlyOS.db.tasks)
     • avg response (if available from cache)
   Admin-only: escalate a user's monitor_level standard↔extended
   (PATCH /api/users/:id) behind a clear confirm. Viewing an
   extended user shows their privacy-respecting activity timeline.

   Realtime comes from assets/js/presence.js (window.AjrlyPresence).
   If presence is not connected (local mode) we fall back to a
   "cloud not enabled" note and render static cards.
   ============================================================ */
import { registerModule } from "../registry.js";
import { registerStrings, t, getLang } from "../i18n.js";

/* ---------------- i18n ---------------- */
registerStrings({
  ar: {
    "nav.team": "غرفة العمليات",
    "page.team": "غرفة العمليات الحية",
    "page.team.sub": "تواجد الفريق في الوقت الحقيقي ومؤشّرات الأداء",
    "team.live": "مباشر",
    "team.offline.title": "السحابة غير مفعّلة",
    "team.offline.body": "التواجد الحي يحتاج وضع السحابة. تُعرض بيانات ثابتة حالياً.",
    "team.st.online": "متصل",
    "team.st.idle": "خامل",
    "team.st.offline": "غير متصل",
    "team.working": "يعمل على",
    "team.idleNow": "لا توجد مهمة حالية",
    "team.activeMin": "دقائق نشطة اليوم",
    "team.doneToday": "أُنجزت اليوم",
    "team.avgResp": "متوسط الرد",
    "team.min": "د",
    "team.monitor.standard": "مراقبة قياسية",
    "team.monitor.extended": "مراقبة موسّعة",
    "team.monitor.toExtended": "ترقية إلى مراقبة موسّعة",
    "team.monitor.toStandard": "إرجاع إلى مراقبة قياسية",
    "team.monitor.confirmExt":
      "ترقية «{name}» إلى مراقبة موسّعة؟ سيُسجَّل خطّ زمني للنشاط/الخمول والتركيز والقسم — بدون ضغطات مفاتيح أو مؤشّر فأرة أو لقطات شاشة. سيُعرض للموظف إشعار إفصاح لمرة واحدة (مطلوب وفق اللائحة العامة لحماية البيانات).",
    "team.monitor.confirmStd": "إرجاع «{name}» إلى المراقبة القياسية؟",
    "team.monitor.done": "تم تحديث مستوى المراقبة",
    "team.monitor.err": "تعذّر تحديث مستوى المراقبة",
    "team.timeline.title": "الخطّ الزمني للنشاط (مراقبة موسّعة)",
    "team.timeline.empty": "لا توجد أحداث بعد",
    "team.timeline.privacy": "نسجّل النشاط/الخمول والتركيز والقسم فقط — أبداً ضغطات المفاتيح أو الإحداثيات أو لقطات الشاشة.",
    "team.view": "عرض",
    "team.empty": "لا يوجد أعضاء في الفريق بعد",
    "act.active": "نشط", "act.idle": "خامل", "act.focus": "تركيز",
    "act.blur": "خروج", "act.login": "دخول", "act.logout": "خروج",
    "act.task_done": "إنجاز مهمة", "act.ticket_reply": "ردّ تذكرة",
  },
  en: {
    "nav.team": "Ops Room",
    "page.team": "Live Ops Room",
    "page.team.sub": "Real-time team presence and performance signals",
    "team.live": "Live",
    "team.offline.title": "Cloud not enabled",
    "team.offline.body": "Live presence needs cloud mode. Showing static data for now.",
    "team.st.online": "Online",
    "team.st.idle": "Idle",
    "team.st.offline": "Offline",
    "team.working": "Working on",
    "team.idleNow": "No current task",
    "team.activeMin": "Active minutes today",
    "team.doneToday": "Done today",
    "team.avgResp": "Avg response",
    "team.min": "m",
    "team.monitor.standard": "Standard monitoring",
    "team.monitor.extended": "Extended monitoring",
    "team.monitor.toExtended": "Upgrade to extended monitoring",
    "team.monitor.toStandard": "Revert to standard monitoring",
    "team.monitor.confirmExt":
      "Upgrade \"{name}\" to extended monitoring? An active/idle, focus and app-section timeline will be recorded — no keystrokes, mouse coordinates or screenshots. The employee will see a one-time disclosure notice (required for GDPR).",
    "team.monitor.confirmStd": "Revert \"{name}\" to standard monitoring?",
    "team.monitor.done": "Monitoring level updated",
    "team.monitor.err": "Could not update monitoring level",
    "team.timeline.title": "Activity timeline (extended monitoring)",
    "team.timeline.empty": "No events yet",
    "team.timeline.privacy": "We record only active/idle, focus and app-section — never keystrokes, coordinates or screenshots.",
    "team.view": "View",
    "team.empty": "No team members yet",
    "act.active": "Active", "act.idle": "Idle", "act.focus": "Focus",
    "act.blur": "Blur", "act.login": "Login", "act.logout": "Logout",
    "act.task_done": "Task done", "act.ticket_reply": "Ticket reply",
  },
});

/* ---------------- helpers ---------------- */
const OS = () => window.AjrlyOS || {};
const P = () => window.AjrlyPresence || null;
const esc = (s) => (OS().esc ? OS().esc(s) : String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));
const initials = (s) => String(s || "?").trim().slice(0, 2).toUpperCase();
const nf = (n) => Number(n || 0).toLocaleString(getLang() === "ar" ? "ar-EG" : "en-GB");
const todayISO = () => new Date().toISOString().slice(0, 10);

let viewingUserId = null;   // user whose extended timeline is open
let timelineCache = {};     // userId -> rows
let unsub = null;           // presence subscription cleanup
let presenceSubscribed = false; // subscribe to presence only once (avoids render recursion)
let rerenderTimer = null;

/* The roster of users to show. In cloud mode WS-A mirrors /api/users
   into a cache; we look in a few likely places, then fall back to the
   local auth users, then to seed TEAM names. Each entry: {id,name,role,monitor_level}. */
function roster() {
  const os = OS();
  // 1) explicit users array on the cache (cloud)
  if (os.db && Array.isArray(os.db.users) && os.db.users.length) {
    return os.db.users.map(normUser);
  }
  // 2) a users() accessor if WS-A exposed one
  if (typeof os.users === "function") {
    try { const u = os.users(); if (Array.isArray(u) && u.length) return u.map(normUser); } catch (_) {}
  }
  // 3) current user at least
  if (typeof os.currentUser === "function") {
    try { const me = os.currentUser(); if (me) return [normUser(me)]; } catch (_) {}
  }
  // 4) seed names
  const TEAM = os.TEAM || [];
  return TEAM.map((name, i) => ({ id: "seed" + i, name, role: "member", monitor_level: "standard" }));
}
function normUser(u) {
  return {
    id: u.id || u.user_id || u.email || u.name,
    name: u.name || u.email || u.id,
    role: u.role || "member",
    monitor_level: u.monitor_level || u.monitor || "standard",
  };
}

/* presence record for a user (match by id, then by name) */
function presenceFor(user, live) {
  return live.find(p => p.userId === user.id) ||
    live.find(p => (p.name || "").toLowerCase() === (user.name || "").toLowerCase()) ||
    null;
}

/* tasks completed today, attributed to a user by name (local cache uses names) */
function doneToday(user) {
  const tasks = (OS().db && OS().db.tasks) || [];
  const td = todayISO();
  return tasks.filter(x =>
    x.status === "complete" &&
    (x.delegateTo === user.name || x.assignedBy === user.name) &&
    ((x.date || x.dueDate || "").slice(0, 10) === td)
  ).length;
}

/* avg first-response (CS) in minutes from cache tickets, if present */
function avgResponse(user) {
  const tickets = (OS().db && OS().db.tickets) || [];
  const mine = tickets.filter(tk =>
    (tk.assignee === user.id || tk.assignee === user.name) &&
    tk.first_response_at && tk.created_at);
  if (!mine.length) return null;
  const sum = mine.reduce((a, tk) => {
    const d = (new Date(tk.first_response_at) - new Date(tk.created_at)) / 60000;
    return a + (isFinite(d) && d >= 0 ? d : 0);
  }, 0);
  return Math.round(sum / mine.length);
}

/* ---------------- card ---------------- */
const STATUS_LABEL = { online: "team.st.online", idle: "team.st.idle", offline: "team.st.offline" };

function card(user, live, isAdmin) {
  const p = presenceFor(user, live);
  const status = (p && p.status) || "offline";
  const task = p && p.currentTask ? p.currentTask : "";
  const mins = p ? p.activeMinutes : 0;
  const done = doneToday(user);
  const resp = avgResponse(user);
  const ext = user.monitor_level === "extended";

  const taskLine = task
    ? `<div class="team-card__task" title="${esc(task)}">▶ ${esc(t("team.working"))}: ${esc(task)}</div>`
    : `<div class="team-card__task muted">${esc(t("team.idleNow"))}</div>`;

  const stats = `<div class="team-card__stats">
    <div class="team-stat"><span class="team-stat__v">${nf(mins)}</span><span class="team-stat__l">${esc(t("team.activeMin"))}</span></div>
    <div class="team-stat"><span class="team-stat__v">${nf(done)}</span><span class="team-stat__l">${esc(t("team.doneToday"))}</span></div>
    ${resp != null ? `<div class="team-stat"><span class="team-stat__v">${nf(resp)}${esc(t("team.min"))}</span><span class="team-stat__l">${esc(t("team.avgResp"))}</span></div>` : ""}
  </div>`;

  const monitorBadge = ext
    ? `<span class="team-badge team-badge--ext">🔒 ${esc(t("team.monitor.extended"))}</span>`
    : `<span class="team-badge">${esc(t("team.monitor.standard"))}</span>`;

  let controls = "";
  if (isAdmin) {
    controls = ext
      ? `<button class="btn btn--ghost btn--sm" data-mon="standard" data-uid="${esc(user.id)}" data-name="${esc(user.name)}">${esc(t("team.monitor.toStandard"))}</button>`
      : `<button class="btn btn--ghost btn--sm" data-mon="extended" data-uid="${esc(user.id)}" data-name="${esc(user.name)}">${esc(t("team.monitor.toExtended"))}</button>`;
  }
  const viewTl = ext
    ? `<button class="btn btn--ghost btn--sm" data-tl="${esc(user.id)}">📈 ${esc(t("team.view"))}</button>`
    : "";

  return `<div class="card team-card">
    <div class="team-card__top">
      <div class="team-card__avatar">${esc(initials(user.name))}</div>
      <div style="min-width:0">
        <div class="team-card__name">${esc(user.name)}</div>
        <div class="team-card__role">${esc(t("role." + user.role) || user.role)}</div>
      </div>
    </div>
    <div class="team-card__status">
      <span class="pdot pdot--${status}"></span>${esc(t(STATUS_LABEL[status]))}
    </div>
    ${taskLine}
    ${stats}
    <div class="team-card__foot">
      ${monitorBadge}
      <span class="flex" style="gap:6px">${viewTl}${controls}</span>
    </div>
  </div>`;
}

/* ---------------- extended timeline ---------------- */
const TL_KIND = {
  active: "act.active", idle: "act.idle", focus: "act.focus", blur: "act.blur",
  login: "act.login", logout: "act.logout", task_done: "act.task_done", ticket_reply: "act.ticket_reply",
};
function fmtTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return esc(iso || "");
  return d.toLocaleTimeString(getLang() === "ar" ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit" });
}
function timelinePanel(user) {
  const rows = timelineCache[user.id] || [];
  const body = rows.length
    ? `<div class="team-timeline">${rows.map(r => `
        <div class="tl-row">
          <span class="tl-row__time">${fmtTime(r.ts)}</span>
          <span class="tl-row__dot tl-row__dot--${esc(r.kind)}"></span>
          <span class="tl-row__kind">${esc(t(TL_KIND[r.kind]) || r.kind)}${r.section ? ` · ${esc(r.section)}` : ""}</span>
        </div>`).join("")}</div>`
    : `<div class="empty"><div class="empty__icon">🕒</div><p class="muted">${esc(t("team.timeline.empty"))}</p></div>`;
  return `<div class="card" style="margin-top:16px">
    <div class="card__head">
      <span class="card__title">🔒 ${esc(t("team.timeline.title"))} — ${esc(user.name)}</span>
      <button class="btn btn--ghost btn--sm" data-tlclose>✕</button>
    </div>
    <p class="muted" style="font-size:12px;margin-bottom:10px">${esc(t("team.timeline.privacy"))}</p>
    ${body}
  </div>`;
}

/* fetch timeline rows for an extended user (cloud only); no-op otherwise */
async function loadTimeline(userId) {
  try {
    const res = await fetch(`/api/activity?user=${encodeURIComponent(userId)}&limit=60`, {
      credentials: "include",
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rows = Array.isArray(data) ? data : (data.rows || data.activity || []);
    return rows.map(r => ({
      ts: r.ts || r.created_at,
      kind: r.kind,
      section: (() => { try { return r.meta ? (JSON.parse(r.meta).section || "") : ""; } catch (_) { return ""; } })(),
    }));
  } catch (_) { return []; }
}

/* ---------------- view ---------------- */
function view() {
  const pres = P();
  const live = pres ? pres.getPresence() : [];
  const connected = pres ? pres.isConnected() : false;
  const isAdmin = typeof OS().can === "function" ? OS().can("manageUsers") : false;
  const list = roster();

  const header = `<div class="toolbar">
    <div class="toolbar__left">
      ${connected
        ? `<span class="live-pill"><span class="live-pill__dot"></span>${esc(t("team.live"))}</span>`
        : `<span class="team-cloud-note">⚪ ${esc(t("team.offline.title"))}</span>`}
    </div>
  </div>`;

  const note = connected ? "" : `<div class="card team-cloud-note" style="margin-bottom:14px">
    <span class="empty__icon" style="font-size:22px">☁️</span>
    <div><b>${esc(t("team.offline.title"))}</b><div class="muted">${esc(t("team.offline.body"))}</div></div>
  </div>`;

  const cards = list.length
    ? `<div class="team-grid">${list.map(u => card(u, live, isAdmin)).join("")}</div>`
    : `<div class="card"><div class="empty"><div class="empty__icon">👥</div><p class="muted">${esc(t("team.empty"))}</p></div></div>`;

  let tl = "";
  if (viewingUserId) {
    const u = list.find(x => x.id === viewingUserId);
    if (u && u.monitor_level === "extended") tl = timelinePanel(u);
  }

  return `<div>${header}${note}${cards}${tl}</div>`;
}

/* ---------------- mount ---------------- */
function mount(ctx) {
  const reRender = () => (ctx && ctx.render ? ctx.render() : (OS().render && OS().render()));
  const $$ = (s) => [...document.querySelectorAll(s)];

  // Live updates: subscribe to presence ONCE (onPresence fires immediately and
  // mount runs on every render, so re-subscribing here would recurse infinitely
  // → "Maximum call stack size exceeded"). Debounce + only re-render on #/team.
  const pres = P();
  if (pres && !presenceSubscribed) {
    presenceSubscribed = true;
    pres.onPresence(() => {
      if ((location.hash.replace("#/", "") || "") !== "team") return;
      clearTimeout(rerenderTimer);
      rerenderTimer = setTimeout(() => { try { (OS().render || (() => {}))(); } catch (_) {} }, 250);
    });
  }

  // admin: escalate / de-escalate monitor level
  $$("[data-mon]").forEach(btn => {
    btn.onclick = async () => {
      const level = btn.dataset.mon;
      const uid = btn.dataset.uid;
      const name = btn.dataset.name || "";
      const key = level === "extended" ? "team.monitor.confirmExt" : "team.monitor.confirmStd";
      const msg = t(key).replace("{name}", name);
      if (!confirm(msg)) return;
      const ok = await patchMonitor(uid, level);
      if (OS().toast) OS().toast(t(ok ? "team.monitor.done" : "team.monitor.err"));
      reRender();
    };
  });

  // open extended timeline
  $$("[data-tl]").forEach(btn => {
    btn.onclick = async () => {
      viewingUserId = btn.dataset.tl;
      timelineCache[viewingUserId] = await loadTimeline(viewingUserId);
      reRender();
    };
  });
  const close = document.querySelector("[data-tlclose]");
  if (close) close.onclick = () => { viewingUserId = null; reRender(); };
}

/* PATCH /api/users/:id { monitor_level }. Updates the local cache
   optimistically too so the badge flips even before the next sync. */
async function patchMonitor(userId, level) {
  // optimistic cache update
  const os = OS();
  if (os.db && Array.isArray(os.db.users)) {
    const u = os.db.users.find(x => (x.id || x.user_id) === userId);
    if (u) u.monitor_level = level;
  }
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monitor_level: level }),
    });
    return res.ok;
  } catch (_) {
    // local mode: no API — keep the optimistic change so the UI still works.
    return true;
  }
}

/* ---------------- register ---------------- */
registerModule({
  id: "team",
  icon: "🟢",
  labelKey: "nav.team",
  titleKey: "page.team",
  subKey: "page.team.sub",
  order: 15,
  view,
  mount,
});
