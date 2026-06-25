/* ============================================================
   Ajrly OS — Finance module (Expenditure + Income)
   Dependency-free, RTL/theme-aware. Reads/writes window.AjrlyOS.db.finance.
   Two tabs (expense | income) sharing one form, plus a per-currency
   summary (income / expense / net). Receipts attach as data URLs.
   ============================================================ */
import { registerModule } from "../registry.js";
import { registerStrings, t, getLang } from "../i18n.js";

/* ---------------- i18n ---------------- */
registerStrings({
  ar: {
    "nav.finance": "المالية",
    "page.finance": "المالية",
    "page.finance.sub": "المصروفات والإيرادات مع المرفقات والإيصالات",
    "fin.tab.expense": "المصروفات",
    "fin.tab.income": "الإيرادات",
    "fin.add.expense": "إضافة مصروف",
    "fin.add.income": "إضافة إيراد",
    "fin.edit.expense": "تعديل مصروف",
    "fin.edit.income": "تعديل إيراد",
    "fin.f.name": "البيان / الاسم",
    "fin.f.date": "التاريخ",
    "fin.f.amount": "المبلغ",
    "fin.f.currency": "العملة",
    "fin.f.category": "التصنيف (اختياري)",
    "fin.f.desc": "السبب / الوصف",
    "fin.f.attachment": "إيصال / مرفق (PDF أو JPG)",
    "fin.attach.pick": "إرفاق ملف",
    "fin.attach.view": "عرض",
    "fin.attach.remove": "إزالة المرفق",
    "fin.attach.too_big": "الملف كبير جداً (الحد الأقصى 1.5 ميجابايت)",
    "fin.attach.bad_type": "الصيغ المسموحة: PDF أو JPG/PNG",
    "fin.th.name": "البيان",
    "fin.th.date": "التاريخ",
    "fin.th.category": "التصنيف",
    "fin.th.amount": "المبلغ",
    "fin.th.desc": "الوصف",
    "fin.th.receipt": "الإيصال",
    "fin.sum.income": "إجمالي الإيرادات",
    "fin.sum.expense": "إجمالي المصروفات",
    "fin.sum.net": "الصافي",
    "fin.empty.expense": "لا توجد مصروفات بعد",
    "fin.empty.income": "لا توجد إيرادات بعد",
    "fin.empty.summary": "أضف أول حركة مالية لعرض الملخص",
    "fin.saved": "تم الحفظ",
    "fin.deleted": "تم الحذف",
    "fin.confirmDel": "حذف هذه الحركة؟",
  },
  en: {
    "nav.finance": "Finance",
    "page.finance": "Finance",
    "page.finance.sub": "Expenditure and income with receipts & attachments",
    "fin.tab.expense": "Expenditure",
    "fin.tab.income": "Income",
    "fin.add.expense": "Add expense",
    "fin.add.income": "Add income",
    "fin.edit.expense": "Edit expense",
    "fin.edit.income": "Edit income",
    "fin.f.name": "Name",
    "fin.f.date": "Date",
    "fin.f.amount": "Amount",
    "fin.f.currency": "Currency",
    "fin.f.category": "Category (optional)",
    "fin.f.desc": "Reason / description",
    "fin.f.attachment": "Receipt / attachment (PDF or JPG)",
    "fin.attach.pick": "Attach file",
    "fin.attach.view": "View",
    "fin.attach.remove": "Remove attachment",
    "fin.attach.too_big": "File is too large (max 1.5 MB)",
    "fin.attach.bad_type": "Allowed: PDF or JPG/PNG",
    "fin.th.name": "Name",
    "fin.th.date": "Date",
    "fin.th.category": "Category",
    "fin.th.amount": "Amount",
    "fin.th.desc": "Description",
    "fin.th.receipt": "Receipt",
    "fin.sum.income": "Total income",
    "fin.sum.expense": "Total expenses",
    "fin.sum.net": "Net",
    "fin.empty.expense": "No expenses yet",
    "fin.empty.income": "No income yet",
    "fin.empty.summary": "Add your first entry to see the summary",
    "fin.saved": "Saved",
    "fin.deleted": "Deleted",
    "fin.confirmDel": "Delete this entry?",
  },
});

/* ---------------- helpers / state ---------------- */
const OS = () => window.AjrlyOS || {};
const esc = (s) => (OS().esc ? OS().esc(s) : String(s ?? ""));
const fmtDate = (iso) => (OS().fmtDate ? OS().fmtDate(iso) : (iso || "—"));
const can = (a) => (typeof OS().can === "function" ? OS().can(a) : false);
const records = () => (OS().db && OS().db.finance) || [];

const CURRENCIES = ["LYD", "USD", "EUR", "EGP"];
const MAX_ATT = 1.5 * 1024 * 1024; // 1.5 MB
const ALLOWED = /(pdf|jpe?g|png)$/i;

let finTab = "expense"; // expense | income

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const todayISO = () => new Date().toISOString().slice(0, 10);
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
function money(amount, currency) {
  const n = num(amount).toLocaleString(getLang() === "ar" ? "ar-EG" : "en-GB", { maximumFractionDigits: 2 });
  return `${n} ${esc(currency || "LYD")}`;
}

/* per-currency { income, expense } across all records */
function totals() {
  const by = {};
  records().forEach(r => {
    const c = r.currency || "LYD";
    by[c] = by[c] || { income: 0, expense: 0 };
    if ((r.kind || "expense") === "income") by[c].income += num(r.amount);
    else by[c].expense += num(r.amount);
  });
  return by;
}

/* ---------------- view ---------------- */
function summaryCards() {
  const by = totals();
  const keys = Object.keys(by);
  if (!keys.length) {
    return `<div class="card"><div class="empty"><div class="empty__icon">💰</div><p class="muted">${esc(t("fin.empty.summary"))}</p></div></div>`;
  }
  const cards = keys.map(c => {
    const net = by[c].income - by[c].expense;
    const netColor = net >= 0 ? "var(--st-complete)" : "var(--st-overdue, #ef4444)";
    return `<div class="card stat">
      <div class="stat__top"><span class="stat__icon" style="background:var(--brand-soft);color:var(--brand)">${esc(c)}</span></div>
      <span class="stat__value" style="color:${netColor}">${money(net, c)}</span>
      <span class="stat__label">${esc(t("fin.sum.net"))}</span>
      <div class="muted" style="margin-top:6px;font-size:12.5px">
        ▲ ${esc(t("fin.sum.income"))}: ${money(by[c].income, c)}<br>
        ▼ ${esc(t("fin.sum.expense"))}: ${money(by[c].expense, c)}
      </div>
    </div>`;
  }).join("");
  return `<div class="grid cards-3" style="margin-bottom:16px">${cards}</div>`;
}

function table() {
  const list = records().filter(r => (r.kind || "expense") === finTab);
  if (!list.length) {
    return `<div class="card"><div class="empty">
      <div class="empty__icon">${finTab === "income" ? "📈" : "🧾"}</div>
      <h3>${esc(t("fin.empty." + finTab))}</h3></div></div>`;
  }
  const D = can("del");
  const rows = list.map(r => {
    const att = r.attachment
      ? `<a href="${esc(r.attachment)}" target="_blank" rel="noopener" download="${esc(r.attachmentName || "receipt")}">📎 ${esc(r.attachmentName || t("fin.attach.view"))}</a>`
      : "—";
    return `<tr>
      <td><div class="cell-title">${esc(r.name || "—")}</div></td>
      <td>${fmtDate(r.date)}</td>
      <td>${r.category ? esc(r.category) : "—"}</td>
      <td style="white-space:nowrap;font-variant-numeric:tabular-nums"><b>${money(r.amount, r.currency)}</b></td>
      <td><div class="muted" style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.description || "")}</div></td>
      <td>${att}</td>
      <td><div class="row-actions">
        <button class="btn btn--ghost btn--sm" data-fedit="${r.id}">✎</button>
        ${D ? `<button class="btn btn--ghost btn--sm btn--danger" data-fdel="${r.id}">🗑</button>` : ""}
      </div></td>
    </tr>`;
  }).join("");
  return `<div class="table-wrap"><table>
    <thead><tr>
      <th>${esc(t("fin.th.name"))}</th><th>${esc(t("fin.th.date"))}</th><th>${esc(t("fin.th.category"))}</th>
      <th>${esc(t("fin.th.amount"))}</th><th>${esc(t("fin.th.desc"))}</th><th>${esc(t("fin.th.receipt"))}</th><th></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function view() {
  const W = can("write");
  const tabs = `<div class="seg" id="finTabs">
    <button data-fintab="expense" class="${finTab === "expense" ? "active" : ""}">🧾 ${esc(t("fin.tab.expense"))}</button>
    <button data-fintab="income" class="${finTab === "income" ? "active" : ""}">📈 ${esc(t("fin.tab.income"))}</button>
  </div>`;
  const addBtn = W
    ? `<button class="btn btn--primary" id="finAdd">＋ ${esc(t("fin.add." + finTab))}</button>`
    : "";
  const toolbar = `<div class="toolbar"><div class="toolbar__left">${tabs}</div><div class="toolbar__right">${addBtn}</div></div>`;
  return `<div>${summaryCards()}${toolbar}${table()}</div>`;
}

/* ---------------- modal ---------------- */
function financeModal(rec) {
  const x = rec || {};
  const editing = !!rec;
  const kind = editing ? (x.kind || "expense") : finTab;
  // attachment working state: undefined→unchanged not relevant; we always send current
  let att = x.attachment ? { data: x.attachment, name: x.attachmentName || "receipt" } : null;
  const opt = (v, cur, label) => `<option value="${v}" ${cur === v ? "selected" : ""}>${label}</option>`;

  OS().openModal(`
    <div class="modal__head"><h3>${esc(t((editing ? "fin.edit." : "fin.add.") + kind))}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body">
      <div class="field"><label>${esc(t("fin.f.name"))}</label><input id="fin_name" value="${esc(x.name || "")}" /></div>
      <div class="field-row">
        <div class="field"><label>${esc(t("fin.f.date"))}</label><input type="date" id="fin_date" value="${esc(x.date || todayISO())}" /></div>
        <div class="field"><label>${esc(t("fin.f.category"))}</label><input id="fin_cat" value="${esc(x.category || "")}" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>${esc(t("fin.f.amount"))}</label><input type="number" step="any" min="0" id="fin_amount" value="${esc(x.amount || "")}" /></div>
        <div class="field"><label>${esc(t("fin.f.currency"))}</label><select id="fin_currency">${CURRENCIES.map(c => opt(c, x.currency || "LYD", c)).join("")}</select></div>
      </div>
      <div class="field"><label>${esc(t("fin.f.desc"))}</label><textarea id="fin_desc">${esc(x.description || "")}</textarea></div>
      <div class="field">
        <label>${esc(t("fin.f.attachment"))}</label>
        <input type="file" id="fin_file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" />
        <div id="fin_att_state" style="margin-top:6px"></div>
      </div>
    </div>
    <div class="modal__foot">
      <button class="btn" data-close>${esc(t("btn.cancel") || "Cancel")}</button>
      <button class="btn btn--primary" data-save>${esc(t("btn.save") || "Save")}</button>
    </div>`);

  const renderAtt = () => {
    const box = $("#fin_att_state");
    if (!box) return;
    box.innerHTML = att
      ? `<span class="flex" style="gap:8px;align-items:center">
           <a href="${esc(att.data)}" target="_blank" rel="noopener" download="${esc(att.name)}">📎 ${esc(att.name)}</a>
           <button type="button" class="btn btn--ghost btn--sm btn--danger" id="fin_att_rm">${esc(t("fin.attach.remove"))}</button>
         </span>`
      : "";
    const rm = $("#fin_att_rm");
    if (rm) rm.onclick = () => { att = null; const f = $("#fin_file"); if (f) f.value = ""; renderAtt(); };
  };
  renderAtt();

  const file = $("#fin_file");
  if (file) file.onchange = () => {
    const f = file.files && file.files[0];
    if (!f) return;
    if (!ALLOWED.test(f.name)) { OS().toast(t("fin.attach.bad_type")); file.value = ""; return; }
    if (f.size > MAX_ATT) { OS().toast(t("fin.attach.too_big")); file.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => { att = { data: String(reader.result || ""), name: f.name }; renderAtt(); };
    reader.readAsDataURL(f);
  };

  ($("[data-save]") || {}).onclick = () => {
    const data = {
      kind,
      name: $("#fin_name").value.trim(),
      date: $("#fin_date").value || todayISO(),
      category: $("#fin_cat").value.trim(),
      amount: $("#fin_amount").value,
      currency: $("#fin_currency").value,
      description: $("#fin_desc").value.trim(),
      attachment: att ? att.data : "",
      attachmentName: att ? att.name : "",
    };
    if (!data.name) { $("#fin_name").focus(); return; }
    if (editing) OS().db.updateFinance(rec.id, data); else OS().db.addFinance(data);
    OS().closeModal();
    (OS().render || (() => {}))();
    OS().toast(t("fin.saved"));
  };
  $$("[data-close]").forEach(b => b.onclick = OS().closeModal);
}

/* ---------------- mount ---------------- */
function mount(ctx) {
  const reRender = () => (ctx && ctx.render ? ctx.render() : (OS().render && OS().render()));
  $$("[data-fintab]").forEach(b => b.onclick = () => { finTab = b.dataset.fintab; reRender(); });
  const add = $("#finAdd");
  if (add) add.onclick = () => financeModal(null);
  $$("[data-fedit]").forEach(b => b.onclick = () => financeModal(records().find(r => r.id === b.dataset.fedit)));
  $$("[data-fdel]").forEach(b => b.onclick = () => {
    if (!confirm(t("fin.confirmDel"))) return;
    OS().db.removeFinance(b.dataset.fdel);
    reRender();
    OS().toast(t("fin.deleted"));
  });
}

/* ---------------- register ---------------- */
registerModule({
  id: "finance",
  icon: "💰",
  labelKey: "nav.finance",
  titleKey: "page.finance",
  subKey: "page.finance.sub",
  order: 45,
  view,
  mount,
});
