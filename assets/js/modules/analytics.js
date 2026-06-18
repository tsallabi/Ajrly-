/* ============================================================
   Ajrly OS — Analytics & Reporting module
   Dependency-free, RTL-aware, theme-aware (CSS variables only).
   Hand-rolled SVG/CSS charts. Reads runtime data from window.AjrlyOS.
   ============================================================ */
import { registerModule } from "../registry.js";
import { registerStrings, t, getLang } from "../i18n.js";

/* ---------------- i18n ---------------- */
registerStrings({
  ar: {
    "nav.analytics": "التحليلات",
    "page.analytics": "التحليلات والتقارير",
    "page.analytics.sub": "مؤشرات أداء متقدمة وتقارير قابلة للتصدير",

    "an.kpi.completion": "نسبة الإنجاز",
    "an.kpi.onTime": "نسبة الالتزام بالموعد",
    "an.kpi.overdue": "مهام متأخرة",
    "an.kpi.conversion": "تحويل مسار الملاك",

    "an.chart.byStatus": "المهام حسب الحالة",
    "an.chart.byMember": "المهام حسب عضو الفريق",
    "an.chart.overTime": "المهام المكتملة عبر الزمن",
    "an.chart.byPillar": "المحتوى حسب الركيزة",
    "an.chart.byPlatform": "المحتوى حسب المنصة",
    "an.chart.funnel": "مسار الملاك",

    "an.filter.member": "العضو",
    "an.filter.from": "من تاريخ",
    "an.filter.to": "إلى تاريخ",
    "an.filter.reset": "إعادة ضبط",
    "an.filter.all": "كل الفريق",

    "an.export.tasks": "تصدير المهام (CSV)",
    "an.export.content": "تصدير المحتوى (CSV)",
    "an.export.owners": "تصدير الملاك (CSV)",
    "an.export.print": "طباعة التقرير",
    "an.export.done": "تم تصدير الملف",
    "an.export.empty": "لا توجد بيانات للتصدير",

    "an.empty": "لا توجد بيانات ضمن النطاق المحدد",
    "an.legend.total": "الإجمالي",
    "an.week": "أسبوع",
    "an.tasks": "مهام",
    "an.posts": "منشورات",
    "an.owners": "ملاك",
    "an.reportTitle": "تقرير أجرلي للأداء",
    "an.generatedOn": "صدر بتاريخ",
  },
  en: {
    "nav.analytics": "Analytics",
    "page.analytics": "Analytics & Reports",
    "page.analytics.sub": "Advanced performance insights and exportable reports",

    "an.kpi.completion": "Completion Rate",
    "an.kpi.onTime": "On-time Rate",
    "an.kpi.overdue": "Overdue Tasks",
    "an.kpi.conversion": "Owner Pipeline Conversion",

    "an.chart.byStatus": "Tasks by Status",
    "an.chart.byMember": "Tasks by Team Member",
    "an.chart.overTime": "Tasks Completed Over Time",
    "an.chart.byPillar": "Content by Pillar",
    "an.chart.byPlatform": "Content by Platform",
    "an.chart.funnel": "Owners Pipeline",

    "an.filter.member": "Member",
    "an.filter.from": "From",
    "an.filter.to": "To",
    "an.filter.reset": "Reset",
    "an.filter.all": "All team",

    "an.export.tasks": "Export Tasks (CSV)",
    "an.export.content": "Export Content (CSV)",
    "an.export.owners": "Export Owners (CSV)",
    "an.export.print": "Print report",
    "an.export.done": "File exported",
    "an.export.empty": "No data to export",

    "an.empty": "No data in the selected range",
    "an.legend.total": "Total",
    "an.week": "Week",
    "an.tasks": "tasks",
    "an.posts": "posts",
    "an.owners": "owners",
    "an.reportTitle": "Ajrly Performance Report",
    "an.generatedOn": "Generated on",
  },
});

/* ---------------- module-scope filter state ---------------- */
let fMember = "";   // "" = all
let fFrom = "";     // ISO date
let fTo = "";       // ISO date

/* ---------------- helpers ---------------- */
const OS = () => window.AjrlyOS || {};
const esc = (s) => (OS().esc ? OS().esc(s) : String(s ?? ""));
const isRTL = () => getLang() === "ar";

const STATUS_KEYS = { pending: "st.pending", progress: "st.progress", complete: "st.complete", overdue: "st.overdue", closed: "st.closed" };
const STATUS_COLOR = {
  complete: "var(--st-complete)", progress: "var(--st-progress)",
  pending: "var(--st-pending)", overdue: "var(--st-overdue)", closed: "var(--st-closed)",
};
const STATUS_ORDER = ["complete", "progress", "pending", "overdue", "closed"];

function nf(n) { return Number(n || 0).toLocaleString(getLang() === "ar" ? "ar-EG" : "en-GB"); }
function fmtDate(iso) { return OS().fmtDate ? OS().fmtDate(iso) : (iso || "—"); }
function parseISO(s) { if (!s) return null; const d = new Date(s); return isNaN(d) ? null : d; }

/* ISO week key e.g. 2026-W25, plus a sortable numeric + label */
function isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;          // Mon=0
  date.setUTCDate(date.getUTCDate() - dayNum + 3);    // nearest Thursday
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return { year: date.getUTCFullYear(), week, key: `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}` };
}

/* date-range guard against filter (inclusive). Uses given iso. */
function inRange(iso) {
  if (!iso) return !(fFrom || fTo);   // no date → only included when no range set
  if (fFrom && iso < fFrom) return false;
  if (fTo && iso > fTo) return false;
  return true;
}

function taskTouchesMember(x, m) { return x.assignedBy === m || x.delegateTo === m; }

/* Apply member + date-range filters to tasks. Tasks date = task.date (created). */
function filteredTasks() {
  let list = OS().db ? OS().db.tasks : [];
  if (fMember) list = list.filter(x => taskTouchesMember(x, fMember));
  if (fFrom || fTo) list = list.filter(x => inRange(x.date) || inRange(x.dueDate));
  return list;
}
function filteredContent() {
  let list = OS().db ? OS().db.content : [];
  if (fFrom || fTo) list = list.filter(c => inRange(c.date));
  return list;
}
function filteredOwners() {
  let list = OS().db ? OS().db.owners : [];
  if (fFrom || fTo) list = list.filter(o => inRange(o.lastContact));
  return list;
}

/* ---------------- KPI computations ---------------- */
function computeKPIs() {
  const tasks = filteredTasks();
  const owners = filteredOwners();
  const total = tasks.length;
  const complete = tasks.filter(x => x.status === "complete").length;
  const overdue = tasks.filter(x => x.status === "overdue").length;
  const completionRate = total ? Math.round((complete / total) * 100) : 0;

  // on-time: completed tasks whose due date was not missed (completed on/before due).
  const completedWithDue = tasks.filter(x => x.status === "complete" && x.dueDate);
  const onTime = completedWithDue.filter(x => {
    // we have task.date (created/worked) — treat as completion proxy; on time if date <= dueDate
    const ref = x.date || x.dueDate;
    return ref <= x.dueDate;
  }).length;
  const onTimeRate = completedWithDue.length ? Math.round((onTime / completedWithDue.length) * 100) : 0;

  const totalOwners = owners.length;
  const activeOwners = owners.filter(o => (o.stage || "recruitment") === "active").length;
  const conversion = totalOwners ? Math.round((activeOwners / totalOwners) * 100) : 0;

  return { total, complete, overdue, completionRate, onTimeRate, conversion, totalOwners, activeOwners };
}

/* ============================================================
   SVG chart builders (theme-aware via currentColor / CSS vars)
   ============================================================ */

/* Donut chart for tasks by status. */
function donutSVG(data) {
  const sum = data.reduce((a, x) => a + x.n, 0);
  const size = 180, cx = size / 2, cy = size / 2, r = 64, sw = 26, C = 2 * Math.PI * r;
  if (!sum) return emptyBox();
  let offset = 0;
  const arcs = data.filter(d => d.n > 0).map(d => {
    const frac = d.n / sum;
    const len = frac * C;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
        stroke="${d.color}" stroke-width="${sw}"
        stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}"
        stroke-dashoffset="${(-offset).toFixed(2)}"
        transform="rotate(-90 ${cx} ${cy})">
      <title>${esc(d.label)}: ${d.n}</title></circle>`;
    offset += len;
    return seg;
  }).join("");
  const legend = data.filter(d => d.n > 0).map(d =>
    `<div class="an-legend__item">
       <span class="an-legend__dot" style="background:${d.color}"></span>
       <span class="an-legend__lbl">${esc(d.label)}</span>
       <span class="an-legend__val">${nf(d.n)}</span>
     </div>`).join("");
  return `<div class="an-donut">
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${esc(t("an.chart.byStatus"))}">
      ${arcs}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" class="an-donut__num">${nf(sum)}</text>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle" class="an-donut__cap">${esc(t("an.legend.total"))}</text>
    </svg>
    <div class="an-legend">${legend}</div>
  </div>`;
}

/* Horizontal bars via .barlist (RTL-safe by default — flex/grid mirrors). */
function barlistRows(rows, color, labelCol = "130px") {
  const max = Math.max(1, ...rows.map(r => r.n));
  if (!rows.length) return emptyBox();
  return `<div class="barlist">${rows.map(r => `
    <div class="barlist__row" style="grid-template-columns:${labelCol} 1fr 40px">
      <span class="an-bar-lbl" title="${esc(r.label)}">${esc(r.label)}</span>
      <div class="barlist__track"><div class="barlist__fill" style="width:${(r.n / max) * 100}%;background:${r.color || color}"></div></div>
      <span class="barlist__val">${nf(r.n)}</span>
    </div>`).join("")}</div>`;
}

/* Area + line chart for completed-over-time, bucketed by ISO week.
   RTL-aware: in Arabic we reverse the x order so time still reads correctly. */
function areaSVG(buckets) {
  if (!buckets.length || buckets.every(b => b.n === 0)) return emptyBox();
  const W = 520, H = 200, padL = 34, padR = 14, padT = 16, padB = 30;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const rtl = isRTL();
  const ordered = rtl ? [...buckets].reverse() : buckets;
  const maxN = Math.max(1, ...ordered.map(b => b.n));
  const n = ordered.length;
  const x = (i) => padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v) => padT + innerH - (v / maxN) * innerH;

  const pts = ordered.map((b, i) => [x(i), y(b.n)]);
  const linePath = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${(padT + innerH).toFixed(1)} L${pts[0][0].toFixed(1)},${(padT + innerH).toFixed(1)} Z`;

  // gridlines (horizontal) — 4 steps
  const grid = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const gy = padT + innerH - f * innerH;
    const val = Math.round(f * maxN);
    return `<line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" class="an-grid" />
            <text x="${rtl ? W - padR + 4 : padL - 6}" y="${gy + 3}" text-anchor="${rtl ? "start" : "end"}" class="an-axis">${val}</text>`;
  }).join("");

  const dots = pts.map((p, i) =>
    `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" class="an-dot"><title>${esc(ordered[i].label)}: ${ordered[i].n}</title></circle>`).join("");

  const xlabels = ordered.map((b, i) =>
    `<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" class="an-axis">${esc(b.short)}</text>`).join("");

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(t("an.chart.overTime"))}">
    <defs>
      <linearGradient id="anArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--brand)" stop-opacity="0.32"/>
        <stop offset="100%" stop-color="var(--brand)" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    ${grid}
    <path d="${areaPath}" fill="url(#anArea)" stroke="none"/>
    <path d="${linePath}" fill="none" stroke="var(--brand)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    ${xlabels}
  </svg>`;
}

/* Funnel for owner stages. Uses logical (inline) layout — naturally mirrors RTL. */
function funnelSVG(stages) {
  const maxN = Math.max(1, ...stages.map(s => s.n));
  const total = stages.reduce((a, s) => a + s.n, 0);
  if (!total) return emptyBox();
  const colors = ["var(--st-pending)", "var(--st-progress)", "var(--accent)", "var(--st-complete)"];
  return `<div class="an-funnel">${stages.map((s, i) => {
    const w = 40 + (s.n / maxN) * 60; // 40%..100%
    return `<div class="an-funnel__row">
      <span class="an-funnel__lbl">${esc(s.label)}</span>
      <div class="an-funnel__bar" style="width:${w}%;background:${colors[i] || "var(--brand)"}">
        <span class="an-funnel__n">${nf(s.n)}</span>
      </div>
    </div>`;
  }).join("")}</div>`;
}

function emptyBox() {
  return `<div class="empty"><div class="empty__icon">📭</div><p class="muted">${esc(t("an.empty"))}</p></div>`;
}

/* ---------------- data shaping for charts ---------------- */
function statusData() {
  const tasks = filteredTasks();
  return STATUS_ORDER.map(s => ({
    s, label: t(STATUS_KEYS[s]), color: STATUS_COLOR[s],
    n: tasks.filter(x => x.status === s).length,
  }));
}
function memberData() {
  const TEAM = OS().TEAM || [];
  const tasks = filteredTasks();
  return TEAM.map(m => ({ label: m, n: tasks.filter(x => taskTouchesMember(x, m)).length }))
    .sort((a, b) => b.n - a.n);
}
function overTimeData() {
  const tasks = filteredTasks().filter(x => x.status === "complete");
  const map = new Map();
  tasks.forEach(x => {
    const iso = x.dueDate || x.date;
    const d = parseISO(iso);
    if (!d) return;
    const wk = isoWeek(d);
    if (!map.has(wk.key)) map.set(wk.key, { key: wk.key, week: wk.week, year: wk.year, n: 0 });
    map.get(wk.key).n++;
  });
  const arr = [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  return arr.map(b => ({ label: `${t("an.week")} ${b.week} · ${b.year}`, short: `${t("an.week")[0] || "W"}${b.week}`, n: b.n }));
}
function pillarData() {
  const PILLARS = OS().PILLARS || [];
  const content = filteredContent();
  return PILLARS.map(p => ({ label: p.name, n: content.filter(c => c.pillar === p.name).length }))
    .filter(x => x.n > 0).sort((a, b) => b.n - a.n);
}
function platformData() {
  const content = filteredContent();
  const counts = {};
  content.forEach(c => (c.platform || []).forEach(p => { counts[p] = (counts[p] || 0) + 1; }));
  return Object.entries(counts).map(([label, n]) => ({ label, n }))
    .sort((a, b) => b.n - a.n);
}
function funnelData() {
  const STAGES = OS().OWNER_STAGES || ["recruitment", "communication", "content", "active"];
  const owners = filteredOwners();
  return STAGES.map(s => ({ label: t("stage." + s), n: owners.filter(o => (o.stage || "recruitment") === s).length }));
}

/* ============================================================
   CSV export
   ============================================================ */
function csvCell(v) {
  let s = String(v ?? "");
  if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function toCSV(headers, rows) {
  const head = headers.map(csvCell).join(",");
  const body = rows.map(r => r.map(csvCell).join(",")).join("\n");
  return "﻿" + head + "\n" + body;   // BOM for Excel/Arabic
}
function download(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function notify() { if (OS().toast) OS().toast(t("an.export.done")); }

function exportTasks() {
  const tasks = filteredTasks();
  if (!tasks.length) { OS().toast && OS().toast(t("an.export.empty")); return; }
  const headers = ["Title", "Priority", "Status", "Assigned By", "Delegate To", "Date", "Due Date"];
  const rows = tasks.map(x => [x.title, x.priority, t(STATUS_KEYS[x.status] || "st.pending"), x.assignedBy, x.delegateTo, x.date, x.dueDate]);
  download("ajrly-tasks.csv", toCSV(headers, rows)); notify();
}
function exportContent() {
  const content = filteredContent();
  if (!content.length) { OS().toast && OS().toast(t("an.export.empty")); return; }
  const headers = ["Day", "Date", "Goal", "Platforms", "Pillar", "Type", "Time"];
  const rows = content.map(c => [c.day, c.date, c.goal, (c.platform || []).join(" | "), c.pillar, c.type, c.time]);
  download("ajrly-content.csv", toCSV(headers, rows)); notify();
}
function exportOwners() {
  const owners = filteredOwners();
  if (!owners.length) { OS().toast && OS().toast(t("an.export.empty")); return; }
  const headers = ["Name", "Phone", "Email", "Listings", "Stage", "Last Contact"];
  const rows = owners.map(o => [o.name, o.phone, o.email, o.listings, t("stage." + (o.stage || "recruitment")), o.lastContact]);
  download("ajrly-owners.csv", toCSV(headers, rows)); notify();
}

/* ============================================================
   VIEW
   ============================================================ */
function statCard(icon, color, value, label) {
  return `<div class="card stat">
    <div class="stat__top">
      <span class="stat__icon" style="background:color-mix(in srgb, ${color} 14%, transparent);color:${color}">${icon}</span>
    </div>
    <span class="stat__value">${value}</span>
    <span class="stat__label">${esc(label)}</span>
  </div>`;
}

function chartCard(titleKey, body, extra = "") {
  return `<div class="card">
    <div class="card__head"><span class="card__title">${esc(t(titleKey))}</span>${extra}</div>
    <div class="an-chart">${body}</div>
  </div>`;
}

function view() {
  const TEAM = OS().TEAM || [];
  const k = computeKPIs();

  const toolbar = `<div class="toolbar an-toolbar an-noprint">
    <div class="toolbar__left">
      <select class="input" id="an_member" aria-label="${esc(t("an.filter.member"))}">
        <option value="">${esc(t("an.filter.all"))}</option>
        ${TEAM.map(m => `<option value="${esc(m)}" ${fMember === m ? "selected" : ""}>${esc(m)}</option>`).join("")}
      </select>
      <label class="an-date"><span class="muted">${esc(t("an.filter.from"))}</span>
        <input type="date" class="input" id="an_from" value="${esc(fFrom)}"></label>
      <label class="an-date"><span class="muted">${esc(t("an.filter.to"))}</span>
        <input type="date" class="input" id="an_to" value="${esc(fTo)}"></label>
      <button class="btn btn--sm" id="an_reset">${esc(t("an.filter.reset"))}</button>
    </div>
    <div class="toolbar__right">
      <button class="btn btn--sm" id="an_exp_tasks">⬇ ${esc(t("an.export.tasks"))}</button>
      <button class="btn btn--sm" id="an_exp_content">⬇ ${esc(t("an.export.content"))}</button>
      <button class="btn btn--sm" id="an_exp_owners">⬇ ${esc(t("an.export.owners"))}</button>
      <button class="btn btn--primary btn--sm" id="an_print">🖨 ${esc(t("an.export.print"))}</button>
    </div>
  </div>`;

  const printHead = `<div class="an-print-head an-printonly">
    <h2>${esc(t("an.reportTitle"))}</h2>
    <p class="muted">${esc(t("an.generatedOn"))} ${esc(fmtDate(new Date().toISOString().slice(0, 10)))}</p>
  </div>`;

  const kpis = `<div class="grid cards-4">
    ${statCard("✅", "var(--st-complete)", nf(k.completionRate) + "%", t("an.kpi.completion"))}
    ${statCard("⏱", "var(--st-progress)", nf(k.onTimeRate) + "%", t("an.kpi.onTime"))}
    ${statCard("⚠️", "var(--st-overdue)", nf(k.overdue), t("an.kpi.overdue"))}
    ${statCard("🤝", "var(--brand)", nf(k.conversion) + "%", t("an.kpi.conversion"))}
  </div>`;

  const row1 = `<div class="grid cards-2" style="margin-top:16px">
    ${chartCard("an.chart.byStatus", `<div id="an_status">${donutSVG(statusData())}</div>`)}
    ${chartCard("an.chart.byMember", `<div id="an_member_chart">${barlistRows(memberData(), "var(--brand)")}</div>`)}
  </div>`;

  const row2 = `<div class="grid" style="margin-top:16px">
    ${chartCard("an.chart.overTime", `<div id="an_time">${areaSVG(overTimeData())}</div>`)}
  </div>`;

  const row3 = `<div class="grid cards-2" style="margin-top:16px">
    ${chartCard("an.chart.byPillar", `<div id="an_pillar">${barlistRows(pillarData(), "var(--accent)", "160px")}</div>`)}
    ${chartCard("an.chart.byPlatform", `<div id="an_platform">${barlistRows(platformData(), "var(--brand)")}</div>`)}
  </div>`;

  const row4 = `<div class="grid" style="margin-top:16px">
    ${chartCard("an.chart.funnel", `<div id="an_funnel">${funnelSVG(funnelData())}</div>`)}
  </div>`;

  return `<div class="an-report">${toolbar}${printHead}${kpis}${row1}${row2}${row3}${row4}</div>`;
}

/* ============================================================
   MOUNT — bind filters + exports, re-render via ctx.render()
   ============================================================ */
function mount(ctx) {
  const $ = (s) => document.querySelector(s);
  const reRender = () => (ctx && ctx.render ? ctx.render() : (OS().render && OS().render()));

  const member = $("#an_member");
  if (member) member.onchange = (e) => { fMember = e.target.value; reRender(); };

  const from = $("#an_from");
  if (from) from.onchange = (e) => { fFrom = e.target.value; reRender(); };

  const to = $("#an_to");
  if (to) to.onchange = (e) => { fTo = e.target.value; reRender(); };

  const reset = $("#an_reset");
  if (reset) reset.onclick = () => { fMember = ""; fFrom = ""; fTo = ""; reRender(); };

  $("#an_exp_tasks") && ($("#an_exp_tasks").onclick = exportTasks);
  $("#an_exp_content") && ($("#an_exp_content").onclick = exportContent);
  $("#an_exp_owners") && ($("#an_exp_owners").onclick = exportOwners);
  $("#an_print") && ($("#an_print").onclick = () => window.print());
}

/* ---------------- register ---------------- */
registerModule({
  id: "analytics",
  icon: "📈",
  labelKey: "nav.analytics",
  titleKey: "page.analytics",
  subKey: "page.analytics.sub",
  order: 50,
  view,
  mount,
});
