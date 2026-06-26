/* ============================================================
   Ajrly OS — Owner Content calendar (محتوى الملاك)
   A content schedule with editable dropdowns (manage options via the
   pencil), a per-row file/link attachment, and a top links bar to the
   WhatsApp groups ("Post To") and the YouTube channel.
   Local-first; syncs like the rest of the app (contentPosts + contentOpts).
   ============================================================ */
import { registerModule } from "../registry.js";
import { registerStrings, t, getLang } from "../i18n.js";

registerStrings({
  ar: {
    "nav.oc": "محتوى الملاك",
    "page.oc": "جدول محتوى الملاك",
    "page.oc.sub": "خطة المحتوى مع قوائم قابلة للتعديل ومرفقات وروابط النشر",
    "oc.add": "إضافة منشور",
    "oc.edit": "تعديل المنشور",
    "oc.links": "روابط النشر",
    "oc.editLinks": "تعديل الروابط",
    "oc.f.day": "اليوم", "oc.f.date": "التاريخ", "oc.f.goal": "الهدف",
    "oc.f.postTo": "النشر على", "oc.f.idea": "فكرة المحتوى", "oc.f.type": "نوع المحتوى",
    "oc.f.caption": "الكابشن", "oc.f.time": "وقت النشر", "oc.f.attach": "مرفق (ملف أو رابط)",
    "oc.attach.file": "رفع ملف (≤1.5 ميجا)", "oc.attach.link": "أو رابط (Drive/يوتيوب…)",
    "oc.attach.tooBig": "الملف كبير جداً — استخدم رابطاً للملفات الكبيرة/الفيديو",
    "oc.opt.title": "تعديل خيارات: ", "oc.opt.add": "إضافة خيار", "oc.opt.ph": "خيار جديد…",
    "oc.link.label": "الاسم", "oc.link.url": "الرابط", "oc.link.add": "إضافة رابط",
    "oc.th.actions": "", "oc.empty": "لا توجد منشورات بعد — أضف أول منشور",
    "oc.confirmDel": "حذف هذا المنشور؟", "oc.confirmDelOpt": "حذف هذا الخيار؟",
    "oc.saved": "تم الحفظ", "oc.deleted": "تم الحذف", "oc.noLinks": "لا روابط بعد",
  },
  en: {
    "nav.oc": "Owner Content",
    "page.oc": "Owner Content Schedule",
    "page.oc.sub": "Content plan with editable dropdowns, attachments and posting links",
    "oc.add": "Add post",
    "oc.edit": "Edit post",
    "oc.links": "Posting links",
    "oc.editLinks": "Edit links",
    "oc.f.day": "Day", "oc.f.date": "Date", "oc.f.goal": "Goal",
    "oc.f.postTo": "Post To", "oc.f.idea": "Content idea", "oc.f.type": "Content type",
    "oc.f.caption": "Caption", "oc.f.time": "Publishing time", "oc.f.attach": "Attachment (file or link)",
    "oc.attach.file": "Upload file (≤1.5MB)", "oc.attach.link": "or link (Drive/YouTube…)",
    "oc.attach.tooBig": "File too large — use a link for large files/video",
    "oc.opt.title": "Edit options: ", "oc.opt.add": "Add option", "oc.opt.ph": "New option…",
    "oc.link.label": "Name", "oc.link.url": "URL", "oc.link.add": "Add link",
    "oc.th.actions": "", "oc.empty": "No posts yet — add your first post",
    "oc.confirmDel": "Delete this post?", "oc.confirmDelOpt": "Delete this option?",
    "oc.saved": "Saved", "oc.deleted": "Deleted", "oc.noLinks": "No links yet",
  },
});

/* ---------------- helpers / state ---------------- */
const OS = () => window.AjrlyOS || {};
const db = () => OS().db || {};
const esc = (s) => (OS().esc ? OS().esc(s) : String(s ?? ""));
const fmtDate = (iso) => (OS().fmtDate ? OS().fmtDate(iso) : (iso || "—"));
const can = (a) => (typeof OS().can === "function" ? OS().can(a) : false);
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const todayISO = () => new Date().toISOString().slice(0, 10);

const MAX_ATT = 1.5 * 1024 * 1024;
const FIELDS = ["goal", "postTo", "idea", "type"];

/* default dropdown options (from the original sheet) — used until edited */
const DEFAULTS = {
  goal: ["زيادة الثقة", "زيادة الوعي بالخدمات", "تثقيف العميل", "زيادة التفاعل", "بناء المجتمع"],
  postTo: ["Whatsapp Channel", "مساحة الحوار", "التعاونات و الشراكات", "Announcements"],
  idea: ["Discount Offer", "Social Media Education", "Website Education", "Paid Ads", "Website Use CTA", "Increase Bookings", "Do's & Dont's", "Event", "Collaboration Offer"],
  type: ["Reel", "Single Graphic", "Carousel", "Story", "Video", "Text"],
};
const DEFAULT_LINKS = [
  { value: "Whatsapp Channel", url: "" },
  { value: "مساحة الحوار", url: "" },
  { value: "التعاونات و الشراكات", url: "" },
  { value: "Announcements", url: "" },
  { value: "YouTube", url: "" },
];

const posts = () => db().contentPosts || [];
const optsRaw = () => db().contentOpts || [];
const storedFor = (field) => optsRaw().filter(o => o.field === field);
/* effective options for a dropdown field: stored values, else defaults */
function optionsFor(field) {
  const s = storedFor(field);
  return s.length ? s.map(o => o.value) : (DEFAULTS[field] || []);
}
function linksList() {
  const s = storedFor("link");
  return s.length ? s.map(o => ({ value: o.value, url: o.url })) : DEFAULT_LINKS;
}
/* turn defaults into stored rows so they become individually editable */
function materialize(field, seed) {
  if (storedFor(field).length) return;
  (seed || []).forEach(v => {
    if (typeof v === "string") db().addContentOpt({ field, value: v, url: "" });
    else db().addContentOpt({ field, value: v.value, url: v.url || "" });
  });
}

/* ---------------- view ---------------- */
function linksBar() {
  const W = can("write");
  const links = linksList().filter(l => l.value);
  const chips = links.length
    ? links.map(l => l.url
        ? `<a class="btn btn--sm" href="${esc(l.url)}" target="_blank" rel="noopener">🔗 ${esc(l.value)}</a>`
        : `<span class="btn btn--sm" style="opacity:.6" title="${esc(t("oc.editLinks"))}">🔗 ${esc(l.value)}</span>`).join("")
    : `<span class="muted">${esc(t("oc.noLinks"))}</span>`;
  return `<div class="card" style="margin-bottom:14px">
    <div class="flex between" style="align-items:center;margin-bottom:8px">
      <span class="card__title">🔗 ${esc(t("oc.links"))}</span>
      ${W ? `<button class="btn btn--ghost btn--sm" id="ocEditLinks">✎ ${esc(t("oc.editLinks"))}</button>` : ""}
    </div>
    <div class="flex" style="gap:8px;flex-wrap:wrap">${chips}</div>
  </div>`;
}

function table() {
  const list = posts();
  if (!list.length) {
    return `<div class="card"><div class="empty"><div class="empty__icon">🗓️</div><h3>${esc(t("oc.empty"))}</h3></div></div>`;
  }
  const D = can("del");
  const rows = list.map(p => {
    const att = p.attachment
      ? `<a href="${esc(p.attachment)}" target="_blank" rel="noopener" download="${esc(p.attachmentName || "file")}">📎 ${esc(p.attachmentName || "open")}</a>`
      : "—";
    return `<tr>
      <td>${esc(p.day || "—")}</td>
      <td style="white-space:nowrap">${p.date ? fmtDate(p.date) : "—"}</td>
      <td>${esc(p.goal || "—")}</td>
      <td>${esc(p.postTo || "—")}</td>
      <td>${esc(p.idea || "—")}</td>
      <td>${esc(p.type || "—")}</td>
      <td><div class="muted" style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.caption || "")}</div></td>
      <td style="white-space:nowrap">${esc(p.pubTime || "—")}</td>
      <td>${att}</td>
      <td><div class="row-actions">
        <button class="btn btn--ghost btn--sm" data-ocedit="${p.id}">✎</button>
        ${D ? `<button class="btn btn--ghost btn--sm btn--danger" data-ocdel="${p.id}">🗑</button>` : ""}
      </div></td>
    </tr>`;
  }).join("");
  return `<div class="table-wrap"><table>
    <thead><tr>
      <th>${esc(t("oc.f.day"))}</th><th>${esc(t("oc.f.date"))}</th><th>${esc(t("oc.f.goal"))}</th>
      <th>${esc(t("oc.f.postTo"))}</th><th>${esc(t("oc.f.idea"))}</th><th>${esc(t("oc.f.type"))}</th>
      <th>${esc(t("oc.f.caption"))}</th><th>${esc(t("oc.f.time"))}</th><th>📎</th><th></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function view() {
  const W = can("write");
  const toolbar = `<div class="toolbar"><div class="toolbar__left"></div><div class="toolbar__right">
    ${W ? `<button class="btn btn--primary" id="ocAdd">＋ ${esc(t("oc.add"))}</button>` : ""}
  </div></div>`;
  return `<div>${linksBar()}${toolbar}${table()}</div>`;
}

/* ---------------- dropdown + pencil field ---------------- */
function selectField(field, current) {
  const opts = optionsFor(field);
  const options = [`<option value="">—</option>`]
    .concat(opts.map(o => `<option value="${esc(o)}" ${current === o ? "selected" : ""}>${esc(o)}</option>`))
    .join("");
  return `<div class="field">
    <label class="flex between" style="align-items:center">${esc(t("oc.f." + field))}
      <button type="button" class="btn btn--ghost btn--sm" data-ocopt="${field}" title="${esc(t("oc.editLinks"))}" style="padding:0 6px">✏️</button>
    </label>
    <select id="oc_${field}">${options}</select>
  </div>`;
}

/* ---------------- post modal ---------------- */
function postModal(post) {
  const x = post || {};
  const editing = !!post;
  let att = x.attachment ? { data: x.attachment, name: x.attachmentName || "file" } : null;
  OS().openModal(`
    <div class="modal__head"><h3>${esc(t(editing ? "oc.edit" : "oc.add"))}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body">
      <div class="field-row">
        <div class="field"><label>${esc(t("oc.f.day"))}</label><input id="oc_day" value="${esc(x.day || "")}" /></div>
        <div class="field"><label>${esc(t("oc.f.date"))}</label><input type="date" id="oc_date" value="${esc(x.date || todayISO())}" /></div>
      </div>
      <div class="field-row">${selectField("goal", x.goal)}${selectField("postTo", x.postTo)}</div>
      <div class="field-row">${selectField("idea", x.idea)}${selectField("type", x.type)}</div>
      <div class="field"><label>${esc(t("oc.f.caption"))}</label><textarea id="oc_caption">${esc(x.caption || "")}</textarea></div>
      <div class="field"><label>${esc(t("oc.f.time"))}</label><input id="oc_time" placeholder="21:00" value="${esc(x.pubTime || "")}" /></div>
      <div class="field">
        <label>${esc(t("oc.f.attach"))}</label>
        <input type="file" id="oc_file" accept=".pdf,.png,.jpg,.jpeg,.svg,.mp4,.mov,image/*,video/*,application/pdf" />
        <input id="oc_link" placeholder="${esc(t("oc.attach.link"))}" value="${esc(x.attachment && /^https?:/i.test(x.attachment) ? x.attachment : "")}" style="margin-top:6px" />
        <div id="oc_att_state" class="muted" style="margin-top:6px;font-size:12px"></div>
      </div>
    </div>
    <div class="modal__foot">
      <button class="btn" data-close>${esc(t("btn.cancel") || "Cancel")}</button>
      <button class="btn btn--primary" data-save>${esc(t("btn.save") || "Save")}</button>
    </div>`);

  const showAtt = () => { const b = $("#oc_att_state"); if (b) b.textContent = att && att.name ? "📎 " + att.name : ""; };
  showAtt();
  const file = $("#oc_file");
  if (file) file.onchange = () => {
    const f = file.files && file.files[0]; if (!f) return;
    if (f.size > MAX_ATT) { OS().toast(t("oc.attach.tooBig")); file.value = ""; return; }
    const r = new FileReader();
    r.onload = () => { att = { data: String(r.result || ""), name: f.name }; const l = $("#oc_link"); if (l) l.value = ""; showAtt(); };
    r.readAsDataURL(f);
  };
  // pencil buttons open the option editor, then reopen this post with values kept
  $$("[data-ocopt]").forEach(b => b.onclick = () => {
    const snap = Object.assign({}, post || {}, collectThenReopen());
    optionEditor(b.dataset.ocopt, () => postModal(snap));
  });

  ($("[data-save]") || {}).onclick = () => {
    const link = $("#oc_link").value.trim();
    const data = {
      day: $("#oc_day").value.trim(), date: $("#oc_date").value,
      goal: $("#oc_goal").value, postTo: $("#oc_postTo").value,
      idea: $("#oc_idea").value, type: $("#oc_type").value,
      caption: $("#oc_caption").value.trim(), pubTime: $("#oc_time").value.trim(),
    };
    if (link) { data.attachment = link; data.attachmentName = link.split("/").pop() || "link"; }
    else if (att) { data.attachment = att.data; data.attachmentName = att.name; }
    else { data.attachment = ""; data.attachmentName = ""; }
    if (editing) db().updateContentPost(post.id, data); else db().addContentPost(data);
    OS().closeModal(); (OS().render || (() => {}))(); OS().toast(t("oc.saved"));
  };
  $$("[data-close]").forEach(b => b.onclick = OS().closeModal);
}
/* keep the in-progress post values when reopening after editing options */
function collectThenReopen() {
  const g = (id) => { const el = $("#" + id); return el ? el.value : ""; };
  return { day: g("oc_day"), date: g("oc_date"), goal: g("oc_goal"), postTo: g("oc_postTo"), idea: g("oc_idea"), type: g("oc_type"), caption: g("oc_caption"), pubTime: g("oc_time") };
}

/* ---------------- option editor (the pencil) ---------------- */
function optionEditor(field, reopen) {
  materialize(field, DEFAULTS[field]);   // make defaults individually editable
  const list = storedFor(field);
  OS().openModal(`
    <div class="modal__head"><h3>✏️ ${esc(t("oc.opt.title"))}${esc(t("oc.f." + field))}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body">
      <div id="oc_opts">${list.map(o => `<div class="flex between" style="padding:6px 0;border-bottom:1px solid var(--border)">
        <span>${esc(o.value)}</span>
        <button class="btn btn--ghost btn--sm btn--danger" data-rmopt="${o.id}">🗑</button>
      </div>`).join("") || `<p class="muted">—</p>`}</div>
      <div class="flex" style="gap:8px;margin-top:12px">
        <input id="oc_newopt" placeholder="${esc(t("oc.opt.ph"))}" style="flex:1" />
        <button class="btn btn--primary" id="oc_addopt">＋ ${esc(t("oc.opt.add"))}</button>
      </div>
    </div>
    <div class="modal__foot"><button class="btn" data-close>${esc(t("btn.cancel") || "Done")}</button></div>`);
  const refresh = () => optionEditor(field, reopen);
  $("#oc_addopt").onclick = () => {
    const v = $("#oc_newopt").value.trim(); if (!v) return;
    db().addContentOpt({ field, value: v, url: "" }); refresh();
  };
  $("#oc_newopt").onkeydown = (e) => { if (e.key === "Enter") $("#oc_addopt").click(); };
  $$("[data-rmopt]").forEach(b => b.onclick = () => { db().removeContentOpt(b.dataset.rmopt); refresh(); });
  $$("[data-close]").forEach(b => b.onclick = () => { OS().closeModal(); if (reopen) reopen(); });
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
        <button class="btn btn--ghost btn--sm btn--danger" data-rmlink="${o.id}">🗑</button>
      </div>`).join("")}</div>
      <button class="btn btn--sm" id="oc_addlink" style="margin-top:10px">＋ ${esc(t("oc.link.add"))}</button>
    </div>
    <div class="modal__foot"><button class="btn btn--primary" data-savelinks>${esc(t("btn.save") || "Save")}</button></div>`);
  const persist = () => {
    storedFor("link").forEach(o => {
      const n = document.querySelector(`[data-lname="${o.id}"]`), u = document.querySelector(`[data-lurl="${o.id}"]`);
      if (n && u) db().updateContentOpt(o.id, { value: n.value.trim(), url: u.value.trim() });
    });
  };
  $("#oc_addlink").onclick = () => { persist(); db().addContentOpt({ field: "link", value: "New", url: "" }); linksEditor(); };
  $$("[data-rmlink]").forEach(b => b.onclick = () => { db().removeContentOpt(b.dataset.rmlink); linksEditor(); });
  ($("[data-savelinks]") || {}).onclick = () => { persist(); OS().closeModal(); (OS().render || (() => {}))(); OS().toast(t("oc.saved")); };
  $$("[data-close]").forEach(b => b.onclick = OS().closeModal);
}

/* ---------------- mount ---------------- */
function mount(ctx) {
  const reRender = () => (ctx && ctx.render ? ctx.render() : (OS().render && OS().render()));
  const add = $("#ocAdd"); if (add) add.onclick = () => postModal(null);
  const el = $("#ocEditLinks"); if (el) el.onclick = () => linksEditor();
  $$("[data-ocedit]").forEach(b => b.onclick = () => postModal(posts().find(p => p.id === b.dataset.ocedit)));
  $$("[data-ocdel]").forEach(b => b.onclick = () => {
    if (!confirm(t("oc.confirmDel"))) return;
    db().removeContentPost(b.dataset.ocdel); reRender(); OS().toast(t("oc.deleted"));
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
