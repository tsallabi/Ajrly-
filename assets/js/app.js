/* ============================================================
   Ajrly OS — Application core (router + views)
   ============================================================ */
import { db, PILLARS, CORE_VALUES, GOALS, TEAM, OWNER_STAGES, LINKS } from "./data.js";
import { t, getLang, setLang, registerStrings } from "./i18n.js";
import { moduleRoutes } from "./registry.js";
import { currentUser, hasUsers, login, register, logout, can, teamNames } from "./auth.js";
/* Feature modules (self-register via registry). Order = nav order. */
/* Feature modules are imported only here, so a ?v= stamp busts their cache on
   each deploy without breaking shared-module identity. Bump alongside index.html. */
import "./modules/finance.js?v=49";
import "./modules/ownerContent.js?v=49";
import "./modules/assets.js?v=49";
import "./modules/account.js?v=49";
import "./modules/team.js?v=49";
import "./modules/performance.js?v=49";
import cloud from "./cloud.js";
import { hydrateFromCloud, wireWriteThrough } from "./dataCloud.js";
import AjrlyPresence from "./presence.js"; // also sets window.AjrlyPresence

/* ---------------- Helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const initials = (n) => (n || "?").trim().charAt(0).toUpperCase();

const STATUS_KEYS = { pending: "st.pending", progress: "st.progress", complete: "st.complete", overdue: "st.overdue", closed: "st.closed" };
const statusBadge = (s) => `<span class="badge badge--${s}">${esc(t(STATUS_KEYS[s] || "st.pending"))}</span>`;
const priChip = (p) => `<span class="pri pri--${(p || "Low").toLowerCase()}">${esc(t("pr." + (p || "Low")))}</span>`;

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return esc(iso);
  return d.toLocaleDateString(getLang() === "ar" ? "ar-EG" : "en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function daysLeft(iso) {
  if (!iso) return null;
  const d = new Date(iso), now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}

let searchQuery = "";

/* ---- Auth / permissions helpers ---- */
registerStrings({
  ar: {
    "auth.welcome": "منظومة أجرلي", "auth.login": "تسجيل الدخول", "auth.register": "إنشاء حساب",
    "auth.email": "البريد الإلكتروني", "auth.password": "كلمة المرور", "auth.name": "الاسم الكامل",
    "auth.haveAccount": "لديك حساب؟ سجّل الدخول", "auth.noAccount": "ليس لديك حساب؟ أنشئ واحداً",
    "auth.firstNote": "أول حساب يُنشأ سيكون «المدير العام» للمنظومة.",
    "auth.err.invalid": "بريد أو كلمة مرور غير صحيحة", "auth.err.exists": "هذا البريد مسجّل مسبقاً",
    "auth.err.missing": "أكمل جميع الحقول", "auth.err.weak": "كلمة المرور قصيرة جداً (4 أحرف على الأقل)",
    "auth.err.disabled": "هذا الحساب معطّل — راجع المدير", "auth.signedIn": "مرحباً بك 👋",
    "auth.logout": "خروج", "auth.readonly": "صلاحية العرض فقط — لا يمكنك التعديل",
  },
  en: {
    "auth.welcome": "Ajrly OS", "auth.login": "Sign in", "auth.register": "Create account",
    "auth.email": "Email", "auth.password": "Password", "auth.name": "Full name",
    "auth.haveAccount": "Have an account? Sign in", "auth.noAccount": "No account? Create one",
    "auth.firstNote": "The first account created becomes the system Admin.",
    "auth.err.invalid": "Invalid email or password", "auth.err.exists": "This email is already registered",
    "auth.err.missing": "Fill all fields", "auth.err.weak": "Password too short (min 4 chars)",
    "auth.err.disabled": "This account is disabled — contact your admin", "auth.signedIn": "Welcome 👋",
    "auth.logout": "Sign out", "auth.readonly": "Viewer role — you can't edit",
  },
});

/* ---- Tasks: tabs + per-task work timer ---- */
registerStrings({
  ar: {
    "tab.all": "الكل", "empty.tasks": "لا توجد مهام في هذا التبويب",
    "timer.col": "وقت العمل", "timer.start": "بدء المؤقّت", "timer.stop": "إيقاف المؤقّت",
    "timer.running": "قيد التشغيل", "timer.tracked": "الوقت المسجّل",
    "timer.locked": "اكتملت المهمة — لا يمكن إضافة وقت",
    "pf.m.hours": "ساعات العمل (هذا الأسبوع)",
    "field.repeat": "التكرار", "repeat.none": "بدون تكرار", "repeat.daily": "يومياً", "repeat.weekly": "أسبوعياً", "repeat.monthly": "شهرياً",
  },
  en: {
    "tab.all": "All", "empty.tasks": "No tasks in this tab",
    "timer.col": "Work time", "timer.start": "Start timer", "timer.stop": "Stop timer",
    "timer.running": "running", "timer.tracked": "Tracked time",
    "timer.locked": "Task is complete — no time can be added",
    "pf.m.hours": "Work hours (this week)",
    "field.repeat": "Repeat", "repeat.none": "No repeat", "repeat.daily": "Daily", "repeat.weekly": "Weekly", "repeat.monthly": "Monthly",
  },
});

/* ---- Property-owner tabs, fields & labels ---- */
registerStrings({
  ar: {
    "stage.registered": "مالك مسجّل", "stage.contacted": "تم التواصل",
    "stage.pending": "بانتظار التواصل", "stage.potential": "مالك محتمل",
    "field.gender": "الجنس", "field.city": "المدينة", "field.signedUp": "تاريخ التسجيل",
    "th.city": "المدينة", "th.signedUp": "تاريخ التسجيل",
    "gender.male": "ذكر", "gender.female": "أنثى",
    "owner.tpl": "قالب Excel", "owner.bulk": "إضافة سريعة (Excel)",
    "owner.bulkAdded": "تمت إضافة {n} مالك", "owner.xlsxErr": "تعذّر قراءة الملف — جرّب CSV",
    "owner.daysAgo": " يوم", "owner.never": "لم يتم التواصل", "owner.since": "منذ",
    "owner.contacted": "تواصل", "owner.markContacted": "تسجيل تواصل",
    "owner.priority": "أولوية", "owner.prioritize": "تمييز كأولوية", "owner.unprioritize": "إزالة الأولوية",
    "owner.log": "سجل التواصل", "owner.noLog": "لا يوجد سجل بعد", "owner.addLog": "تسجيل تواصل",
    "owner.logTitle": "تسجيل تواصل", "owner.summary": "ملخص المحادثة", "owner.summaryPh": "عمّ تحدثتم؟",
    "owner.next": "ماذا نناقش المرة القادمة؟", "owner.nextPh": "نقاط المتابعة القادمة",
    "owner.logged": "تم تسجيل التواصل", "owner.type": "النوع",
    "stage.tasks": "مهام الملاك",
    "owner.createTask": "إنشاء مهمة", "owner.noTasks": "لا توجد مهام للملاك بعد",
    "owner.noTasksSub": "أنشئ مهمة لمساعدة مالك من تبويب «بانتظار التواصل» أو من ملف المالك",
    "owner.community": "عضو مجتمع", "owner.community.add": "تعيين كعضو مجتمع", "owner.community.remove": "إزالة من المجتمع",
    "task.owner": "المالك المرتبط", "task.contact": "وسيلة التواصل المفضّلة",
    "contact.whatsapp": "واتساب", "contact.phone": "اتصال", "contact.email": "بريد",
    "owner.toPotential": "تحويل إلى محتمل", "owner.toRegistered": "تحويل إلى مسجّل", "owner.converted": "تم التحويل",
    "field.social": "رابط التواصل الاجتماعي", "field.socialPh": "رابط أو @معرّف على وسائل التواصل",
  },
  en: {
    "stage.registered": "Registered", "stage.contacted": "Contacted",
    "stage.pending": "Pending contact", "stage.potential": "Potential",
    "field.gender": "Gender", "field.city": "City", "field.signedUp": "Signed up",
    "th.city": "City", "th.signedUp": "Signed up",
    "gender.male": "Male", "gender.female": "Female",
    "owner.tpl": "Excel template", "owner.bulk": "Excel quick add",
    "owner.bulkAdded": "Added {n} owners", "owner.xlsxErr": "Couldn't read file — try CSV",
    "owner.daysAgo": "d", "owner.never": "Never contacted", "owner.since": "Since",
    "owner.contacted": "Contacted", "owner.markContacted": "Log contact",
    "owner.priority": "Priority", "owner.prioritize": "Mark priority", "owner.unprioritize": "Unprioritize",
    "owner.log": "Contact log", "owner.noLog": "No log yet", "owner.addLog": "Log a contact",
    "owner.logTitle": "Log contact", "owner.summary": "What was discussed", "owner.summaryPh": "What did you talk about?",
    "owner.next": "What to discuss next time", "owner.nextPh": "Next follow-up points",
    "owner.logged": "Contact logged", "owner.type": "Type",
    "stage.tasks": "Owner Tasks",
    "owner.createTask": "Create task", "owner.noTasks": "No owner tasks yet",
    "owner.noTasksSub": "Create a task to help an owner from the Pending tab or the owner profile",
    "owner.community": "Community member", "owner.community.add": "Make community member", "owner.community.remove": "Remove from community",
    "task.owner": "Related owner", "task.contact": "Preferred contact",
    "contact.whatsapp": "WhatsApp", "contact.phone": "Call", "contact.email": "Email",
    "owner.toPotential": "Convert to potential", "owner.toRegistered": "Convert to registered", "owner.converted": "Converted",
    "field.social": "Social media link", "field.socialPh": "Profile URL or @handle",
  },
});

/* ---- cloud state (set during boot; falls back to local auth when off) ---- */
let cloudReady = false;
let cloudUser = null;
let cloudTeam = [];           // names from /api/sync users (cloud mode)
/** The signed-in user, from cloud when available, else local auth. */
function activeUser() { return cloudReady ? cloudUser : currentUser(); }

/* dynamic team list (registered users; cloud users in cloud mode, else local) */
function team() {
  if (cloudReady && cloudTeam.length) return cloudTeam;
  const list = teamNames();
  return list.length ? list : TEAM;
}
const W = () => can("write", activeUser());   // may create/edit
const D = () => can("del", activeUser());     // may delete
const A = () => can("assign", activeUser());  // may assign/delegate

/* ---------------- Toast ---------------- */
function toast(msg) {
  const host = $("#toastHost");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 300); }, 2200);
}

/* ---------------- Modal ---------------- */
function openModal(html) {
  const host = $("#modalHost");
  host.innerHTML = `<div class="modal">${html}</div>`;
  host.hidden = false;
  host.onclick = (e) => { if (e.target === host) closeModal(); };
}
function closeModal() { const h = $("#modalHost"); h.hidden = true; h.innerHTML = ""; }
window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

/* ============================================================
   VIEW: Dashboard
   ============================================================ */
function viewDashboard() {
  const tasks = db.tasks;
  const total = tasks.length;
  const by = (s) => tasks.filter(x => x.status === s).length;
  const complete = by("complete"), pending = by("pending") + by("progress"), overdue = by("overdue");
  const rate = total ? Math.round((complete / total) * 100) : 0;

  const statusCounts = ["complete", "progress", "pending", "overdue", "closed"].map(s => ({ s, n: by(s) }));
  const maxStatus = Math.max(1, ...statusCounts.map(x => x.n));

  const members = team().map(m => ({ m, n: tasks.filter(x => x.assignedBy === m || x.delegateTo === m).length }));
  const maxMem = Math.max(1, ...members.map(x => x.n));

  const upcoming = [...tasks].filter(x => x.status !== "complete" && x.status !== "closed")
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999")).slice(0, 5);

  const statColor = { complete: "var(--st-complete)", progress: "var(--st-progress)", pending: "var(--st-pending)", overdue: "var(--st-overdue)", closed: "var(--st-closed)" };

  return `
  <div class="grid cards-4">
    ${statCard("📋", "var(--brand)", total, t("stat.total"))}
    ${statCard("✅", "var(--st-complete)", complete, t("stat.complete"))}
    ${statCard("⏳", "var(--st-pending)", pending, t("stat.pending"))}
    ${statCard("⚠️", "var(--st-overdue)", overdue, t("stat.overdue"))}
  </div>

  <div class="grid cards-2" style="margin-top:16px">
    <div class="card">
      <div class="card__head"><span class="card__title">${t("stat.completion")}</span><span class="muted">${rate}%</span></div>
      <div class="progress"><div class="progress__bar" style="width:${rate}%"></div></div>
      <div class="barlist" style="margin-top:18px">
        ${statusCounts.map(x => `
          <div class="barlist__row">
            <span>${t(STATUS_KEYS[x.s])}</span>
            <div class="barlist__track"><div class="barlist__fill" style="width:${(x.n / maxStatus) * 100}%;background:${statColor[x.s]}"></div></div>
            <span class="barlist__val">${x.n}</span>
          </div>`).join("")}
      </div>
    </div>

    <div class="card">
      <div class="card__head"><span class="card__title">${t("card.byMember")}</span></div>
      <div class="barlist">
        ${members.map(x => `
          <div class="barlist__row">
            <span class="flex" style="gap:8px"><span class="avatar-sm">${initials(x.m)}</span>${esc(x.m)}</span>
            <div class="barlist__track"><div class="barlist__fill" style="width:${(x.n / maxMem) * 100}%;background:var(--brand)"></div></div>
            <span class="barlist__val">${x.n}</span>
          </div>`).join("")}
      </div>
    </div>
  </div>

  <div style="margin-top:16px">
    <div class="card">
      <div class="card__head"><span class="card__title">${t("card.upcoming")}</span><a class="btn btn--ghost btn--sm" href="#/tasks">→</a></div>
      <div class="mini-list">
        ${upcoming.length ? upcoming.map(x => {
          const dl = daysLeft(x.dueDate);
          const late = dl !== null && dl < 0;
          return `<div class="mini-list__item">
            <span class="dot" style="background:${x.priority === "High" ? "var(--pr-high)" : x.priority === "Medium" ? "var(--pr-medium)" : "var(--pr-low)"}"></span>
            <div style="flex:1;min-width:0">
              <div class="cell-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.title)}</div>
              <div class="muted">${fmtDate(x.dueDate)} ${dl !== null ? `· ${late ? `${Math.abs(dl)}${getLang()==="ar"?" يوم تأخير":"d late"}` : `${dl}${getLang()==="ar"?" يوم":"d"}`}` : ""}</div>
            </div>
            ${statusBadge(x.status)}
          </div>`;
        }).join("") : `<div class="empty"><div class="empty__icon">🎉</div></div>`}
      </div>
    </div>
  </div>`;
}

function statCard(icon, color, value, label) {
  return `<div class="card stat">
    <div class="stat__top">
      <span class="stat__icon" style="background:color-mix(in srgb, ${color} 14%, transparent);color:${color}">${icon}</span>
    </div>
    <span class="stat__value">${value}</span>
    <span class="stat__label">${esc(label)}</span>
  </div>`;
}

/* ============================================================
   VIEW: Tasks
   ============================================================ */
const TASK_TABS = ["all", "pending", "progress", "complete", "overdue", "closed"];
const TASK_TAB_ICON = { all: "📋", pending: "🕒", progress: "🔄", complete: "✅", overdue: "⚠️", closed: "🔒" };
let taskTab = "all";
let taskMember = "";
let timerTick = null;
let bootDone = false;   // true once boot finishes — gates recurring-task rolling

/* ---- Per-task work timer (start/stop many times until complete) ---- */
function taskSessions(x) {
  const l = x.timeLog;
  if (Array.isArray(l)) return l;
  if (typeof l === "string" && l) { try { const p = JSON.parse(l); return Array.isArray(p) ? p : []; } catch (e) { return []; } }
  return [];
}
const taskAccumSeconds = (x) => taskSessions(x).reduce((s, e) => s + (Number(e.seconds) || 0), 0);
function taskLiveSeconds(x) {
  if (!x.timerStart) return 0;
  const st = new Date(x.timerStart).getTime();
  if (isNaN(st)) return 0;
  return Math.max(0, Math.floor((Date.now() - st) / 1000));
}
const taskTotalSeconds = (x) => taskAccumSeconds(x) + taskLiveSeconds(x);
const taskRunning = (x) => !!x.timerStart;
const taskLocked = (x) => x.status === "complete" || x.status === "closed";
function fmtDur(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const mm = String(m).padStart(2, "0"), ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}
/* close a running session into the log (no-op if not running) */
function finalizeTimer(x) {
  if (!x.timerStart) return {};
  const sessions = taskSessions(x).slice();
  sessions.push({ start: x.timerStart, end: new Date().toISOString(), seconds: taskLiveSeconds(x), by: (activeUser() && activeUser().name) || "" });
  return { timeLog: sessions, timerStart: "" };
}
function toggleTaskTimer(id) {
  const x = db.tasks.find(t => t.id === id);
  if (!x) return;
  if (taskLocked(x)) { toast(t("timer.locked")); return; }
  if (x.timerStart) {
    db.updateTask(id, finalizeTimer(x));
  } else {
    const patch = { timerStart: new Date().toISOString() };
    // starting work moves a pending task into "In Progress" automatically
    if (x.status === "pending") patch.status = "progress";
    db.updateTask(id, patch);
  }
  render();
}
/* change status, finalizing a running timer when the task is completed/closed */
function applyTaskStatus(id, status) {
  const x = db.tasks.find(t => t.id === id);
  if (!x) return;
  const patch = { status };
  if (status === "complete" || status === "closed") Object.assign(patch, finalizeTimer(x));
  db.updateTask(id, patch);
}
const REPEATS = ["daily", "weekly", "monthly"];
/* Has the next occurrence arrived, given the latest instance's day + cadence? */
function repeatDue(latestDay, repeat, today) {
  if (!latestDay) return false;
  const L = new Date(latestDay + "T00:00:00"), T = new Date(today + "T00:00:00");
  if (isNaN(L) || isNaN(T)) return false;
  if (repeat === "daily") return T > L;
  if (repeat === "weekly") return (T - L) >= 7 * 86400000;
  if (repeat === "monthly") { const n = new Date(L); n.setMonth(n.getMonth() + 1); return T >= n; }
  return false;
}
/* Recurring tasks (daily/weekly/monthly): self-perpetuating. For each series we
   look at its LATEST instance — if it still repeats and the next occurrence is
   due, that instance becomes overdue (Late, still open) and a fresh instance is
   created for today on top, carrying the same cadence. The chain continues until
   the user sets the latest instance's Repeat to "none". Deduped by series so
   synced devices don't create duplicates. Returns true if anything changed. */
function rollRecurringTasks() {
  const today = todayISO();
  const seriesTasks = db.tasks.filter(t => t.seriesId);   // any instance of a series
  if (!seriesTasks.length) return false;
  const bySeries = {};
  seriesTasks.forEach(t => { (bySeries[t.seriesId] = bySeries[t.seriesId] || []).push(t); });
  let changed = false;
  Object.values(bySeries).forEach(list => {
    list.sort((a, b) => String(b.dueDate || b.date || b.createdAt || "").localeCompare(String(a.dueDate || a.date || a.createdAt || "")));
    const latest = list[0];
    if (!REPEATS.includes(latest.repeat)) return;       // repetition stopped on the newest instance
    const latestDay = latest.dueDate || latest.date || "";
    if (!repeatDue(latestDay, latest.repeat, today)) return; // next occurrence not due yet
    if (latest.status !== "complete" && latest.status !== "closed") {
      db.updateTask(latest.id, { status: "overdue" });  // missed → Late, still open
    }
    db.addTask({
      title: latest.title, description: latest.description, priority: latest.priority,
      assignedBy: latest.assignedBy, delegateTo: latest.delegateTo,
      ownerId: latest.ownerId, ownerName: latest.ownerName, contactMethod: latest.contactMethod,
      repeat: latest.repeat, seriesId: latest.seriesId,
      dueDate: today, date: today, status: "pending",
    });
    changed = true;
  });
  return changed;
}

/* Record that the current user was active today (once per day, deduped). */
function markActive() {
  const u = activeUser(); if (!u) return;
  const day = todayISO();
  const uid = u.id || u.name, uname = u.name || "";
  const seen = (db.activity || []).some(a => a.day === day && (a.userId === uid || a.userName === uname));
  if (!seen) db.addActivity({ userId: uid, userName: uname, day });
}

function stopTimerTicker() { if (timerTick) { clearInterval(timerTick); timerTick = null; } }
function startTimerTicker() {
  stopTimerTicker();
  if (!db.tasks.some(taskRunning)) return;
  timerTick = setInterval(() => {
    $$("[data-timerlive]").forEach(el => {
      const x = db.tasks.find(t => t.id === el.dataset.timerlive);
      if (x) el.textContent = fmtDur(taskTotalSeconds(x));
    });
  }, 1000);
}

function filterTasks() {
  let list = db.tasks;
  if (taskMember) list = list.filter(x => x.assignedBy === taskMember || x.delegateTo === taskMember);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(x => (x.title + x.description + x.assignedBy + x.delegateTo).toLowerCase().includes(q));
  }
  return list;
}

function viewTasks() {
  const base = filterTasks();
  const counts = {};
  TASK_TABS.forEach(tab => counts[tab] = tab === "all" ? base.length : base.filter(x => x.status === tab).length);
  if (!TASK_TABS.includes(taskTab)) taskTab = "all";

  const tabs = `<div class="seg" id="taskTabs">
    ${TASK_TABS.map(s => `<button data-ttab="${s}" class="${taskTab === s ? "active" : ""}">${TASK_TAB_ICON[s]} ${esc(t(s === "all" ? "tab.all" : STATUS_KEYS[s]))} <span class="kcol__count">${counts[s]}</span></button>`).join("")}
  </div>`;
  const memberFilter = `<select class="input" id="memberFilter">
    <option value="">${t("filter.member")}</option>
    ${team().map(m => `<option value="${m}" ${taskMember === m ? "selected" : ""}>${m}</option>`).join("")}
  </select>`;
  const toolbar = `<div class="toolbar">
    <div class="toolbar__left">${tabs}${memberFilter}</div>
    <div class="toolbar__right">
      ${W() ? `<button class="btn btn--primary" id="addTask">＋ ${t("btn.newTask")}</button>` : ""}
    </div>
  </div>`;
  const list = taskTab === "all" ? base : base.filter(x => x.status === taskTab);
  return toolbar + tasksTable(list);
}

function tasksTable(list) {
  if (!list.length) {
    return `<div class="card"><div class="empty">
      <div class="empty__icon">${TASK_TAB_ICON[taskTab] || "📋"}</div>
      <h3>${t("empty.tasks")}</h3></div></div>`;
  }
  const rows = list.map(x => {
    const who = x.delegateTo || x.assignedBy;
    const running = taskRunning(x);
    const locked = taskLocked(x);
    const timerBtn = locked
      ? `<span title="${t("timer.locked")}">🔒</span>`
      : `<button class="btn btn--ghost btn--sm" data-timer="${x.id}" title="${running ? t("timer.stop") : t("timer.start")}">${running ? "⏸" : "▶"}</button>`;
    return `<tr>
      <td><div class="cell-title">${(x.repeat && x.repeat !== "none") ? `<span title="${t("repeat." + x.repeat)}">🔁 </span>` : ""}${esc(x.title)}</div><div class="muted">${x.ownerName ? "🏠 " + esc(x.ownerName) + " · " : ""}${esc(x.description || "")}</div></td>
      <td>${priChip(x.priority)}</td>
      <td>${who ? `<span class="flex" style="gap:7px"><span class="avatar-sm">${initials(who)}</span>${esc(who)}</span>` : "—"}</td>
      <td>${fmtDate(x.dueDate)}</td>
      <td>${statusBadge(x.status)}</td>
      <td style="white-space:nowrap"><span class="flex" style="gap:6px;align-items:center">${timerBtn}<span data-timerlive="${x.id}" class="${running ? "" : "muted"}" style="font-variant-numeric:tabular-nums">${fmtDur(taskTotalSeconds(x))}</span></span></td>
      <td><div class="row-actions">
        <button class="btn btn--ghost btn--sm" data-edit="${x.id}">✎</button>
        ${D() ? `<button class="btn btn--ghost btn--sm btn--danger" data-del="${x.id}">🗑</button>` : ""}
      </div></td>
    </tr>`;
  }).join("");
  return `<div class="table-wrap"><table>
    <thead><tr>
      <th>${t("th.task")}</th><th>${t("th.priority")}</th><th>${t("th.assignedBy")}</th>
      <th>${t("th.dueDate")}</th><th>${t("th.status")}</th><th>${t("timer.col")}</th><th></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function taskModal(task, prefill) {
  const x = task || Object.assign({ priority: "Medium", status: "pending" }, prefill || {});
  const editing = !!task;
  const lockOwner = !!(prefill && prefill.lockOwner);
  const opt = (val, cur, label) => `<option value="${val}" ${cur === val ? "selected" : ""}>${label}</option>`;
  openModal(`
    <div class="modal__head"><h3>${editing ? t("modal.editTask") : t("modal.newTask")}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body">
      <div class="field"><label>${t("field.title")}</label><input id="f_title" value="${esc(x.title || "")}" /></div>
      <div class="field"><label>${t("field.desc")}</label><textarea id="f_desc">${esc(x.description || "")}</textarea></div>
      <div class="field-row">
        <div class="field"><label>${t("field.priority")}</label><select id="f_pri">${["High","Medium","Low"].map(p => opt(p, x.priority, t("pr."+p))).join("")}</select></div>
        <div class="field"><label>${t("field.status")}</label><select id="f_status">${Object.keys(STATUS_KEYS).map(s => opt(s, x.status, t(STATUS_KEYS[s]))).join("")}</select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>${t("field.assignedBy")}</label><select id="f_by" ${A() ? "" : "disabled"}><option value=""></option>${team().map(m => opt(m, x.assignedBy, m)).join("")}</select></div>
        <div class="field"><label>${t("field.delegate")}</label><select id="f_del" ${A() ? "" : "disabled"}><option value=""></option>${team().map(m => opt(m, x.delegateTo, m)).join("")}</select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>${t("field.dueDate")}</label><input type="date" id="f_due" value="${esc(x.dueDate || "")}" /></div>
        <div class="field"><label>${t("field.duration")}</label><input id="f_dur" placeholder="00:30" value="${esc(x.duration || "")}" /></div>
      </div>
      <div class="field"><label>🔁 ${t("field.repeat")}</label><select id="f_repeat">${["none","daily","weekly","monthly"].map(r => opt(r, (x.repeat || "none"), t("repeat." + r))).join("")}</select></div>
      ${editing ? `<div class="field"><label>⏱️ ${t("timer.tracked")}</label><input value="${fmtDur(taskTotalSeconds(x))}${taskRunning(x) ? " · " + t("timer.running") : ""}" disabled /></div>` : ""}
      <div class="field-row">
        <div class="field"><label>${t("task.owner")}</label><select id="f_owner" ${lockOwner ? "disabled" : ""}>
          <option value="">—</option>
          ${db.owners.map(o => `<option value="${o.id}" ${x.ownerId === o.id ? "selected" : ""}>${esc(o.name || "—")}</option>`).join("")}
        </select></div>
        <div class="field"><label>${t("task.contact")}</label><select id="f_contact">
          <option value="">—</option>
          ${CONTACT_METHODS.map(m => opt(m, x.contactMethod, t("contact." + m))).join("")}
        </select></div>
      </div>
    </div>
    <div class="modal__foot">
      ${editing && D() ? `<button class="btn btn--danger" data-delete>${t("btn.delete")}</button>` : ""}
      <button class="btn" data-close>${t("btn.cancel")}</button>
      ${W() ? `<button class="btn btn--primary" data-save>${t("btn.save")}</button>` : ""}
    </div>`);

  ($("[data-save]") || {}).onclick = () => {
    const oid = $("#f_owner").value;
    const own = db.owners.find(o => o.id === oid);
    const data = {
      title: $("#f_title").value.trim(), description: $("#f_desc").value.trim(),
      priority: $("#f_pri").value, status: $("#f_status").value,
      assignedBy: $("#f_by").value, delegateTo: $("#f_del").value,
      dueDate: $("#f_due").value, duration: $("#f_dur").value,
      ownerId: oid, ownerName: own ? own.name : (x.ownerName || ""), contactMethod: $("#f_contact").value,
      repeat: $("#f_repeat").value,
    };
    if (!data.title) { $("#f_title").focus(); return; }
    // recurring tasks: tag a series + default the due date to today
    if (data.repeat && data.repeat !== "none") {
      data.seriesId = (editing && task.seriesId) ? task.seriesId : ("ser" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
      if (!data.dueDate) data.dueDate = todayISO();
    }
    // finalize a running timer when the task is being completed/closed
    if (editing && (data.status === "complete" || data.status === "closed")) Object.assign(data, finalizeTimer(task));
    if (editing) db.updateTask(task.id, data); else db.addTask(data);
    closeModal(); render(); toast(t("toast.saved"));
  };
  if (editing) ($("[data-delete]") || {}).onclick = () => { db.removeTask(task.id); closeModal(); render(); toast(t("toast.deleted")); };
  $$("[data-close]").forEach(b => b.onclick = closeModal);
}

/* ============================================================
   VIEW: Content Studio
   ============================================================ */
let contentMode = "calendar";

function viewContent() {
  const seg = `<div class="seg">
    <button data-cmode="calendar" class="${contentMode === "calendar" ? "active" : ""}">${t("view.calendar")}</button>
    <button data-cmode="table" class="${contentMode === "table" ? "active" : ""}">${t("view.table")}</button>
  </div>`;
  const toolbar = `<div class="toolbar">
    <div class="toolbar__left">${seg}</div>
    <div class="toolbar__right">${W() ? `<button class="btn btn--primary" id="addPost">＋ ${t("btn.newPost")}</button>` : ""}</div>
  </div>`;
  return toolbar + (contentMode === "calendar" ? contentCalendar() : contentTable());
}

function contentCalendar() {
  const days = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const dayLabel = { Saturday: "السبت", Sunday: "الأحد", Monday: "الإثنين", Tuesday: "الثلاثاء", Wednesday: "الأربعاء", Thursday: "الخميس", Friday: "الجمعة" };
  return `<div class="cal">${days.map(d => {
    const posts = db.content.filter(c => c.day === d);
    return `<div class="cal__day">
      <div class="cal__dnum">${getLang() === "ar" ? dayLabel[d] : d}</div>
      ${posts.map(p => `<div class="cal__post" data-cedit="${p.id}">
        <b>${esc(p.pillar || p.type || "—")}</b>
        <span class="muted">${esc((p.platform || []).join(", "))}</span>
      </div>`).join("")}
    </div>`;
  }).join("")}</div>`;
}

function contentTable() {
  return `<div class="table-wrap"><table>
    <thead><tr>
      <th>${t("th.day")}</th><th>${t("th.date")}</th><th>${t("th.goal")}</th><th>${t("th.platform")}</th>
      <th>${t("th.pillar")}</th><th>${t("th.type")}</th><th>${t("th.time")}</th><th></th>
    </tr></thead>
    <tbody>${db.content.map(c => `<tr>
      <td>${esc(c.day || "—")}</td><td>${fmtDate(c.date)}</td><td>${esc(c.goal || "—")}</td>
      <td>${(c.platform || []).map(p => `<span class="tag">${esc(p)}</span>`).join(" ")}</td>
      <td>${esc(c.pillar || "—")}</td><td>${esc(c.type || "—")}</td><td>${esc(c.time || "—")}</td>
      <td><div class="row-actions">
        <button class="btn btn--ghost btn--sm" data-cedit="${c.id}">✎</button>
        ${D() ? `<button class="btn btn--ghost btn--sm btn--danger" data-cdel="${c.id}">🗑</button>` : ""}
      </div></td>
    </tr>`).join("")}</tbody>
  </table></div>`;
}

const PLATFORMS = ["Instagram", "Facebook", "WhatsApp", "TikTok", "Snapchat", "X"];
const CONTENT_TYPES = ["Carousel", "Story", "Single Graphic", "Reel", "Video", "Text"];

function contentModal(post) {
  const x = post || { platform: [] };
  const editing = !!post;
  const opt = (val, cur) => `<option value="${esc(val)}" ${cur === val ? "selected" : ""}>${esc(val)}</option>`;
  openModal(`
    <div class="modal__head"><h3>${editing ? t("modal.editPost") : t("modal.newPost")}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body">
      <div class="field-row">
        <div class="field"><label>${t("field.day")}</label><input id="c_day" value="${esc(x.day || "")}" /></div>
        <div class="field"><label>${t("field.date")}</label><input type="date" id="c_date" value="${esc(x.date || "")}" /></div>
      </div>
      <div class="field"><label>${t("field.goal")}</label><select id="c_goal"><option value=""></option>${GOALS.map(g => opt(g, x.goal)).join("")}</select></div>
      <div class="field"><label>${t("field.pillar")}</label><select id="c_pillar"><option value=""></option>${PILLARS.map(p => opt(p.name, x.pillar)).join("")}</select></div>
      <div class="field"><label>${t("field.platform")}</label><div id="c_plats" class="values">${PLATFORMS.map(p => `<label class="value-pill" style="cursor:pointer;background:${(x.platform||[]).includes(p)?"var(--brand)":"var(--brand-soft)"};color:${(x.platform||[]).includes(p)?"#fff":"var(--brand)"}"><input type="checkbox" value="${p}" ${(x.platform||[]).includes(p)?"checked":""} style="display:none">${p}</label>`).join("")}</div></div>
      <div class="field-row">
        <div class="field"><label>${t("field.type")}</label><select id="c_type"><option value=""></option>${CONTENT_TYPES.map(ty => opt(ty, x.type)).join("")}</select></div>
        <div class="field"><label>${t("field.time")}</label><input id="c_time" placeholder="21:00" value="${esc(x.time || "")}" /></div>
      </div>
      <div class="field"><label>${t("field.caption")}</label><textarea id="c_caption">${esc(x.caption || "")}</textarea></div>
      <div class="field-row">
        <div class="field"><label>${t("field.hook")}</label><input id="c_hook" value="${esc(x.hook || "")}" /></div>
        <div class="field"><label>${t("field.budget")}</label><input id="c_budget" value="${esc(x.budget || "")}" /></div>
      </div>
    </div>
    <div class="modal__foot">
      ${editing && D() ? `<button class="btn btn--danger" data-delete>${t("btn.delete")}</button>` : ""}
      <button class="btn" data-close>${t("btn.cancel")}</button>
      ${W() ? `<button class="btn btn--primary" data-save>${t("btn.save")}</button>` : ""}
    </div>`);

  // toggle platform pills
  $$("#c_plats label").forEach(lab => lab.onclick = () => {
    setTimeout(() => {
      const on = lab.querySelector("input").checked;
      lab.style.background = on ? "var(--brand)" : "var(--brand-soft)";
      lab.style.color = on ? "#fff" : "var(--brand)";
    }, 0);
  });

  ($("[data-save]") || {}).onclick = () => {
    const data = {
      day: $("#c_day").value.trim(), date: $("#c_date").value, goal: $("#c_goal").value,
      pillar: $("#c_pillar").value, type: $("#c_type").value, time: $("#c_time").value,
      caption: $("#c_caption").value.trim(), hook: $("#c_hook").value.trim(), budget: $("#c_budget").value.trim(),
      platform: $$("#c_plats input:checked").map(i => i.value),
    };
    if (editing) db.updateContent(post.id, data); else db.addContent(data);
    closeModal(); render(); toast(t("toast.saved"));
  };
  if (editing) ($("[data-delete]") || {}).onclick = () => { db.removeContent(post.id); closeModal(); render(); toast(t("toast.deleted")); };
  $$("[data-close]").forEach(b => b.onclick = closeModal);
}

/* ============================================================
   VIEW: Owners CRM
   ============================================================ */
const STAGE_ICON = { registered: "✅", contacted: "💬", pending: "⏳", potential: "🌱", tasks: "🛠️" };
const OWNER_TABS = ["registered", "contacted", "pending", "potential", "tasks"];
const CONTACT_CYCLE = 14; // days between contacts
const CONTACT_METHODS = ["whatsapp", "phone", "email"];
let ownerTab = "registered";

const ownerType = (o) => (o.stage === "potential" ? "potential" : "registered");
const todayISO = () => new Date().toISOString().slice(0, 10);
function daysSinceContact(o) {
  if (!o.lastContact) return Infinity;
  const d = new Date(o.lastContact); if (isNaN(d)) return Infinity;
  const n = new Date(); n.setHours(0, 0, 0, 0);
  return Math.floor((n - d) / 86400000);
}
function ownerLog(o) {
  const l = o.contactLog;
  if (Array.isArray(l)) return l;
  if (typeof l === "string" && l) { try { const p = JSON.parse(l); return Array.isArray(p) ? p : []; } catch (e) { return []; } }
  return [];
}
function ownerInTab(o, tab) {
  const ty = ownerType(o);
  if (tab === "potential") return ty === "potential";
  if (tab === "registered") return ty === "registered";
  if (ty !== "registered") return false;
  const due = daysSinceContact(o) > CONTACT_CYCLE;   // never-contacted = due
  return tab === "pending" ? due : !due;             // contacted = within the cycle
}

const ownerTasks = () => db.tasks.filter(x => x.ownerId);

function viewOwners() {
  const owners = db.owners;
  const counts = {};
  OWNER_TABS.forEach(tab => {
    counts[tab] = tab === "tasks"
      ? ownerTasks().filter(x => x.status !== "complete" && x.status !== "closed").length
      : owners.filter(o => ownerInTab(o, tab)).length;
  });
  if (!OWNER_TABS.includes(ownerTab)) ownerTab = "registered";

  const tabs = `<div class="seg" id="ownerTabs">
    ${OWNER_TABS.map(s => `<button data-otab="${s}" class="${ownerTab === s ? "active" : ""}">${STAGE_ICON[s]} ${esc(t("stage." + s))} <span class="kcol__count">${counts[s]}</span></button>`).join("")}
  </div>`;
  const rightActions = ownerTab === "tasks"
    ? (W() ? `<button class="btn btn--primary" id="addOwnerTask">＋ ${t("owner.createTask")}</button>` : "")
    : `<button class="btn btn--sm" id="ownerTpl" title="${t("owner.tpl")}">⬇ ${t("owner.tpl")}</button>
       <button class="btn btn--sm" id="ownerXlsx">⬆ ${t("owner.bulk")}</button>
       ${W() ? `<button class="btn btn--primary" id="addOwner">＋ ${t("btn.newOwner")}</button>` : ""}
       <input type="file" id="ownerFile" accept=".csv,.xlsx,.xls" hidden />`;
  const toolbar = `<div class="toolbar"><div class="toolbar__left">${tabs}</div><div class="toolbar__right">${rightActions}</div></div>`;

  if (ownerTab === "tasks") return toolbar + ownerTasksView();

  let list = owners.filter(o => ownerInTab(o, ownerTab));
  list = list.sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0) || daysSinceContact(b) - daysSinceContact(a));

  if (!list.length) {
    return toolbar + `<div class="card"><div class="empty">
      <div class="empty__icon">${STAGE_ICON[ownerTab]}</div>
      <h3>${t("empty.owners")}</h3><p class="muted">${t("empty.owners.sub")}</p>
    </div></div>`;
  }

  const rows = list.map(o => {
    const due = daysSinceContact(o);
    const dueTxt = o.lastContact ? (due > CONTACT_CYCLE ? `<span style="color:var(--st-overdue)">${due}${t("owner.daysAgo")}</span>` : `${due}${t("owner.daysAgo")}`) : `<span class="muted">${t("owner.never")}</span>`;
    const checked = (o.lastContact && due <= CONTACT_CYCLE) ? "checked" : "";
    const community = o.community ? ` <span class="tag" style="background:var(--brand-soft);color:var(--brand);border-color:transparent">👥 ${t("owner.community")}</span>` : "";
    return `<tr>
      <td><span class="flex" style="gap:8px;align-items:center">
        <button class="btn btn--ghost btn--sm owner-star" data-ostar="${o.id}" title="${t("owner.priority")}" style="padding:2px 4px">${o.priority ? "⭐" : "☆"}</button>
        <a href="#" class="cell-title owner-open" data-oprofile="${o.id}" style="color:var(--brand)">${esc(o.name || "—")}</a>${community}
      </span></td>
      <td>${esc(o.phone || "—")}</td><td>${esc(o.city || "—")}</td>
      <td>${o.lastContact ? fmtDate(o.lastContact) : "—"}</td><td>${dueTxt}</td>
      <td style="text-align:center"><input type="checkbox" class="owner-contacted" data-ocontact="${o.id}" ${checked} title="${t("owner.markContacted")}" style="width:18px;height:18px;cursor:pointer" /></td>
      <td><div class="row-actions">
        ${W() ? `<button class="btn btn--ghost btn--sm" data-oconv="${o.id}" title="${ownerType(o) === "potential" ? t("owner.toRegistered") : t("owner.toPotential")}">${ownerType(o) === "potential" ? "⬆️" : "⬇️"}</button>` : ""}
        ${W() ? `<button class="btn btn--ghost btn--sm" data-otask="${o.id}" title="${t("owner.createTask")}">＋🛠️</button>` : ""}
        <button class="btn btn--ghost btn--sm" data-oedit="${o.id}">✎</button>
        ${D() ? `<button class="btn btn--ghost btn--sm btn--danger" data-odel="${o.id}">🗑</button>` : ""}
      </div></td>
    </tr>`;
  }).join("");

  return toolbar + `<div class="table-wrap"><table>
    <thead><tr>
      <th>${t("th.owner")}</th><th>${t("th.phone")}</th><th>${t("th.city")}</th>
      <th>${t("th.lastContact")}</th><th>${t("owner.since")}</th><th style="text-align:center">${t("owner.contacted")}</th><th></th>
    </tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* ---- 5th tab: owner-help tasks (these are real tasks, shown in Tasks too) ---- */
function ownerTasksView() {
  const list = ownerTasks().slice().sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  if (!list.length) return `<div class="card"><div class="empty"><div class="empty__icon">🛠️</div><h3>${t("owner.noTasks")}</h3><p class="muted">${t("owner.noTasksSub")}</p></div></div>`;
  return `<div class="table-wrap"><table>
    <thead><tr>
      <th>${t("task.owner")}</th><th>${t("th.task")}</th><th>${t("th.assignedBy")}</th><th>${t("task.contact")}</th>
      <th>${t("th.dueDate")}</th><th>${t("th.priority")}</th><th>${t("th.status")}</th><th style="text-align:center">✓</th><th></th>
    </tr></thead>
    <tbody>${list.map(x => {
      const who = x.delegateTo || x.assignedBy;
      const done = x.status === "complete";
      return `<tr>
        <td><b>${esc(x.ownerName || "—")}</b></td>
        <td><div class="cell-title" style="${done ? "text-decoration:line-through;opacity:.6" : ""}">${esc(x.title)}</div><div class="muted">${esc(x.description || "")}</div></td>
        <td>${who ? esc(who) : "—"}</td>
        <td>${x.contactMethod ? t("contact." + x.contactMethod) : "—"}</td>
        <td>${fmtDate(x.dueDate)}</td><td>${priChip(x.priority)}</td><td>${statusBadge(x.status)}</td>
        <td style="text-align:center"><input type="checkbox" data-otaskdone="${x.id}" ${done ? "checked" : ""} style="width:18px;height:18px;cursor:pointer" /></td>
        <td><div class="row-actions"><button class="btn btn--ghost btn--sm" data-otaskedit="${x.id}">✎</button></div></td>
      </tr>`;
    }).join("")}</tbody></table></div>`;
}

/* ---- Owner profile (all info + dated contact log) ---- */
/* Normalize a social handle/URL into an openable link */
function socialURL(v) {
  const s = String(v || "").trim();
  if (!s) return "#";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("@")) return "https://instagram.com/" + s.slice(1);
  return "https://" + s;
}

function ownerProfile(owner) {
  const o = owner; const log = ownerLog(o);
  const wa = o.phone ? `https://wa.me/${String(o.phone).replace(/[^\d]/g, "")}` : null;
  const info = (label, val) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--border)"><span class="muted">${label}</span><span>${val || "—"}</span></div>`;
  const logHtml = log.length ? log.map(e => `
    <div class="card" style="background:var(--surface-2);margin-bottom:8px;padding:12px">
      <div class="flex between"><b>${esc(fmtDate(e.date))}</b><span class="muted" style="font-size:11px">${esc(e.by || "")}</span></div>
      ${e.summary ? `<div style="margin-top:4px">💬 ${esc(e.summary)}</div>` : ""}
      ${e.next ? `<div style="margin-top:4px;color:var(--brand)">➡️ ${esc(e.next)}</div>` : ""}
    </div>`).join("") : `<div class="empty"><p class="muted">${t("owner.noLog")}</p></div>`;

  openModal(`
    <div class="modal__head"><h3>${o.priority ? "⭐ " : ""}${esc(o.name || "—")}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body">
      <div class="flex" style="gap:8px;flex-wrap:wrap;margin-bottom:6px">
        ${wa ? `<a class="btn btn--sm" href="${wa}" target="_blank" rel="noopener">🟢 ${t("intg.due.wa")}</a>` : ""}
        ${o.email ? `<a class="btn btn--sm" href="mailto:${esc(o.email)}">✉️ ${t("intg.due.email")}</a>` : ""}
        ${o.social ? `<a class="btn btn--sm" href="${esc(socialURL(o.social))}" target="_blank" rel="noopener">🔗 ${t("field.social")}</a>` : ""}
        <button class="btn btn--sm" data-ostar2="${o.id}">${o.priority ? "⭐ " + t("owner.unprioritize") : "☆ " + t("owner.prioritize")}</button>
        <button class="btn btn--sm" data-ocomm="${o.id}">${o.community ? "👥 " + t("owner.community.remove") : "👥 " + t("owner.community.add")}</button>
        ${W() ? `<button class="btn btn--sm" data-oconv2="${o.id}">${ownerType(o) === "potential" ? "⬆️ " + t("owner.toRegistered") : "⬇️ " + t("owner.toPotential")}</button>` : ""}
        ${W() ? `<button class="btn btn--sm" data-otask3="${o.id}">＋🛠️ ${t("owner.createTask")}</button>` : ""}
        ${W() ? `<button class="btn btn--sm" data-oedit2="${o.id}">✎ ${t("btn.edit")}</button>` : ""}
      </div>
      ${o.community ? `<div style="margin-bottom:8px"><span class="tag" style="background:var(--brand-soft);color:var(--brand);border-color:transparent">👥 ${t("owner.community")}</span></div>` : ""}
      ${info(t("field.gender"), o.gender ? t("gender." + o.gender) : "")}
      ${info(t("field.phone"), esc(o.phone))}
      ${info(t("field.email"), esc(o.email))}
      ${info(t("field.city"), esc(o.city))}
      ${info(t("field.listings"), esc(o.listings))}
      ${info(t("field.signedUp"), o.signedUp ? fmtDate(o.signedUp) : "")}
      ${info(t("field.lastContact"), o.lastContact ? fmtDate(o.lastContact) : "")}
      ${info(t("field.social"), o.social ? `<a href="${esc(socialURL(o.social))}" target="_blank" rel="noopener">${esc(o.social)}</a>` : "")}
      ${info(t("th.stage"), t("stage." + ownerType(o)))}
      ${o.notes ? `<div style="margin-top:10px"><span class="muted">${t("field.notes")}</span><div>${esc(o.notes)}</div></div>` : ""}
      <div class="section-title" style="margin:18px 0 10px;font-size:15px">🗒️ ${t("owner.log")}</div>
      ${logHtml}
    </div>
    <div class="modal__foot">
      <button class="btn" data-close>${t("btn.cancel")}</button>
      ${W() ? `<button class="btn btn--primary" data-ologadd="${o.id}">＋ ${t("owner.addLog")}</button>` : ""}
    </div>`);
  const cur = () => db.owners.find(x => x.id === o.id) || o;
  ($("[data-ologadd]") || {}).onclick = () => logContactModal(cur());
  ($("[data-oedit2]") || {}).onclick = () => ownerModal(cur());
  ($("[data-ostar2]") || {}).onclick = () => { const c = cur(); db.updateOwner(c.id, { priority: !c.priority }); render(); ownerProfile(db.owners.find(x => x.id === o.id)); };
  ($("[data-ocomm]") || {}).onclick = () => { const c = cur(); db.updateOwner(c.id, { community: !c.community }); render(); ownerProfile(db.owners.find(x => x.id === o.id)); };
  ($("[data-otask3]") || {}).onclick = () => { const c = cur(); ownerCreateTask(c); };
  ($("[data-oconv2]") || {}).onclick = () => { const c = cur(); db.updateOwner(c.id, { stage: ownerType(c) === "potential" ? "registered" : "potential" }); render(); toast(t("owner.converted")); ownerProfile(db.owners.find(x => x.id === o.id)); };
  $$("[data-close]").forEach(b => b.onclick = closeModal);
}

/* open the task modal pre-linked to an owner */
function ownerCreateTask(o) {
  taskModal(null, { ownerId: o.id, ownerName: o.name, contactMethod: o.phone ? "whatsapp" : (o.email ? "email" : ""), lockOwner: true });
}

/* ---- Log a contact (resets the 2-week timer) ---- */
function logContactModal(owner) {
  openModal(`
    <div class="modal__head"><h3>${t("owner.logTitle")} — ${esc(owner.name || "")}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body">
      <div class="field"><label>${t("owner.summary")}</label><textarea id="lc_sum" placeholder="${t("owner.summaryPh")}"></textarea></div>
      <div class="field"><label>${t("owner.next")}</label><textarea id="lc_next" placeholder="${t("owner.nextPh")}"></textarea></div>
      <div class="field"><label>${t("field.lastContact")}</label><input type="date" id="lc_date" value="${todayISO()}" /></div>
    </div>
    <div class="modal__foot">
      <button class="btn" data-close>${t("btn.cancel")}</button>
      <button class="btn btn--primary" data-save>${t("btn.save")}</button>
    </div>`);
  ($("[data-save]") || {}).onclick = () => {
    const date = $("#lc_date").value || todayISO();
    const entry = { date, summary: $("#lc_sum").value.trim(), next: $("#lc_next").value.trim(), by: (activeUser() && activeUser().name) || "" };
    const log = [entry, ...ownerLog(owner)];
    const patch = { contactLog: log, lastContact: date };
    if (ownerType(owner) !== "potential") patch.stage = "registered";
    db.updateOwner(owner.id, patch);
    closeModal(); render(); toast(t("owner.logged"));
  };
  $$("[data-close]").forEach(b => b.onclick = closeModal);
}

function ownerModal(owner) {
  const x = owner || {};
  const editing = !!owner;
  const types = ["registered", "potential"];
  openModal(`
    <div class="modal__head"><h3>${editing ? t("modal.editOwner") : t("modal.newOwner")}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body">
      <div class="field-row">
        <div class="field"><label>${t("field.name")}</label><input id="o_name" value="${esc(x.name || "")}" /></div>
        <div class="field"><label>${t("field.gender")}</label><select id="o_gender">
          <option value="">—</option>
          <option value="male" ${x.gender === "male" ? "selected" : ""}>${t("gender.male")}</option>
          <option value="female" ${x.gender === "female" ? "selected" : ""}>${t("gender.female")}</option>
        </select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>${t("field.phone")}</label><input id="o_phone" value="${esc(x.phone || "")}" /></div>
        <div class="field"><label>${t("field.email")}</label><input id="o_email" value="${esc(x.email || "")}" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>${t("field.city")}</label><input id="o_city" value="${esc(x.city || "")}" /></div>
        <div class="field"><label>${t("field.listings")}</label><input type="number" id="o_listings" value="${esc(x.listings || "")}" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>${t("field.signedUp")}</label><input type="date" id="o_signed" value="${esc(x.signedUp || "")}" /></div>
        <div class="field"><label>${t("owner.type")}</label><select id="o_stage">${types.map(s => `<option value="${s}" ${(x.stage === "potential" ? "potential" : "registered") === s ? "selected" : ""}>${t("stage." + s)}</option>`).join("")}</select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>${t("field.lastContact")}</label><input type="date" id="o_last" value="${esc(x.lastContact || "")}" /></div>
        <div class="field"><label>${t("field.social")}</label><input id="o_social" placeholder="${t("field.socialPh")}" value="${esc(x.social || "")}" /></div>
      </div>
      <label class="flex" style="gap:8px;cursor:pointer;margin:2px 0"><input type="checkbox" id="o_community" ${x.community ? "checked" : ""} style="width:17px;height:17px" /> 👥 ${t("owner.community")}</label>
      <div class="field"><label>${t("field.notes")}</label><textarea id="o_notes">${esc(x.notes || "")}</textarea></div>
    </div>
    <div class="modal__foot">
      ${editing && D() ? `<button class="btn btn--danger" data-delete>${t("btn.delete")}</button>` : ""}
      <button class="btn" data-close>${t("btn.cancel")}</button>
      ${W() ? `<button class="btn btn--primary" data-save>${t("btn.save")}</button>` : ""}
    </div>`);
  ($("[data-save]") || {}).onclick = () => {
    const data = {
      name: $("#o_name").value.trim(), gender: $("#o_gender").value,
      phone: $("#o_phone").value.trim(), email: $("#o_email").value.trim(),
      city: $("#o_city").value.trim(), listings: $("#o_listings").value,
      signedUp: $("#o_signed").value, lastContact: $("#o_last").value,
      social: $("#o_social").value.trim(),
      community: $("#o_community").checked,
      notes: $("#o_notes").value.trim(), stage: $("#o_stage").value, status: "pending",
    };
    if (!data.name) { $("#o_name").focus(); return; }
    if (editing) db.updateOwner(owner.id, data); else { data.contactLog = []; data.priority = false; db.addOwner(data); }
    closeModal(); render(); toast(t("toast.saved"));
  };
  if (editing) ($("[data-delete]") || {}).onclick = () => { db.removeOwner(owner.id); closeModal(); render(); toast(t("toast.deleted")); };
  $$("[data-close]").forEach(b => b.onclick = closeModal);
}

/* ---- Excel/CSV bulk add + template ---- */
const OWNER_TPL_HEADERS = ["Name", "Gender(male/female)", "Phone", "Email", "City", "Listings", "SignedUp(YYYY-MM-DD)", "LastContact(YYYY-MM-DD)", "Type(registered/potential)", "Notes"];
function downloadOwnerTemplate() {
  const sample = ["Mohammed Ali", "male", "+218911234567", "m.ali@example.ly", "Tripoli", "3", "2026-06-01", "2026-06-20", "registered", "Owns 3 apartments"];
  const csv = "﻿" + OWNER_TPL_HEADERS.join(",") + "\n" + sample.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",") + "\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "ajrly-owners-template.csv"; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function parseCSV(text) {
  const rows = []; let row = [], val = "", q = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { val += '"'; i++; } else q = false; } else val += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(val); val = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(val); rows.push(row); row = []; val = ""; }
    else val += c;
  }
  if (val !== "" || row.length) { row.push(val); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim() !== ""));
}
async function rowsFromFile(file) {
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".csv")) return parseCSV(await file.text());
  // xlsx/xls → lazy-load SheetJS
  const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
}
async function ownerBulkAdd(file) {
  let rows;
  try { rows = await rowsFromFile(file); }
  catch (e) { toast(t("owner.xlsxErr")); return; }
  if (!rows || rows.length < 2) { toast(t("intg.import.none")); return; }
  const header = rows[0].map(h => String(h || "").toLowerCase());
  const idx = (k) => header.findIndex(h => h.includes(k));
  const iName = idx("name"), iGen = idx("gender"), iPhone = idx("phone"), iEmail = idx("email"),
    iCity = idx("city"), iList = idx("listing"), iSigned = idx("signed"), iLast = idx("contact"),
    iType = idx("type"), iNotes = idx("note");
  const existing = new Set(db.owners.map(o => (o.phone || "") + "|" + (o.email || "")));
  let added = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]; const get = (i) => (i >= 0 && row[i] != null ? String(row[i]).trim() : "");
    const name = get(iName); if (!name) continue;
    const phone = get(iPhone), email = get(iEmail);
    if (existing.has(phone + "|" + email) && (phone || email)) continue;
    const typ = get(iType).toLowerCase().includes("potential") ? "potential" : "registered";
    db.addOwner({
      name, gender: get(iGen).toLowerCase().startsWith("f") ? "female" : (get(iGen) ? "male" : ""),
      phone, email, city: get(iCity), listings: get(iList), signedUp: get(iSigned),
      lastContact: get(iLast), notes: get(iNotes), stage: typ, status: "pending", contactLog: [], priority: false,
    });
    existing.add(phone + "|" + email); added++;
  }
  render(); toast(t("owner.bulkAdded").replace("{n}", added));
}

/* ============================================================
   VIEW: Strategy
   ============================================================ */
function viewStrategy() {
  return `
  <div class="card">
    <div class="card__head"><span class="card__title">${t("section.links")}</span></div>
    <div class="grid cards-4">
      ${LINKS.map(l => `<a class="card" style="background:var(--surface-2);text-align:center" href="${l.url}" target="_blank" rel="noopener">
        <div style="font-size:24px">${l.icon}</div>
        <div style="margin-top:8px;font-weight:600">${esc(l.label)}</div>
      </a>`).join("")}
    </div>
  </div>

  <div class="card" style="margin-top:16px">
    <div class="card__head"><span class="card__title">${t("section.values")}</span></div>
    <div class="values">${CORE_VALUES.map(v => `<span class="value-pill">${esc(v)}</span>`).join("")}</div>
  </div>

  <div class="card" style="margin-top:16px">
    <div class="card__head"><span class="card__title">${t("section.goals")}</span></div>
    <div class="grid cards-4">
      ${GOALS.map((g, i) => `<div class="card" style="background:var(--surface-2)">
        <span class="stat__icon" style="background:var(--brand-soft);color:var(--brand)">${["🫂","🎓","🔍","💎"][i] || "🎯"}</span>
        <div style="margin-top:10px;font-weight:600">${esc(g)}</div>
      </div>`).join("")}
    </div>
  </div>

  <div class="section-title">${t("section.pillars")}</div>
  <div class="pillar-grid">
    ${PILLARS.map(p => `<div class="pillar">
      <div class="pillar__icon">${p.icon}</div>
      <div class="pillar__name">${esc(p.name)}</div>
      <div class="pillar__sub">${esc(p.sub)}</div>
      <div class="pillar__purpose">${esc(p.purpose)}</div>
    </div>`).join("")}
  </div>`;
}

/* ============================================================
   Router + render
   ============================================================ */
const coreRoutes = {
  dashboard: { view: viewDashboard, title: "page.dashboard", sub: "page.dashboard.sub", icon: "📊", labelKey: "nav.dashboard", order: 10 },
  tasks: { view: viewTasks, title: "page.tasks", sub: "page.tasks.sub", icon: "✅", labelKey: "nav.tasks", order: 20 },
  owners: { view: viewOwners, title: "page.owners", sub: "page.owners.sub", icon: "🏠", labelKey: "nav.owners", order: 40 },
};

function allRoutes() {
  const r = { ...coreRoutes };
  for (const m of moduleRoutes) {
    r[m.id] = { view: m.view, title: m.titleKey, sub: m.subKey, icon: m.icon, labelKey: m.labelKey, mount: m.mount, order: m.order ?? 100 };
  }
  return r;
}

function currentRoute() {
  const r = location.hash.replace("#/", "") || "dashboard";
  return allRoutes()[r] ? r : "dashboard";
}

function buildNav() {
  const routes = allRoutes();
  const items = Object.entries(routes).sort((a, b) => a[1].order - b[1].order);
  $("#nav").innerHTML = items.map(([id, r]) =>
    `<a class="nav__item" href="#/${id}" data-route="${id}"><span class="nav__icon">${r.icon || "•"}</span><span>${esc(t(r.labelKey || id))}</span></a>`
  ).join("");
  $$("#nav .nav__item").forEach(a => a.onclick = () => $("#sidebar").classList.remove("open"));
}

function render() {
  // Auth gate — must be signed in to use the app
  if (!activeUser()) { renderAuthScreen(); return; }
  document.body.classList.remove("authing");
  renderUserChip();
  // roll daily recurring tasks forward (after boot so data is loaded)
  if (bootDone) { try { rollRecurringTasks(); } catch (_) {} }
  try {
    stopTimerTicker();
    const r = currentRoute();
    const route = allRoutes()[r];
    $("#pageTitle").textContent = t(route.title);
    $("#pageSubtitle").textContent = t(route.sub);
    $("#view").innerHTML = route.view();
    $$("#nav .nav__item").forEach(a => a.classList.toggle("active", a.dataset.route === r));
    if (route.mount) route.mount({ render, toast, t, db }); else bindViewEvents(r);
  } catch (err) {
    // Never leave a blank/black screen — surface the error instead.
    console.error(err);
    $("#view").innerHTML = `<div class="card"><div class="empty"><div class="empty__icon">⚠️</div>
      <h3>Something went wrong</h3><p class="muted">${esc(err && err.message || err)}</p></div></div>`;
  }
}

/* ---------------- Auth screen (login / register) ---------------- */
let authMode = null;
function renderAuthScreen() {
  document.body.classList.add("authing");
  if (authMode === null) authMode = hasUsers() ? "login" : "register";
  const reg = authMode === "register";
  const first = !hasUsers();
  $("#view").innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card card">
        <div class="auth-brand">
          <div class="brand__logo"><img src="./assets/img/ajrly-key.svg" alt="Ajrly" /></div>
          <div><div style="font-weight:800;font-size:18px">Ajrly <span style="color:var(--brand)">OS</span></div>
          <div class="muted">${esc(t("auth.welcome"))}</div></div>
        </div>
        <div class="seg" style="width:100%;margin:6px 0 16px">
          <button data-am="login" class="${reg ? "" : "active"}" style="flex:1">${esc(t("auth.login"))}</button>
          <button data-am="register" class="${reg ? "active" : ""}" style="flex:1">${esc(t("auth.register"))}</button>
        </div>
        ${reg && first ? `<p class="muted" style="margin-bottom:10px">🛡️ ${esc(t("auth.firstNote"))}</p>` : ""}
        ${reg ? `<div class="field"><label>${esc(t("auth.name"))}</label><input id="a_name" /></div>` : ""}
        <div class="field"><label>${esc(t("auth.email"))}</label><input id="a_email" type="email" autocomplete="username" /></div>
        <div class="field"><label>${esc(t("auth.password"))}</label><input id="a_pw" type="password" autocomplete="${reg ? "new-password" : "current-password"}" /></div>
        <p id="a_err" style="color:var(--st-overdue);font-size:12.5px;min-height:16px;margin:4px 0"></p>
        <button class="btn btn--primary" id="a_submit" style="width:100%">${esc(reg ? t("auth.register") : t("auth.login"))}</button>
        <p class="muted" style="text-align:center;margin-top:12px;cursor:pointer" id="a_toggle">${esc(reg ? t("auth.haveAccount") : t("auth.noAccount"))}</p>
      </div>
    </div>`;

  $$("[data-am]").forEach(b => b.onclick = () => { authMode = b.dataset.am; renderAuthScreen(); });
  $("#a_toggle").onclick = () => { authMode = reg ? "login" : "register"; renderAuthScreen(); };
  const submit = async () => {
    const err = $("#a_err");
    const btn = $("#a_submit");
    const email = $("#a_email").value, pw = $("#a_pw").value;
    const name = $("#a_name") ? $("#a_name").value : "";
    btn.disabled = true;
    try {
      if (cloudReady) {
        // Cloud auth: server creates the session cookie; sync data after.
        cloudUser = reg ? await cloud.register(name, email, pw) : await cloud.login(email, pw);
        try { const data = await hydrateFromCloud(db); if (data && data.users) cloudTeam = data.users.map(u => u.name); } catch (_) {}
        wireWriteThrough(db, (e) => console.warn("cloud write failed", e));
        try { AjrlyPresence.start(); } catch (_) {}
      } else {
        const res = reg ? await register({ name, email, password: pw }) : await login(email, pw);
        if (res.error) { err.textContent = t("auth.err." + res.error) || res.error; btn.disabled = false; return; }
      }
      authMode = null;
      try { markActive(); } catch (_) {}
      toast(t("auth.signedIn"));
      location.hash = "#/dashboard";
      render();
    } catch (e) {
      const code = (e && e.code) || "invalid";
      err.textContent = t("auth.err." + code) !== ("auth.err." + code) ? t("auth.err." + code) : t("auth.err.invalid");
      btn.disabled = false;
    }
  };
  $("#a_submit").onclick = submit;
  ["a_email", "a_pw", "a_name"].forEach(id => { const el = $("#" + id); if (el) el.onkeydown = (e) => { if (e.key === "Enter") submit(); }; });
}

/* ---------------- Sidebar user chip ---------------- */
function renderUserChip() {
  const u = activeUser();
  const foot = $(".sidebar__footer");
  if (!u || !foot) return;
  const initials = String(u.name || "?").trim().slice(0, 2).toUpperCase();
  const roleLabel = t("role." + u.role);
  foot.innerHTML = `
    <a class="user-chip" href="#/account" style="text-decoration:none">
      <div class="user-chip__avatar">${esc(initials)}</div>
      <div class="user-chip__meta">
        <span class="user-chip__name">${esc(u.name)}</span>
        <span class="user-chip__role">${esc(roleLabel)}</span>
      </div>
    </a>
    <button class="btn btn--sm" id="logoutBtn" style="width:100%;margin-top:8px">⎋ ${esc(t("auth.logout"))}</button>`;
  $("#logoutBtn").onclick = async () => {
    try { AjrlyPresence.stop && AjrlyPresence.stop(); } catch (_) {}
    if (cloudReady) { try { await cloud.logout(); } catch (_) {} cloudUser = null; }
    else { logout(); }
    authMode = null; render();
  };
}

function bindViewEvents(r) {
  stopTimerTicker();
  // Tasks
  if (r === "tasks") {
    $("#addTask") && ($("#addTask").onclick = () => taskModal(null));
    $$("[data-ttab]").forEach(b => b.onclick = () => { taskTab = b.dataset.ttab; render(); });
    $("#memberFilter") && ($("#memberFilter").onchange = (e) => { taskMember = e.target.value; render(); });
    $$("[data-edit]").forEach(b => b.onclick = () => taskModal(db.tasks.find(x => x.id === b.dataset.edit)));
    $$("[data-del]").forEach(b => b.onclick = () => { if (confirm(t("confirm.delete"))) { db.removeTask(b.dataset.del); render(); toast(t("toast.deleted")); } });
    $$("[data-timer]").forEach(b => b.onclick = () => toggleTaskTimer(b.dataset.timer));
    startTimerTicker();
  }
  // Content
  if (r === "content") {
    $("#addPost") && ($("#addPost").onclick = () => contentModal(null));
    $$("[data-cmode]").forEach(b => b.onclick = () => { contentMode = b.dataset.cmode; render(); });
    $$("[data-cedit]").forEach(b => b.onclick = () => contentModal(db.content.find(x => x.id === b.dataset.cedit)));
    $$("[data-cdel]").forEach(b => b.onclick = () => { if (confirm(t("confirm.delete"))) { db.removeContent(b.dataset.cdel); render(); toast(t("toast.deleted")); } });
  }
  // Owners
  if (r === "owners") {
    $$("[data-otab]").forEach(b => b.onclick = () => { ownerTab = b.dataset.otab; render(); });
    $("#addOwner") && ($("#addOwner").onclick = () => ownerModal(null));
    $$("[data-oedit]").forEach(b => b.onclick = () => ownerModal(db.owners.find(x => x.id === b.dataset.oedit)));
    $$("[data-odel]").forEach(b => b.onclick = () => { if (confirm(t("confirm.delete"))) { db.removeOwner(b.dataset.odel); render(); toast(t("toast.deleted")); } });
    $$("[data-oprofile]").forEach(b => b.onclick = (e) => { e.preventDefault(); ownerProfile(db.owners.find(x => x.id === b.dataset.oprofile)); });
    $$("[data-ostar]").forEach(b => b.onclick = () => { const o = db.owners.find(x => x.id === b.dataset.ostar); db.updateOwner(o.id, { priority: !o.priority }); render(); });
    $$("[data-ocontact]").forEach(b => b.onclick = (e) => { e.preventDefault(); logContactModal(db.owners.find(x => x.id === b.dataset.ocontact)); });
    $$("[data-oconv]").forEach(b => b.onclick = () => { const o = db.owners.find(x => x.id === b.dataset.oconv); db.updateOwner(o.id, { stage: ownerType(o) === "potential" ? "registered" : "potential" }); render(); toast(t("owner.converted")); });
    $("#ownerTpl") && ($("#ownerTpl").onclick = downloadOwnerTemplate);
    $("#ownerXlsx") && ($("#ownerXlsx").onclick = () => $("#ownerFile") && $("#ownerFile").click());
    $("#ownerFile") && ($("#ownerFile").onchange = (e) => { const f = e.target.files[0]; if (f) ownerBulkAdd(f); e.target.value = ""; });
    // owner-help tasks
    $$("[data-otask]").forEach(b => b.onclick = () => ownerCreateTask(db.owners.find(x => x.id === b.dataset.otask)));
    $("#addOwnerTask") && ($("#addOwnerTask").onclick = () => taskModal(null, {}));
    $$("[data-otaskedit]").forEach(b => b.onclick = () => taskModal(db.tasks.find(x => x.id === b.dataset.otaskedit)));
    $$("[data-otaskdone]").forEach(b => b.onclick = () => {
      applyTaskStatus(b.dataset.otaskdone, b.checked ? "complete" : "pending");
      render(); toast(t("toast.saved"));
    });
  }
}

/* ============================================================
   Chrome: language, theme, sidebar, search, i18n labels
   ============================================================ */
function applyLang() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  $$("[data-i18n]").forEach(el => el.textContent = t(el.dataset.i18n));
  $$("[data-i18n-ph]").forEach(el => el.placeholder = t(el.dataset.i18nPh));
  buildNav();
}

function initChrome() {
  // theme
  const savedTheme = localStorage.getItem("ajrly_theme") || "light";
  document.body.dataset.theme = savedTheme;
  $("#themeToggle").textContent = savedTheme === "dark" ? "☀️" : "🌙";
  $("#themeToggle").onclick = () => {
    const next = document.body.dataset.theme === "dark" ? "light" : "dark";
    document.body.dataset.theme = next;
    localStorage.setItem("ajrly_theme", next);
    $("#themeToggle").textContent = next === "dark" ? "☀️" : "🌙";
  };
  // language
  $("#langToggle").onclick = () => { setLang(getLang() === "ar" ? "en" : "ar"); applyLang(); render(); };
  // search
  $("#globalSearch").oninput = (e) => { searchQuery = e.target.value.trim(); if (currentRoute() === "tasks") render(); };
  // sidebar mobile
  const sb = $("#sidebar");
  $("#menuToggle").onclick = () => sb.classList.toggle("open");
}

/* Expose a tiny API for feature modules (charts, exports, etc.).
   Must be set BEFORE the first render so module views can read it.
   `can`/`currentUser` resolve against the active (cloud or local) user. */
window.AjrlyOS = {
  db, t, getLang, render, toast, openModal, closeModal, esc, fmtDate,
  PILLARS, GOALS, TEAM, OWNER_STAGES, team,
  currentUser: () => activeUser(),
  can: (action, u) => can(action, u || activeUser()),
  isCloud: () => cloudReady,
  cloud,
};

/* Boot — wrapped so a failure shows an error instead of a black screen.
   Detect the cloud backend first; if live, restore the session and hydrate
   shared data, then render. Always falls back to local mode on any failure. */
window.addEventListener("hashchange", render);
async function boot() {
  initChrome();
  buildNav();
  applyLang();
  render(); // instant first paint (local); re-rendered after cloud detection
  try {
    cloudReady = await cloud.detect();
    if (cloudReady) {
      try {
        cloudUser = await cloud.me();          // restore session if cookie valid
        if (cloudUser) {
          const data = await hydrateFromCloud(db);
          if (data && data.users) cloudTeam = data.users.map(u => u.name);
          wireWriteThrough(db, (e) => console.warn("cloud write failed", e));
          try { AjrlyPresence.start(); } catch (_) {}
        }
      } catch (_) { cloudUser = null; }
    }
  } catch (_) { cloudReady = false; }
  bootDone = true;   // enable recurring-task rolling now that data is loaded
  try { markActive(); } catch (_) {}
  render();
}
try {
  boot();
} catch (err) {
  console.error("Boot failed:", err);
  const v = document.getElementById("view");
  if (v) v.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444">⚠️ ${String(err && err.message || err)}</div>`;
}
