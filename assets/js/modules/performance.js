/* ============================================================
   Ajrly OS — Employee Performance module (WS-D)
   Per-employee performance: Ajrly Score gauge (pure SVG, theme + RTL
   aware), core metrics, an activity heatmap (last ~8 weeks) and a
   leaderboard. Filters: member + date range.

   Data source:
   - Cloud mode: GET /api/performance (credentials:'include') ->
       { users:[{id,name,role,completionRate,onTimeRate,tasksPerDay,
                 tasksDone,activeMinutes,avgFirstResponse,ticketsResolved,
                 ajrlyScore}], generatedAt }
   - Local mode (cloud off): compute a BASIC version from
       window.AjrlyOS.db.tasks (completion / on-time / by-member) so the
       view still shows something. No activity/CS data -> shown as "—".

   Dependency-free, RTL-aware, theme-aware (CSS variables only).
   ============================================================ */
import { registerModule } from "../registry.js";
import { registerStrings, t, getLang } from "../i18n.js";

/* ---------------- i18n ---------------- */
registerStrings({
  ar: {
    "nav.performance": "الأداء",
    "page.performance": "أداء الموظفين",
    "page.performance.sub": "مؤشرات أداء لكل موظف ولوحة المتصدرين",

    "pf.filter.member": "العضو",
    "pf.filter.from": "من تاريخ",
    "pf.filter.to": "إلى تاريخ",
    "pf.filter.reset": "إعادة ضبط",
    "pf.filter.all": "كل الفريق",
    "pf.refresh": "تحديث",

    "pf.score": "نقاط أجرلي",
    "pf.leaderboard": "لوحة المتصدرين",
    "pf.rank": "الترتيب",
    "pf.member": "الموظف",

    "pf.m.completion": "نسبة الإنجاز",
    "pf.m.onTime": "الالتزام بالموعد",
    "pf.m.perDay": "مهام/يوم",
    "pf.m.done": "مهام منجزة",
    "pf.m.active": "دقائق النشاط",
    "pf.m.firstResp": "متوسط أول رد",
    "pf.m.tickets": "تذاكر محلولة",
    "pf.m.min": "د",

    "pf.heatmap": "نشاط آخر 8 أسابيع",
    "pf.calendar": "النشاط الشهري",
    "pf.local.note": "وضع محلي — مؤشرات أساسية من المهام فقط",
    "pf.empty": "لا توجد بيانات أداء",
    "pf.na": "—",
    "pf.generatedOn": "حُدّث في",
  },
  en: {
    "nav.performance": "Performance",
    "page.performance": "Employee Performance",
    "page.performance.sub": "Per-employee metrics and leaderboard",

    "pf.filter.member": "Member",
    "pf.filter.from": "From",
    "pf.filter.to": "To",
    "pf.filter.reset": "Reset",
    "pf.filter.all": "All team",
    "pf.refresh": "Refresh",

    "pf.score": "Ajrly Score",
    "pf.leaderboard": "Leaderboard",
    "pf.rank": "Rank",
    "pf.member": "Member",

    "pf.m.completion": "Completion",
    "pf.m.onTime": "On-time",
    "pf.m.perDay": "Tasks/day",
    "pf.m.done": "Tasks done",
    "pf.m.active": "Active minutes",
    "pf.m.firstResp": "Avg first response",
    "pf.m.tickets": "Tickets resolved",
    "pf.m.min": "min",

    "pf.heatmap": "Activity — last 8 weeks",
    "pf.calendar": "Monthly activity",
    "pf.local.note": "Local mode — basic metrics from tasks only",
    "pf.empty": "No performance data",
    "pf.na": "—",
    "pf.generatedOn": "Updated",
  },
});

/* ---------------- module-scope state ---------------- */
let fMember = "";       // "" = all
let fFrom = "";         // ISO date
let fTo = "";           // ISO date
let cache = null;       // last fetched/computed { users, generatedAt, local }
let loading = false;
let weekHoursMap = {};  // { memberName: seconds } accumulated this week (from task timers)
let calOffset = 0;      // months back from the current month for the attendance calendar (0 = this month)

/* ---------------- helpers ---------------- */
const OS = () => window.AjrlyOS || {};

/* current week (Mon 00:00 .. next Mon) as epoch ms */
function weekRange() {
  const now = new Date();
  const diffToMon = (now.getDay() + 6) % 7;       // 0=Mon .. 6=Sun
  const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(now.getDate() - diffToMon);
  const end = new Date(start); end.setDate(start.getDate() + 7);
  return { start: start.getTime(), end: end.getTime() };
}
/* sum task-timer sessions per member for the current week (seconds) */
function computeWeekHours() {
  const { start, end } = weekRange();
  const tasks = (OS().db && OS().db.tasks) || [];
  const map = {};
  tasks.forEach(x => {
    let log = x.timeLog;
    if (typeof log === "string" && log) { try { log = JSON.parse(log); } catch (e) { log = []; } }
    if (!Array.isArray(log)) return;
    log.forEach(s => {
      const tEnd = new Date(s.end || s.start).getTime();
      if (isNaN(tEnd) || tEnd < start || tEnd >= end) return;
      const who = s.by || x.delegateTo || x.assignedBy || "";
      if (who) map[who] = (map[who] || 0) + (Number(s.seconds) || 0);
    });
  });
  return map;
}
/* seconds -> hours with one decimal */
const weekHoursOf = (name) => Math.round(((weekHoursMap[name] || 0) / 3600) * 10) / 10;
const esc = (s) => (OS().esc ? OS().esc(s) : String(s ?? ""));
const isRTL = () => getLang() === "ar";
function nf(n) { return Number(n || 0).toLocaleString(getLang() === "ar" ? "ar-EG" : "en-GB"); }
function fmtDate(iso) { return OS().fmtDate ? OS().fmtDate(iso) : (iso || "—"); }
function na() { return `<span class="muted">${esc(t("pf.na"))}</span>`; }

function inRange(iso) {
  if (!iso) return !(fFrom || fTo);
  if (fFrom && iso < fFrom) return false;
  if (fTo && iso > fTo) return false;
  return true;
}
function scoreColor(s) {
  if (s >= 80) return "var(--st-complete)";
  if (s >= 60) return "var(--brand)";
  if (s >= 40) return "var(--accent)";
  return "var(--st-overdue, #ef4444)";
}

/* ============================================================
   Cloud fetch + local fallback
   ============================================================ */
async function loadCloud() {
  const res = await fetch("/api/performance", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("perf_" + res.status);
  const data = await res.json();
  return { users: data.users || [], generatedAt: data.generatedAt || null, local: false };
}

/* BASIC local computation from window.AjrlyOS.db.tasks.
   Uses the same name-based ownership the rest of the app uses. */
function computeLocal() {
  const TEAM = (OS().team ? OS().team() : OS().TEAM) || [];
  let tasks = (OS().db && OS().db.tasks) || [];
  if (fFrom || fTo) tasks = tasks.filter(x => inRange(x.date) || inRange(x.dueDate));

  const touches = (x, m) => x.assignedBy === m || x.delegateTo === m;
  const users = TEAM.map(m => {
    const mine = tasks.filter(x => touches(x, m));
    const done = mine.filter(x => x.status === "complete");
    const completionRate = mine.length ? Math.round((done.length / mine.length) * 100) : 0;
    const withDue = done.filter(x => x.dueDate);
    const onTime = withDue.filter(x => (x.date || x.dueDate) <= x.dueDate).length;
    const onTimeRate = withDue.length ? Math.round((onTime / withDue.length) * 100) : 0;
    // basic score: completion 60% + on-time 40% (no activity/CS locally)
    const ajrlyScore = Math.round(completionRate * 0.6 + onTimeRate * 0.4);
    return {
      id: m, name: m, role: "member",
      completionRate, onTimeRate,
      tasksPerDay: null, tasksDone: done.length,
      activeMinutes: null, avgFirstResponse: null, ticketsResolved: null,
      tasksTotal: mine.length, ajrlyScore,
    };
  }).filter(u => u.tasksTotal > 0);
  users.sort((a, b) => b.ajrlyScore - a.ajrlyScore);
  return { users, generatedAt: new Date().toISOString(), local: true };
}

async function ensureData(reRender) {
  if (loading) return;
  loading = true;
  try {
    // Prefer cloud; fall back to local on any failure.
    let data;
    try {
      data = await loadCloud();
    } catch (_) {
      data = computeLocal();
    }
    cache = data;
  } catch (_) {
    cache = computeLocal();
  } finally {
    loading = false;
    reRender && reRender();
  }
}

/* visible (filtered) user list */
function visibleUsers() {
  let list = cache ? cache.users.slice() : [];
  if (fMember) list = list.filter(u => u.name === fMember || u.id === fMember);
  return list;
}

/* ============================================================
   Pure-SVG score gauge (ring). Theme-aware via CSS vars, RTL-aware:
   in RTL we mirror the arc so it fills from the right.
   ============================================================ */
function gaugeSVG(score, size = 132) {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  const cx = size / 2, cy = size / 2, r = size / 2 - 14, sw = 12;
  const C = 2 * Math.PI * r;
  const len = (s / 100) * C;
  const color = scoreColor(s);
  const rtl = isRTL();
  // base ring + progress arc. rotate so the arc starts at top (-90deg);
  // mirror horizontally for RTL so progress reads start->end naturally.
  const mirror = rtl ? `scale(-1,1) translate(${-size},0)` : "";
  return `<svg class="pf-gauge" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"
       role="img" aria-label="${esc(t("pf.score"))}: ${s}">
    <g transform="${mirror}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="${sw}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}"
        stroke-linecap="round"
        stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}"
        stroke-dashoffset="0"
        transform="rotate(-90 ${cx} ${cy})"/>
    </g>
    <text x="${cx}" y="${cy - 2}" text-anchor="middle" class="pf-gauge__num" style="fill:${color}">${nf(s)}</text>
    <text x="${cx}" y="${cy + 16}" text-anchor="middle" class="pf-gauge__cap">${esc(t("pf.score"))}</text>
  </svg>`;
}

/* ============================================================
   Activity heatmap — last ~8 weeks (56 days), GitHub-style grid.
   Cloud mode: scaled by activeMinutes spread as a synthetic recent
   signal isn't available per-day, so we derive a deterministic-but
   honest intensity from the user's tasks completed per day when we have
   dates; otherwise we leave it light. Columns = weeks, rows = weekdays.
   RTL-aware: weeks flow start->end via logical order (reversed in RTL).
   ============================================================ */
const WEEKS = 8;
function heatmapData(u) {
  // Build a per-day count of completed tasks (last 56 days) from local db
  // when available; this gives a real, theme-aware heatmap in both modes.
  const counts = {};
  const tasks = (OS().db && OS().db.tasks) || [];
  const touches = (x) => x.assignedBy === u.name || x.delegateTo === u.name || x.assignedBy === u.id || x.delegateTo === u.id;
  tasks.forEach(x => {
    if (x.status !== "complete") return;
    if (!touches(x)) return;
    const day = (x.dueDate || x.date || "").slice(0, 10);
    if (day) counts[day] = (counts[day] || 0) + 1;
  });
  return counts;
}
function heatmapSVG(u) {
  const counts = heatmapData(u);
  const today = new Date();
  const cell = 13, gap = 3, rows = 7;
  const totalDays = WEEKS * rows;
  // find Sunday-aligned start
  const start = new Date(today);
  start.setDate(start.getDate() - (totalDays - 1));
  let maxN = 1;
  const days = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const n = counts[iso] || 0;
    if (n > maxN) maxN = n;
    days.push({ iso, n, dow: d.getDay() });
  }
  const cols = WEEKS;
  const W = cols * (cell + gap);
  const H = rows * (cell + gap);
  const rtl = isRTL();
  const rects = days.map((d, i) => {
    const col = Math.floor(i / rows);
    const row = i % rows;
    const xCol = rtl ? (cols - 1 - col) : col;
    const x = xCol * (cell + gap);
    const y = row * (cell + gap);
    const f = d.n === 0 ? 0 : Math.min(1, 0.25 + (d.n / maxN) * 0.75);
    const fill = d.n === 0
      ? "var(--surface-2)"
      : `color-mix(in srgb, var(--brand) ${Math.round(f * 100)}%, transparent)`;
    return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3" ry="3"
      fill="${fill}" stroke="var(--border)" stroke-width="0.5">
      <title>${esc(d.iso)}: ${d.n}</title></rect>`;
  }).join("");
  return `<svg class="pf-heat" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMinYMid meet"
       role="img" aria-label="${esc(t("pf.heatmap"))}">${rects}</svg>`;
}

/* ============================================================
   Cards / metrics
   ============================================================ */
function metricRow(label, value) {
  return `<div class="pf-metric">
    <span class="pf-metric__lbl">${esc(label)}</span>
    <span class="pf-metric__val">${value}</span>
  </div>`;
}
function employeeCard(u) {
  const pct = (v) => (v == null ? na() : nf(v) + "%");
  const num = (v) => (v == null ? na() : nf(v));
  const perDay = u.tasksPerDay == null ? na() : nf(u.tasksPerDay);
  return `<div class="card pf-card">
    <div class="pf-card__head">
      <div class="pf-id">
        <span class="avatar-sm">${esc(initials(u.name))}</span>
        <div class="pf-id__txt">
          <span class="pf-id__name">${esc(u.name)}</span>
          <span class="muted">${esc(u.role || "")}</span>
        </div>
      </div>
      ${gaugeSVG(u.ajrlyScore)}
    </div>
    <div class="pf-metrics">
      ${metricRow(t("pf.m.completion"), pct(u.completionRate))}
      ${metricRow(t("pf.m.onTime"), pct(u.onTimeRate))}
      ${metricRow(t("pf.m.perDay"), perDay)}
      ${metricRow(t("pf.m.done"), num(u.tasksDone))}
      ${metricRow(t("pf.m.hours"), weekHoursOf(u.name) ? nf(weekHoursOf(u.name)) : na())}
      ${metricRow(t("pf.m.active"), num(u.activeMinutes))}
    </div>
    <div class="pf-heat-wrap">
      ${monthlyCalendar(u)}
    </div>
  </div>`;
}
/* Monthly attendance calendar — current month, days numbered, days the user
   was active (logged into the system) highlighted. */
function activeDaysFor(u) {
  const acts = (OS().db && OS().db.activity) || [];
  const set = new Set();
  acts.forEach(a => {
    if (a.userId === u.id || a.userName === u.name || a.userId === u.name) {
      const d = String(a.day || "").slice(0, 10);
      if (d) set.add(d);
    }
  });
  return set;
}
function monthlyCalendar(u) {
  const active = activeDaysFor(u);
  const now = new Date();
  // base month = current month shifted back by calOffset (data from any month is kept)
  const base = new Date(now.getFullYear(), now.getMonth() + calOffset, 1);
  const year = base.getFullYear(), month = base.getMonth();
  const isCurrentMonth = (year === now.getFullYear() && month === now.getMonth());
  const todayD = isCurrentMonth ? now.getDate() : -1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = new Date(year, month, 1).getDay(); // 0=Sun
  const dows = (getLang() === "ar")
    ? ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"]
    : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const cell = (inner, style) => `<div style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:7px;font-size:11.5px;${style || ""}">${inner}</div>`;
  const head = dows.map(d => cell(d, "color:var(--muted,#94a3b8);font-size:10px")).join("");
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(cell("", "visibility:hidden"));
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const on = active.has(iso);
    const isToday = d === todayD;
    const style = on
      ? "background:var(--brand);color:#fff;font-weight:600"
      : "background:var(--surface-2);color:var(--muted,#94a3b8)";
    const ring = isToday ? "box-shadow:0 0 0 2px var(--brand) inset;" : "";
    cells.push(cell(String(d), ring + style));
  }
  const title = base.toLocaleDateString(getLang() === "ar" ? "ar-EG" : "en-GB", { month: "long", year: "numeric" });
  const navBtn = (dir, label, disabled) => `<button class="btn btn--ghost btn--sm" data-cal="${dir}" ${disabled ? "disabled style=\"opacity:.4\"" : ""} style="padding:0 6px;min-width:0">${label}</button>`;
  const header = `<div class="flex between" style="align-items:center;margin-bottom:2px">
    <span class="muted pf-heat-cap">📅 ${esc(title)}</span>
    <span class="flex" style="gap:2px">${navBtn("prev", "‹", false)}${navBtn("next", "›", calOffset >= 0)}</span>
  </div>`;
  return `${header}
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:6px">${head}${cells.join("")}</div>`;
}
function initials(name) {
  const parts = String(name || "").trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

/* leaderboard table (reuses .table-wrap) */
function leaderboard(users) {
  if (!users.length) return "";
  const rows = users.map((u, i) => `<tr>
    <td class="pf-rank">${nf(i + 1)}</td>
    <td><span class="flex" style="gap:7px"><span class="avatar-sm">${esc(initials(u.name))}</span>${esc(u.name)}</span></td>
    <td><b style="color:${scoreColor(u.ajrlyScore)}">${nf(u.ajrlyScore)}</b></td>
    <td>${u.completionRate == null ? na() : nf(u.completionRate) + "%"}</td>
    <td>${u.onTimeRate == null ? na() : nf(u.onTimeRate) + "%"}</td>
    <td>${u.tasksDone == null ? na() : nf(u.tasksDone)}</td>
    <td>${weekHoursOf(u.name) ? nf(weekHoursOf(u.name)) : na()}</td>
  </tr>`).join("");
  return `<div class="card">
    <div class="card__head"><span class="card__title">${esc(t("pf.leaderboard"))}</span></div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr>
          <th>${esc(t("pf.rank"))}</th>
          <th>${esc(t("pf.member"))}</th>
          <th>${esc(t("pf.score"))}</th>
          <th>${esc(t("pf.m.completion"))}</th>
          <th>${esc(t("pf.m.onTime"))}</th>
          <th>${esc(t("pf.m.done"))}</th>
          <th>${esc(t("pf.m.hours"))}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

function emptyBox() {
  return `<div class="empty"><div class="empty__icon">🏅</div><p class="muted">${esc(t("pf.empty"))}</p></div>`;
}

/* ============================================================
   VIEW
   ============================================================ */
function view() {
  weekHoursMap = computeWeekHours();
  const TEAM = (OS().team ? OS().team() : OS().TEAM) || [];

  const localNote = cache && cache.local
    ? `<div class="pf-note muted">ℹ️ ${esc(t("pf.local.note"))}</div>` : "";
  const stamp = cache && cache.generatedAt
    ? `<span class="muted pf-stamp">${esc(t("pf.generatedOn"))} ${esc(fmtDate(cache.generatedAt.slice(0, 10)))}</span>` : "";

  const toolbar = `<div class="toolbar pf-toolbar">
    <div class="toolbar__left">
      <select class="input" id="pf_member" aria-label="${esc(t("pf.filter.member"))}">
        <option value="">${esc(t("pf.filter.all"))}</option>
        ${TEAM.map(m => `<option value="${esc(m)}" ${fMember === m ? "selected" : ""}>${esc(m)}</option>`).join("")}
      </select>
      <label class="pf-date"><span class="muted">${esc(t("pf.filter.from"))}</span>
        <input type="date" class="input" id="pf_from" value="${esc(fFrom)}"></label>
      <label class="pf-date"><span class="muted">${esc(t("pf.filter.to"))}</span>
        <input type="date" class="input" id="pf_to" value="${esc(fTo)}"></label>
      <button class="btn btn--sm" id="pf_reset">${esc(t("pf.filter.reset"))}</button>
    </div>
    <div class="toolbar__right">
      ${stamp}
      <button class="btn btn--sm" id="pf_refresh">↻ ${esc(t("pf.refresh"))}</button>
    </div>
  </div>`;

  let body;
  if (!cache) {
    body = `<div class="card pf-loading"><p class="muted">…</p></div>`;
  } else {
    const users = visibleUsers();
    if (!users.length) {
      body = emptyBox();
    } else {
      const cards = `<div class="grid cards-3 pf-grid">${users.map(employeeCard).join("")}</div>`;
      const board = leaderboard(cache.users.filter(u => !fMember || u.name === fMember || u.id === fMember));
      body = `${cards}<div class="grid" style="margin-top:16px">${board}</div>`;
    }
  }

  return `<div class="pf-report">${toolbar}${localNote}${body}</div>`;
}

/* ============================================================
   MOUNT
   ============================================================ */
function mount(ctx) {
  const $ = (s) => document.querySelector(s);
  const reRender = () => (ctx && ctx.render ? ctx.render() : (OS().render && OS().render()));

  // lazy-load on first mount (or after explicit refresh)
  if (!cache && !loading) ensureData(reRender);

  const member = $("#pf_member");
  if (member) member.onchange = (e) => { fMember = e.target.value; reRender(); };
  const from = $("#pf_from");
  if (from) from.onchange = (e) => { fFrom = e.target.value; cache = null; ensureData(reRender); };
  const to = $("#pf_to");
  if (to) to.onchange = (e) => { fTo = e.target.value; cache = null; ensureData(reRender); };
  const reset = $("#pf_reset");
  if (reset) reset.onclick = () => { fMember = ""; fFrom = ""; fTo = ""; cache = null; ensureData(reRender); };
  const refresh = $("#pf_refresh");
  if (refresh) refresh.onclick = () => { cache = null; ensureData(reRender); };
  // attendance calendar month navigation (shared across all cards)
  document.querySelectorAll("[data-cal]").forEach(b => b.onclick = () => {
    if (b.dataset.cal === "prev") calOffset -= 1;
    else if (calOffset < 0) calOffset += 1;
    reRender();
  });
}

/* ---------------- register ---------------- */
registerModule({
  id: "performance",
  icon: "🏅",
  labelKey: "nav.performance",
  titleKey: "page.performance",
  subKey: "page.performance.sub",
  order: 55,
  view,
  mount,
});
