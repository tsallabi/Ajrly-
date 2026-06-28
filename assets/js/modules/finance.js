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
    "fin.settings": "إعدادات — تعديل القوائم",
    "fin.settings.cats": "التصنيفات",
    "fin.settings.rcps": "المستلمون الثابتون (المدفوع له)",
    "fin.opt.add": "إضافة",
    "fin.opt.ph": "خيار جديد…",
    "fin.f.desc": "السبب / الوصف",
    "fin.f.attachment": "إيصال / مرفق (PDF أو JPG)",
    "fin.attach.pick": "إرفاق ملف",
    "fin.attach.view": "عرض",
    "fin.preview.newtab": "فتح في تبويب جديد",
    "fin.preview.download": "تنزيل",
    "fin.preview.none": "لا يمكن معاينة هذا الملف — افتحه في تبويب جديد",
    "fin.attach.remove": "إزالة المرفق",
    "fin.attach.too_big": "الملف كبير جداً (الحد الأقصى 1.5 ميجابايت)",
    "fin.attach.bad_type": "الصيغ المسموحة: PDF أو JPG/PNG",
    "fin.th.name": "البيان",
    "fin.th.date": "التاريخ",
    "fin.th.category": "التصنيف",
    "fin.th.amount": "المبلغ",
    "fin.th.desc": "الوصف",
    "fin.th.receipt": "الإيصال",
    "fin.f.rate": "سعر الصرف (1 دولار = ؟ بهذه العملة)",
    "fin.f.usd": "القيمة بالدولار",
    "fin.sum.income": "إجمالي الإيرادات",
    "fin.sum.expense": "إجمالي المصروفات",
    "fin.sum.net": "الصافي",
    "fin.sum.usdAll": "الصافي بالدولار (كل العملات)",
    "fin.print": "طباعة تقرير",
    "fin.report.title": "تقرير المالية — أجرلي",
    "fin.report.generated": "أُنشئ في", "fin.report.entries": "حركة",
    "fin.report.summary": "الملخص", "fin.report.all": "كل الحركات", "fin.report.type": "النوع",
    "fin.report.popup": "اسمح بالنوافذ المنبثقة لإنشاء التقرير",
    "fin.tab.budgets": "الميزانيات",
    "fin.bud.create": "إنشاء ميزانية", "fin.bud.edit": "تعديل الميزانية",
    "fin.bud.name": "اسم الميزانية", "fin.bud.planner": "المخطِّط (الموظف)",
    "fin.bud.status.pending": "قيد المراجعة", "fin.bud.status.approved": "معتمدة", "fin.bud.status.denied": "مرفوضة",
    "fin.bud.approve": "اعتماد", "fin.bud.deny": "رفض", "fin.bud.open": "فتح", "fin.bud.back": "رجوع",
    "fin.bud.empty": "لا توجد ميزانيات بعد",
    "fin.bud.assigned": "الميزانية المخصّصة", "fin.bud.actual": "الإنفاق الفعلي",
    "fin.bud.estimated": "التكلفة التقديرية الإجمالية", "fin.bud.remaining": "المتبقّي",
    "fin.bud.changes": "التغييرات المطلوبة", "fin.bud.changesPh": "حدّد التغييرات المطلوبة على الميزانية…",
    "fin.bud.addCost": "إضافة تكلفة", "fin.bud.editCost": "تعديل التكلفة", "fin.bud.costsEmpty": "لا توجد تكاليف بعد",
    "fin.bud.confirmDel": "حذف هذه الميزانية؟", "fin.bud.vs": "المخصّص مقابل الفعلي",
    "fin.cost.name": "اسم المصروف", "fin.cost.desc": "الوصف", "fin.cost.est": "التكلفة التقديرية",
    "fin.cost.duration": "مدة الخدمة", "fin.cost.provider": "مزوّد الخدمة", "fin.cost.importance": "الأهمية",
    "fin.cost.attach": "عرض سعر / عقد (PDF أو JPG)", "fin.cost.confirmDel": "حذف هذه التكلفة؟",
    "imp.high": "عالية", "imp.medium": "متوسطة", "imp.low": "منخفضة",
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
    "fin.settings": "Settings — manage dropdowns",
    "fin.settings.cats": "Categories",
    "fin.settings.rcps": "Fixed recipients (Paid to)",
    "fin.opt.add": "Add",
    "fin.opt.ph": "New option…",
    "fin.f.desc": "Reason / description",
    "fin.f.attachment": "Receipt / attachment (PDF or JPG)",
    "fin.attach.pick": "Attach file",
    "fin.attach.view": "View",
    "fin.preview.newtab": "Open in new tab",
    "fin.preview.download": "Download",
    "fin.preview.none": "Can't preview this file — open it in a new tab",
    "fin.attach.remove": "Remove attachment",
    "fin.attach.too_big": "File is too large (max 1.5 MB)",
    "fin.attach.bad_type": "Allowed: PDF or JPG/PNG",
    "fin.th.name": "Name",
    "fin.th.date": "Date",
    "fin.th.category": "Category",
    "fin.th.amount": "Amount",
    "fin.th.desc": "Description",
    "fin.th.receipt": "Receipt",
    "fin.f.rate": "Exchange rate (1 USD = ? in this currency)",
    "fin.f.usd": "USD value",
    "fin.sum.income": "Total income",
    "fin.sum.expense": "Total expenses",
    "fin.sum.net": "Net",
    "fin.sum.usdAll": "Net in USD (all currencies)",
    "fin.print": "Print report",
    "fin.report.title": "Finance Report — Ajrly",
    "fin.report.generated": "Generated", "fin.report.entries": "entries",
    "fin.report.summary": "Summary", "fin.report.all": "All transactions", "fin.report.type": "Type",
    "fin.report.popup": "Allow pop-ups to generate the report",
    "fin.tab.budgets": "Budgets",
    "fin.bud.create": "Create budget", "fin.bud.edit": "Edit budget",
    "fin.bud.name": "Budget name", "fin.bud.planner": "Planned by (employee)",
    "fin.bud.status.pending": "Pending review", "fin.bud.status.approved": "Approved", "fin.bud.status.denied": "Denied",
    "fin.bud.approve": "Approve", "fin.bud.deny": "Deny", "fin.bud.open": "Open", "fin.bud.back": "Back",
    "fin.bud.empty": "No budgets yet",
    "fin.bud.assigned": "Assigned budget", "fin.bud.actual": "Actual spending",
    "fin.bud.estimated": "Estimated total cost", "fin.bud.remaining": "Remaining",
    "fin.bud.changes": "Changes needed", "fin.bud.changesPh": "Specify the changes needed on this budget…",
    "fin.bud.addCost": "Add cost", "fin.bud.editCost": "Edit cost", "fin.bud.costsEmpty": "No costs yet",
    "fin.bud.confirmDel": "Delete this budget?", "fin.bud.vs": "Assigned vs Actual",
    "fin.cost.name": "Expense name", "fin.cost.desc": "Description", "fin.cost.est": "Estimated cost",
    "fin.cost.duration": "Duration of service", "fin.cost.provider": "Service provider", "fin.cost.importance": "Importance",
    "fin.cost.attach": "Quote / contract (PDF or JPG)", "fin.cost.confirmDel": "Delete this cost?",
    "imp.high": "High", "imp.medium": "Medium", "imp.low": "Low",
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
let finSettings = false; // settings (dropdown manager) expanded?
let budgetOpen = null;   // id of the open budget (cost page), or null for the list

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
/* Exchange rate is entered as "1 USD = ? units of this currency", so the
   USD value is amount ÷ rate. USD defaults to a rate of 1. Rate 0/empty
   means "unknown" → USD value 0 (skipped from USD totals). */
const usdRate = (r) => (r && r.rate ? num(r.rate) : ((r && (r.currency || "") === "USD") ? 1 : 0));
const usdOf = (r) => { const rate = usdRate(r); return rate ? num(r && r.amount) / rate : 0; };
/* totals converted to USD across all currencies */
function usdTotals(list) {
  let income = 0, expense = 0, any = false;
  (list || records()).forEach(r => {
    const u = usdOf(r);
    if (u) { any = true; if ((r.kind || "expense") === "income") income += u; else expense += u; }
  });
  return { income, expense, any };
}

/* ---- summary filters (auto-built from logged data) ---- */
const inMonth = (r) => !finMonth || String(r.date || "").slice(0, 7) === finMonth;
const inCat = (r) => !finCatFilter || (r.category || "") === finCatFilter;
const summaryRecords = () => records().filter(r => inMonth(r) && inCat(r));
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
    if (!inCat(r)) return;
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
  const catChip = finCatFilter
    ? `<span class="flex" style="gap:6px;align-items:center;background:var(--brand-soft);color:var(--brand);border-radius:999px;padding:4px 6px 4px 12px;font-size:12.5px;font-weight:600">
        ${esc(finCatFilter)}<button class="icon-btn" id="finClearCat" title="✕" style="width:20px;height:20px;line-height:1;padding:0;font-size:12px">✕</button></span>`
    : "";
  const head = `<div class="toolbar" style="margin-bottom:10px"><div class="toolbar__left" style="gap:8px;align-items:center;flex-wrap:wrap">
    <span class="muted">${esc(t("fin.summaryFor"))}</span> ${monthSel} ${catChip}
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

/* ---------------- printable report (full income + expenditure log) ---------------- */
function printReport() {
  const rtl = getLang() === "ar";
  const loc = rtl ? "ar-EG" : "en-GB";
  const all = records().slice().sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  const by = totals();           // per-currency across ALL records
  const u = usdTotals();
  const ccyRows = Object.keys(by).map(c => {
    const net = by[c].income - by[c].expense;
    return `<tr><td>${esc(c)}</td><td class="num">${esc(money(by[c].income, c))}</td><td class="num">${esc(money(by[c].expense, c))}</td><td class="num">${esc(money(net, c))}</td></tr>`;
  }).join("");
  const rows = all.map(r => {
    const usd = (r.currency !== "USD" && usdRate(r)) ? money(usdOf(r), "USD") : (r.currency === "USD" ? money(r.amount, "USD") : "—");
    const kind = (r.kind || "expense") === "income" ? t("fin.tab.income") : t("fin.tab.expense");
    return `<tr>
      <td>${esc(r.date || "")}</td><td>${esc(kind)}</td><td>${esc(r.name || "")}</td>
      <td>${esc(r.category || "")}</td><td>${esc(r.paidTo || "")}</td>
      <td class="num">${esc(money(r.amount, r.currency))}</td><td class="num">${esc(usd)}</td>
      <td>${esc(r.description || "")}</td></tr>`;
  }).join("");
  const usdLine = u.any
    ? `<p class="muted">${esc(t("fin.sum.usdAll"))}: <b>${esc(money(u.income - u.expense, "USD"))}</b> &nbsp; (▲ ${esc(money(u.income, "USD"))} / ▼ ${esc(money(u.expense, "USD"))})</p>`
    : "";
  const align = rtl ? "right" : "left", numAlign = rtl ? "left" : "right";
  const html = `<!DOCTYPE html><html lang="${rtl ? "ar" : "en"}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8">
    <title>${esc(t("fin.report.title"))}</title>
    <style>
      body{font-family:system-ui,-apple-system,Arial,sans-serif;color:#111;padding:24px;line-height:1.5}
      h1{font-size:20px;margin:0 0 2px} h2{font-size:14px;margin:20px 0 8px}
      .muted{color:#555;font-size:12px;margin:2px 0}
      table{width:100%;border-collapse:collapse;font-size:12px;margin:6px 0 14px}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:${align};vertical-align:top}
      th{background:#1a5cff;color:#fff;white-space:nowrap}
      .num{text-align:${numAlign};font-variant-numeric:tabular-nums;white-space:nowrap}
      @media print{@page{margin:14mm}}
    </style></head><body>
    <h1>${esc(t("fin.report.title"))}</h1>
    <p class="muted">${esc(t("fin.report.generated"))}: ${esc(new Date().toLocaleString(loc))} · ${all.length} ${esc(t("fin.report.entries"))}</p>
    <h2>${esc(t("fin.report.summary"))}</h2>
    <table><thead><tr><th>${esc(t("fin.f.currency"))}</th><th>${esc(t("fin.sum.income"))}</th><th>${esc(t("fin.sum.expense"))}</th><th>${esc(t("fin.sum.net"))}</th></tr></thead>
      <tbody>${ccyRows || `<tr><td colspan="4" class="muted">—</td></tr>`}</tbody></table>
    ${usdLine}
    <h2>${esc(t("fin.report.all"))}</h2>
    <table><thead><tr>
      <th>${esc(t("fin.th.date"))}</th><th>${esc(t("fin.report.type"))}</th><th>${esc(t("fin.th.name"))}</th>
      <th>${esc(t("fin.th.category"))}</th><th>${esc(t("fin.th.paidTo"))}</th><th>${esc(t("fin.th.amount"))}</th>
      <th>${esc(t("fin.f.usd"))}</th><th>${esc(t("fin.th.desc"))}</th>
    </tr></thead><tbody>${rows || `<tr><td colspan="8" class="muted">—</td></tr>`}</tbody></table>
  </body></html>`;
  const w = window.open("", "_blank");
  if (!w) { OS().toast(t("fin.report.popup")); return; }
  w.document.open(); w.document.write(html); w.document.close(); w.focus();
  setTimeout(() => { try { w.print(); } catch (_) {} }, 350);
}

function table() {
  let list = records().filter(r => (r.kind || "expense") === finTab);
  if (finCatFilter) list = list.filter(r => (r.category || "") === finCatFilter);
  // newest date on top, oldest at the bottom (stable: ties keep insertion order)
  list = list.slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const showPaid = finTab === "expense";
  if (!list.length) {
    return `<div class="card"><div class="empty">
      <div class="empty__icon">${finTab === "income" ? "📈" : "🧾"}</div>
      <h3>${esc(t("fin.empty." + finTab))}</h3></div></div>`;
  }
  const D = can("del");
  const rows = list.map(r => {
    const att = r.attachment
      ? `<button class="btn btn--ghost btn--sm" data-fview="${r.id}">📎 ${esc(r.attachmentName || t("fin.attach.view"))}</button>`
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

/* ---- settings: manage the editable dropdowns (categories + recipients) ---- */
function optBlock(field, labelKey, addId, inpId) {
  const rows = optsRaw().filter(o => o.field === field);
  const chips = rows.length
    ? rows.map(o => `<span class="flex" style="gap:6px;align-items:center;background:var(--brand-soft);color:var(--brand);border-radius:999px;padding:4px 6px 4px 12px;font-size:12.5px">
        ${esc(o.value)}<button class="icon-btn" data-rmopt="${o.id}" title="✕" style="width:20px;height:20px;line-height:1;padding:0;font-size:12px">✕</button></span>`).join("")
    : `<span class="muted">—</span>`;
  return `<div style="margin-bottom:16px">
    <div class="muted" style="margin-bottom:8px;font-weight:600">${esc(t(labelKey))}</div>
    <div class="flex" style="gap:8px;flex-wrap:wrap;margin-bottom:10px">${chips}</div>
    <div class="flex" style="gap:8px">
      <input class="input" id="${inpId}" placeholder="${esc(t("fin.opt.ph"))}" style="max-width:260px" />
      <button class="btn btn--sm" id="${addId}">＋ ${esc(t("fin.opt.add"))}</button>
    </div>
  </div>`;
}
function settingsCard() {
  if (!can("write")) return "";
  const head = `<div style="margin-top:18px"><button class="btn btn--ghost btn--sm" id="finSettingsBtn">⚙️ ${esc(t("fin.settings"))} ${finSettings ? "▲" : "▼"}</button></div>`;
  if (!finSettings) return head;
  return head + `<div class="card" style="margin-top:10px">
    ${optBlock(FIN_CAT, "fin.settings.cats", "finAddCat", "finNewCat")}
    ${optBlock(FIN_RCP, "fin.settings.rcps", "finAddRcp", "finNewRcp")}
  </div>`;
}

/* ---------------- budgets ---------------- */
const budgets = () => (OS().db && OS().db.budgets) || [];
const IMPORTANCE = ["high", "medium", "low"];
const impColor = { high: "var(--st-overdue,#ef4444)", medium: "#d97706", low: "var(--st-complete)" };
const canApprove = () => can("del"); // managers/admins approve/deny
function budCosts(b) {
  const c = b && b.costs;
  if (Array.isArray(c)) return c;
  if (typeof c === "string" && c) { try { const p = JSON.parse(c); return Array.isArray(p) ? p : []; } catch (_) { return []; } }
  return [];
}
const costUsd = (c) => { const r = num(c.rate); return r ? num(c.estimatedCost) / r : 0; };
const budEstUsd = (b) => budCosts(b).reduce((s, c) => s + costUsd(c), 0);

function budgetsView() {
  if (budgetOpen) {
    const b = budgets().find(x => x.id === budgetOpen);
    if (b) return budgetDetail(b);
    budgetOpen = null;
  }
  return budgetList();
}

function budgetList() {
  const W = can("write");
  const list = budgets();
  const createBtn = W ? `<div class="toolbar"><div class="toolbar__right"><button class="btn btn--primary" id="budCreate">＋ ${esc(t("fin.bud.create"))}</button></div></div>` : "";
  if (!list.length) return `${createBtn}<div class="card"><div class="empty"><div class="empty__icon">📋</div><p class="muted">${esc(t("fin.bud.empty"))}</p></div></div>`;
  const rows = list.map(b => {
    const st = b.status || "pending";
    const stColor = st === "approved" ? "var(--st-complete)" : st === "denied" ? "var(--st-overdue,#ef4444)" : "var(--muted)";
    const estUsd = budEstUsd(b);
    const approveBtn = (canApprove() && st !== "approved") ? `<button class="btn btn--sm bud-approve" data-bid="${b.id}" style="background:var(--st-complete);color:#fff;border-color:var(--st-complete)">✓ ${esc(t("fin.bud.approve"))}</button>` : "";
    const denyBtn = (canApprove() && st !== "denied") ? `<button class="btn btn--sm bud-deny" data-bid="${b.id}" style="background:var(--st-overdue,#ef4444);color:#fff;border-color:var(--st-overdue,#ef4444)">✕ ${esc(t("fin.bud.deny"))}</button>` : "";
    return `<div class="card" style="margin-bottom:10px">
      <div class="flex between" style="align-items:flex-start;gap:10px;flex-wrap:wrap">
        <div style="flex:1;min-width:180px">
          <div style="font-weight:700;font-size:15px">${esc(b.name || "—")} <span class="badge" style="background:color-mix(in srgb,${stColor} 16%,transparent);color:${stColor};font-size:11px">${esc(t("fin.bud.status." + st))}</span></div>
          <div class="muted" style="font-size:12.5px;margin-top:2px">${b.planner ? "👤 " + esc(b.planner) : ""}</div>
          <div class="muted" style="font-size:12.5px;margin-top:4px">${esc(t("fin.bud.assigned"))}: ${b.assigned ? money(b.assigned, b.currency) : "—"} · ${esc(t("fin.bud.actual"))}: ${b.actual ? money(b.actual, b.currency) : "—"}${estUsd ? ` · ${esc(t("fin.bud.estimated"))}: ${money(estUsd, "USD")}` : ""}</div>
          ${st === "denied" && b.denialNote ? `<div style="margin-top:6px;color:var(--st-overdue,#ef4444);font-size:12.5px">⚠ ${esc(t("fin.bud.changes"))}: ${esc(b.denialNote)}</div>` : ""}
        </div>
        <div class="flex" style="gap:6px;flex-wrap:wrap">
          ${approveBtn}${denyBtn}
          <button class="btn btn--sm bud-open" data-bid="${b.id}">${esc(t("fin.bud.open"))} →</button>
          ${can("del") ? `<button class="btn btn--ghost btn--sm btn--danger bud-del" data-bid="${b.id}">🗑</button>` : ""}
        </div>
      </div>
    </div>`;
  }).join("");
  return `${createBtn}${rows}`;
}

function budgetDetail(b) {
  const W = can("write");
  const st = b.status || "pending";
  const costs = budCosts(b);
  const estUsd = budEstUsd(b);
  const byCcy = {}; costs.forEach(c => { const cc = c.currency || b.currency || "LYD"; byCcy[cc] = (byCcy[cc] || 0) + num(c.estimatedCost); });
  const estLines = Object.keys(byCcy).map(cc => money(byCcy[cc], cc)).join(" · ");
  const assigned = num(b.assigned), actual = num(b.actual), remaining = assigned - actual;
  const remColor = remaining >= 0 ? "var(--st-complete)" : "var(--st-overdue,#ef4444)";
  const stColor = st === "approved" ? "var(--st-complete)" : st === "denied" ? "var(--st-overdue,#ef4444)" : "var(--muted)";
  const header = `<div class="flex between" style="align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
    <button class="btn btn--ghost btn--sm" id="budBack">← ${esc(t("fin.bud.back"))}</button>
    <div class="flex" style="gap:6px">
      ${(canApprove() && st !== "approved") ? `<button class="btn btn--sm bud-approve" data-bid="${b.id}" style="background:var(--st-complete);color:#fff;border-color:var(--st-complete)">✓ ${esc(t("fin.bud.approve"))}</button>` : ""}
      ${(canApprove() && st !== "denied") ? `<button class="btn btn--sm bud-deny" data-bid="${b.id}" style="background:var(--st-overdue,#ef4444);color:#fff;border-color:var(--st-overdue,#ef4444)">✕ ${esc(t("fin.bud.deny"))}</button>` : ""}
      ${W ? `<button class="btn btn--ghost btn--sm" id="budEdit">✎</button>` : ""}
    </div>
  </div>`;
  const denialField = canApprove()
    ? `<div class="field" style="margin-top:10px"><label>⚠ ${esc(t("fin.bud.changes"))}</label><textarea id="budDenial" placeholder="${esc(t("fin.bud.changesPh"))}">${esc(b.denialNote || "")}</textarea></div>`
    : (b.denialNote ? `<div style="margin-top:8px;color:var(--st-overdue,#ef4444)">⚠ ${esc(t("fin.bud.changes"))}: ${esc(b.denialNote)}</div>` : "");
  const titleCard = `<div class="card" style="margin-bottom:14px">
    <div style="font-weight:800;font-size:18px">${esc(b.name || "—")} <span class="badge" style="background:color-mix(in srgb,${stColor} 16%,transparent);color:${stColor};font-size:11px">${esc(t("fin.bud.status." + st))}</span></div>
    <div class="muted" style="margin-top:2px">${b.planner ? "👤 " + esc(b.planner) : ""}</div>
    ${denialField}
  </div>`;
  const statCards = `<div class="grid cards-3" style="margin-bottom:14px">
    <div class="card stat"><span class="stat__value">${money(assigned, b.currency)}</span><span class="stat__label">${esc(t("fin.bud.assigned"))}</span></div>
    <div class="card stat"><span class="stat__value">${money(actual, b.currency)}</span><span class="stat__label">${esc(t("fin.bud.actual"))}</span></div>
    <div class="card stat"><span class="stat__value" style="color:${remColor}">${money(remaining, b.currency)}</span><span class="stat__label">${esc(t("fin.bud.remaining"))}</span></div>
  </div>`;
  const addCostBtn = W ? `<button class="btn btn--primary btn--sm" id="costAdd">＋ ${esc(t("fin.bud.addCost"))}</button>` : "";
  const estLine = `<span class="card__title">${esc(t("fin.bud.estimated"))}: ${estLines || "0"}${estUsd ? ` <span class="muted" style="font-size:12px">(≈ ${money(estUsd, "USD")})</span>` : ""}</span>`;
  let costRows;
  if (!costs.length) {
    costRows = `<div class="empty"><p class="muted">${esc(t("fin.bud.costsEmpty"))}</p></div>`;
  } else {
    costRows = `<div class="table-wrap"><table>
      <thead><tr><th>${esc(t("fin.cost.name"))}</th><th>${esc(t("fin.cost.provider"))}</th><th>${esc(t("fin.cost.duration"))}</th><th>${esc(t("fin.cost.importance"))}</th><th>${esc(t("fin.cost.est"))}</th><th>📎</th><th></th></tr></thead>
      <tbody>${costs.map((c, i) => {
        const imp = c.importance || "medium";
        const att = c.attachment ? `<a href="${esc(c.attachment)}" target="_blank" rel="noopener">📎</a>` : "—";
        const usd = (c.currency !== "USD" && num(c.rate)) ? `<div class="muted" style="font-size:11px">≈ ${money(costUsd(c), "USD")}</div>` : "";
        return `<tr>
          <td><div class="cell-title">${esc(c.name || "—")}</div>${c.description ? `<div class="muted" style="font-size:11.5px;max-width:260px">${esc(c.description)}</div>` : ""}</td>
          <td>${esc(c.provider || "—")}</td><td>${esc(c.duration || "—")}</td>
          <td><span class="badge" style="background:color-mix(in srgb,${impColor[imp]} 16%,transparent);color:${impColor[imp]}">${esc(t("imp." + imp))}</span></td>
          <td style="white-space:nowrap"><b>${money(c.estimatedCost, c.currency)}</b>${usd}</td>
          <td>${att}</td>
          <td><div class="flex" style="gap:4px">${W ? `<button class="btn btn--ghost btn--sm cost-edit" data-i="${i}">✎</button>` : ""}${W ? `<button class="btn btn--ghost btn--sm btn--danger cost-del" data-i="${i}">🗑</button>` : ""}</div></td>
        </tr>`;
      }).join("")}</tbody></table></div>`;
  }
  const costsCard = `<div class="card"><div class="card__head">${estLine}${addCostBtn}</div>${costRows}</div>`;
  return `<div>${header}${titleCard}${statCards}${costsCard}</div>`;
}

function budgetModal(b) {
  const x = b || {}; const editing = !!b;
  let team = OS().team; team = typeof team === "function" ? (team() || []) : (Array.isArray(team) ? team : []);
  OS().openModal(`
    <div class="modal__head"><h3>📋 ${esc(t(editing ? "fin.bud.edit" : "fin.bud.create"))}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body">
      <div class="field"><label>${esc(t("fin.bud.name"))}</label><input id="bud_name" value="${esc(x.name || "")}" /></div>
      <div class="field"><label>${esc(t("fin.bud.planner"))}</label>
        <input id="bud_planner" list="bud_team" autocomplete="off" value="${esc(x.planner || "")}" />
        <datalist id="bud_team">${team.map(n => `<option value="${esc(n)}"></option>`).join("")}</datalist></div>
      <div class="field-row">
        <div class="field"><label>${esc(t("fin.bud.assigned"))}</label><input type="number" step="any" id="bud_assigned" value="${esc(x.assigned || "")}" /></div>
        <div class="field"><label>${esc(t("fin.f.currency"))}</label><select id="bud_ccy">${CURRENCIES.map(c => `<option ${(x.currency || "LYD") === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      </div>
      <div class="field"><label>${esc(t("fin.bud.actual"))}</label><input type="number" step="any" id="bud_actual" value="${esc(x.actual || "")}" /></div>
    </div>
    <div class="modal__foot"><button class="btn" data-close>${esc(t("btn.cancel") || "Cancel")}</button><button class="btn btn--primary" data-save>${esc(t("btn.save") || "Save")}</button></div>`);
  ($("[data-save]") || {}).onclick = () => {
    const data = { name: $("#bud_name").value.trim(), planner: $("#bud_planner").value.trim(), assigned: $("#bud_assigned").value, currency: $("#bud_ccy").value, actual: $("#bud_actual").value };
    if (!data.name) { $("#bud_name").focus(); return; }
    if (editing) OS().db.updateBudget(b.id, data);
    else OS().db.addBudget({ ...data, status: "pending", denialNote: "", costs: [] });
    OS().closeModal(); (OS().render || (() => {}))(); OS().toast(t("fin.saved"));
  };
  $$("[data-close]").forEach(bt => bt.onclick = OS().closeModal);
}

function costModal(bid, idx) {
  const b = budgets().find(x => x.id === bid); if (!b) return;
  const list = budCosts(b);
  const c = (idx != null && list[idx]) ? list[idx] : {};
  let att = c.attachment ? { data: c.attachment, name: c.attachmentName || "file" } : null;
  OS().openModal(`
    <div class="modal__head"><h3>💵 ${esc(t(idx != null ? "fin.bud.editCost" : "fin.bud.addCost"))}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body">
      <div class="field"><label>${esc(t("fin.cost.name"))}</label><input id="c_name" value="${esc(c.name || "")}" /></div>
      <div class="field"><label>${esc(t("fin.cost.desc"))}</label><textarea id="c_desc">${esc(c.description || "")}</textarea></div>
      <div class="field-row">
        <div class="field"><label>${esc(t("fin.cost.est"))}</label><input type="number" step="any" id="c_est" value="${esc(c.estimatedCost || "")}" /></div>
        <div class="field"><label>${esc(t("fin.f.currency"))}</label><select id="c_ccy">${CURRENCIES.map(cc => `<option ${(c.currency || b.currency || "LYD") === cc ? "selected" : ""}>${cc}</option>`).join("")}</select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>${esc(t("fin.f.rate"))}</label><input type="number" step="any" id="c_rate" value="${esc(c.rate || ((c.currency || b.currency || "LYD") === "USD" ? "1" : ""))}" placeholder="1 USD = ?" /></div>
        <div class="field"><label>${esc(t("fin.f.usd"))}</label><input id="c_usd" disabled /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>${esc(t("fin.cost.duration"))}</label><input id="c_dur" value="${esc(c.duration || "")}" /></div>
        <div class="field"><label>${esc(t("fin.cost.provider"))}</label><input id="c_prov" value="${esc(c.provider || "")}" /></div>
      </div>
      <div class="field"><label>${esc(t("fin.cost.importance"))}</label><select id="c_imp">${IMPORTANCE.map(i => `<option value="${i}" ${(c.importance || "medium") === i ? "selected" : ""}>${esc(t("imp." + i))}</option>`).join("")}</select></div>
      <div class="field"><label>${esc(t("fin.cost.attach"))}</label><input type="file" id="c_file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" /><div id="c_att" class="muted" style="font-size:12px;margin-top:6px"></div></div>
    </div>
    <div class="modal__foot"><button class="btn" data-close>${esc(t("btn.cancel") || "Cancel")}</button><button class="btn btn--primary" data-save>${esc(t("btn.save") || "Save")}</button></div>`);
  const recalc = () => { const r = num($("#c_rate") && $("#c_rate").value); const usd = r ? num($("#c_est").value) / r : 0; const box = $("#c_usd"); if (box) box.value = usd ? money(usd, "USD") : "—"; };
  ["#c_est", "#c_rate"].forEach(s => { const el = $(s); if (el) el.oninput = recalc; });
  const ccy = $("#c_ccy"); if (ccy) ccy.onchange = () => { const r = $("#c_rate"); if (ccy.value === "USD" && r && !num(r.value)) r.value = "1"; recalc(); };
  recalc();
  const showAtt = () => { const bx = $("#c_att"); if (bx) bx.textContent = att && att.name ? "📎 " + att.name : ""; };
  showAtt();
  const file = $("#c_file");
  if (file) file.onchange = () => {
    const f = file.files && file.files[0]; if (!f) return;
    if (!ALLOWED.test(f.name)) { OS().toast(t("fin.attach.bad_type")); file.value = ""; return; }
    if (f.size > MAX_ATT) { OS().toast(t("fin.attach.too_big")); file.value = ""; return; }
    const r = new FileReader(); r.onload = () => { att = { data: String(r.result || ""), name: f.name }; showAtt(); }; r.readAsDataURL(f);
  };
  ($("[data-save]") || {}).onclick = () => {
    const item = {
      name: $("#c_name").value.trim(), description: $("#c_desc").value.trim(),
      estimatedCost: $("#c_est").value, currency: $("#c_ccy").value, rate: $("#c_rate").value,
      duration: $("#c_dur").value.trim(), provider: $("#c_prov").value.trim(), importance: $("#c_imp").value,
      attachment: att ? att.data : "", attachmentName: att ? att.name : "",
    };
    if (!item.name) { $("#c_name").focus(); return; }
    const next = budCosts(b).slice();
    if (idx != null) next[idx] = item; else next.push(item);
    OS().db.updateBudget(b.id, { costs: next });
    OS().closeModal(); (OS().render || (() => {}))(); OS().toast(t("fin.saved"));
  };
  $$("[data-close]").forEach(bt => bt.onclick = OS().closeModal);
}

function view() {
  const W = can("write");
  const tabs = `<div class="seg" id="finTabs">
    <button data-fintab="expense" class="${finTab === "expense" ? "active" : ""}">🧾 ${esc(t("fin.tab.expense"))}</button>
    <button data-fintab="income" class="${finTab === "income" ? "active" : ""}">📈 ${esc(t("fin.tab.income"))}</button>
    <button data-fintab="budgets" class="${finTab === "budgets" ? "active" : ""}">📋 ${esc(t("fin.tab.budgets"))}</button>
  </div>`;
  if (finTab === "budgets") {
    return `<div><div class="toolbar"><div class="toolbar__left">${tabs}</div></div>${budgetsView()}</div>`;
  }
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
  const printBtn = records().length ? `<button class="btn btn--ghost" id="finPrint">🖨 ${esc(t("fin.print"))}</button>` : "";
  const toolbar = `<div class="toolbar"><div class="toolbar__left">${tabs}</div><div class="toolbar__right" style="gap:8px">${catFilter}${printBtn}${addBtn}</div></div>`;
  return `<div>${chartCard()}${summaryCards()}${toolbar}${table()}${settingsCard()}</div>`;
}

/* ---------------- attachment preview ---------------- */
const isImgAtt = (src, name) => /^data:image\//i.test(src || "") || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(name || "") || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(src || "");
const isPdfAtt = (src, name) => /^data:application\/pdf/i.test(src || "") || /\.pdf(\?|$)/i.test(name || "") || /\.pdf(\?|$)/i.test(src || "");
function previewModal(id) {
  const r = records().find(x => x.id === id);
  if (!r || !r.attachment) return;
  const src = r.attachment, name = r.attachmentName || "receipt";
  let body;
  if (isImgAtt(src, name)) {
    body = `<img src="${esc(src)}" alt="${esc(name)}" style="max-width:100%;max-height:72vh;display:block;margin:0 auto;border-radius:8px" />`;
  } else if (isPdfAtt(src, name)) {
    body = `<iframe src="${esc(src)}" title="${esc(name)}" style="width:100%;height:72vh;border:1px solid var(--border);border-radius:8px"></iframe>`;
  } else {
    body = `<p class="muted">${esc(t("fin.preview.none"))}</p>`;
  }
  OS().openModal(`
    <div class="modal__head"><h3>📎 ${esc(name)}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body" style="min-width:min(78vw,720px)">${body}</div>
    <div class="modal__foot">
      <a class="btn" href="${esc(src)}" target="_blank" rel="noopener">↗ ${esc(t("fin.preview.newtab"))}</a>
      <a class="btn" href="${esc(src)}" download="${esc(name)}">⬇ ${esc(t("fin.preview.download"))}</a>
      <button class="btn btn--primary" data-close>${esc(t("btn.close") || "Close")}</button>
    </div>`);
  $$("[data-close]").forEach(b => b.onclick = OS().closeModal);
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
        <div class="field"><label>${esc(t("fin.f.rate"))}</label><input type="number" step="any" min="0" id="fin_rate" value="${esc(x.rate || ((x.currency || "LYD") === "USD" ? "1" : ""))}" placeholder="1 USD = ?" /></div>
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
           <a href="${esc(att.data)}" target="_blank" rel="noopener">📎 ${esc(att.name)}</a>
           <button type="button" class="btn btn--ghost btn--sm btn--danger" id="fin_att_rm">${esc(t("fin.attach.remove"))}</button>
         </span>`
      : "";
    const rm = $("#fin_att_rm");
    if (rm) rm.onclick = () => { att = null; const f = $("#fin_file"); if (f) f.value = ""; renderAtt(); };
  };
  renderAtt();

  // live USD value = amount ÷ exchange rate (1 USD = ? units)
  const recalcUsd = () => {
    const rate = num($("#fin_rate") && $("#fin_rate").value);
    const usd = rate ? num($("#fin_amount") && $("#fin_amount").value) / rate : 0;
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
  const pb = $("#finPrint"); if (pb) pb.onclick = printReport;
  const ccl = $("#finClearCat"); if (ccl) ccl.onclick = () => { finCatFilter = ""; reRender(); };

  // ---- budgets ----
  const bc = $("#budCreate"); if (bc) bc.onclick = () => budgetModal(null);
  const bb = $("#budBack"); if (bb) bb.onclick = () => { budgetOpen = null; reRender(); };
  const be = $("#budEdit"); if (be) be.onclick = () => budgetModal(budgets().find(x => x.id === budgetOpen));
  $$(".bud-open").forEach(b => b.onclick = () => { budgetOpen = b.dataset.bid; reRender(); });
  $$(".bud-approve").forEach(b => b.onclick = () => { OS().db.updateBudget(b.dataset.bid, { status: "approved", denialNote: "" }); reRender(); OS().toast(t("fin.saved")); });
  $$(".bud-deny").forEach(b => b.onclick = () => { OS().db.updateBudget(b.dataset.bid, { status: "denied" }); budgetOpen = b.dataset.bid; reRender(); });
  $$(".bud-del").forEach(b => b.onclick = () => { if (!confirm(t("fin.bud.confirmDel"))) return; OS().db.removeBudget(b.dataset.bid); if (budgetOpen === b.dataset.bid) budgetOpen = null; reRender(); OS().toast(t("fin.deleted")); });
  const bd = $("#budDenial"); if (bd) bd.onchange = () => { if (budgetOpen) OS().db.updateBudget(budgetOpen, { denialNote: bd.value }); };
  const ca = $("#costAdd"); if (ca) ca.onclick = () => costModal(budgetOpen, null);
  $$(".cost-edit").forEach(b => b.onclick = () => costModal(budgetOpen, parseInt(b.dataset.i, 10)));
  $$(".cost-del").forEach(b => b.onclick = () => {
    if (!confirm(t("fin.cost.confirmDel"))) return;
    const bg = budgets().find(x => x.id === budgetOpen); if (!bg) return;
    const next = budCosts(bg).slice(); next.splice(parseInt(b.dataset.i, 10), 1);
    OS().db.updateBudget(budgetOpen, { costs: next }); reRender(); OS().toast(t("fin.deleted"));
  });

  // settings: manage the editable dropdowns
  const sb = $("#finSettingsBtn"); if (sb) sb.onclick = () => { finSettings = !finSettings; reRender(); };
  const addFromInput = (inpId, field) => {
    const inp = $(inpId); if (!inp) return;
    const v = inp.value.trim(); if (!v) { inp.focus(); return; }
    addOpt(field, v); reRender();
  };
  const ac = $("#finAddCat"); if (ac) ac.onclick = () => addFromInput("#finNewCat", FIN_CAT);
  const ar = $("#finAddRcp"); if (ar) ar.onclick = () => addFromInput("#finNewRcp", FIN_RCP);
  const nc = $("#finNewCat"); if (nc) nc.onkeydown = (e) => { if (e.key === "Enter") addFromInput("#finNewCat", FIN_CAT); };
  const nr = $("#finNewRcp"); if (nr) nr.onkeydown = (e) => { if (e.key === "Enter") addFromInput("#finNewRcp", FIN_RCP); };
  $$("[data-rmopt]").forEach(b => b.onclick = () => {
    if (OS().db && OS().db.removeContentOpt) OS().db.removeContentOpt(b.dataset.rmopt);
    reRender();
  });
  const add = $("#finAdd");
  if (add) add.onclick = () => financeModal(null);
  $$("[data-fview]").forEach(b => b.onclick = () => previewModal(b.dataset.fview));
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
