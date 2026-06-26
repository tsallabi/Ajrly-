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
    "oc.tab.grid": "الجدول", "oc.tab.calendar": "التقويم",
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
    "oc.tab.grid": "Grid", "oc.tab.calendar": "Calendar",
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
const DROPDOWNS = { goal: 1, postTo: 1, idea: 1, type: 1 };
const N_BLANK = 7;
let ocFilterIdea = "";   // "" = all ideas
let ocView = "grid";     // grid | calendar
let calOff = 0;          // month offset for the calendar tab

/* deterministic translucent colour for a value (readable in both themes) */
function colorFor(v) {
  const s = String(v || ""); if (!s) return "";
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `hsla(${h % 360},65%,55%,0.20)`;
}
const weekdayName = (iso) => { try { return new Date(iso + "T00:00:00").toLocaleDateString(getLang() === "ar" ? "ar-EG" : "en-GB", { weekday: "short" }); } catch (_) { return ""; } };
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
  if (field === "day") return `<input class="oc-cell" data-f="day" value="${esc(v)}" ${ro} style="width:58px;min-width:48px;text-align:center" />`;
  if (field === "date") return `<span class="oc-datelabel" title="${esc(v)}" style="cursor:pointer;display:inline-block;min-width:42px;text-align:center;padding:6px 4px">${esc(fmtDM(v)) || "📅"}</span><input type="date" class="oc-cell oc-datein" data-f="date" value="${esc(v)}" style="display:none" ${ro} />`;
  if (DROPDOWNS[field]) {
    const opts = ["<option value=\"\"></option>"].concat(optionsFor(field).map(o => `<option ${o === v ? "selected" : ""}>${esc(o)}</option>`)).join("");
    const tint = v ? ` style="background:${colorFor(v)}"` : "";
    return `<select class="oc-cell" data-f="${field}"${tint} ${ro}>${opts}</select>`;
  }
  return `<input class="oc-cell" data-f="${field}" value="${esc(v)}" ${ro} />`;
}
function attachCellHTML(p) {
  const has = p && p.attachment;
  const link = has ? `<a href="${esc(p.attachment)}" target="_blank" rel="noopener" title="${esc(p.attachmentName || "")}" style="text-decoration:none">📎</a>` : "";
  const btn = W() ? `<button class="btn btn--ghost btn--sm oc-att" style="padding:0 6px">＋</button>` : "";
  return `${link}${btn}`;
}
function rowHTML(p) {
  const idAttr = p ? `data-id="${p.id}"` : `data-draft="1"`;
  const tds = COLS.map(f => `<td>${cellInput(f, p)}</td>`).join("");
  const del = (p && can("del")) ? `<button class="btn btn--ghost btn--sm btn--danger oc-del">🗑</button>` : "";
  return `<tr ${idAttr}>${tds}<td style="white-space:nowrap">${attachCellHTML(p)}</td><td>${del}</td></tr>`;
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

function view() {
  const style = `<style>
    table.oc-grid td { padding:4px 6px; vertical-align:middle }
    .oc-cell { width:100%; min-width:120px; box-sizing:border-box; border:1px solid var(--border); border-radius:6px; padding:6px 8px; background:var(--surface); color:var(--text); font:inherit }
    .oc-cell:focus { outline:2px solid var(--brand); outline-offset:-1px }
    table.oc-grid td:nth-child(1) { width:60px }   /* day — narrow */
    table.oc-grid td:nth-child(2) { width:58px }   /* date — narrow */
    table.oc-grid td:nth-child(7) .oc-cell { min-width:300px }  /* caption — roomy */
    table.oc-grid td:nth-child(5) .oc-cell { min-width:170px }  /* content idea */
  </style>`;
  const tabs = `<div class="seg" id="ocTabs" style="margin-bottom:14px">
    <button data-ocview="grid" class="${ocView === "grid" ? "active" : ""}">🗓️ ${esc(t("oc.tab.grid"))}</button>
    <button data-ocview="calendar" class="${ocView === "calendar" ? "active" : ""}">📆 ${esc(t("oc.tab.calendar"))}</button>
  </div>`;
  if (ocView === "calendar") return `<div>${tabs}${linksBar()}${calendarView()}</div>`;

  const filterSel = `<div class="toolbar"><div class="toolbar__left">
    <span class="muted">${esc(t("oc.filterBy"))}</span>
    <select class="input" id="ocFilter"><option value="">${esc(t("oc.allIdeas"))}</option>${optionsFor("idea").map(o => `<option ${ocFilterIdea === o ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>
  </div></div>`;
  const list = ocFilterIdea ? posts().filter(p => p.idea === ocFilterIdea) : posts();
  // blank rows only when not filtering (so you can keep adding)
  const blanks = (W() && !ocFilterIdea) ? Array.from({ length: N_BLANK }).map(() => rowHTML(null)).join("") : "";
  const body = list.map(rowHTML).join("") + blanks;
  return `<div>${style}${tabs}${linksBar()}${filterSel}
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
  const el = $("#ocEditLinks"); if (el) el.onclick = () => linksEditor();
  $$(".oc-opt").forEach(b => b.onclick = () => optionEditor(b.dataset.f, reRender));
  const flt = $("#ocFilter"); if (flt) flt.onchange = (e) => { ocFilterIdea = e.target.value; reRender(); };

  const body = $("#ocBody");
  if (!body) return;

  // inline edit: existing rows update in place; blank rows become real on first entry
  body.addEventListener("change", (e) => {
    const cell = e.target.closest("[data-f]"); if (!cell) return;
    const tr = cell.closest("tr"); const field = cell.dataset.f; const val = cell.value;
    if (cell.tagName === "SELECT") cell.style.background = colorFor(val);  // recolour chip
    // picking a date: show compact d/m label, hide the picker, auto-fill the weekday
    let extra = null;
    if (field === "date") {
      const lbl = tr.querySelector(".oc-datelabel");
      if (lbl) { lbl.textContent = fmtDM(val) || "📅"; lbl.style.display = ""; }
      cell.style.display = "none";
      if (val) { const wd = weekdayName(val); const dayCell = tr.querySelector('[data-f="day"]'); if (dayCell) dayCell.value = wd; extra = { day: wd }; }
    }
    if (tr.dataset.id) {
      const patch = { [field]: val }; if (extra) Object.assign(patch, extra);
      db().updateContentPost(tr.dataset.id, patch); return;
    }
    // draft row → create a post from whatever is filled in this row
    const data = {};
    tr.querySelectorAll("[data-f]").forEach(c => { if (c.value) data[c.dataset.f] = c.value; });
    if (!Object.keys(data).length) return;
    db().addContentPost(data);
    const id = (db().contentPosts[0] || {}).id;
    tr.dataset.id = id; tr.removeAttribute("data-draft");
    if (can("del")) { const last = tr.querySelector("td:last-child"); if (last) last.innerHTML = `<button class="btn btn--ghost btn--sm btn--danger oc-del">🗑</button>`; }
    // keep blank rows available — top up when the last one is filled
    if (!body.querySelector("tr[data-draft]")) { for (let i = 0; i < 3; i++) body.insertAdjacentHTML("beforeend", rowHTML(null)); }
  });

  // revert the date picker back to its compact label when it loses focus
  body.addEventListener("focusout", (e) => {
    const inp = e.target.closest && e.target.closest(".oc-datein"); if (!inp) return;
    const lbl = inp.parentNode.querySelector(".oc-datelabel");
    if (lbl) { lbl.textContent = fmtDM(inp.value) || "📅"; lbl.style.display = ""; }
    inp.style.display = "none";
  });

  body.addEventListener("click", (e) => {
    const tr = e.target.closest("tr"); if (!tr) return;
    // click the compact date label → reveal the date picker
    const lbl = e.target.closest(".oc-datelabel");
    if (lbl && W()) {
      const inp = lbl.parentNode.querySelector(".oc-datein");
      lbl.style.display = "none"; inp.style.display = ""; inp.focus();
      if (inp.showPicker) { try { inp.showPicker(); } catch (_) {} }
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
