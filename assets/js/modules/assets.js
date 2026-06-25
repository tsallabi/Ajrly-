/* ============================================================
   Ajrly OS — Business Assets module (link library + previews)
   Named folders, each holding links to files (Google Drive, images,
   PDFs, video…). Stores only the link (tiny), so it works locally and
   syncs to the cloud like the rest of the app. Renders Drive thumbnails
   and an embedded preview — no file storage / bucket needed.
   ============================================================ */
import { registerModule } from "../registry.js";
import { registerStrings, t } from "../i18n.js";

/* ---------------- i18n ---------------- */
registerStrings({
  ar: {
    "nav.assets": "أصول الشركة",
    "page.assets": "أصول الشركة",
    "page.assets.sub": "مجلدات وروابط لملفات الشركة (Google Drive، صور، PDF، فيديو…) مع معاينة",
    "as.newFolder": "مجلد جديد",
    "as.folderName": "اسم المجلد",
    "as.rename": "إعادة تسمية",
    "as.delete": "حذف",
    "as.back": "رجوع",
    "as.addLink": "إضافة رابط",
    "as.editLink": "تعديل الرابط",
    "as.name": "اسم الملف",
    "as.url": "الرابط (Google Drive أو أي رابط)",
    "as.urlHint": "للمعاينة من Google Drive: اضبط مشاركة الملف على «أي شخص لديه الرابط».",
    "as.open": "فتح في تبويب جديد",
    "as.preview": "معاينة",
    "as.noPreview": "لا تتوفر معاينة — افتح الرابط في تبويب جديد",
    "as.files": "ملف",
    "as.empty.folders": "لا توجد مجلدات بعد — أنشئ أول مجلد",
    "as.empty.files": "هذا المجلد فارغ — أضف أول رابط",
    "as.confirmDelFolder": "حذف هذا المجلد وكل روابطه؟",
    "as.confirmDelFile": "حذف هذا الرابط؟",
    "as.saved": "تم الحفظ",
    "as.deleted": "تم الحذف",
    "as.needUrl": "أدخل الاسم والرابط",
  },
  en: {
    "nav.assets": "Business Assets",
    "page.assets": "Business Assets",
    "page.assets.sub": "Folders of links to company files (Google Drive, images, PDF, video…) with preview",
    "as.newFolder": "New folder",
    "as.folderName": "Folder name",
    "as.rename": "Rename",
    "as.delete": "Delete",
    "as.back": "Back",
    "as.addLink": "Add link",
    "as.editLink": "Edit link",
    "as.name": "File name",
    "as.url": "Link (Google Drive or any URL)",
    "as.urlHint": "For Google Drive previews, set the file's sharing to \"Anyone with the link\".",
    "as.open": "Open in new tab",
    "as.preview": "Preview",
    "as.noPreview": "No preview available — open the link in a new tab",
    "as.files": "files",
    "as.empty.folders": "No folders yet — create your first folder",
    "as.empty.files": "This folder is empty — add your first link",
    "as.confirmDelFolder": "Delete this folder and all its links?",
    "as.confirmDelFile": "Delete this link?",
    "as.saved": "Saved",
    "as.deleted": "Deleted",
    "as.needUrl": "Enter a name and a link",
  },
});

/* ---------------- helpers / state ---------------- */
const OS = () => window.AjrlyOS || {};
const esc = (s) => (OS().esc ? OS().esc(s) : String(s ?? ""));
const fmtDate = (iso) => (OS().fmtDate ? OS().fmtDate((iso || "").slice(0, 10)) : (iso || "—"));
const can = (a) => (typeof OS().can === "function" ? OS().can(a) : false);
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const folders = () => (OS().db && OS().db.assetFolders) || [];
const items = () => (OS().db && OS().db.assets) || [];
const folderItems = (fid) => items().filter(a => a.folderId === fid);

let openFolder = null;

/* ---- Google Drive / link helpers ---- */
function driveId(url) {
  const u = String(url || "");
  const m = u.match(/\/file\/d\/([-\w]{12,})/)
    || u.match(/\/folders\/([-\w]{12,})/)
    || u.match(/[?&]id=([-\w]{12,})/)
    || u.match(/\/d\/([-\w]{12,})/);
  return m ? m[1] : null;
}
const isDriveFolder = (url) => /\/folders\//.test(String(url || ""));
const isImageUrl = (url) => /\.(png|jpe?g|gif|webp|svg|bmp)(\?|#|$)/i.test(String(url || ""));
function thumbFor(a) {
  const id = driveId(a.url);
  if (id && !isDriveFolder(a.url)) return `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
  if (isImageUrl(a.url)) return a.url;
  return null;
}
function previewSrc(a) {
  const id = driveId(a.url);
  if (id) return isDriveFolder(a.url)
    ? `https://drive.google.com/embeddedfolderview?id=${id}#grid`
    : `https://drive.google.com/file/d/${id}/preview`;
  return a.url;
}
function canEmbed(a) {
  return !!driveId(a.url) || isImageUrl(a.url);
}
function iconFor(a) {
  const u = String(a.url || "").toLowerCase();
  if (isDriveFolder(a.url)) return "🗂️";
  if (driveId(a.url)) return "📄";
  if (isImageUrl(a.url)) return "🖼️";
  if (/\.pdf(\?|#|$)/.test(u)) return "📄";
  if (/\.(mp4|mov|webm|mkv)(\?|#|$)/.test(u)) return "🎬";
  return "🔗";
}

/* ---------------- views ---------------- */
function gridView() {
  const W = can("write");
  const toolbar = `<div class="toolbar"><div class="toolbar__left"></div><div class="toolbar__right">
    ${W ? `<button class="btn btn--primary" id="asNewFolder">＋ ${esc(t("as.newFolder"))}</button>` : ""}
  </div></div>`;
  const list = folders();
  if (!list.length) {
    return toolbar + `<div class="card"><div class="empty"><div class="empty__icon">🗂️</div><h3>${esc(t("as.empty.folders"))}</h3></div></div>`;
  }
  const cards = list.map(f => `<div class="card" style="cursor:pointer" data-open="${f.id}">
    <div class="flex between" style="align-items:flex-start">
      <div style="font-size:30px">🗂️</div>
      <div class="row-actions" data-stop>
        <button class="btn btn--ghost btn--sm" data-frename="${f.id}" title="${esc(t("as.rename"))}">✎</button>
        ${can("del") ? `<button class="btn btn--ghost btn--sm btn--danger" data-fdel="${f.id}" title="${esc(t("as.delete"))}">🗑</button>` : ""}
      </div>
    </div>
    <div class="cell-title" style="margin-top:8px">${esc(f.name || "—")}</div>
    <div class="muted" style="font-size:12.5px">${folderItems(f.id).length} ${esc(t("as.files"))}</div>
  </div>`).join("");
  return toolbar + `<div class="grid cards-3">${cards}</div>`;
}

function assetCard(a) {
  const th = thumbFor(a);
  const media = th
    ? `<div style="height:130px;background:var(--surface-2);border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:38px">
         <img src="${esc(th)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover" data-thumb />
       </div>`
    : `<div style="height:130px;background:var(--surface-2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:38px">${iconFor(a)}</div>`;
  return `<div class="card">
    <div data-prev="${a.id}" style="cursor:pointer">${media}</div>
    <div class="cell-title" style="margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(a.name)}">${iconFor(a)} ${esc(a.name || "—")}</div>
    <div class="flex between" style="margin-top:6px">
      <span class="muted" style="font-size:11.5px">${fmtDate(a.createdAt)}</span>
      <div class="row-actions">
        <a class="btn btn--ghost btn--sm" href="${esc(a.url)}" target="_blank" rel="noopener" title="${esc(t("as.open"))}">↗</a>
        ${can("write") ? `<button class="btn btn--ghost btn--sm" data-aedit="${a.id}">✎</button>` : ""}
        ${can("del") ? `<button class="btn btn--ghost btn--sm btn--danger" data-adel="${a.id}">🗑</button>` : ""}
      </div>
    </div>
  </div>`;
}

function folderView() {
  const f = folders().find(x => x.id === openFolder);
  if (!f) { openFolder = null; return gridView(); }
  const W = can("write");
  const toolbar = `<div class="toolbar">
    <div class="toolbar__left"><button class="btn btn--sm" id="asBack">← ${esc(t("as.back"))}</button>
      <span class="card__title" style="margin-inline-start:10px">🗂️ ${esc(f.name || "—")}</span></div>
    <div class="toolbar__right">${W ? `<button class="btn btn--primary" id="asAddLink">＋ ${esc(t("as.addLink"))}</button>` : ""}</div>
  </div>`;
  const list = folderItems(f.id);
  if (!list.length) {
    return toolbar + `<div class="card"><div class="empty"><div class="empty__icon">📂</div><h3>${esc(t("as.empty.files"))}</h3></div></div>`;
  }
  return toolbar + `<div class="grid cards-3">${list.map(assetCard).join("")}</div>`;
}

function view() {
  return openFolder ? folderView() : gridView();
}

/* ---------------- modals ---------------- */
function linkModal(asset) {
  const x = asset || {};
  const editing = !!asset;
  OS().openModal(`
    <div class="modal__head"><h3>${esc(t(editing ? "as.editLink" : "as.addLink"))}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body">
      <div class="field"><label>${esc(t("as.name"))}</label><input id="as_name" value="${esc(x.name || "")}" /></div>
      <div class="field"><label>${esc(t("as.url"))}</label><input id="as_url" placeholder="https://drive.google.com/file/d/…/view" value="${esc(x.url || "")}" /></div>
      <p class="muted" style="font-size:12px">${esc(t("as.urlHint"))}</p>
    </div>
    <div class="modal__foot">
      <button class="btn" data-close>${esc(t("btn.cancel") || "Cancel")}</button>
      <button class="btn btn--primary" data-save>${esc(t("btn.save") || "Save")}</button>
    </div>`);
  ($("[data-save]") || {}).onclick = () => {
    const name = $("#as_name").value.trim();
    const url = $("#as_url").value.trim();
    if (!name || !url) { OS().toast(t("as.needUrl")); return; }
    const data = { folderId: openFolder, name, url };
    if (editing) OS().db.updateAsset(asset.id, data); else OS().db.addAsset(data);
    OS().closeModal(); (OS().render || (() => {}))(); OS().toast(t("as.saved"));
  };
  $$("[data-close]").forEach(b => b.onclick = OS().closeModal);
}

function previewModal(asset) {
  const a = asset; if (!a) return;
  const body = canEmbed(a)
    ? `<iframe src="${esc(previewSrc(a))}" style="width:100%;height:68vh;border:0;border-radius:10px;background:var(--surface-2)" allow="autoplay" referrerpolicy="no-referrer"></iframe>`
    : `<div class="empty"><div class="empty__icon">🔗</div><p class="muted">${esc(t("as.noPreview"))}</p></div>`;
  OS().openModal(`
    <div class="modal__head"><h3>${iconFor(a)} ${esc(a.name || "—")}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body">${body}</div>
    <div class="modal__foot">
      <a class="btn" href="${esc(a.url)}" target="_blank" rel="noopener">↗ ${esc(t("as.open"))}</a>
      <button class="btn btn--primary" data-close>${esc(t("btn.cancel") || "Close")}</button>
    </div>`);
  // widen the modal for previews
  const m = document.querySelector(".modal"); if (m) m.style.maxWidth = "900px";
  $$("[data-close]").forEach(b => b.onclick = OS().closeModal);
}

/* ---------------- mount ---------------- */
function mount(ctx) {
  const reRender = () => (ctx && ctx.render ? ctx.render() : (OS().render && OS().render()));

  $$("[data-open]").forEach(c => c.onclick = (e) => {
    if (e.target.closest("[data-stop]")) return;
    openFolder = c.dataset.open; reRender();
  });
  const back = $("#asBack"); if (back) back.onclick = () => { openFolder = null; reRender(); };

  const nf = $("#asNewFolder");
  if (nf) nf.onclick = () => {
    const name = (prompt(t("as.folderName")) || "").trim();
    if (!name) return;
    OS().db.addAssetFolder({ name }); reRender(); OS().toast(t("as.saved"));
  };
  $$("[data-frename]").forEach(b => b.onclick = () => {
    const f = folders().find(x => x.id === b.dataset.frename);
    const name = (prompt(t("as.folderName"), f ? f.name : "") || "").trim();
    if (!name) return;
    OS().db.updateAssetFolder(b.dataset.frename, { name }); reRender(); OS().toast(t("as.saved"));
  });
  $$("[data-fdel]").forEach(b => b.onclick = () => {
    if (!confirm(t("as.confirmDelFolder"))) return;
    if (openFolder === b.dataset.fdel) openFolder = null;
    OS().db.removeAssetFolder(b.dataset.fdel); reRender(); OS().toast(t("as.deleted"));
  });

  // broken Drive thumbnail (file not shared publicly) → show an icon instead
  $$("[data-thumb]").forEach(img => { img.onerror = () => { const p = img.parentNode; if (p) p.textContent = "🖼️"; }; });

  const add = $("#asAddLink"); if (add) add.onclick = () => linkModal(null);
  $$("[data-aedit]").forEach(b => b.onclick = () => linkModal(items().find(a => a.id === b.dataset.aedit)));
  $$("[data-prev]").forEach(b => b.onclick = () => previewModal(items().find(a => a.id === b.dataset.prev)));
  $$("[data-adel]").forEach(b => b.onclick = () => {
    if (!confirm(t("as.confirmDelFile"))) return;
    OS().db.removeAsset(b.dataset.adel); reRender(); OS().toast(t("as.deleted"));
  });
}

/* ---------------- register ---------------- */
registerModule({
  id: "assets",
  icon: "🗂️",
  labelKey: "nav.assets",
  titleKey: "page.assets",
  subKey: "page.assets.sub",
  order: 47,
  view,
  mount,
});
