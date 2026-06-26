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
    "fin.cat.ph": "اختر أو اكتب تصنيفاً…",
    "fin.f.paidTo": "المدفوع له",
    "fin.paidto.ph": "اختر مستلماً ثابتاً أو اكتب اسماً لمرة واحدة…",
    "fin.f.saveRecipient": "حفظ كمستلم ثابت",
    "fin.th.paidTo": "المدفوع له",
    "fin.filter.cat": "التصنيف:",
    "fin.allCats": "كل التصنيفات",
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
    "fin.f.rate": "سعر الصرف للدولار (1 = ؟ دولار)",
    "fin.f.usd": "القيمة بالدولار",
    "fin.sum.income": "إجمالي الإيرادات",
    "fin.sum.expense": "إجمالي المصروفات",
    "fin.sum.net": "الصافي",
    "fin.sum.usdAll": "الصافي بالدولار (كل العملات)",
    "fin.summaryFor": "ملخص:", "fin.allTime": "كل الفترات", "fin.empty.month": "لا توجد حركات في هذا الشهر",
    "fin.chart.title": "ملخص السنة (شهرياً)",
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
    "fin.cat.ph": "Pick or type a category…",
    "fin.f.paidTo": "Paid to",
    "fin.paidto.ph": "Pick a fixed recipient or type a once-off name…",
    "fin.f.saveRecipient": "Save as fixed recipient",
    "fin.th.paidTo": "Paid to",
    "fin.filter.cat": "Category:",
    "fin.allCats": "All categories",
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
    "fin.f.rate": "Exchange rate to USD (1 = ? USD)",
    "fin.f.usd": "USD value",
    "fin.sum.income": "Total income",
    "fin.sum.expense": "Total expenses",
    "fin.sum.net": "Net",
    "fin.sum.usdAll": "Net in USD (all currencies)",
    "fin.summaryFor": "Summary:", "fin.allTime": "All time", "fin.empty.month": "No entries in this month",
    "fin.chart.title": "Yearly summary (monthly)",
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

/* Editable option lists (categories + recipients) reuse the synced
   contentOpts store, discriminated by `field`. */
const FIN_CAT = "finCategory", FIN_RCP = "finRecipient";
const optsRaw = () => (OS().db && OS().db.contentOpts) || [];
const savedOpts = (field) => optsRaw().filter(o => o.field === field).map(o => o.value).filter(Boolean);
function addOpt(field, value) {
  const v = String(value || "").trim();
  if (!v) return;
  if (savedOpts(field).some(x => x.toLowerCase() === v.toLowerCase())) return;
  if (OS().db && OS().db.addContentOpt) OS().db.addContentOpt({ field, value: v, url: "" });
}
/* distinct categories: saved ∪ those already used on records */
function categoriesPresent() {
  const set = new Set(savedOpts(FIN_CAT));
  records().forEach(r => { if (r.category) set.add(r.category); });
  return [...set].sort((a, b) => a.localeCompare(b));
}
const recipientsList = () => savedOpts(FIN_RCP).slice().sort((a, b) => a.localeCompare(b));

const CURRENCIES = ["LYD", "USD", "EUR", "EGP"];
const MAX_ATT = 1.5 * 1024 * 1024; // 1.5 MB
const ALLOWED = /(pdf|jpe?g|png)$/i;

let finTab = "expense"; // expense | income
let finYear = null;     // selected year for the chart (null => latest present)
let finCcy = "";        // selected currency for the chart ("" => most common)
let finMonth = "";      // summary month filter "YYYY-MM" ("" => all time)
let finCatFilter = "";  // category filter ("" => all categories)

const MONTHS = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ar: ["ينا", "فبر", "مار", "أبر", "مايو", "يون", "يول", "أغس", "سبت", "أكت", "نوف", "ديس"],
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const todayISO = () => new Date().toISOString().slice(0, 10);
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
function money(amount, currency) {
  const n = num(amount).toLocaleString(getLang() === "ar" ? "ar-EG" : "en-GB", { maximumFractionDigits: 2 });
  return `${n} ${esc(currency || "LYD")}`;
}
/* USD per 1 unit of the record's currency (manual rate; USD defaults to 1) */
const usdRate = (r) => (r && r.rate ? num(r.rate) : ((r && (r.currency || "") === "USD") ? 1 : 0));
const usdOf = (r) => num(r && r.amount) * usdRate(r);
/* totals converted to USD across all currencies */
function usdTotals(list) {
  let income = 0, expense = 0, any = false;
  (list || records()).forEach(r => {
    const u = usdOf(r);
    if (u) { any = true; if ((r.kind || "expense") === "income") income += u; else expense += u; }
  });
  return { income, expense, any };
}

/* ---- summary month filter (auto-built from logged data) ---- */
const inMonth = (r) => !finMonth || String(r.date || "").slice(0, 7) === finMonth;
const summaryRecords = () => records().filter(inMonth);
function monthsPresent() {
  const set = new Set();
  records().forEach(r => { const m = String(r.date || "").slice(0, 7); if (/^\d{4}-\d{2}$/.test(m)) set.add(m); });
  return [...set].sort().reverse(); // newest month first
}
function monthLabel(key) {
  const p = key.split("-"); const y = +p[0], m = +p[1];
  try { return new Date(y, m - 1, 1).toLocaleDateString(getLang() === "ar" ? "ar-EG" : "en-GB", { month: "long", year: "numeric" }); }
  catch (_) { return key; }
}

/* per-currency { income, expense } across the given records (defaults to all) */
function totals(list) {
  const by = {};
  (list || records()).forEach(r => {
    const c = r.currency || "LYD";
    by[c] = by[c] || { income: 0, expense: 0 };
    if ((r.kind || "expense") === "income") by[c].income += num(r.amount);
    else by[c].expense += num(r.amount);
  });
  return by;
}

/* ---------------- yearly chart ---------------- */
function currenciesPresent() {
  const s = new Set();
  records().forEach(r => s.add(r.currency || "LYD"));
  return s.size ? [...s] : ["LYD"];
}
function yearsPresent() {
  const ys = new Set();
  records().forEach(r => { const y = (r.date || "").slice(0, 4); if (y) ys.add(y); });
  ys.add(String(new Date().getFullYear()));
  return [...ys].sort().reverse(); // latest first
}
function pickYear() {
  const years = yearsPresent();
  return (finYear && years.map(String).includes(String(finYear))) ? String(finYear) : years[0];
}
function pickCcy() {
  const present = currenciesPresent();
  if (finCcy && present.includes(finCcy)) return finCcy;
  const c = {}; records().forEach(r => { const k = r.currency || "LYD"; c[k] = (c[k] || 0) + 1; });
  return present.slice().sort((a, b) => (c[b] || 0) - (c[a] || 0))[0];
}
function monthly(year, ccy) {
  const inc = Array(12).fill(0), exp = Array(12).fill(0);
  records().forEach(r => {
    if ((r.currency || "LYD") !== ccy) return;
    const d = r.date || "";
    if (d.slice(0, 4) !== String(year)) return;
    const m = parseInt(d.slice(5, 7), 10) - 1;
    if (m < 0 || m > 11) return;
    if ((r.kind || "expense") === "income") inc[m] += num(r.amount);
    else exp[m] += num(r.amount);
  });
  return { inc, exp };
}
function chartSVG(year, ccy) {
  const { inc, exp } = monthly(year, ccy);
  const rtl = getLang() === "ar";
  const months = MONTHS[rtl ? "ar" : "en"];
  const max = Math.max(1, ...inc, ...exp);
  const W = 760, H = 260, padL = 8, padR = 8, padTop = 14, padBot = 28;
  const plotW = W - padL - padR, plotH = H - padTop - padBot;
  const slot = plotW / 12;
  const barW = Math.min(14, slot / 3), gap = 3;
  const grid = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const y = padTop + plotH - f * plotH;
    return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="0.5"/>`;
  }).join("");
  const bars = [];
  for (let i = 0; i < 12; i++) {
    const slotIndex = rtl ? (11 - i) : i;
    const cx = padL + slotIndex * slot + slot / 2;
    const incH = (inc[i] / max) * plotH, expH = (exp[i] / max) * plotH;
    const xInc = cx - barW - gap / 2, xExp = cx + gap / 2;
    bars.push(`<rect x="${xInc.toFixed(1)}" y="${(padTop + plotH - incH).toFixed(1)}" width="${barW.toFixed(1)}" height="${incH.toFixed(1)}" rx="2" fill="var(--st-complete)"><title>${esc(months[i])} · ${esc(t("fin.sum.income"))}: ${money(inc[i], ccy)}</title></rect>`);
    bars.push(`<rect x="${xExp.toFixed(1)}" y="${(padTop + plotH - expH).toFixed(1)}" width="${barW.toFixed(1)}" height="${expH.toFixed(1)}" rx="2" fill="var(--st-overdue, #ef4444)"><title>${esc(months[i])} · ${esc(t("fin.sum.expense"))}: ${money(exp[i], ccy)}</title></rect>`);
    bars.push(`<text x="${cx.toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="var(--muted, #94a3b8)">${esc(months[i])}</text>`);
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(t("fin.chart.title"))}">${grid}${bars.join("")}</svg>`;
}
function chartCard() {
  if (!records().length) return "";
  const year = pickYear(), ccy = pickCcy();
  const yearSel = `<select class="input" id="finYear">${yearsPresent().map(y => `<option value="${y}" ${String(y) === String(year) ? "selected" : ""}>${y}</option>`).join("")}</select>`;
  const ccySel = `<select class="input" id="finCcy">${currenciesPresent().map(c => `<option value="${c}" ${c === ccy ? "selected" : ""}>${c}</option>`).join("")}</select>`;
  return `<div class="card" style="margin-bottom:16px">
    <div class="card__head">
      <span class="card__title">📊 ${esc(t("fin.chart.title"))} — ${esc(year)}</span>
      <span class="flex" style="gap:8px">${ccySel}${yearSel}</span>
    </div>
    <div class="flex" style="gap:16px;margin:2px 2px 8px;font-size:12.5px">
      <span class="flex" style="gap:6px;align-items:center"><span style="width:11px;height:11px;border-radius:3px;background:var(--st-complete);display:inline-block"></span>${esc(t("fin.sum.income"))}</span>
      <span class="flex" style="gap:6px;align-items:center"><span style="width:11px;height:11px;border-radius:3px;background:var(--st-overdue,#ef4444);display:inline-block"></span>${esc(t("fin.sum.expense"))}</span>
    </div>
    ${chartSVG(year, ccy)}
  </div>`;
}

/* ---------------- view ---------------- */
function summaryCards() {
  if (!records().length) {
    return `<div class="card"><div class="empty"><div class="empty__icon">💰</div><p class="muted">${esc(t("fin.empty.summary"))}</p></div></div>`;
  }
  // month dropdown — auto-built from logged months
  const months = monthsPresent();
  const monthSel = `<select class="input" id="finMonth">
    <option value="">${esc(t("fin.allTime"))}</option>
    ${months.map(m => `<option value="${m}" ${finMonth === m ? "selected" : ""}>${esc(monthLabel(m))}</option>`).join("")}
  </select>`;
  const head = `<div class="toolbar" style="margin-bottom:10px"><div class="toolbar__left">
    <span class="muted">${esc(t("fin.summaryFor"))}</span> ${monthSel}
  </div></div>`;

  const recs = summaryRecords();
  const by = totals(recs);
  const keys = Object.keys(by);
  if (!keys.length) {
    return head + `<div class="card" style="margin-bottom:16px"><div class="empty"><div class="empty__icon">📭</div><p class="muted">${esc(t("fin.empty.month"))}</p></div></div>`;
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
  });
  // unified total converted to USD (uses each transaction's exchange rate)
  const u = usdTotals(recs);
  if (u.any) {
    const net = u.income - u.expense;
    const netColor = net >= 0 ? "var(--st-complete)" : "var(--st-overdue, #ef4444)";
    cards.unshift(`<div class="card stat" style="border:1.5px solid var(--brand)">
      <div class="stat__top"><span class="stat__icon" style="background:var(--brand);color:#fff">$</span></div>
      <span class="stat__value" style="color:${netColor}">${money(net, "USD")}</span>
      <span class="stat__label">${esc(t("fin.sum.usdAll"))}</span>
      <div class="muted" style="margin-top:6px;font-size:12.5px">
        ▲ ${esc(t("fin.sum.income"))}: ${money(u.income, "USD")}<br>
        ▼ ${esc(t("fin.sum.expense"))}: ${money(u.expense, "USD")}
      </div>
    </div>`);
  }
  return head + `<div class="grid cards-3" style="margin-bottom:16px">${cards.join("")}</div>`;
}

function table() {
  let list = records().filter(r => (r.kind || "expense") === finTab);
  if (finCatFilter) list = list.filter(r => (r.category || "") === finCatFilter);
  const showPaid = finTab === "expense";
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
      ${showPaid ? `<td>${r.paidTo ? esc(r.paidTo) : "—"}</td>` : ""}
      <td style="white-space:nowrap;font-variant-numeric:tabular-nums"><b>${money(r.amount, r.currency)}</b>${(r.currency !== "USD" && usdRate(r)) ? `<div class="muted" style="font-size:11.5px">≈ ${money(usdOf(r), "USD")}</div>` : ""}</td>
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
      ${showPaid ? `<th>${esc(t("fin.th.paidTo"))}</th>` : ""}
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
  const cats = categoriesPresent();
  const catFilter = cats.length
    ? `<span class="muted" style="align-self:center">${esc(t("fin.filter.cat"))}</span>
       <select class="input" id="finCatFilter" style="max-width:200px">
         <option value="">${esc(t("fin.allCats"))}</option>
         ${cats.map(c => `<option value="${esc(c)}" ${finCatFilter === c ? "selected" : ""}>${esc(c)}</option>`).join("")}
       </select>`
    : "";
  const toolbar = `<div class="toolbar"><div class="toolbar__left">${tabs}</div><div class="toolbar__right" style="gap:8px">${catFilter}${addBtn}</div></div>`;
  return `<div>${chartCard()}${summaryCards()}${toolbar}${table()}</div>`;
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
        <div class="field"><label>${esc(t("fin.f.category"))}</label>
          <input id="fin_cat" list="fin_cat_list" autocomplete="off" value="${esc(x.category || "")}" placeholder="${esc(t("fin.cat.ph"))}" />
          <datalist id="fin_cat_list">${categoriesPresent().map(c => `<option value="${esc(c)}"></option>`).join("")}</datalist>
        </div>
      </div>
      ${kind === "expense" ? `<div class="field"><label>${esc(t("fin.f.paidTo"))}</label>
        <input id="fin_paidto" list="fin_rcp_list" autocomplete="off" value="${esc(x.paidTo || "")}" placeholder="${esc(t("fin.paidto.ph"))}" />
        <datalist id="fin_rcp_list">${recipientsList().map(r => `<option value="${esc(r)}"></option>`).join("")}</datalist>
        <label class="flex" style="gap:6px;align-items:center;margin-top:6px;font-weight:400;font-size:12.5px">
          <input type="checkbox" id="fin_paidto_fix" style="width:auto" /> ${esc(t("fin.f.saveRecipient"))}
        </label>
      </div>` : ""}
      <div class="field-row">
        <div class="field"><label>${esc(t("fin.f.amount"))}</label><input type="number" step="any" min="0" id="fin_amount" value="${esc(x.amount || "")}" /></div>
        <div class="field"><label>${esc(t("fin.f.currency"))}</label><select id="fin_currency">${CURRENCIES.map(c => opt(c, x.currency || "LYD", c)).join("")}</select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>${esc(t("fin.f.rate"))}</label><input type="number" step="any" min="0" id="fin_rate" value="${esc(x.rate || ((x.currency || "LYD") === "USD" ? "1" : ""))}" placeholder="1 = ? USD" /></div>
        <div class="field"><label>${esc(t("fin.f.usd"))}</label><input id="fin_usd" disabled /></div>
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

  // live USD value = amount × exchange rate
  const recalcUsd = () => {
    const usd = num($("#fin_amount") && $("#fin_amount").value) * num($("#fin_rate") && $("#fin_rate").value);
    const box = $("#fin_usd"); if (box) box.value = usd ? money(usd, "USD") : "—";
  };
  const amt = $("#fin_amount"), rate = $("#fin_rate"), ccy = $("#fin_currency");
  if (amt) amt.oninput = recalcUsd;
  if (rate) rate.oninput = recalcUsd;
  if (ccy) ccy.onchange = () => { if (ccy.value === "USD" && rate && !num(rate.value)) rate.value = "1"; recalcUsd(); };
  recalcUsd();

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
    const category = $("#fin_cat").value.trim();
    const paidEl = $("#fin_paidto");
    const paidTo = paidEl ? paidEl.value.trim() : (x.paidTo || "");
    const data = {
      kind,
      name: $("#fin_name").value.trim(),
      date: $("#fin_date").value || todayISO(),
      category,
      paidTo,
      amount: $("#fin_amount").value,
      currency: $("#fin_currency").value,
      rate: $("#fin_rate").value,
      description: $("#fin_desc").value.trim(),
      attachment: att ? att.data : "",
      attachmentName: att ? att.name : "",
    };
    if (!data.name) { $("#fin_name").focus(); return; }
    // categories are a reusable taxonomy → always remember them for the filter
    if (category) addOpt(FIN_CAT, category);
    // recipients: only remember when "save as fixed" is ticked (once-off otherwise)
    const fix = $("#fin_paidto_fix");
    if (paidTo && fix && fix.checked) addOpt(FIN_RCP, paidTo);
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
  $$("[data-fintab]").forEach(b => b.onclick = () => { finTab = b.dataset.fintab; finCatFilter = ""; reRender(); });
  const ys = $("#finYear"); if (ys) ys.onchange = (e) => { finYear = e.target.value; reRender(); };
  const cs = $("#finCcy"); if (cs) cs.onchange = (e) => { finCcy = e.target.value; reRender(); };
  const ms = $("#finMonth"); if (ms) ms.onchange = (e) => { finMonth = e.target.value; reRender(); };
  const cf = $("#finCatFilter"); if (cf) cf.onchange = (e) => { finCatFilter = e.target.value; reRender(); };
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
