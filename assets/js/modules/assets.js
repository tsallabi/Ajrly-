/* ============================================================
   Ajrly OS — Business Assets module
   Named folders, each holding files of any format (pdf, jpg, svg, ai,
   psd, indd, video, …). Files live in Cloudflare R2; metadata in D1.
   Cloud-only (large binaries can't be cached locally). Fetches live.
   ============================================================ */
import { registerModule } from "../registry.js";
import { registerStrings, t } from "../i18n.js";

/* ---------------- i18n ---------------- */
registerStrings({
  ar: {
    "nav.assets": "أصول الشركة",
    "page.assets": "أصول الشركة",
    "page.assets.sub": "مجلدات وملفات بكل الصيغ (PDF, JPG, SVG, AI, PSD, INDD, فيديو…)",
    "as.newFolder": "مجلد جديد",
    "as.folderName": "اسم المجلد",
    "as.rename": "إعادة تسمية",
    "as.delete": "حذف",
    "as.back": "رجوع",
    "as.upload": "رفع ملفات",
    "as.uploading": "جارٍ الرفع…",
    "as.uploaded": "تم الرفع",
    "as.files": "ملف",
    "as.empty.folders": "لا توجد مجلدات بعد — أنشئ أول مجلد",
    "as.empty.files": "هذا المجلد فارغ — ارفع أول ملف",
    "as.confirmDelFolder": "حذف هذا المجلد وكل ملفاته؟",
    "as.confirmDelFile": "حذف هذا الملف؟",
    "as.cloudReq": "هذا القسم يحتاج وضع السحابة (مع تخزين R2). يتم تفعيله من قِبل المدير.",
    "as.setupHint": "تعذّر تحميل الأصول. تأكد من إنشاء جداول قاعدة البيانات وتفعيل تخزين R2.",
    "as.storageOff": "تخزين الملفات (R2) غير مفعّل بعد — لا يمكن الرفع حالياً.",
    "as.tooBig": "الملف كبير جداً (الحد المقترح 200 ميجابايت).",
    "as.th.name": "الاسم", "as.th.type": "النوع", "as.th.size": "الحجم", "as.th.date": "التاريخ",
  },
  en: {
    "nav.assets": "Business Assets",
    "page.assets": "Business Assets",
    "page.assets.sub": "Folders and files in any format (PDF, JPG, SVG, AI, PSD, INDD, video…)",
    "as.newFolder": "New folder",
    "as.folderName": "Folder name",
    "as.rename": "Rename",
    "as.delete": "Delete",
    "as.back": "Back",
    "as.upload": "Upload files",
    "as.uploading": "Uploading…",
    "as.uploaded": "Uploaded",
    "as.files": "files",
    "as.empty.folders": "No folders yet — create your first folder",
    "as.empty.files": "This folder is empty — upload your first file",
    "as.confirmDelFolder": "Delete this folder and all its files?",
    "as.confirmDelFile": "Delete this file?",
    "as.cloudReq": "This section needs cloud mode (with R2 storage). Ask your admin to enable it.",
    "as.setupHint": "Couldn't load assets. Make sure the database tables exist and R2 storage is enabled.",
    "as.storageOff": "File storage (R2) is not enabled yet — uploads are unavailable.",
    "as.tooBig": "File is too large (suggested max 200 MB).",
    "as.th.name": "Name", "as.th.type": "Type", "as.th.size": "Size", "as.th.date": "Date",
  },
});

/* ---------------- helpers / state ---------------- */
const OS = () => window.AjrlyOS || {};
const esc = (s) => (OS().esc ? OS().esc(s) : String(s ?? ""));
const fmtDate = (iso) => (OS().fmtDate ? OS().fmtDate((iso || "").slice(0, 10)) : (iso || "—"));
const can = (a) => (typeof OS().can === "function" ? OS().can(a) : false);
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let folders = null;   // null = not loaded
let assets = null;
let openFolder = null; // folder id currently open, or null = grid
let loading = false;
let errMsg = "";

const MAX_SIZE = 200 * 1024 * 1024; // soft cap 200MB

function fmtSize(n) {
  n = Number(n) || 0;
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  if (n < 1073741824) return (n / 1048576).toFixed(1) + " MB";
  return (n / 1073741824).toFixed(2) + " GB";
}
function iconFor(name, type) {
  const ext = String(name || "").split(".").pop().toLowerCase();
  if (/(jpe?g|png|gif|webp|bmp|tiff?)/.test(ext) || /^image\//.test(type || "")) return "🖼️";
  if (ext === "svg") return "🔷";
  if (ext === "pdf") return "📄";
  if (/(ai|psd|indd|eps|sketch|fig|xd)/.test(ext)) return "🎨";
  if (/(mp4|mov|avi|mkv|webm|m4v)/.test(ext) || /^video\//.test(type || "")) return "🎬";
  if (/(mp3|wav|aac|ogg|flac)/.test(ext) || /^audio\//.test(type || "")) return "🎵";
  if (/(zip|rar|7z|tar|gz)/.test(ext)) return "🗜️";
  if (/(docx?|pages)/.test(ext)) return "📝";
  if (/(xlsx?|csv|numbers)/.test(ext)) return "📊";
  if (/(pptx?|key)/.test(ext)) return "📑";
  return "📦";
}

async function apiGet(path) {
  const r = await fetch(path, { credentials: "include", headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error("http_" + r.status);
  return r.json();
}
async function apiSend(path, method, body) {
  const r = await fetch(path, {
    method, credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error("http_" + r.status);
  return r.json().catch(() => ({}));
}

async function load(reRender) {
  if (loading) return;
  loading = true; errMsg = "";
  try {
    const [f, a] = await Promise.all([apiGet("/api/assets/folders"), apiGet("/api/assets")]);
    folders = f.asset_folders || [];
    assets = a.assets || [];
  } catch (e) {
    folders = folders || []; assets = assets || [];
    errMsg = "setup";
  } finally {
    loading = false;
    reRender && reRender();
  }
}

const folderAssets = (fid) => (assets || []).filter(a => a.folderId === fid);

/* ---------------- views ---------------- */
function notice(msg, icon) {
  return `<div class="card"><div class="empty"><div class="empty__icon">${icon || "☁️"}</div><p class="muted">${esc(msg)}</p></div></div>`;
}

function gridView() {
  const W = can("write");
  const toolbar = `<div class="toolbar"><div class="toolbar__left"></div><div class="toolbar__right">
    ${W ? `<button class="btn btn--primary" id="asNewFolder">＋ ${esc(t("as.newFolder"))}</button>` : ""}
  </div></div>`;
  const hint = errMsg ? notice(t("as.setupHint"), "⚠️") : "";
  if (!folders.length) {
    return toolbar + hint + (errMsg ? "" : `<div class="card"><div class="empty"><div class="empty__icon">🗂️</div><h3>${esc(t("as.empty.folders"))}</h3></div></div>`);
  }
  const cards = folders.map(f => {
    const n = folderAssets(f.id).length;
    return `<div class="card" style="cursor:pointer" data-open="${f.id}">
      <div class="flex between" style="align-items:flex-start">
        <div style="font-size:30px">🗂️</div>
        <div class="row-actions" data-stop>
          <button class="btn btn--ghost btn--sm" data-frename="${f.id}" title="${esc(t("as.rename"))}">✎</button>
          ${can("del") ? `<button class="btn btn--ghost btn--sm btn--danger" data-fdel="${f.id}" title="${esc(t("as.delete"))}">🗑</button>` : ""}
        </div>
      </div>
      <div class="cell-title" style="margin-top:8px">${esc(f.name || "—")}</div>
      <div class="muted" style="font-size:12.5px">${n} ${esc(t("as.files"))}</div>
    </div>`;
  }).join("");
  return toolbar + hint + `<div class="grid cards-3">${cards}</div>`;
}

function folderView() {
  const f = (folders || []).find(x => x.id === openFolder);
  if (!f) { openFolder = null; return gridView(); }
  const W = can("write");
  const list = folderAssets(f.id);
  const toolbar = `<div class="toolbar">
    <div class="toolbar__left"><button class="btn btn--sm" id="asBack">← ${esc(t("as.back"))}</button>
      <span class="card__title" style="margin-inline-start:10px">🗂️ ${esc(f.name || "—")}</span></div>
    <div class="toolbar__right">
      ${W ? `<button class="btn btn--primary" id="asUploadBtn">⬆ ${esc(t("as.upload"))}</button>
             <input type="file" id="asFile" multiple hidden />` : ""}
    </div>
  </div>`;
  if (!list.length) {
    return toolbar + `<div class="card"><div class="empty"><div class="empty__icon">📂</div><h3>${esc(t("as.empty.files"))}</h3></div></div>`;
  }
  const rows = list.map(a => `<tr>
    <td><a href="/api/assets/file/${esc(a.id)}" target="_blank" rel="noopener" class="cell-title" style="color:var(--brand)">${iconFor(a.name, a.type)} ${esc(a.name || "—")}</a></td>
    <td><span class="muted">${esc((String(a.name || "").split(".").pop() || "").toUpperCase())}</span></td>
    <td style="white-space:nowrap">${fmtSize(a.size)}</td>
    <td>${fmtDate(a.createdAt)}</td>
    <td><div class="row-actions">
      <a class="btn btn--ghost btn--sm" href="/api/assets/file/${esc(a.id)}" target="_blank" rel="noopener" title="⬇">⬇</a>
      ${can("del") ? `<button class="btn btn--ghost btn--sm btn--danger" data-adel="${a.id}">🗑</button>` : ""}
    </div></td>
  </tr>`).join("");
  return toolbar + `<div class="table-wrap"><table>
    <thead><tr><th>${esc(t("as.th.name"))}</th><th>${esc(t("as.th.type"))}</th><th>${esc(t("as.th.size"))}</th><th>${esc(t("as.th.date"))}</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function view() {
  if (!(OS().isCloud && OS().isCloud())) return notice(t("as.cloudReq"), "☁️");
  if (folders === null) return `<div class="card"><div class="empty"><p class="muted">…</p></div></div>`;
  return openFolder ? folderView() : gridView();
}

/* ---------------- actions ---------------- */
async function uploadFiles(fileList, reRender) {
  const files = [...fileList];
  if (!files.length) return;
  if (files.some(f => f.size > MAX_SIZE)) { OS().toast(t("as.tooBig")); return; }
  OS().toast(t("as.uploading"));
  let ok = 0;
  for (const f of files) {
    try {
      const r = await fetch("/api/assets/upload", {
        method: "POST", credentials: "include",
        headers: {
          "Content-Type": f.type || "application/octet-stream",
          "X-Folder-Id": openFolder,
          "X-File-Name": encodeURIComponent(f.name),
        },
        body: f,
      });
      if (r.status === 503) { OS().toast(t("as.storageOff")); break; }
      if (!r.ok) throw new Error("http_" + r.status);
      ok++;
    } catch (_) { /* continue with the rest */ }
  }
  if (ok) OS().toast(t("as.uploaded"));
  await load(reRender);
}

/* ---------------- mount ---------------- */
function mount(ctx) {
  const reRender = () => (ctx && ctx.render ? ctx.render() : (OS().render && OS().render()));
  if (!(OS().isCloud && OS().isCloud())) return;
  if (folders === null && !loading) { load(reRender); return; }

  // open folder (ignore clicks on the action buttons)
  $$("[data-open]").forEach(c => c.onclick = (e) => {
    if (e.target.closest("[data-stop]")) return;
    openFolder = c.dataset.open; reRender();
  });
  const back = $("#asBack"); if (back) back.onclick = () => { openFolder = null; reRender(); };

  const nf = $("#asNewFolder");
  if (nf) nf.onclick = async () => {
    const name = (prompt(t("as.folderName")) || "").trim();
    if (!name) return;
    try { await apiSend("/api/assets/folders", "POST", { name }); } catch (_) {}
    await load(reRender);
  };
  $$("[data-frename]").forEach(b => b.onclick = async () => {
    const f = (folders || []).find(x => x.id === b.dataset.frename);
    const name = (prompt(t("as.folderName"), f ? f.name : "") || "").trim();
    if (!name) return;
    try { await apiSend("/api/assets/folders/" + b.dataset.frename, "PATCH", { name }); } catch (_) {}
    await load(reRender);
  });
  $$("[data-fdel]").forEach(b => b.onclick = async () => {
    if (!confirm(t("as.confirmDelFolder"))) return;
    try { await apiSend("/api/assets/folders/" + b.dataset.fdel, "DELETE"); } catch (_) {}
    if (openFolder === b.dataset.fdel) openFolder = null;
    await load(reRender);
  });

  const upBtn = $("#asUploadBtn"); const fileInput = $("#asFile");
  if (upBtn && fileInput) {
    upBtn.onclick = () => fileInput.click();
    fileInput.onchange = (e) => { const fl = e.target.files; e.target.value = ""; uploadFiles(fl, reRender); };
  }
  $$("[data-adel]").forEach(b => b.onclick = async () => {
    if (!confirm(t("as.confirmDelFile"))) return;
    try { await apiSend("/api/assets/" + b.dataset.adel, "DELETE"); } catch (_) {}
    await load(reRender);
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
