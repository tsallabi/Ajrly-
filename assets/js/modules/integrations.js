/* ============================================================
   Ajrly OS — Integrations & Automation module
   - Contact-Due alerts with one-click WhatsApp (wa.me) + Email (mailto)
   - Owner import: CSV upload, paste table, fetch from ajrly.ly
   - Channels config + connectivity test (graceful, zero-backend)

   Everything degrades gracefully with NO backend:
     • wa.me + mailto links always work standalone.
     • The /api/* Cloudflare Pages Functions are OPTIONAL enhancements;
       when missing/unconfigured the UI reports it cleanly.
   ============================================================ */
import { registerModule } from "../registry.js";
import { registerStrings, t, getLang } from "../i18n.js";

/* ---------------- i18n ---------------- */
registerStrings({
  ar: {
    "nav.integrations": "التكاملات",
    "page.integrations": "التكاملات والأتمتة",
    "page.integrations.sub": "واتساب، البريد، واستيراد الملاك",

    "intg.due.title": "تذكير بالتواصل",
    "intg.due.sub": "ملاك لم يتم التواصل معهم منذ فترة",
    "intg.due.threshold": "العتبة (أيام)",
    "intg.due.none": "كل الملاك على تواصل حديث 🎉",
    "intg.due.never": "لم يتم التواصل",
    "intg.due.daysAgo": "منذ {n} يوم",
    "intg.due.wa": "واتساب",
    "intg.due.email": "بريد",
    "intg.due.mark": "تم التواصل اليوم",
    "intg.due.noPhone": "لا يوجد رقم",
    "intg.due.noEmail": "لا يوجد بريد",
    "intg.due.marked": "تم تحديث آخر تواصل",

    "intg.import.title": "استيراد الملاك",
    "intg.import.sub": "ملف CSV، أو لصق جدول، أو جلب من ajrly.ly",
    "intg.import.csv": "رفع ملف CSV",
    "intg.import.paste": "لصق جدول",
    "intg.import.pastePh": "الصق صفوفاً مفصولة بفاصلة أو تبويب (Tab). الصف الأول عناوين الأعمدة.",
    "intg.import.fetch": "جلب من ajrly.ly",
    "intg.import.parse": "تحليل",
    "intg.import.map": "ربط الأعمدة",
    "intg.import.preview": "معاينة",
    "intg.import.doImport": "استيراد",
    "intg.import.skip": "تجاهل",
    "intg.import.none": "لا توجد صفوف صالحة",
    "intg.import.dupes": "{n} مكرر (موجود مسبقاً)",
    "intg.import.willAdd": "{n} جديد سيُضاف",
    "intg.import.added": "تم استيراد {n} مالك",
    "intg.import.fetchFail": "نقطة الجلب غير متاحة بعد — جرّب CSV أو اللصق",
    "intg.import.fetchEmpty": "لم تُرجع نقطة الجلب أي صفوف",
    "intg.col.name": "الاسم",
    "intg.col.phone": "الجوال",
    "intg.col.email": "البريد",
    "intg.col.listings": "القوائم",
    "intg.col.stage": "المرحلة",
    "intg.col.notes": "ملاحظات",
    "intg.col.ignore": "— تجاهل —",

    "intg.ch.title": "القنوات",
    "intg.ch.sub": "حالة الاتصال واختبارها",
    "intg.ch.wa": "واتساب (Cloud API)",
    "intg.ch.email": "البريد الإلكتروني",
    "intg.ch.configured": "مُهيّأ",
    "intg.ch.notConfigured": "غير مُهيّأ — الروابط المباشرة تعمل دائماً",
    "intg.ch.test": "اختبار الاتصال",
    "intg.ch.testing": "جارٍ الاختبار…",
    "intg.ch.ok": "نجح الاتصال ✓",
    "intg.ch.fail": "تعذّر الاتصال — الميزة اختيارية",
    "intg.ch.501": "النقطة غير مُهيّأة (501) — استخدم الروابط المباشرة",
    "intg.ch.directNote": "wa.me و mailto يعملان دون أي خادم.",
  },
  en: {
    "nav.integrations": "Integrations",
    "page.integrations": "Integrations & Automation",
    "page.integrations.sub": "WhatsApp, email, owner import",

    "intg.due.title": "Contact Due",
    "intg.due.sub": "Owners not contacted in a while",
    "intg.due.threshold": "Threshold (days)",
    "intg.due.none": "All owners recently contacted 🎉",
    "intg.due.never": "Never contacted",
    "intg.due.daysAgo": "{n} days ago",
    "intg.due.wa": "WhatsApp",
    "intg.due.email": "Email",
    "intg.due.mark": "Mark contacted today",
    "intg.due.noPhone": "No phone",
    "intg.due.noEmail": "No email",
    "intg.due.marked": "Last contact updated",

    "intg.import.title": "Import Owners",
    "intg.import.sub": "CSV file, paste a table, or fetch from ajrly.ly",
    "intg.import.csv": "Upload CSV file",
    "intg.import.paste": "Paste table",
    "intg.import.pastePh": "Paste comma- or tab-separated rows. First row = column headers.",
    "intg.import.fetch": "Fetch from ajrly.ly",
    "intg.import.parse": "Parse",
    "intg.import.map": "Map columns",
    "intg.import.preview": "Preview",
    "intg.import.doImport": "Import",
    "intg.import.skip": "Discard",
    "intg.import.none": "No valid rows",
    "intg.import.dupes": "{n} duplicate (already exists)",
    "intg.import.willAdd": "{n} new will be added",
    "intg.import.added": "Imported {n} owners",
    "intg.import.fetchFail": "Fetch endpoint not available yet — try CSV or paste",
    "intg.import.fetchEmpty": "Fetch endpoint returned no rows",
    "intg.col.name": "Name",
    "intg.col.phone": "Phone",
    "intg.col.email": "Email",
    "intg.col.listings": "Listings",
    "intg.col.stage": "Stage",
    "intg.col.notes": "Notes",
    "intg.col.ignore": "— ignore —",

    "intg.ch.title": "Channels",
    "intg.ch.sub": "Connection status & test",
    "intg.ch.wa": "WhatsApp (Cloud API)",
    "intg.ch.email": "Email",
    "intg.ch.configured": "Configured",
    "intg.ch.notConfigured": "Not configured — direct links always work",
    "intg.ch.test": "Test connection",
    "intg.ch.testing": "Testing…",
    "intg.ch.ok": "Connection OK ✓",
    "intg.ch.fail": "Connection failed — feature is optional",
    "intg.ch.501": "Endpoint not configured (501) — use direct links",
    "intg.ch.directNote": "wa.me and mailto work with no server at all.",
  },
});

/* ---------------- small helpers ---------------- */
const OS = () => window.AjrlyOS;
const esc = (s) => OS().esc(s);
const tn = (key, n) => t(key).replace("{n}", n);
const OWNER_COLS = ["name", "phone", "email", "listings", "stage", "notes"];

/* localized greeting used by the outreach links */
function greeting(name) {
  const ar = `مرحباً ${name || ""}، معك فريق أجرلي. نود الاطمئنان عليك ومتابعة قوائمك على المنصة. هل نقدر نساعدك بأي شيء؟`;
  const en = `Hi ${name || ""}, this is the Ajrly team. Just checking in on your listings on the platform — how can we help?`;
  return getLang() === "ar" ? ar : en;
}
function emailSubject() {
  return getLang() === "ar" ? "متابعة من فريق أجرلي" : "Following up from the Ajrly team";
}

/* strip everything but digits for wa.me (Libyan numbers etc.) */
function waDigits(phone) {
  let d = String(phone || "").replace(/[^\d+]/g, "");
  d = d.replace(/\+/g, "");
  return d;
}
function waLink(phone, name) {
  const d = waDigits(phone);
  if (!d) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(greeting(name))}`;
}
function mailLink(email, name) {
  if (!email) return null;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(emailSubject())}&body=${encodeURIComponent(greeting(name))}`;
}

function todayISO() { return new Date().toISOString().slice(0, 10); }
function daysSince(iso) {
  if (!iso) return Infinity;
  const d = new Date(iso);
  if (isNaN(d)) return Infinity;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.floor((now - d) / 86400000);
}
/* advance owner stage one step (recruitment→communication→content→active) */
function nextStage(stage) {
  const steps = OS().OWNER_STAGES;
  const i = steps.indexOf(stage || "recruitment");
  return i < 0 ? "communication" : steps[Math.min(i + 1, steps.length - 1)];
}

/* ---------------- CSV / table parsing (dependency-free) ---------------- */
/* Handles quoted fields, embedded commas/newlines, doubled-quote escapes,
   and CRLF. Returns array of string[] rows. Default delimiter ",". */
function parseDelimited(text, delim) {
  const rows = [];
  let row = [], field = "", i = 0, inQuotes = false;
  const D = delim || ",";
  const s = String(text || "");
  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === D) { row.push(field); field = ""; i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    field += c; i++;
  }
  // last field/row
  if (field.length || row.length) { row.push(field); rows.push(row); }
  // drop fully-empty rows
  return rows.filter(r => r.some(x => String(x).trim() !== ""));
}

/* sniff delimiter for pasted tables (tab vs comma) */
function sniffDelim(text) {
  const firstLine = String(text || "").split(/\r?\n/)[0] || "";
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return tabs > commas ? "\t" : ",";
}

/* auto-detect which parsed column maps to each owner field by header name */
function autoMap(headers) {
  const map = {}; // ownerField -> columnIndex (or -1)
  const norm = headers.map(h => String(h).trim().toLowerCase());
  const aliases = {
    name: ["name", "owner", "الاسم", "اسم", "المالك", "full name"],
    phone: ["phone", "mobile", "whatsapp", "tel", "الجوال", "الهاتف", "رقم", "phone number"],
    email: ["email", "e-mail", "mail", "البريد", "الايميل", "الإيميل"],
    listings: ["listings", "listing", "properties", "units", "القوائم", "عدد القوائم", "العقارات"],
    stage: ["stage", "status", "المرحلة", "الحالة"],
    notes: ["notes", "note", "comment", "ملاحظات", "ملاحظة"],
  };
  for (const f of OWNER_COLS) {
    map[f] = -1;
    for (let i = 0; i < norm.length; i++) {
      if (aliases[f].includes(norm[i])) { map[f] = i; break; }
    }
  }
  return map;
}

/* coerce a parsed stage string to a valid OWNER_STAGES value */
function normStage(v) {
  const s = String(v || "").trim().toLowerCase();
  const valid = OS().OWNER_STAGES;
  if (valid.includes(s)) return s;
  const ar = { "استقطاب": "recruitment", "تواصل": "communication", "إنتاج محتوى": "content", "محتوى": "content", "نشط": "active" };
  return ar[String(v || "").trim()] || "recruitment";
}

/* turn parsed rows + a field→index map into owner objects */
function rowsToOwners(rows, map, hasHeader) {
  const body = hasHeader ? rows.slice(1) : rows;
  const out = [];
  for (const r of body) {
    const o = {};
    for (const f of OWNER_COLS) {
      const idx = map[f];
      o[f] = idx >= 0 ? String(r[idx] ?? "").trim() : "";
    }
    if (!o.name && !o.phone && !o.email) continue; // need at least one identifier
    o.stage = o.stage ? normStage(o.stage) : "recruitment";
    out.push(o);
  }
  return out;
}

/* dedupe parsed owners against existing db.owners by phone (digits) or email */
function dedupe(candidates) {
  const owners = OS().db.owners;
  const phones = new Set(owners.map(o => waDigits(o.phone)).filter(Boolean));
  const emails = new Set(owners.map(o => String(o.email || "").trim().toLowerCase()).filter(Boolean));
  const seenP = new Set(), seenE = new Set();
  const fresh = [], dupes = [];
  for (const c of candidates) {
    const p = waDigits(c.phone);
    const e = String(c.email || "").trim().toLowerCase();
    const isDup = (p && (phones.has(p) || seenP.has(p))) || (e && (emails.has(e) || seenE.has(e)));
    if (isDup) { dupes.push(c); continue; }
    if (p) seenP.add(p);
    if (e) seenE.add(e);
    fresh.push(c);
  }
  return { fresh, dupes };
}

/* ---------------- channel config detection ---------------- */
/* "configured" if the page sets window.AJRLY_CONFIG flags OR localStorage
   holds a hint. The server holds the real secrets; this is only a UI hint. */
function chConfigured(channel) {
  const cfg = window.AJRLY_CONFIG || {};
  if (channel === "whatsapp") {
    return !!(cfg.whatsapp || cfg.WHATSAPP || localStorage.getItem("ajrly_wa_configured"));
  }
  return !!(cfg.email || cfg.EMAIL || localStorage.getItem("ajrly_email_configured"));
}

/* ============================================================
   VIEW
   ============================================================ */
function view() {
  return `
  <div class="grid" style="gap:16px">
    ${dueSection()}
    ${importSection()}
    ${channelsSection()}
  </div>`;
}

/* state kept across renders within the page */
let dueThreshold = 14;
let parsed = null;      // { headers, rows, map, hasHeader, delim }

function computeDue() {
  return OS().db.owners
    .map(o => ({ o, d: daysSince(o.lastContact) }))
    .filter(x => x.d >= dueThreshold)
    .sort((a, b) => b.d - a.d);
}

function dueSection() {
  const due = computeDue();
  const rows = due.map(({ o, d }) => {
    const wa = waLink(o.phone, o.name);
    const ml = mailLink(o.email, o.name);
    const ago = d === Infinity ? t("intg.due.never") : tn("intg.due.daysAgo", d);
    return `<tr>
      <td><span class="flex" style="gap:8px"><b>${esc(o.name || "—")}</b></span>
          <div class="muted">${esc(o.phone || "")} ${o.email ? "· " + esc(o.email) : ""}</div></td>
      <td><span class="badge badge--overdue" style="background:color-mix(in srgb,var(--st-overdue) 16%,transparent);color:var(--st-overdue)">${ago}</span></td>
      <td>
        <div class="row-actions" style="flex-wrap:wrap;gap:6px">
          ${wa
            ? `<a class="btn btn--sm btn--primary" href="${wa}" target="_blank" rel="noopener">🟢 ${t("intg.due.wa")}</a>`
            : `<span class="tag">${t("intg.due.noPhone")}</span>`}
          ${ml
            ? `<a class="btn btn--sm" href="${ml}">✉️ ${t("intg.due.email")}</a>`
            : `<span class="tag">${t("intg.due.noEmail")}</span>`}
          <button class="btn btn--ghost btn--sm" data-mark="${o.id}">✓ ${t("intg.due.mark")}</button>
        </div>
      </td>
    </tr>`;
  }).join("");

  return `<div class="card">
    <div class="card__head">
      <span class="card__title">⏰ ${t("intg.due.title")}</span>
      <span class="muted">${t("intg.due.sub")}</span>
    </div>
    <div class="toolbar" style="margin-bottom:8px">
      <div class="toolbar__left field-row" style="align-items:center;gap:8px">
        <label class="muted">${t("intg.due.threshold")}</label>
        <input class="input" id="dueDays" type="number" min="0" value="${dueThreshold}" style="width:90px" />
      </div>
      <div class="toolbar__right muted">${due.length}</div>
    </div>
    ${due.length
      ? `<div class="table-wrap"><table><tbody>${rows}</tbody></table></div>`
      : `<div class="empty"><div class="empty__icon">🎉</div><p class="muted">${t("intg.due.none")}</p></div>`}
  </div>`;
}

function importSection() {
  return `<div class="card">
    <div class="card__head">
      <span class="card__title">📥 ${t("intg.import.title")}</span>
      <span class="muted">${t("intg.import.sub")}</span>
    </div>

    <div class="grid cards-3" style="gap:12px;margin-bottom:12px">
      <div class="field">
        <label>${t("intg.import.csv")}</label>
        <input class="input" id="csvFile" type="file" accept=".csv,text/csv,text/plain" />
      </div>
      <div class="field" style="grid-column:span 2">
        <label>${t("intg.import.paste")}</label>
        <textarea class="input" id="pasteBox" rows="3" placeholder="${esc(t("intg.import.pastePh"))}"></textarea>
      </div>
    </div>
    <div class="toolbar">
      <div class="toolbar__left">
        <button class="btn btn--sm" id="parsePaste">${t("intg.import.parse")}</button>
        <button class="btn btn--sm btn--ghost" id="fetchAjrly">🌐 ${t("intg.import.fetch")}</button>
      </div>
    </div>

    <div id="importStage"></div>
  </div>`;
}

function mappingAndPreview() {
  if (!parsed) return "";
  const { headers, rows, map, hasHeader } = parsed;
  const colOptions = (selected) => `
    <option value="-1">${t("intg.col.ignore")}</option>
    ${headers.map((h, i) => `<option value="${i}" ${selected === i ? "selected" : ""}>${esc(hasHeader ? h : (getLang() === "ar" ? "عمود " : "Col ") + (i + 1))}</option>`).join("")}`;

  const mapUI = `<div class="grid cards-3" style="gap:10px;margin-top:12px">
    ${OWNER_COLS.map(f => `<div class="field">
      <label>${t("intg.col." + f)}</label>
      <select class="input" data-map="${f}">${colOptions(map[f])}</select>
    </div>`).join("")}
  </div>`;

  // build live preview from current map
  const candidates = rowsToOwners(rows, map, hasHeader);
  const { fresh, dupes } = dedupe(candidates);
  const previewRows = candidates.slice(0, 12).map(c => `<tr>
    <td>${esc(c.name || "—")}</td><td>${esc(c.phone || "—")}</td><td>${esc(c.email || "—")}</td>
    <td>${esc(c.listings || "0")}</td><td>${esc(t("stage." + c.stage))}</td>
  </tr>`).join("");

  return `${mapUI}
    <div class="card__head" style="margin-top:14px">
      <span class="card__title">${t("intg.import.preview")}</span>
      <span class="muted">
        <span class="tag">${tn("intg.import.willAdd", fresh.length)}</span>
        ${dupes.length ? `<span class="tag">${tn("intg.import.dupes", dupes.length)}</span>` : ""}
      </span>
    </div>
    ${candidates.length
      ? `<div class="table-wrap"><table>
          <thead><tr>
            <th>${t("intg.col.name")}</th><th>${t("intg.col.phone")}</th><th>${t("intg.col.email")}</th>
            <th>${t("intg.col.listings")}</th><th>${t("intg.col.stage")}</th>
          </tr></thead>
          <tbody>${previewRows}</tbody></table></div>`
      : `<div class="empty muted">${t("intg.import.none")}</div>`}
    <div class="toolbar" style="margin-top:10px">
      <div class="toolbar__right row-actions">
        <button class="btn btn--ghost btn--sm" id="cancelImport">${t("intg.import.skip")}</button>
        <button class="btn btn--primary btn--sm" id="doImport" ${fresh.length ? "" : "disabled"}>
          ${t("intg.import.doImport")} (${fresh.length})
        </button>
      </div>
    </div>`;
}

function channelsSection() {
  const card = (channel, title) => {
    const on = chConfigured(channel);
    return `<div class="card" style="background:var(--surface-2)">
      <div class="card__head">
        <span class="card__title">${channel === "whatsapp" ? "🟢" : "✉️"} ${title}</span>
        <span class="badge ${on ? "badge--complete" : ""}" style="${on ? "background:color-mix(in srgb,var(--st-complete,#16a34a) 16%,transparent);color:var(--st-complete,#16a34a)" : ""}">
          ${on ? t("intg.ch.configured") : t("intg.ch.notConfigured")}
        </span>
      </div>
      <div class="toolbar" style="margin-top:6px">
        <div class="toolbar__left">
          <button class="btn btn--sm" data-test="${channel}">${t("intg.ch.test")}</button>
        </div>
        <div class="toolbar__right muted" data-test-result="${channel}"></div>
      </div>
    </div>`;
  };
  return `<div class="card">
    <div class="card__head">
      <span class="card__title">🔌 ${t("intg.ch.title")}</span>
      <span class="muted">${t("intg.ch.sub")}</span>
    </div>
    <div class="grid cards-2" style="gap:12px">
      ${card("whatsapp", t("intg.ch.wa"))}
      ${card("email", t("intg.ch.email"))}
    </div>
    <p class="muted" style="margin-top:10px">ℹ️ ${t("intg.ch.directNote")}</p>
  </div>`;
}

/* ============================================================
   MOUNT (bind events)
   ============================================================ */
function mount(ctx) {
  const { render, toast, db } = OS();
  const root = document.getElementById("view");
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];

  /* ---- Contact Due ---- */
  const daysInput = $("#dueDays");
  if (daysInput) {
    daysInput.onchange = () => {
      const v = parseInt(daysInput.value, 10);
      dueThreshold = isNaN(v) || v < 0 ? 0 : v;
      render();
    };
  }
  $$("[data-mark]").forEach(b => b.onclick = () => {
    const o = db.owners.find(x => x.id === b.dataset.mark);
    if (!o) return;
    db.updateOwner(o.id, { lastContact: todayISO(), stage: nextStage(o.stage) });
    toast(t("intg.due.marked"));
    render();
  });

  /* ---- Import: CSV file ---- */
  const fileInput = $("#csvFile");
  if (fileInput) fileInput.onchange = () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { loadParsed(reader.result, ","); };
    reader.readAsText(f);
  };

  /* ---- Import: paste table ---- */
  const parseBtn = $("#parsePaste");
  if (parseBtn) parseBtn.onclick = () => {
    const txt = $("#pasteBox").value;
    if (!txt.trim()) return;
    loadParsed(txt, sniffDelim(txt));
  };

  /* ---- Import: fetch from ajrly.ly ---- */
  const fetchBtn = $("#fetchAjrly");
  if (fetchBtn) fetchBtn.onclick = async () => {
    fetchBtn.disabled = true;
    try {
      const res = await fetch("/api/import-owners", { headers: { "Accept": "application/json" } });
      if (!res.ok) throw new Error("status " + res.status);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.owners || data.rows || []);
      if (!list.length) { toast(t("intg.import.fetchEmpty")); return; }
      // Already structured owner objects: route through the dedupe + preview pipeline.
      parsed = structuredToParsed(list);
      renderStage();
    } catch (e) {
      // Endpoint not deployed / not configured → graceful fallback message.
      toast(t("intg.import.fetchFail"));
    } finally {
      fetchBtn.disabled = false;
    }
  };

  /* ---- Channels: test connection ---- */
  $$("[data-test]").forEach(b => b.onclick = async () => {
    const channel = b.dataset.test;
    const out = root.querySelector(`[data-test-result="${channel}"]`);
    const endpoint = channel === "whatsapp" ? "/api/whatsapp" : "/api/notify-email";
    const body = channel === "whatsapp"
      ? { to: "", message: "ping", test: true }
      : { to: "", subject: "ping", html: "ping", test: true };
    b.disabled = true; if (out) out.textContent = t("intg.ch.testing");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 501) { if (out) out.textContent = t("intg.ch.501"); return; }
      if (out) out.textContent = res.ok ? t("intg.ch.ok") : t("intg.ch.fail");
    } catch (e) {
      if (out) out.textContent = t("intg.ch.fail");
    } finally {
      b.disabled = false;
    }
  });

  /* ---- Import staging area (mapping + preview) ---- */
  bindStage();

  /* helper: parse raw text into `parsed` and render the staging area */
  function loadParsed(text, delim) {
    const rows = parseDelimited(text, delim);
    if (!rows.length) { toast(t("intg.import.none")); return; }
    const headers = rows[0].map(x => String(x).trim());
    // Heuristic: treat first row as header if any cell maps to a known field.
    const map = autoMap(headers);
    const hasHeader = OWNER_COLS.some(f => map[f] >= 0);
    parsed = { headers, rows, map: hasHeader ? map : positionalMap(headers.length), hasHeader, delim };
    renderStage();
  }

  function renderStage() {
    const stage = $("#importStage");
    if (stage) stage.innerHTML = mappingAndPreview();
    bindStage();
  }

  function bindStage() {
    $$("[data-map]").forEach(sel => sel.onchange = () => {
      parsed.map[sel.dataset.map] = parseInt(sel.value, 10);
      renderStage();
    });
    const cancel = $("#cancelImport");
    if (cancel) cancel.onclick = () => { parsed = null; renderStage(); };
    const doImp = $("#doImport");
    if (doImp) doImp.onclick = () => {
      const candidates = rowsToOwners(parsed.rows, parsed.map, parsed.hasHeader);
      const { fresh } = dedupe(candidates);
      fresh.forEach(o => db.addOwner({
        name: o.name, phone: o.phone, email: o.email,
        listings: o.listings || "0", stage: o.stage, notes: o.notes || "",
        lastContact: "", status: "pending",
      }));
      parsed = null;
      toast(tn("intg.import.added", fresh.length));
      render();
    };
  }
}

/* when no header detected, map columns positionally to OWNER_COLS order */
function positionalMap(width) {
  const map = {};
  OWNER_COLS.forEach((f, i) => { map[f] = i < width ? i : -1; });
  return map;
}

/* wrap already-structured owner objects (from the API) as a `parsed` set so
   they flow through the same mapping/preview/dedupe pipeline */
function structuredToParsed(list) {
  const headers = OWNER_COLS.slice();
  const rows = [headers].concat(list.map(o => OWNER_COLS.map(f => o[f] ?? "")));
  const map = {}; OWNER_COLS.forEach((f, i) => map[f] = i);
  return { headers, rows, map, hasHeader: true, delim: "," };
}

/* ---------------- register ---------------- */
registerModule({
  id: "integrations",
  icon: "🔗",
  labelKey: "nav.integrations",
  titleKey: "page.integrations",
  subKey: "page.integrations.sub",
  order: 60,
  view,
  mount,
});
