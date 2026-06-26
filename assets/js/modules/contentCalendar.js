/* ============================================================
   Ajrly OS — Content Calendar (تقويم المحتوى)
   Monthly overview of the owner content schedule: each post appears on
   its date as a colour-coded chip. Read-only; navigate by month.
   Reads window.AjrlyOS.db.contentPosts.
   ============================================================ */
import { registerModule } from "../registry.js";
import { registerStrings, t, getLang } from "../i18n.js";

registerStrings({
  ar: {
    "nav.ccal": "تقويم المحتوى",
    "page.ccal": "تقويم المحتوى الشهري",
    "page.ccal.sub": "نظرة شهرية على ما سيُنشر من محتوى",
    "ccal.none": "لا منشورات هذا الشهر",
  },
  en: {
    "nav.ccal": "Content Calendar",
    "page.ccal": "Monthly Content Calendar",
    "page.ccal.sub": "A month-at-a-glance view of scheduled content",
    "ccal.none": "No posts this month",
  },
});

const OS = () => window.AjrlyOS || {};
const esc = (s) => (OS().esc ? OS().esc(s) : String(s ?? ""));
const posts = () => (OS().db && OS().db.contentPosts) || [];
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let calOff = 0; // months from current

function colorFor(v) {
  const s = String(v || ""); if (!s) return "var(--surface-2)";
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `hsla(${h % 360},65%,55%,0.22)`;
}

function view() {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + calOff, 1);
  const year = base.getFullYear(), month = base.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = base.getDay();
  const lang = getLang() === "ar" ? "ar-EG" : "en-GB";
  const dows = (getLang() === "ar")
    ? ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // group posts by day-of-month for this year/month
  const byDay = {};
  posts().forEach(p => {
    const d = String(p.date || "");
    if (d.slice(0, 7) === `${year}-${String(month + 1).padStart(2, "0")}`) {
      const dom = parseInt(d.slice(8, 10), 10);
      (byDay[dom] = byDay[dom] || []).push(p);
    }
  });
  const total = Object.values(byDay).reduce((n, a) => n + a.length, 0);

  const headCells = dows.map(d => `<div style="text-align:center;font-size:11px;color:var(--muted,#94a3b8);padding:4px 0">${d}</div>`).join("");
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(`<div></div>`);
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = (calOff === 0 && d === now.getDate());
    const items = (byDay[d] || []).map(p => {
      const label = esc(p.idea || p.type || p.caption || "•");
      const tip = esc([p.postTo, p.type, p.caption].filter(Boolean).join(" · "));
      return `<div title="${tip}" style="font-size:10.5px;background:${colorFor(p.idea)};border-radius:5px;padding:2px 5px;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</div>`;
    }).join("");
    cells.push(`<div style="min-height:96px;border:1px solid var(--border);border-radius:9px;padding:5px;background:var(--surface);${isToday ? "box-shadow:0 0 0 2px var(--brand) inset" : ""}">
      <div style="font-size:11px;color:var(--muted,#94a3b8);font-weight:600">${d}</div>${items}
    </div>`);
  }

  const title = base.toLocaleDateString(lang, { month: "long", year: "numeric" });
  return `<div class="card">
    <div class="flex between" style="align-items:center;margin-bottom:12px">
      <span class="card__title">📆 ${esc(title)}${total ? ` <span class="muted" style="font-size:12px">· ${total}</span>` : ""}</span>
      <span class="flex" style="gap:4px">
        <button class="btn btn--ghost btn--sm" data-ccnav="prev">‹</button>
        <button class="btn btn--sm" data-ccnav="today">${getLang() === "ar" ? "اليوم" : "Today"}</button>
        <button class="btn btn--ghost btn--sm" data-ccnav="next">›</button>
      </span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">${headCells}${cells.join("")}</div>
    ${total ? "" : `<p class="muted" style="text-align:center;margin-top:14px">${esc(t("ccal.none"))}</p>`}
  </div>`;
}

function mount(ctx) {
  const reRender = () => (ctx && ctx.render ? ctx.render() : (OS().render && OS().render()));
  $$("[data-ccnav]").forEach(b => b.onclick = () => {
    const d = b.dataset.ccnav;
    if (d === "prev") calOff -= 1; else if (d === "next") calOff += 1; else calOff = 0;
    reRender();
  });
}

registerModule({
  id: "contentcalendar",
  icon: "📆",
  labelKey: "nav.ccal",
  titleKey: "page.ccal",
  subKey: "page.ccal.sub",
  order: 43,
  view,
  mount,
});
