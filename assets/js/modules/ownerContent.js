/* ============================================================
   Ajrly OS — Owner Content calendar (محتوى الملاك)
   Spreadsheet-style grid: cells are edited inline, blank rows at the
   bottom are ready to fill (no "add" button). Dropdown columns have a
   ✏️ in their header to manage options. Per-row file/link attachment.
   Top links bar to the WhatsApp groups ("Post To") and YouTube channel.
   Local-first; syncs like the rest of the app (contentPosts + contentOpts).
   ============================================================ */
import { registerModule } from "../registry.js";
import { registerStrings, t, getLang } from "../i18n.js";

registerStrings({
  ar: {
    "nav.oc": "محتوى الملاك",
    "page.oc": "جدول محتوى الملاك",
    "page.oc.sub": "املأ الجدول مباشرة كأنه شيت — قوائم قابلة للتعديل ومرفقات وروابط النشر",
    "oc.links": "روابط النشر",
    "oc.editLinks": "تعديل الروابط",
    "oc.f.day": "اليوم", "oc.f.date": "التاريخ", "oc.f.goal": "الهدف",
    "oc.f.postTo": "النشر على", "oc.f.idea": "فكرة المحتوى", "oc.f.type": "نوع المحتوى",
    "oc.f.caption": "الكابشن", "oc.f.pubTime": "وقت النشر", "oc.f.attach": "مرفق",
    "oc.attach.title": "مرفق", "oc.attach.file": "رفع ملف (≤1.5 ميجا)",
    "oc.attach.link": "أو رابط (Drive/يوتيوب…)", "oc.attach.tooBig": "الملف كبير جداً — استخدم رابطاً للفيديو/الملفات الكبيرة",
    "oc.attach.fillFirst": "املأ خانة في الصف أولاً",
    "oc.opt.title": "خيارات: ", "oc.opt.add": "إضافة خيار", "oc.opt.ph": "خيار جديد…",
    "oc.link.label": "الاسم", "oc.link.url": "الرابط", "oc.link.add": "إضافة رابط",
    "oc.confirmDel": "حذف هذا الصف؟", "oc.saved": "تم الحفظ", "oc.deleted": "تم الحذف",
    "oc.noLinks": "لا روابط بعد — اضغط تعديل الروابط",
    "oc.filterBy": "تصفية حسب الفكرة:", "oc.allIdeas": "كل الأفكار",
    "oc.tab.grid": "الجدول", "oc.tab.calendar": "التقويم", "oc.tab.notebook": "المفكرة",
    "oc.nb.new": "صفحة جديدة", "oc.nb.page": "صفحة", "oc.nb.of": "من",
    "oc.nb.empty": "لا توجد صفحات بعد — اضغط صفحة جديدة",
    "oc.nb.placeholder": "اكتب هنا… يمكنك لصق نص وصور",
    "oc.nb.title": "عنوان الصفحة", "oc.nb.date": "تاريخ النشر",
    "oc.nb.delete": "حذف الصفحة", "oc.nb.confirmDel": "حذف هذه الصفحة؟", "oc.nb.saved": "تم الحفظ",
  },
  en: {
    "nav.oc": "Owner Content",
    "page.oc": "Owner Content Schedule",
    "page.oc.sub": "Fill the grid directly like a sheet — editable dropdowns, attachments and posting links",
    "oc.links": "Posting links",
    "oc.editLinks": "Edit links",
    "oc.f.day": "Day", "oc.f.date": "Date", "oc.f.goal": "Goal",
    "oc.f.postTo": "Post To", "oc.f.idea": "Content idea", "oc.f.type": "Content type",
    "oc.f.caption": "Caption", "oc.f.pubTime": "Publishing time", "oc.f.attach": "Attach",
    "oc.attach.title": "Attachment", "oc.attach.file": "Upload file (≤1.5MB)",
    "oc.attach.link": "or link (Drive/YouTube…)", "oc.attach.tooBig": "File too large — use a link for video/large files",
    "oc.attach.fillFirst": "Fill a cell in the row first",
    "oc.opt.title": "Options: ", "oc.opt.add": "Add option", "oc.opt.ph": "New option…",
    "oc.link.label": "Name", "oc.link.url": "URL", "oc.link.add": "Add link",
    "oc.confirmDel": "Delete this row?", "oc.saved": "Saved", "oc.deleted": "Deleted",
    "oc.noLinks": "No links yet — click Edit links",
    "oc.filterBy": "Filter by idea:", "oc.allIdeas": "All ideas",
    "oc.tab.grid": "Grid", "oc.tab.calendar": "Calendar", "oc.tab.notebook": "Notebook",
    "oc.nb.new": "New page", "oc.nb.page": "Page", "oc.nb.of": "of",
    "oc.nb.empty": "No pages yet — click New page",
    "oc.nb.placeholder": "Write here… you can paste text and images",
    "oc.nb.title": "Page title", "oc.nb.date": "Publish date",
    "oc.nb.delete": "Delete page", "oc.nb.confirmDel": "Delete this page?", "oc.nb.saved": "Saved",
  },
});

/* ---------------- helpers / state ---------------- */
const OS = () => window.AjrlyOS || {};
const db = () => OS().db || {};
const esc = (s) => (OS().esc ? OS().esc(s) : String(s ?? ""));
const can = (a) => (typeof OS().can === "function" ? OS().can(a) : false);
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const todayISO = () => new Date().toISOString().slice(0, 10);

const MAX_ATT = 1.5 * 1024 * 1024;
const COLS = ["day", "date", "goal", "postTo", "idea", "type", "caption", "pubTime"];
const EDIT_COLS = ["goal", "postTo", "idea", "type", "caption", "pubTime"]; // day+date are auto
const DROPDOWNS = { goal: 1, postTo: 1, idea: 1, type: 1 };
let ocFilterIdea = "";   // "" = all ideas
let ocView = "grid";     // grid | calendar | notebook
let calOff = 0;          // month offset for the calendar tab
let weekOff = 0;         // week offset for the grid (0 = current week; never < 0)
let nbPage = 0;          // current notebook page index
let nbSaveTimer = null;  // debounce for notebook autosave

/* ---- week-grid date helpers (rows are auto-dated Mon→Sun) ---- */
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
function mondayOf(d) { const x = startOfDay(d); const dow = x.getDay(); x.setDate(x.getDate() + (dow === 0 ? -6 : 1 - dow)); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const selectedMonday = () => addDays(mondayOf(new Date()), weekOff * 7);
/* ISO 8601 week-of-year: weeks 1–53, Monday-start, week 1 holds the
   year's first Thursday (the global standard). */
function isoWeek(d) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = x.getUTCDay() || 7;            // Sun=7
  x.setUTCDate(x.getUTCDate() + 4 - dayNum);    // shift to this week's Thursday
  const yearStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return Math.ceil(((x - yearStart) / 86400000 + 1) / 7);
}
function weekLabel(mon) {
  const lang = getLang();
  const loc = lang === "ar" ? "ar-EG" : "en-GB";
  const sun = addDays(mon, 6);
  const monName = (d) => d.toLocaleDateString(loc, { month: "long" });
  // months the Mon→Sun week spans (one, or "June – July" across a boundary)
  const span = mon.getMonth() === sun.getMonth() ? monName(mon) : `${monName(mon)} – ${monName(sun)}`;
  const year = addDays(mon, 3).getFullYear(); // ISO week-year = the Thursday's year
  const word = lang === "ar" ? "الأسبوع" : "Week";
  return `${word} ${isoWeek(mon)} · ${span} ${year}`;
}

/* deterministic translucent colour for a value (readable in both themes) */
function colorFor(v) {
  const s = String(v || ""); if (!s) return "";
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `hsla(${h % 360},65%,55%,0.20)`;
}
const DOW2 = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const weekdayName = (iso) => { const d = new Date(iso + "T00:00:00"); return isNaN(d) ? "" : DOW2[d.getDay()]; };
const fmtDM = (iso) => { const p = String(iso || "").split("-"); return p.length === 3 ? `${+p[2]}/${+p[1]}` : ""; };

const DEFAULTS = {
  goal: ["زيادة الثقة", "زيادة الوعي بالخدمات", "تثقيف العميل", "زيادة التفاعل", "بناء المجتمع"],
  postTo: ["Whatsapp Channel", "مساحة الحوار", "التعاونات و الشراكات", "Announcements"],
  idea: ["Discount Offer", "Social Media Education", "Website Education", "Paid Ads", "Website Use CTA", "Increase Bookings", "Do's & Dont's", "Event", "Collaboration Offer"],
  type: ["Reel", "Single Graphic", "Carousel", "Story", "Video", "Text"],
};
const DEFAULT_LINKS = [
  { value: "Whatsapp Channel", url: "" }, { value: "مساحة الحوار", url: "" },
  { value: "التعاونات و الشراكات", url: "" }, { value: "Announcements", url: "" }, { value: "YouTube", url: "" },
];

const posts = () => db().contentPosts || [];
const optsRaw = () => db().contentOpts || [];
const storedFor = (f) => optsRaw().filter(o => o.field === f);
const optionsFor = (f) => { const s = storedFor(f); return s.length ? s.map(o => o.value) : (DEFAULTS[f] || []); };
const linksList = () => { const s = storedFor("link"); return s.length ? s.map(o => ({ value: o.value, url: o.url })) : DEFAULT_LINKS; };
function materialize(field, seed) {
  if (storedFor(field).length) return;
  (seed || []).forEach(v => typeof v === "string"
    ? db().addContentOpt({ field, value: v, url: "" })
    : db().addContentOpt({ field, value: v.value, url: v.url || "" }));
}

/* ---------------- cells / rows ---------------- */
const W = () => can("write");
function cellInput(field, p) {
  const v = (p && p[field]) || "";
  const ro = W() ? "" : "disabled";
  if (DROPDOWNS[field]) {
    const opts = ["<option value=\"\"></option>"].concat(optionsFor(field).map(o => `<option ${o === v ? "selected" : ""}>${esc(o)}</option>`)).join("");
    const tint = v ? ` style="background:${colorFor(v)}"` : "";
    return `<select class="oc-cell" data-f="${field}"${tint} ${ro}>${opts}</select>`;
  }
  if (field === "pubTime") {
    const parts = String(v || "").split(":"); const hh = parts[0] || "", mm = parts[1] || "";
    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
    const mins = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
    const hSel = `<select class="oc-cell oc-time" data-pt="h" ${ro} style="min-width:56px"><option value=""></option>${hours.map(s => `<option ${hh === s ? "selected" : ""}>${s}</option>`).join("")}</select>`;
    const mSel = `<select class="oc-cell oc-time" data-pt="m" ${ro} style="min-width:56px"><option value=""></option>${mins.map(s => `<option ${mm === s ? "selected" : ""}>${s}</option>`).join("")}</select>`;
    const shown = hh ? `${hh}:${mm || "00"}` : "";
    return `<span class="oc-timelabel" style="cursor:pointer;display:inline-block;min-width:40px;text-align:center;padding:4px 2px;font-size:13px">${esc(shown) || "⏰"}</span>` +
      `<span class="oc-timeedit flex" style="display:none;gap:4px;align-items:center;justify-content:center">${hSel}<b>:</b>${mSel}</span>`;
  }
  if (field === "caption") {
    return `<textarea class="oc-cell oc-cap" data-f="caption" rows="2" ${ro} style="resize:vertical;min-height:38px;overflow:hidden;white-space:pre-wrap;line-height:1.4">${esc(v)}</textarea>`;
  }
  return `<input class="oc-cell" data-f="${field}" value="${esc(v)}" ${ro} />`;
}
/* read all editable cells of a row into a post object (including the time selects) */
function readRow(tr) {
  const d = {};
  tr.querySelectorAll("[data-f]").forEach(c => { if (c.value) d[c.dataset.f] = c.value; });
  const h = tr.querySelector('[data-pt="h"]'), m = tr.querySelector('[data-pt="m"]');
  if (h && h.value) d.pubTime = `${h.value}:${(m && m.value) || "00"}`;
  return d;
}
function attachCellHTML(p) {
  const has = p && p.attachment;
  const link = has ? `<a href="${esc(p.attachment)}" target="_blank" rel="noopener" title="${esc(p.attachmentName || "")}" style="text-decoration:none">📎</a>` : "";
  const btn = W() ? `<button class="btn btn--ghost btn--sm oc-att" style="padding:0 6px">＋</button>` : "";
  return `${link}${btn}`;
}
/* a grid row keyed to a fixed date: day + date are auto/read-only, the
   rest of the columns are editable. p is the existing post (or null). */
function gridRowHTML(iso, p) {
  const idAttr = p ? `data-id="${p.id}"` : `data-draft="1"`;
  const isToday = iso && iso === todayISO();
  const dayCell = `<td><span class="oc-auto">${esc(weekdayName(iso))}</span></td>`;
  const dateCell = `<td><span class="oc-auto oc-autodate">${esc(fmtDM(iso))}</span></td>`;
  const tds = EDIT_COLS.map(f => `<td>${cellInput(f, p)}</td>`).join("");
  const del = (p && can("del")) ? `<button class="btn btn--ghost btn--sm btn--danger oc-del">🗑</button>` : "";
  return `<tr ${idAttr} data-date="${esc(iso)}"${isToday ? ' class="oc-today"' : ""}>${dayCell}${dateCell}${tds}<td style="white-space:nowrap">${attachCellHTML(p)}</td><td>${del}</td></tr>`;
}

function linksBar() {
  const links = linksList().filter(l => l.value);
  const chips = links.length
    ? links.map(l => l.url
        ? `<a class="btn btn--sm" href="${esc(l.url)}" target="_blank" rel="noopener">🔗 ${esc(l.value)}</a>`
        : `<span class="btn btn--sm" style="opacity:.55">🔗 ${esc(l.value)}</span>`).join("")
    : `<span class="muted">${esc(t("oc.noLinks"))}</span>`;
  return `<div class="card" style="margin-bottom:14px">
    <div class="flex between" style="align-items:center;margin-bottom:8px">
      <span class="card__title">🔗 ${esc(t("oc.links"))}</span>
      ${W() ? `<button class="btn btn--ghost btn--sm" id="ocEditLinks">✎ ${esc(t("oc.editLinks"))}</button>` : ""}
    </div>
    <div class="flex" style="gap:8px;flex-wrap:wrap">${chips}</div>
  </div>`;
}

function headerCell(f) {
  const pencil = (W() && DROPDOWNS[f]) ? ` <button class="btn btn--ghost btn--sm oc-opt" data-f="${f}" style="padding:0 5px">✏️</button>` : "";
  return `<th style="white-space:nowrap">${esc(t("oc.f." + f))}${pencil}</th>`;
}

/* ---------------- calendar tab ---------------- */
function calendarView() {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + calOff, 1);
  const year = base.getFullYear(), month = base.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = base.getDay();
  const lang = getLang() === "ar" ? "ar-EG" : "en-GB";
  const dows = (getLang() === "ar")
    ? ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const ym = `${year}-${String(month + 1).padStart(2, "0")}`;
  const byDay = {};
  posts().forEach(p => {
    const d = String(p.date || "");
    if (d.slice(0, 7) === ym) { const dom = parseInt(d.slice(8, 10), 10); (byDay[dom] = byDay[dom] || []).push(p); }
  });
  const total = Object.values(byDay).reduce((n, a) => n + a.length, 0);
  const head = dows.map(d => `<div style="text-align:center;font-size:11px;color:var(--muted,#94a3b8);padding:4px 0">${d}</div>`).join("");
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push("<div></div>");
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = (calOff === 0 && d === now.getDate());
    const items = (byDay[d] || []).map(p => {
      const label = esc(p.idea || p.type || p.caption || "•");
      const tip = esc([p.postTo, p.type, p.caption].filter(Boolean).join(" · "));
      return `<div title="${tip}" style="font-size:10.5px;background:${colorFor(p.idea)};border-radius:5px;padding:2px 5px;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</div>`;
    }).join("");
    cells.push(`<div style="min-height:96px;border:1px solid var(--border);border-radius:9px;padding:5px;background:var(--surface);${isToday ? "box-shadow:0 0 0 2px var(--brand) inset" : ""}">
      <div style="font-size:11px;color:var(--muted,#94a3b8);font-weight:600">${d}</div>${items}</div>`);
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
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">${head}${cells.join("")}</div>
  </div>`;
}

/* ---------------- notebook tab ---------------- */
const nbPages = () => db().notebook || [];
function nbClamp() { const n = nbPages().length; if (nbPage < 0) nbPage = 0; if (nbPage > n - 1) nbPage = Math.max(0, n - 1); }
/* strip scripts/handlers from pasted/edited HTML before storing */
function nbSanitize(html) {
  const d = document.createElement("div");
  d.innerHTML = String(html || "");
  d.querySelectorAll("script,style,iframe,object,embed,link,meta").forEach(n => n.remove());
  d.querySelectorAll("*").forEach(el => {
    [...el.attributes].forEach(a => {
      if (/^on/i.test(a.name) || ((a.name === "href" || a.name === "src") && /^\s*javascript:/i.test(a.value))) el.removeAttribute(a.name);
    });
  });
  return d.innerHTML;
}
/* persist the current page's body + title (sanitized); debounced while typing */
function nbSaveNow() {
  clearTimeout(nbSaveTimer); nbSaveTimer = null;
  const el = $("#nbBody"); if (!el) return;
  const id = el.dataset.id; if (!id) return;
  const patch = { body: nbSanitize(el.innerHTML) };
  const titleEl = $("#nbTitle"); if (titleEl) patch.title = titleEl.value;
  db().updateNotebookPage(id, patch);
}
function nbScheduleSave() { clearTimeout(nbSaveTimer); nbSaveTimer = setTimeout(nbSaveNow, 700); }
function notebookView() {
  const W = can("write");
  const pages = nbPages();
  const nbStyle = `<style>
    .nb-wrap{max-width:840px;margin:0 auto}
    .nb-paper{position:relative;min-height:560px;background:#fdfcdf;border:1px solid var(--border);border-radius:10px;
      padding:16px 22px 24px 60px;line-height:28px;color:#222;font-size:15px;outline:none;overflow-wrap:anywhere;
      background-image:repeating-linear-gradient(#fdfcdf 0,#fdfcdf 27px,#cfe2f3 28px)}
    .nb-paper::before{content:"";position:absolute;top:0;bottom:0;left:46px;width:2px;background:#e9a8a8}
    .nb-paper:empty:before{content:attr(data-ph);color:#9a9a7a}
    .nb-paper img{max-width:100%;height:auto;border-radius:6px;margin:4px 0;display:block}
    [dir="rtl"] .nb-paper{padding:16px 60px 24px 22px}
    [dir="rtl"] .nb-paper::before{left:auto;right:46px}
  </style>`;
  if (!pages.length) {
    return `${nbStyle}<div class="nb-wrap"><div class="card"><div class="empty"><div class="empty__icon">📓</div>
      <p class="muted">${esc(t("oc.nb.empty"))}</p>
      ${W ? `<button class="btn btn--primary" id="nbNew">＋ ${esc(t("oc.nb.new"))}</button>` : ""}</div></div></div>`;
  }
  nbClamp();
  const p = pages[nbPage];
  const nav = `<div class="flex between" style="align-items:center;margin-bottom:10px;gap:8px;flex-wrap:wrap">
    <span class="flex" style="gap:6px;align-items:center">
      <button class="btn btn--ghost btn--sm" data-nbnav="prev" ${nbPage <= 0 ? "disabled" : ""}>‹</button>
      <span class="muted" style="min-width:96px;text-align:center">${esc(t("oc.nb.page"))} ${nbPage + 1} ${esc(t("oc.nb.of"))} ${pages.length}</span>
      <button class="btn btn--ghost btn--sm" data-nbnav="next" ${nbPage >= pages.length - 1 ? "disabled" : ""}>›</button>
    </span>
    <span class="flex" style="gap:6px;align-items:center">
      ${W ? `<input type="date" class="input" id="nbDate" value="${esc(p.date || "")}" style="max-width:160px" title="${esc(t("oc.nb.date"))}" />`
          : (p.date ? `<span class="muted">📅 ${esc(p.date)}</span>` : "")}
      ${W ? `<button class="btn btn--ghost btn--sm" id="nbNew">＋ ${esc(t("oc.nb.new"))}</button>` : ""}
      ${(W && can("del")) ? `<button class="btn btn--ghost btn--sm btn--danger" id="nbDel" title="${esc(t("oc.nb.delete"))}">🗑</button>` : ""}
    </span>
  </div>`;
  const titleField = W
    ? `<input class="input" id="nbTitle" value="${esc(p.title || "")}" placeholder="${esc(t("oc.nb.title"))}" style="margin-bottom:8px;font-weight:600" />`
    : (p.title ? `<div style="font-weight:700;margin-bottom:8px">${esc(p.title)}</div>` : "");
  return `${nbStyle}<div class="nb-wrap">${nav}${titleField}
    <div class="nb-paper" id="nbBody" ${W ? 'contenteditable="true"' : ""} data-id="${esc(p.id)}" data-ph="${esc(t("oc.nb.placeholder"))}">${nbSanitize(p.body || "")}</div>
  </div>`;
}

function view() {
  const style = `<style>
    table.oc-grid td { padding:4px 6px; vertical-align:middle }
    .oc-cell { width:100%; min-width:120px; box-sizing:border-box; border:1px solid var(--border); border-radius:6px; padding:6px 8px; background:var(--surface); color:var(--text); font:inherit }
    .oc-cell:focus { outline:2px solid var(--brand); outline-offset:-1px }
    table.oc-grid td:nth-child(1) { width:60px }   /* day — narrow */
    table.oc-grid td:nth-child(2) { width:58px }   /* date — narrow */
    table.oc-grid td:nth-child(7) .oc-cell { min-width:300px }  /* caption — roomy */
    table.oc-grid td:nth-child(5) .oc-cell { min-width:170px }  /* content idea */
    table.oc-grid td:nth-child(8) { width:74px; text-align:center }  /* publishing time — compact + centred */
    table.oc-grid td:nth-child(1), table.oc-grid td:nth-child(2) { text-align:center }
    .oc-auto { display:inline-block; min-width:40px; font-weight:600; color:var(--muted,#94a3b8) }
    .oc-autodate { color:var(--text) }
    tr.oc-today td { background:rgba(26,92,255,.10) }
    tr.oc-today td:nth-child(2) .oc-auto { color:var(--brand); font-weight:700 }
  </style>`;
  const tabs = `<div class="seg" id="ocTabs" style="margin-bottom:14px">
    <button data-ocview="grid" class="${ocView === "grid" ? "active" : ""}">🗓️ ${esc(t("oc.tab.grid"))}</button>
    <button data-ocview="calendar" class="${ocView === "calendar" ? "active" : ""}">📆 ${esc(t("oc.tab.calendar"))}</button>
    <button data-ocview="notebook" class="${ocView === "notebook" ? "active" : ""}">📓 ${esc(t("oc.tab.notebook"))}</button>
  </div>`;
  if (ocView === "calendar") return `<div>${tabs}${linksBar()}${calendarView()}</div>`;
  if (ocView === "notebook") return `<div>${tabs}${notebookView()}</div>`;

  const filterSel = `<div class="toolbar"><div class="toolbar__left">
    <span class="muted">${esc(t("oc.filterBy"))}</span>
    <select class="input" id="ocFilter"><option value="">${esc(t("oc.allIdeas"))}</option>${optionsFor("idea").map(o => `<option ${ocFilterIdea === o ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>
  </div></div>`;

  let weekBar = "", body = "";
  if (ocFilterIdea) {
    // filtering: flat list of matching posts (across all weeks), auto-dated rows
    body = posts().filter(p => p.idea === ocFilterIdea).map(p => gridRowHTML(p.date || "", p)).join("");
  } else {
    // week view: one auto-dated row per day Mon→Sun of the selected week
    const mon = selectedMonday();
    weekBar = `<div class="card" style="padding:10px 14px;margin-bottom:12px"><div class="flex between" style="align-items:center">
      <span class="card__title">🗓️ ${esc(weekLabel(mon))}</span>
      <span class="flex" style="gap:4px">
        <button class="btn btn--ghost btn--sm" data-wk="prev" ${weekOff <= 0 ? "disabled" : ""}>‹</button>
        <button class="btn btn--sm" data-wk="today">${getLang() === "ar" ? "اليوم" : "Today"}</button>
        <button class="btn btn--ghost btn--sm" data-wk="next">›</button>
      </span></div></div>`;
    const rows = [];
    for (let i = 0; i < 7; i++) {
      const iso = isoOf(addDays(mon, i));
      const dayPosts = posts().filter(x => x.date === iso);
      if (dayPosts.length) dayPosts.forEach(p => rows.push(gridRowHTML(iso, p)));
      else rows.push(gridRowHTML(iso, null));
    }
    body = rows.join("");
  }
  return `<div>${style}${tabs}${linksBar()}${filterSel}${weekBar}
    <div class="table-wrap"><table class="oc-grid">
      <thead><tr>${COLS.map(headerCell).join("")}<th>📎</th><th></th></tr></thead>
      <tbody id="ocBody">${body}</tbody>
    </table></div>
  </div>`;
}

/* ---------------- attachment modal ---------------- */
function attachModal(id) {
  const p = posts().find(x => x.id === id) || {};
  let att = p.attachment && !/^https?:/i.test(p.attachment) ? { data: p.attachment, name: p.attachmentName || "file" } : null;
  OS().openModal(`
    <div class="modal__head"><h3>📎 ${esc(t("oc.attach.title"))}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body">
      <div class="field"><label>${esc(t("oc.attach.file"))}</label>
        <input type="file" id="oc_file" accept=".pdf,.png,.jpg,.jpeg,.svg,.mp4,.mov,image/*,video/*,application/pdf" /></div>
      <div class="field"><label>${esc(t("oc.attach.link"))}</label>
        <input id="oc_link" value="${esc(p.attachment && /^https?:/i.test(p.attachment) ? p.attachment : "")}" placeholder="https://…" /></div>
      <div id="oc_att_state" class="muted" style="font-size:12px"></div>
    </div>
    <div class="modal__foot"><button class="btn" data-close>${esc(t("btn.cancel") || "Cancel")}</button>
      <button class="btn btn--primary" data-save>${esc(t("btn.save") || "Save")}</button></div>`);
  const show = () => { const b = $("#oc_att_state"); if (b) b.textContent = att && att.name ? "📎 " + att.name : ""; };
  show();
  const file = $("#oc_file");
  if (file) file.onchange = () => {
    const f = file.files && file.files[0]; if (!f) return;
    if (f.size > MAX_ATT) { OS().toast(t("oc.attach.tooBig")); file.value = ""; return; }
    const r = new FileReader(); r.onload = () => { att = { data: String(r.result || ""), name: f.name }; const l = $("#oc_link"); if (l) l.value = ""; show(); }; r.readAsDataURL(f);
  };
  ($("[data-save]") || {}).onclick = () => {
    const link = $("#oc_link").value.trim();
    const patch = link ? { attachment: link, attachmentName: link.split("/").pop() || "link" }
      : (att ? { attachment: att.data, attachmentName: att.name } : { attachment: "", attachmentName: "" });
    db().updateContentPost(id, patch);
    OS().closeModal(); (OS().render || (() => {}))(); OS().toast(t("oc.saved"));
  };
  $$("[data-close]").forEach(b => b.onclick = OS().closeModal);
}

/* ---------------- option editor (header pencil) ---------------- */
function optionEditor(field, done) {
  materialize(field, DEFAULTS[field]);
  const list = storedFor(field);
  OS().openModal(`
    <div class="modal__head"><h3>✏️ ${esc(t("oc.opt.title"))}${esc(t("oc.f." + field))}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body">
      <div>${list.map(o => `<div class="flex between" style="padding:6px 0;border-bottom:1px solid var(--border)">
        <span>${esc(o.value)}</span><button class="btn btn--ghost btn--sm btn--danger" data-rm="${o.id}">🗑</button></div>`).join("") || "<p class='muted'>—</p>"}</div>
      <div class="flex" style="gap:8px;margin-top:12px">
        <input id="oc_newopt" placeholder="${esc(t("oc.opt.ph"))}" style="flex:1" />
        <button class="btn btn--primary" id="oc_addopt">＋ ${esc(t("oc.opt.add"))}</button>
      </div>
    </div>
    <div class="modal__foot"><button class="btn" data-close>${esc(t("btn.cancel") || "Done")}</button></div>`);
  const refresh = () => optionEditor(field, done);
  $("#oc_addopt").onclick = () => { const v = $("#oc_newopt").value.trim(); if (!v) return; db().addContentOpt({ field, value: v, url: "" }); refresh(); };
  $("#oc_newopt").onkeydown = (e) => { if (e.key === "Enter") $("#oc_addopt").click(); };
  $$("[data-rm]").forEach(b => b.onclick = () => { db().removeContentOpt(b.dataset.rm); refresh(); });
  $$("[data-close]").forEach(b => b.onclick = () => { OS().closeModal(); if (done) done(); });
}

/* ---------------- links editor ---------------- */
function linksEditor() {
  materialize("link", DEFAULT_LINKS);
  const list = storedFor("link");
  OS().openModal(`
    <div class="modal__head"><h3>🔗 ${esc(t("oc.editLinks"))}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body">
      <div>${list.map(o => `<div class="flex between" style="gap:8px;padding:6px 0;border-bottom:1px solid var(--border);align-items:center">
        <div style="flex:1">
          <input data-lname="${o.id}" value="${esc(o.value)}" placeholder="${esc(t("oc.link.label"))}" style="margin-bottom:4px" />
          <input data-lurl="${o.id}" value="${esc(o.url || "")}" placeholder="${esc(t("oc.link.url"))}" />
        </div>
        <button class="btn btn--ghost btn--sm btn--danger" data-rml="${o.id}">🗑</button></div>`).join("")}</div>
      <button class="btn btn--sm" id="oc_addlink" style="margin-top:10px">＋ ${esc(t("oc.link.add"))}</button>
    </div>
    <div class="modal__foot"><button class="btn btn--primary" data-savelinks>${esc(t("btn.save") || "Save")}</button></div>`);
  const persist = () => storedFor("link").forEach(o => {
    const n = document.querySelector(`[data-lname="${o.id}"]`), u = document.querySelector(`[data-lurl="${o.id}"]`);
    if (n && u) db().updateContentOpt(o.id, { value: n.value.trim(), url: u.value.trim() });
  });
  $("#oc_addlink").onclick = () => { persist(); db().addContentOpt({ field: "link", value: "New", url: "" }); linksEditor(); };
  $$("[data-rml]").forEach(b => b.onclick = () => { db().removeContentOpt(b.dataset.rml); linksEditor(); });
  ($("[data-savelinks]") || {}).onclick = () => { persist(); OS().closeModal(); (OS().render || (() => {}))(); OS().toast(t("oc.saved")); };
  $$("[data-close]").forEach(b => b.onclick = OS().closeModal);
}

/* ---------------- mount (inline grid editing) ---------------- */
function mount(ctx) {
  const reRender = () => (ctx && ctx.render ? ctx.render() : (OS().render && OS().render()));
  // tab switch (grid / calendar) + calendar month nav — bind first (work in both views)
  $$("[data-ocview]").forEach(b => b.onclick = () => { ocView = b.dataset.ocview; reRender(); });
  $$("[data-ccnav]").forEach(b => b.onclick = () => {
    const d = b.dataset.ccnav; if (d === "prev") calOff -= 1; else if (d === "next") calOff += 1; else calOff = 0;
    reRender();
  });
  // week navigator for the grid (never goes before the current week)
  $$("[data-wk]").forEach(b => b.onclick = () => {
    const d = b.dataset.wk; if (d === "prev") weekOff = Math.max(0, weekOff - 1); else if (d === "next") weekOff += 1; else weekOff = 0;
    reRender();
  });
  const el = $("#ocEditLinks"); if (el) el.onclick = () => linksEditor();
  $$(".oc-opt").forEach(b => b.onclick = () => optionEditor(b.dataset.f, reRender));
  const flt = $("#ocFilter"); if (flt) flt.onchange = (e) => { ocFilterIdea = e.target.value; reRender(); };

  // ---- notebook bindings (bound before the grid early-return below) ----
  const nbNew = $("#nbNew");
  if (nbNew) nbNew.onclick = () => {
    db().addNotebookPage({ title: "", date: todayISO(), body: "" });
    nbPage = (db().notebook || []).length - 1;   // jump to the new (last) page
    reRender();
  };
  $$("[data-nbnav]").forEach(b => b.onclick = () => {
    nbSaveNow();
    nbPage += (b.dataset.nbnav === "next" ? 1 : -1);
    reRender();
  });
  const nbDate = $("#nbDate"); if (nbDate) nbDate.onchange = () => { const el2 = $("#nbBody"); if (el2) db().updateNotebookPage(el2.dataset.id, { date: nbDate.value }); };
  const nbTitle = $("#nbTitle"); if (nbTitle) nbTitle.oninput = () => nbScheduleSave();
  const nbDel = $("#nbDel");
  if (nbDel) nbDel.onclick = () => {
    const el2 = $("#nbBody"); if (!el2) return;
    if (!confirm(t("oc.nb.confirmDel"))) return;
    db().removeNotebookPage(el2.dataset.id);
    if (nbPage > 0) nbPage -= 1;
    reRender(); OS().toast(t("oc.deleted"));
  };
  const nbBody = $("#nbBody");
  if (nbBody && nbBody.getAttribute("contenteditable") === "true") {
    nbBody.addEventListener("input", () => nbScheduleSave());
    nbBody.addEventListener("blur", () => nbSaveNow());
    nbBody.addEventListener("paste", (e) => {
      const items = (e.clipboardData && e.clipboardData.items) || [];
      for (const it of items) {
        if (it.type && it.type.indexOf("image") === 0) {
          e.preventDefault();
          const f = it.getAsFile(); if (!f) continue;
          if (f.size > 2 * 1024 * 1024) { OS().toast(t("oc.attach.tooBig")); return; }
          const r = new FileReader();
          r.onload = () => { try { document.execCommand("insertImage", false, String(r.result || "")); } catch (_) {} nbScheduleSave(); };
          r.readAsDataURL(f);
          return;
        }
      }
      nbScheduleSave(); // plain text paste → save after the default insert
    });
  }

  const body = $("#ocBody");
  if (!body) return;

  // caption textareas auto-grow to show the whole text
  const autosize = (ta) => { ta.style.height = "auto"; ta.style.height = (ta.scrollHeight + 2) + "px"; };
  body.querySelectorAll(".oc-cap").forEach(autosize);
  body.addEventListener("input", (e) => { const ta = e.target.closest && e.target.closest(".oc-cap"); if (ta) autosize(ta); });

  // inline edit: existing rows update in place; blank rows become real on first entry
  body.addEventListener("change", (e) => {
    const cell = e.target.closest("[data-f], .oc-time"); if (!cell) return;
    const tr = cell.closest("tr");
    let field, val;
    if (cell.classList.contains("oc-time")) {
      field = "pubTime";
      const h = tr.querySelector('[data-pt="h"]').value, m = tr.querySelector('[data-pt="m"]').value;
      val = h ? `${h}:${m || "00"}` : "";
      const lbl = cell.closest("td").querySelector(".oc-timelabel");
      if (lbl) lbl.textContent = val || "⏰";
    } else {
      field = cell.dataset.f; val = cell.value;
      if (cell.tagName === "SELECT") cell.style.background = colorFor(val);  // recolour chip
    }
    if (tr.dataset.id) {
      db().updateContentPost(tr.dataset.id, { [field]: val }); return;
    }
    // draft row → create a post from whatever is filled, stamped with the
    // row's fixed (auto) date + weekday.
    const data = readRow(tr);
    if (!Object.keys(data).length) return;
    const iso = tr.dataset.date || "";
    if (iso) { data.date = iso; data.day = weekdayName(iso); }
    db().addContentPost(data);
    const id = (db().contentPosts[0] || {}).id;
    tr.dataset.id = id; tr.removeAttribute("data-draft");
    if (can("del")) { const last = tr.querySelector("td:last-child"); if (last) last.innerHTML = `<button class="btn btn--ghost btn--sm btn--danger oc-del">🗑</button>`; }
  });

  // collapse the time pickers back to their compact box on blur
  body.addEventListener("focusout", (e) => {
    const tsel = e.target.closest && e.target.closest(".oc-time");
    if (tsel) {
      const td = tsel.closest("td");
      setTimeout(() => {
        const edit = td.querySelector(".oc-timeedit");
        if (edit && !edit.contains(document.activeElement)) {
          const h = td.querySelector('[data-pt="h"]').value, m = td.querySelector('[data-pt="m"]').value;
          const lbl = td.querySelector(".oc-timelabel");
          if (lbl) { lbl.textContent = h ? `${h}:${m || "00"}` : "⏰"; lbl.style.display = ""; }
          edit.style.display = "none";
        }
      }, 0);
    }
  });

  body.addEventListener("click", (e) => {
    const tr = e.target.closest("tr"); if (!tr) return;
    // click the compact time box → reveal the hour/minute dropdowns
    const tlbl = e.target.closest(".oc-timelabel");
    if (tlbl && W()) {
      const edit = tlbl.parentNode.querySelector(".oc-timeedit");
      tlbl.style.display = "none"; edit.style.display = "";
      const h = edit.querySelector('[data-pt="h"]'); if (h) h.focus();
      return;
    }
    if (e.target.closest(".oc-del")) {
      if (!tr.dataset.id) return;
      if (!confirm(t("oc.confirmDel"))) return;
      db().removeContentPost(tr.dataset.id); reRender(); OS().toast(t("oc.deleted")); return;
    }
    if (e.target.closest(".oc-att")) {
      if (!tr.dataset.id) { OS().toast(t("oc.attach.fillFirst")); return; }
      attachModal(tr.dataset.id);
    }
  });
}

registerModule({
  id: "ownercontent",
  icon: "🗓️",
  labelKey: "nav.oc",
  titleKey: "page.oc",
  subKey: "page.oc.sub",
  order: 42,
  view,
  mount,
});
