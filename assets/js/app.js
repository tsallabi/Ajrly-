/* ============================================================
   Ajrly OS — Application core (router + views)
   ============================================================ */
import { db, PILLARS, CORE_VALUES, GOALS, TEAM, OWNER_STAGES, LINKS } from "./data.js";
import { t, getLang, setLang, registerStrings } from "./i18n.js";
import { moduleRoutes } from "./registry.js";
import { currentUser, hasUsers, login, register, logout, can, teamNames } from "./auth.js";
/* Feature modules (self-register via registry). Order = nav order. */
import "./modules/analytics.js";
import "./modules/integrations.js";
import "./modules/account.js";
import "./modules/team.js";
import "./modules/support.js";
import "./modules/performance.js";
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

  const pillarMix = PILLARS.map(p => ({ p: p.name, n: db.content.filter(c => c.pillar === p.name).length })).filter(x => x.n > 0);
  const maxPil = Math.max(1, ...pillarMix.map(x => x.n));

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

  <div class="grid cards-2" style="margin-top:16px">
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

    <div class="card">
      <div class="card__head"><span class="card__title">${t("card.pillarsMix")}</span><a class="btn btn--ghost btn--sm" href="#/content">→</a></div>
      <div class="barlist">
        ${pillarMix.length ? pillarMix.map(x => `
          <div class="barlist__row" style="grid-template-columns:160px 1fr 36px">
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.p)}</span>
            <div class="barlist__track"><div class="barlist__fill" style="width:${(x.n / maxPil) * 100}%;background:var(--accent)"></div></div>
            <span class="barlist__val">${x.n}</span>
          </div>`).join("") : `<div class="empty muted">—</div>`}
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
let tasksMode = "board";
let taskMember = "";

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
  const seg = `<div class="seg">
    <button data-mode="board" class="${tasksMode === "board" ? "active" : ""}">${t("view.board")}</button>
    <button data-mode="table" class="${tasksMode === "table" ? "active" : ""}">${t("view.table")}</button>
  </div>`;
  const memberFilter = `<select class="input" id="memberFilter">
    <option value="">${t("filter.member")}</option>
    ${team().map(m => `<option value="${m}" ${taskMember === m ? "selected" : ""}>${m}</option>`).join("")}
  </select>`;
  const toolbar = `<div class="toolbar">
    <div class="toolbar__left">${seg}${memberFilter}</div>
    <div class="toolbar__right">
      ${W() ? `<button class="btn btn--primary" id="addTask">＋ ${t("btn.newTask")}</button>` : ""}
    </div>
  </div>`;
  return toolbar + (tasksMode === "board" ? tasksBoard() : tasksTable());
}

function tasksBoard() {
  const cols = ["pending", "progress", "complete", "overdue", "closed"];
  const list = filterTasks();
  return `<div class="kanban">${cols.map(col => {
    const items = list.filter(x => x.status === col);
    return `<div class="kcol" data-col="${col}">
      <div class="kcol__head"><h4>${t(STATUS_KEYS[col])}</h4><span class="kcol__count">${items.length}</span></div>
      ${items.map(taskCard).join("")}
    </div>`;
  }).join("")}</div>`;
}

function taskCard(x) {
  const who = x.delegateTo || x.assignedBy;
  return `<div class="kcard pri-${(x.priority || "low").toLowerCase()}" draggable="true" data-id="${x.id}">
    <div class="kcard__title">${esc(x.title)}</div>
    <div class="kcard__meta">${priChip(x.priority)}<span class="muted">${fmtDate(x.dueDate)}</span></div>
    <div class="kcard__foot">
      ${who ? `<span class="avatar-sm" title="${esc(who)}">${initials(who)}</span>` : "<span></span>"}
      <button class="btn btn--ghost btn--sm" data-edit="${x.id}">${t("btn.edit")}</button>
    </div>
  </div>`;
}

function tasksTable() {
  const list = filterTasks();
  return `<div class="table-wrap"><table>
    <thead><tr>
      <th>${t("th.task")}</th><th>${t("th.priority")}</th><th>${t("th.assignedBy")}</th>
      <th>${t("th.dueDate")}</th><th>${t("th.status")}</th><th>${t("th.delegate")}</th><th></th>
    </tr></thead>
    <tbody>
      ${list.map(x => `<tr>
        <td><div class="cell-title">${esc(x.title)}</div><div class="muted">${esc(x.description || "")}</div></td>
        <td>${priChip(x.priority)}</td>
        <td>${x.assignedBy ? `<span class="flex" style="gap:7px"><span class="avatar-sm">${initials(x.assignedBy)}</span>${esc(x.assignedBy)}</span>` : "—"}</td>
        <td>${fmtDate(x.dueDate)}</td>
        <td>${statusBadge(x.status)}</td>
        <td>${x.delegateTo ? esc(x.delegateTo) : "—"}</td>
        <td><div class="row-actions">
          <button class="btn btn--ghost btn--sm" data-edit="${x.id}">✎</button>
          ${D() ? `<button class="btn btn--ghost btn--sm btn--danger" data-del="${x.id}">🗑</button>` : ""}
        </div></td>
      </tr>`).join("")}
    </tbody>
  </table></div>`;
}

function taskModal(task) {
  const x = task || { priority: "Medium", status: "pending" };
  const editing = !!task;
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
    </div>
    <div class="modal__foot">
      ${editing && D() ? `<button class="btn btn--danger" data-delete>${t("btn.delete")}</button>` : ""}
      <button class="btn" data-close>${t("btn.cancel")}</button>
      ${W() ? `<button class="btn btn--primary" data-save>${t("btn.save")}</button>` : ""}
    </div>`);

  ($("[data-save]") || {}).onclick = () => {
    const data = {
      title: $("#f_title").value.trim(), description: $("#f_desc").value.trim(),
      priority: $("#f_pri").value, status: $("#f_status").value,
      assignedBy: $("#f_by").value, delegateTo: $("#f_del").value,
      dueDate: $("#f_due").value, duration: $("#f_dur").value,
    };
    if (!data.title) { $("#f_title").focus(); return; }
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
const stageBadge = (s) => `<span class="tag" style="background:var(--brand-soft);color:var(--brand);border-color:transparent">${esc(t("stage." + (s || "recruitment")))}</span>`;

function viewOwners() {
  const owners = db.owners;
  // pipeline summary (maps the sheet's 3 owner tabs into one funnel)
  const pipeline = `<div class="grid cards-4" style="margin-bottom:16px">
    ${OWNER_STAGES.map((st, i) => {
      const n = owners.filter(o => (o.stage || "recruitment") === st).length;
      return `<div class="card stat">
        <div class="stat__top"><span class="stat__icon" style="background:var(--brand-soft);color:var(--brand)">${["📣","💬","🎬","✅"][i]}</span></div>
        <span class="stat__value">${n}</span><span class="stat__label">${t("stage." + st)}</span>
      </div>`;
    }).join("")}
  </div>`;
  const toolbar = `<div class="toolbar">
    <div class="toolbar__left"><span class="card__title">${t("owners.pipeline")}</span><span class="muted">${owners.length} ${t("th.owner")}</span></div>
    <div class="toolbar__right">${W() ? `<button class="btn btn--primary" id="addOwner">＋ ${t("btn.newOwner")}</button>` : ""}</div>
  </div>`;
  if (!owners.length) {
    return toolbar + pipeline + `<div class="card"><div class="empty">
      <div class="empty__icon">🏠</div>
      <h3>${t("empty.owners")}</h3>
      <p class="muted">${t("empty.owners.sub")}</p>
    </div></div>`;
  }
  return toolbar + pipeline + `<div class="table-wrap"><table>
    <thead><tr>
      <th>${t("th.owner")}</th><th>${t("th.phone")}</th><th>${t("th.email")}</th><th>${t("th.listings")}</th>
      <th>${t("th.stage")}</th><th>${t("th.lastContact")}</th><th></th>
    </tr></thead>
    <tbody>${owners.map(o => `<tr>
      <td><span class="flex" style="gap:8px"><span class="avatar-sm">${initials(o.name)}</span>${esc(o.name || "—")}</span></td>
      <td>${esc(o.phone || "—")}</td><td>${esc(o.email || "—")}</td><td>${esc(o.listings || "0")}</td>
      <td>${stageBadge(o.stage)}</td>
      <td>${fmtDate(o.lastContact)}</td>
      <td><div class="row-actions">
        <button class="btn btn--ghost btn--sm" data-oedit="${o.id}">✎</button>
        ${D() ? `<button class="btn btn--ghost btn--sm btn--danger" data-odel="${o.id}">🗑</button>` : ""}
      </div></td>
    </tr>`).join("")}</tbody>
  </table></div>`;
}

function ownerModal(owner) {
  const x = owner || {};
  const editing = !!owner;
  openModal(`
    <div class="modal__head"><h3>${editing ? t("modal.editOwner") : t("modal.newOwner")}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body">
      <div class="field"><label>${t("field.name")}</label><input id="o_name" value="${esc(x.name || "")}" /></div>
      <div class="field-row">
        <div class="field"><label>${t("field.phone")}</label><input id="o_phone" value="${esc(x.phone || "")}" /></div>
        <div class="field"><label>${t("field.email")}</label><input id="o_email" value="${esc(x.email || "")}" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>${t("field.listings")}</label><input type="number" id="o_listings" value="${esc(x.listings || "")}" /></div>
        <div class="field"><label>${t("field.stage")}</label><select id="o_stage">${OWNER_STAGES.map(s => `<option value="${s}" ${x.stage === s ? "selected" : ""}>${t("stage." + s)}</option>`).join("")}</select></div>
      </div>
      <div class="field"><label>${t("field.lastContact")}</label><input type="date" id="o_last" value="${esc(x.lastContact || "")}" /></div>
      <div class="field"><label>${t("field.notes")}</label><textarea id="o_notes">${esc(x.notes || "")}</textarea></div>
    </div>
    <div class="modal__foot">
      ${editing && D() ? `<button class="btn btn--danger" data-delete>${t("btn.delete")}</button>` : ""}
      <button class="btn" data-close>${t("btn.cancel")}</button>
      ${W() ? `<button class="btn btn--primary" data-save>${t("btn.save")}</button>` : ""}
    </div>`);
  ($("[data-save]") || {}).onclick = () => {
    const data = {
      name: $("#o_name").value.trim(), phone: $("#o_phone").value.trim(), email: $("#o_email").value.trim(),
      listings: $("#o_listings").value, lastContact: $("#o_last").value, notes: $("#o_notes").value.trim(),
      stage: $("#o_stage").value, status: "pending",
    };
    if (!data.name) { $("#o_name").focus(); return; }
    if (editing) db.updateOwner(owner.id, data); else db.addOwner(data);
    closeModal(); render(); toast(t("toast.saved"));
  };
  if (editing) ($("[data-delete]") || {}).onclick = () => { db.removeOwner(owner.id); closeModal(); render(); toast(t("toast.deleted")); };
  $$("[data-close]").forEach(b => b.onclick = closeModal);
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
  content: { view: viewContent, title: "page.content", sub: "page.content.sub", icon: "📅", labelKey: "nav.content", order: 30 },
  owners: { view: viewOwners, title: "page.owners", sub: "page.owners.sub", icon: "🏠", labelKey: "nav.owners", order: 40 },
  strategy: { view: viewStrategy, title: "page.strategy", sub: "page.strategy.sub", icon: "🎯", labelKey: "nav.strategy", order: 90 },
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
  try {
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
  // Tasks
  if (r === "tasks") {
    $("#addTask") && ($("#addTask").onclick = () => taskModal(null));
    $$("[data-mode]").forEach(b => b.onclick = () => { tasksMode = b.dataset.mode; render(); });
    $("#memberFilter") && ($("#memberFilter").onchange = (e) => { taskMember = e.target.value; render(); });
    $$("[data-edit]").forEach(b => b.onclick = () => taskModal(db.tasks.find(x => x.id === b.dataset.edit)));
    $$("[data-del]").forEach(b => b.onclick = () => { if (confirm(t("confirm.delete"))) { db.removeTask(b.dataset.del); render(); toast(t("toast.deleted")); } });
    enableDragDrop();
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
    $("#addOwner") && ($("#addOwner").onclick = () => ownerModal(null));
    $$("[data-oedit]").forEach(b => b.onclick = () => ownerModal(db.owners.find(x => x.id === b.dataset.oedit)));
    $$("[data-odel]").forEach(b => b.onclick = () => { if (confirm(t("confirm.delete"))) { db.removeOwner(b.dataset.odel); render(); toast(t("toast.deleted")); } });
  }
}

/* Kanban drag & drop */
function enableDragDrop() {
  let dragId = null;
  $$(".kcard").forEach(c => {
    c.addEventListener("dragstart", () => { dragId = c.dataset.id; c.style.opacity = ".5"; });
    c.addEventListener("dragend", () => { c.style.opacity = "1"; });
    // clicking the body (not edit btn) opens edit
    c.addEventListener("click", (e) => { if (!e.target.closest("[data-edit]")) taskModal(db.tasks.find(x => x.id === c.dataset.id)); });
  });
  $$(".kcol").forEach(col => {
    col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("drag-over"); });
    col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
    col.addEventListener("drop", (e) => {
      e.preventDefault(); col.classList.remove("drag-over");
      if (dragId) { db.updateTask(dragId, { status: col.dataset.col }); render(); }
    });
  });
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
  render();
}
try {
  boot();
} catch (err) {
  console.error("Boot failed:", err);
  const v = document.getElementById("view");
  if (v) v.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444">⚠️ ${String(err && err.message || err)}</div>`;
}
