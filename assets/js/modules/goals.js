/* ============================================================
   Ajrly OS — Goals dashboard
   Business planning & goal-setting, grounded in the Ajrly marketing
   plan (Supply-First, city-by-city, North-Star = serious inquiries).
   Three tabs:
     • Goals & OKRs  — goal cards with circular progress rings
     • City Focus    — Supply-First targets per city (owners + properties)
     • Property Mix  — pie chart of the property-database composition
   Dependency-free, RTL/theme-aware. Reads/writes window.AjrlyOS.db.
   All three collections sync to Cloudflare (D1 + KV).
   ============================================================ */
import { registerModule } from "../registry.js";
import { registerStrings, t, getLang } from "../i18n.js";

/* ---------------- i18n ---------------- */
registerStrings({
  ar: {
    "nav.goals": "الأهداف",
    "page.goals": "الأهداف والخطط",
    "page.goals.sub": "خطط العمل، أهداف النمو، مدن التركيز، وتركيبة قاعدة العقارات",
    "goals.tab.okr": "الأهداف",
    "goals.tab.cities": "مدن التركيز",
    "goals.tab.mix": "تركيبة العقارات",
    // strategy banner (from the marketing plan)
    "goals.northStar": "المؤشر الأهم (North Star)",
    "goals.northStar.val": "الاستفسارات الجادة بين المؤجر والمستأجر داخل التطبيق",
    "goals.strat.supply": "العرض أولاً — ابدأ بالمؤجرين والمكاتب والعقارات قبل الطلب",
    "goals.strat.city": "مدينة محددة أولاً ثم التوسّع تدريجياً",
    // OKRs
    "goals.create": "إنشاء هدف جديد",
    "goals.edit": "تعديل الهدف",
    "goals.empty": "لا توجد أهداف بعد — أنشئ أول هدف",
    "goals.kr": "نتيجة رئيسية", "goals.krs": "نتائج رئيسية",
    "goals.viewEdit": "عرض / تعديل",
    "goals.f.title": "عنوان الهدف", "goals.f.desc": "الوصف",
    "goals.f.category": "التصنيف", "goals.f.owner": "المسؤول",
    "goals.f.type": "نوع الهدف",
    "goals.type.quant": "كمي (نتائج رئيسية)", "goals.type.qual": "نوعي (تقدّم يدوي)",
    "goals.f.status": "الحالة",
    "goals.status.active": "نشط", "goals.status.paused": "متوقف", "goals.status.done": "مكتمل",
    "goals.f.progress": "نسبة الإنجاز (%)",
    "goals.kr.name": "النتيجة الرئيسية", "goals.kr.current": "الحالي", "goals.kr.target": "المستهدف", "goals.kr.unit": "الوحدة",
    "goals.kr.add": "＋ إضافة نتيجة رئيسية", "goals.kr.none": "أضف نتيجة رئيسية واحدة على الأقل",
    "goals.confirmDel": "حذف هذا الهدف؟",
    // cities
    "goals.city.add": "إضافة مدينة", "goals.city.edit": "تعديل المدينة",
    "goals.city.empty": "لم تُحدَّد مدن تركيز بعد",
    "goals.city.name": "المدينة", "goals.city.priority": "الأولوية",
    "goals.pri.primary": "أساسية", "goals.pri.secondary": "ثانوية", "goals.pri.expansion": "توسّع",
    "goals.city.tOwners": "المؤجرون المستهدفون", "goals.city.tProps": "العقارات المستهدفة",
    "goals.city.cOwners": "المؤجرون الحاليون", "goals.city.cProps": "العقارات الحالية",
    "goals.city.notes": "ملاحظات",
    "goals.city.owners": "المؤجرون", "goals.city.props": "العقارات",
    "goals.city.confirmDel": "حذف هذه المدينة؟",
    "goals.city.totOwners": "إجمالي المؤجرين", "goals.city.totProps": "إجمالي العقارات",
    // property mix
    "goals.mix.title": "تركيبة قاعدة العقارات",
    "goals.mix.empty": "لم تُضَف أنواع عقارات بعد",
    "goals.mix.setup": "إنشاء الأنواع الافتراضية", "goals.mix.add": "إضافة نوع",
    "goals.mix.edit": "تعديل النوع",
    "goals.mix.type": "نوع العقار", "goals.mix.count": "العدد", "goals.mix.color": "اللون",
    "goals.mix.total": "إجمالي العقارات", "goals.mix.share": "النسبة",
    "goals.mix.confirmDel": "حذف هذا النوع؟",
    "ptype.apartment": "شقق", "ptype.room": "غرف", "ptype.house": "بيوت", "ptype.shop": "محلات", "ptype.office": "مكاتب",
    "goals.saved": "تم الحفظ", "goals.deleted": "تم الحذف",
    "btn.cancel": "إلغاء", "btn.save": "حفظ", "btn.close": "إغلاق",
  },
  en: {
    "nav.goals": "Goals",
    "page.goals": "Goals & Plans",
    "page.goals.sub": "Business plans, growth goals, focus cities, and property-database mix",
    "goals.tab.okr": "Goals",
    "goals.tab.cities": "Focus cities",
    "goals.tab.mix": "Property mix",
    "goals.northStar": "North-Star metric",
    "goals.northStar.val": "Serious inquiries between owner and renter inside the app",
    "goals.strat.supply": "Supply-First — build owners, offices & listings before demand",
    "goals.strat.city": "Start with one focus city, then expand",
    "goals.create": "Create a new Goal",
    "goals.edit": "Edit goal",
    "goals.empty": "No goals yet — create your first goal",
    "goals.kr": "Key Result", "goals.krs": "Key Results",
    "goals.viewEdit": "View / Edit",
    "goals.f.title": "Goal title", "goals.f.desc": "Description",
    "goals.f.category": "Category", "goals.f.owner": "Owner",
    "goals.f.type": "Goal type",
    "goals.type.quant": "Quantitative (key results)", "goals.type.qual": "Qualitative (manual %)",
    "goals.f.status": "Status",
    "goals.status.active": "Active", "goals.status.paused": "Paused", "goals.status.done": "Done",
    "goals.f.progress": "Progress (%)",
    "goals.kr.name": "Key result", "goals.kr.current": "Current", "goals.kr.target": "Target", "goals.kr.unit": "Unit",
    "goals.kr.add": "＋ Add key result", "goals.kr.none": "Add at least one key result",
    "goals.confirmDel": "Delete this goal?",
    "goals.city.add": "Add city", "goals.city.edit": "Edit city",
    "goals.city.empty": "No focus cities set yet",
    "goals.city.name": "City", "goals.city.priority": "Priority",
    "goals.pri.primary": "Primary", "goals.pri.secondary": "Secondary", "goals.pri.expansion": "Expansion",
    "goals.city.tOwners": "Target owners", "goals.city.tProps": "Target properties",
    "goals.city.cOwners": "Current owners", "goals.city.cProps": "Current properties",
    "goals.city.notes": "Notes",
    "goals.city.owners": "Owners", "goals.city.props": "Properties",
    "goals.city.confirmDel": "Delete this city?",
    "goals.city.totOwners": "Total owners", "goals.city.totProps": "Total properties",
    "goals.mix.title": "Property database composition",
    "goals.mix.empty": "No property types added yet",
    "goals.mix.setup": "Set up standard types", "goals.mix.add": "Add type",
    "goals.mix.edit": "Edit type",
    "goals.mix.type": "Property type", "goals.mix.count": "Count", "goals.mix.color": "Colour",
    "goals.mix.total": "Total properties", "goals.mix.share": "Share",
    "goals.mix.confirmDel": "Delete this type?",
    "ptype.apartment": "Apartments", "ptype.room": "Rooms", "ptype.house": "Houses", "ptype.shop": "Shops", "ptype.office": "Offices",
    "goals.saved": "Saved", "goals.deleted": "Deleted",
    "btn.cancel": "Cancel", "btn.save": "Save", "btn.close": "Close",
  },
});

/* ---------------- helpers / state ---------------- */
const OS = () => window.AjrlyOS || {};
const esc = (s) => (OS().esc ? OS().esc(s) : String(s ?? ""));
const can = (a) => (typeof OS().can === "function" ? OS().can(a) : false);
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const clampPct = (n) => Math.max(0, Math.min(100, Math.round(n)));
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const goals = () => (OS().db && OS().db.goals) || [];
const cities = () => (OS().db && OS().db.cityTargets) || [];
const ptypes = () => (OS().db && OS().db.propertyTypes) || [];
const teamList = () => { let team = OS().team; team = typeof team === "function" ? (team() || []) : (Array.isArray(team) ? team : []); return team; };

let goalsTab = "okr"; // okr | cities | mix

const PALETTE = ["#1a5cff", "#16a34a", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#ef4444", "#84cc16", "#f97316", "#6366f1"];
const DEFAULT_TYPES = [
  { type: "apartment", color: "#1a5cff" },
  { type: "room", color: "#16a34a" },
  { type: "house", color: "#f59e0b" },
  { type: "shop", color: "#8b5cf6" },
  { type: "office", color: "#ec4899" },
];
const PTYPE_KEYS = { apartment: "ptype.apartment", room: "ptype.room", house: "ptype.house", shop: "ptype.shop", office: "ptype.office" };
const ptLabel = (ty) => (PTYPE_KEYS[ty] ? t(PTYPE_KEYS[ty]) : ty);

const LIBYAN_CITIES = ["Tripoli", "Benghazi", "Misrata", "Zawiya", "Al Bayda", "Khoms", "Zliten", "Sabha", "Tobruk", "Ajdabiya", "Sirte", "Derna", "Gharyan", "Sabratha", "Bani Walid", "Tarhuna", "Murzuq", "Ghadames"];

/* ---- key results parsing + goal progress ---- */
function goalKRs(g) {
  const k = g && g.keyResults;
  if (Array.isArray(k)) return k;
  if (typeof k === "string" && k) { try { const p = JSON.parse(k); return Array.isArray(p) ? p : []; } catch (_) { return []; } }
  return [];
}
function goalPct(g) {
  if ((g.type || "quantitative") === "qualitative") return clampPct(num(g.progress));
  const krs = goalKRs(g);
  if (!krs.length) return 0;
  const sum = krs.reduce((s, kr) => {
    const tgt = num(kr.target);
    return s + (tgt > 0 ? Math.min(100, (num(kr.current) / tgt) * 100) : 0);
  }, 0);
  return clampPct(sum / krs.length);
}

/* ---------------- SVG: progress ring (OKR cards) ---------------- */
function ring(pct) {
  const r = 34, c = 2 * Math.PI * r, off = c * (1 - clampPct(pct) / 100);
  const color = pct >= 100 ? "var(--st-complete,#16a34a)" : pct === 0 ? "var(--border)" : "var(--st-complete,#16a34a)";
  return `<svg viewBox="0 0 80 80" width="84" height="84" role="img" aria-label="${pct}%">
    <circle cx="40" cy="40" r="${r}" fill="none" stroke="var(--border)" stroke-width="7"/>
    <circle cx="40" cy="40" r="${r}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 40 40)"/>
    <text x="40" y="40" text-anchor="middle" dominant-baseline="central" font-size="16" font-weight="700" fill="var(--text,#0f172a)">${pct}%</text>
  </svg>`;
}

/* ---------------- SVG: pie chart (property mix) ---------------- */
function pieSVG(slices) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const cx = 110, cy = 110, r = 100;
  if (!total) {
    return `<svg viewBox="0 0 220 220" width="220" height="220"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="4 4"/><text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="13" fill="var(--muted,#94a3b8)">0</text></svg>`;
  }
  const live = slices.filter(s => s.value > 0);
  if (live.length === 1) {
    const s = live[0];
    return `<svg viewBox="0 0 220 220" width="220" height="220"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${esc(s.color)}"><title>${esc(s.label)}: 100%</title></circle></svg>`;
  }
  let acc = 0;
  const paths = live.map(s => {
    const a0 = acc / total * 2 * Math.PI; acc += s.value; const a1 = acc / total * 2 * Math.PI;
    const x1 = cx + r * Math.sin(a0), y1 = cy - r * Math.cos(a0);
    const x2 = cx + r * Math.sin(a1), y2 = cy - r * Math.cos(a1);
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    const pct = Math.round(s.value / total * 100);
    return `<path d="M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z" fill="${esc(s.color)}" stroke="var(--surface,#fff)" stroke-width="1.5"><title>${esc(s.label)}: ${pct}%</title></path>`;
  }).join("");
  return `<svg viewBox="0 0 220 220" width="220" height="220" role="img" aria-label="${esc(t("goals.mix.title"))}">${paths}</svg>`;
}

/* small horizontal progress bar */
function bar(cur, tgt, color) {
  const pct = tgt > 0 ? Math.min(100, Math.round(cur / tgt * 100)) : 0;
  return `<div style="height:8px;border-radius:999px;background:var(--border);overflow:hidden;margin-top:4px">
    <div style="height:100%;width:${pct}%;background:${color};border-radius:999px"></div></div>`;
}

/* ============================================================
   TAB 1 — Goals & OKRs
   ============================================================ */
function strategyBanner() {
  return `<div class="card" style="margin-bottom:16px;border-inline-start:3px solid var(--brand)">
    <div class="flex" style="gap:10px;align-items:flex-start;flex-wrap:wrap">
      <div style="flex:1;min-width:220px">
        <div class="muted" style="font-size:12px;font-weight:600">★ ${esc(t("goals.northStar"))}</div>
        <div style="font-weight:700;margin-top:2px">${esc(t("goals.northStar.val"))}</div>
      </div>
      <div style="flex:1;min-width:220px;font-size:12.5px" class="muted">
        <div>▣ ${esc(t("goals.strat.supply"))}</div>
        <div style="margin-top:4px">◎ ${esc(t("goals.strat.city"))}</div>
      </div>
    </div>
  </div>`;
}

function okrView() {
  const W = can("write");
  const createBtn = W ? `<button class="btn btn--primary" id="goalCreate">＋ ${esc(t("goals.create"))}</button>` : "";
  const toolbar = `<div class="toolbar"><div class="toolbar__right">${createBtn}</div></div>`;
  const list = goals();
  if (!list.length) {
    return `${strategyBanner()}${toolbar}<div class="card"><div class="empty"><div class="empty__icon">🎯</div><p class="muted">${esc(t("goals.empty"))}</p></div></div>`;
  }
  const cards = list.map(g => {
    const pct = goalPct(g);
    const krn = goalKRs(g).length;
    const krLabel = (g.type || "quantitative") === "qualitative" ? "" :
      `<div class="muted" style="font-size:12px;margin-top:2px">${krn} ${esc(krn === 1 ? t("goals.kr") : t("goals.krs"))}</div>`;
    return `<div class="card" style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px">
      <div style="margin-top:4px">${ring(pct)}</div>
      <div style="font-weight:700;margin-top:6px">${esc(g.title || "—")}</div>
      ${g.category ? `<div class="muted" style="font-size:11.5px">${esc(g.category)}</div>` : ""}
      ${krLabel}
      <div style="margin-top:8px"><button class="btn btn--ghost btn--sm goal-edit" data-id="${g.id}">✎ ${esc(t("goals.viewEdit"))}</button></div>
    </div>`;
  }).join("");
  return `${strategyBanner()}${toolbar}<div class="grid cards-3">${cards}</div>`;
}

function krRowHTML(i, kr) {
  kr = kr || {};
  return `<div class="g-kr" data-i="${i}" style="display:grid;grid-template-columns:1fr 70px 70px 70px 28px;gap:6px;margin-bottom:6px;align-items:center">
    <input class="input g-kr-name" placeholder="${esc(t("goals.kr.name"))}" value="${esc(kr.name || "")}" />
    <input class="input g-kr-cur" type="number" step="any" placeholder="${esc(t("goals.kr.current"))}" value="${esc(kr.current ?? "")}" />
    <input class="input g-kr-tgt" type="number" step="any" placeholder="${esc(t("goals.kr.target"))}" value="${esc(kr.target ?? "")}" />
    <input class="input g-kr-unit" placeholder="${esc(t("goals.kr.unit"))}" value="${esc(kr.unit || "")}" />
    <button type="button" class="icon-btn g-kr-rm" title="✕" style="width:26px;height:26px;line-height:1;padding:0">✕</button>
  </div>`;
}

function goalModal(g) {
  const x = g || {}; const editing = !!g;
  const type = x.type || "quantitative";
  const krs = goalKRs(x);
  const team = teamList();
  const opt = (v, cur, label) => `<option value="${v}" ${cur === v ? "selected" : ""}>${label}</option>`;
  OS().openModal(`
    <div class="modal__head"><h3>🎯 ${esc(t(editing ? "goals.edit" : "goals.create"))}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body">
      <div class="field"><label>${esc(t("goals.f.title"))}</label><input id="g_title" value="${esc(x.title || "")}" /></div>
      <div class="field"><label>${esc(t("goals.f.desc"))}</label><textarea id="g_desc">${esc(x.description || "")}</textarea></div>
      <div class="field-row">
        <div class="field"><label>${esc(t("goals.f.category"))}</label><input id="g_cat" value="${esc(x.category || "")}" /></div>
        <div class="field"><label>${esc(t("goals.f.owner"))}</label>
          <input id="g_owner" list="g_team" autocomplete="off" value="${esc(x.owner || "")}" />
          <datalist id="g_team">${team.map(n => `<option value="${esc(n)}"></option>`).join("")}</datalist></div>
      </div>
      <div class="field-row">
        <div class="field"><label>${esc(t("goals.f.type"))}</label><select id="g_type">
          ${opt("quantitative", type, esc(t("goals.type.quant")))}${opt("qualitative", type, esc(t("goals.type.qual")))}
        </select></div>
        <div class="field"><label>${esc(t("goals.f.status"))}</label><select id="g_status">
          ${opt("active", x.status || "active", esc(t("goals.status.active")))}${opt("paused", x.status || "active", esc(t("goals.status.paused")))}${opt("done", x.status || "active", esc(t("goals.status.done")))}
        </select></div>
      </div>
      <div id="g_qual" class="field" style="display:${type === "qualitative" ? "block" : "none"}">
        <label>${esc(t("goals.f.progress"))}</label>
        <input id="g_progress" type="number" min="0" max="100" step="1" value="${esc(x.progress ?? "0")}" />
      </div>
      <div id="g_quant" style="display:${type === "qualitative" ? "none" : "block"}">
        <label style="font-weight:600;font-size:13px">${esc(t("goals.krs"))}</label>
        <div id="g_krs" style="margin-top:8px">${(krs.length ? krs : [{}]).map((kr, i) => krRowHTML(i, kr)).join("")}</div>
        <button type="button" class="btn btn--ghost btn--sm" id="g_kr_add">${esc(t("goals.kr.add"))}</button>
      </div>
    </div>
    <div class="modal__foot"><button class="btn" data-close>${esc(t("btn.cancel"))}</button><button class="btn btn--primary" data-save>${esc(t("btn.save"))}</button></div>`);

  const typeSel = $("#g_type");
  const syncType = () => {
    const q = typeSel.value === "qualitative";
    $("#g_qual").style.display = q ? "block" : "none";
    $("#g_quant").style.display = q ? "none" : "block";
  };
  if (typeSel) typeSel.onchange = syncType;
  let kc = (krs.length ? krs.length : 1);
  const bindRm = () => $$(".g-kr-rm").forEach(b => b.onclick = () => {
    if ($$(".g-kr").length <= 1) { const row = b.closest(".g-kr"); row.querySelectorAll("input").forEach(i => i.value = ""); return; }
    b.closest(".g-kr").remove();
  });
  bindRm();
  const addBtn = $("#g_kr_add");
  if (addBtn) addBtn.onclick = () => { $("#g_krs").insertAdjacentHTML("beforeend", krRowHTML(kc++, {})); bindRm(); };

  ($("[data-save]") || {}).onclick = () => {
    const title = $("#g_title").value.trim();
    if (!title) { $("#g_title").focus(); return; }
    const tp = $("#g_type").value;
    const keyResults = tp === "qualitative" ? [] : $$(".g-kr").map(row => ({
      name: row.querySelector(".g-kr-name").value.trim(),
      current: row.querySelector(".g-kr-cur").value,
      target: row.querySelector(".g-kr-tgt").value,
      unit: row.querySelector(".g-kr-unit").value.trim(),
    })).filter(kr => kr.name || kr.target || kr.current);
    const data = {
      title, description: $("#g_desc").value.trim(), category: $("#g_cat").value.trim(),
      owner: $("#g_owner").value.trim(), type: tp, status: $("#g_status").value,
      progress: tp === "qualitative" ? String(clampPct(num($("#g_progress").value))) : (x.progress || "0"),
      keyResults,
    };
    if (editing) OS().db.updateGoal(g.id, data); else OS().db.addGoal(data);
    OS().closeModal(); (OS().render || (() => {}))(); OS().toast(t("goals.saved"));
  };
  $$("[data-close]").forEach(b => b.onclick = OS().closeModal);
}

/* ============================================================
   TAB 2 — City Focus (Supply-First)
   ============================================================ */
const priColor = { primary: "var(--st-complete,#16a34a)", secondary: "var(--brand)", expansion: "#d97706" };
const PRIORITIES = ["primary", "secondary", "expansion"];

function citiesView() {
  const W = can("write");
  const list = cities();
  const addBtn = W ? `<button class="btn btn--primary" id="cityAdd">＋ ${esc(t("goals.city.add"))}</button>` : "";
  const toolbar = `<div class="toolbar"><div class="toolbar__right">${addBtn}</div></div>`;
  if (!list.length) {
    return `${toolbar}<div class="card"><div class="empty"><div class="empty__icon">🗺️</div><p class="muted">${esc(t("goals.city.empty"))}</p></div></div>`;
  }
  // ordered: primary → secondary → expansion
  const ordered = list.slice().sort((a, b) => PRIORITIES.indexOf(a.priority || "secondary") - PRIORITIES.indexOf(b.priority || "secondary"));
  const totOwners = list.reduce((s, c) => s + num(c.currentOwners), 0);
  const totProps = list.reduce((s, c) => s + num(c.currentProperties), 0);
  const stats = `<div class="grid cards-3" style="margin-bottom:14px">
    <div class="card stat"><span class="stat__value">${totOwners.toLocaleString()}</span><span class="stat__label">${esc(t("goals.city.totOwners"))}</span></div>
    <div class="card stat"><span class="stat__value" style="color:var(--brand)">${totProps.toLocaleString()}</span><span class="stat__label">${esc(t("goals.city.totProps"))}</span></div>
  </div>`;
  const rows = ordered.map(c => {
    const pc = priColor[c.priority || "secondary"];
    return `<div class="card" style="margin-bottom:10px">
      <div class="flex between" style="align-items:flex-start;gap:10px;flex-wrap:wrap">
        <div style="flex:1;min-width:220px">
          <div style="font-weight:700;font-size:15px">${esc(c.city || "—")}
            <span class="badge" style="background:color-mix(in srgb,${pc} 16%,transparent);color:${pc};font-size:11px">${esc(t("goals.pri." + (c.priority || "secondary")))}</span></div>
          <div style="margin-top:10px">
            <div class="flex between" style="font-size:12.5px"><span class="muted">${esc(t("goals.city.owners"))}</span><span>${num(c.currentOwners).toLocaleString()} / ${num(c.targetOwners).toLocaleString()}</span></div>
            ${bar(num(c.currentOwners), num(c.targetOwners), "var(--st-complete,#16a34a)")}
            <div class="flex between" style="font-size:12.5px;margin-top:8px"><span class="muted">${esc(t("goals.city.props"))}</span><span>${num(c.currentProperties).toLocaleString()} / ${num(c.targetProperties).toLocaleString()}</span></div>
            ${bar(num(c.currentProperties), num(c.targetProperties), "var(--brand)")}
          </div>
          ${c.notes ? `<div class="muted" style="font-size:12.5px;margin-top:8px;white-space:pre-wrap">${esc(c.notes)}</div>` : ""}
        </div>
        <div class="flex" style="gap:6px">
          ${W ? `<button class="btn btn--ghost btn--sm city-edit" data-id="${c.id}">✎</button>` : ""}
          ${can("del") ? `<button class="btn btn--ghost btn--sm btn--danger city-del" data-id="${c.id}">🗑</button>` : ""}
        </div>
      </div>
    </div>`;
  }).join("");
  return `${toolbar}${stats}${rows}`;
}

function cityModal(c) {
  const x = c || {}; const editing = !!c;
  const opt = (v, cur, label) => `<option value="${v}" ${cur === v ? "selected" : ""}>${label}</option>`;
  OS().openModal(`
    <div class="modal__head"><h3>🗺️ ${esc(t(editing ? "goals.city.edit" : "goals.city.add"))}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body">
      <div class="field-row">
        <div class="field"><label>${esc(t("goals.city.name"))}</label>
          <input id="ct_city" list="ct_cities" autocomplete="off" value="${esc(x.city || "")}" />
          <datalist id="ct_cities">${LIBYAN_CITIES.map(n => `<option value="${esc(n)}"></option>`).join("")}</datalist></div>
        <div class="field"><label>${esc(t("goals.city.priority"))}</label><select id="ct_pri">
          ${PRIORITIES.map(p => opt(p, x.priority || "secondary", esc(t("goals.pri." + p)))).join("")}
        </select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>${esc(t("goals.city.cOwners"))}</label><input id="ct_cown" type="number" step="any" value="${esc(x.currentOwners ?? "")}" /></div>
        <div class="field"><label>${esc(t("goals.city.tOwners"))}</label><input id="ct_town" type="number" step="any" value="${esc(x.targetOwners ?? "")}" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>${esc(t("goals.city.cProps"))}</label><input id="ct_cprop" type="number" step="any" value="${esc(x.currentProperties ?? "")}" /></div>
        <div class="field"><label>${esc(t("goals.city.tProps"))}</label><input id="ct_tprop" type="number" step="any" value="${esc(x.targetProperties ?? "")}" /></div>
      </div>
      <div class="field"><label>${esc(t("goals.city.notes"))}</label><textarea id="ct_notes">${esc(x.notes || "")}</textarea></div>
    </div>
    <div class="modal__foot"><button class="btn" data-close>${esc(t("btn.cancel"))}</button><button class="btn btn--primary" data-save>${esc(t("btn.save"))}</button></div>`);
  ($("[data-save]") || {}).onclick = () => {
    const city = $("#ct_city").value.trim();
    if (!city) { $("#ct_city").focus(); return; }
    const data = {
      city, priority: $("#ct_pri").value,
      currentOwners: $("#ct_cown").value, targetOwners: $("#ct_town").value,
      currentProperties: $("#ct_cprop").value, targetProperties: $("#ct_tprop").value,
      notes: $("#ct_notes").value.trim(),
    };
    if (editing) OS().db.updateCityTarget(c.id, data); else OS().db.addCityTarget(data);
    OS().closeModal(); (OS().render || (() => {}))(); OS().toast(t("goals.saved"));
  };
  $$("[data-close]").forEach(b => b.onclick = OS().closeModal);
}

/* ============================================================
   TAB 3 — Property Mix (pie chart)
   ============================================================ */
function nextColor() {
  const used = new Set(ptypes().map(p => (p.color || "").toLowerCase()));
  return PALETTE.find(c => !used.has(c.toLowerCase())) || PALETTE[ptypes().length % PALETTE.length];
}

function mixView() {
  const W = can("write");
  const list = ptypes();
  if (!list.length) {
    const setup = W ? `<button class="btn btn--primary" id="mixSetup">✨ ${esc(t("goals.mix.setup"))}</button> <button class="btn" id="mixAdd">＋ ${esc(t("goals.mix.add"))}</button>` : "";
    return `<div class="toolbar"><div class="toolbar__right">${setup}</div></div>
      <div class="card"><div class="empty"><div class="empty__icon">🥧</div><p class="muted">${esc(t("goals.mix.empty"))}</p></div></div>`;
  }
  const slices = list.map(p => ({ label: ptLabel(p.type), value: num(p.count), color: p.color || "#94a3b8", id: p.id }));
  const total = slices.reduce((s, x) => s + x.value, 0);
  const addBtn = W ? `<button class="btn btn--primary" id="mixAdd">＋ ${esc(t("goals.mix.add"))}</button>` : "";
  const toolbar = `<div class="toolbar"><div class="toolbar__right">${addBtn}</div></div>`;
  const legend = list.map(p => {
    const v = num(p.count); const pct = total > 0 ? Math.round(v / total * 100) : 0;
    return `<div class="flex between" style="gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
      <div class="flex" style="gap:8px;align-items:center;min-width:0">
        <span style="width:12px;height:12px;border-radius:3px;background:${esc(p.color || "#94a3b8")};flex:none"></span>
        <span style="font-weight:600">${esc(ptLabel(p.type))}</span>
        <span class="muted" style="font-size:12px">· ${pct}%</span>
      </div>
      <div class="flex" style="gap:6px;align-items:center">
        ${W ? `<input class="input mix-count" data-id="${p.id}" type="number" step="any" min="0" value="${esc(p.count ?? "0")}" style="width:84px;text-align:center" />`
            : `<b style="font-variant-numeric:tabular-nums">${v.toLocaleString()}</b>`}
        ${W ? `<button class="btn btn--ghost btn--sm mix-edit" data-id="${p.id}">✎</button>` : ""}
        ${can("del") ? `<button class="btn btn--ghost btn--sm btn--danger mix-del" data-id="${p.id}">🗑</button>` : ""}
      </div>
    </div>`;
  }).join("");
  const chart = `<div class="card" style="display:flex;flex-direction:column;align-items:center;gap:8px">
    <div class="card__title" style="align-self:flex-start">🥧 ${esc(t("goals.mix.title"))}</div>
    ${pieSVG(slices)}
    <div class="stat" style="text-align:center"><span class="stat__value">${total.toLocaleString()}</span><span class="stat__label">${esc(t("goals.mix.total"))}</span></div>
  </div>`;
  const legendCard = `<div class="card"><div class="card__title" style="margin-bottom:4px">${esc(t("goals.mix.share"))}</div>${legend}</div>`;
  return `${toolbar}<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">${chart}${legendCard}</div>`;
}

function ptypeModal(p) {
  const x = p || {}; const editing = !!p;
  const color = x.color || nextColor();
  OS().openModal(`
    <div class="modal__head"><h3>🏠 ${esc(t(editing ? "goals.mix.edit" : "goals.mix.add"))}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body">
      <div class="field"><label>${esc(t("goals.mix.type"))}</label>
        <input id="pt_type" list="pt_types" autocomplete="off" value="${esc(PTYPE_KEYS[x.type] ? "" : (x.type || ""))}" placeholder="${esc(ptLabel(x.type || ""))}" />
        <datalist id="pt_types">${Object.keys(PTYPE_KEYS).map(k => `<option value="${esc(t(PTYPE_KEYS[k]))}"></option>`).join("")}</datalist></div>
      <div class="field-row">
        <div class="field"><label>${esc(t("goals.mix.count"))}</label><input id="pt_count" type="number" step="any" min="0" value="${esc(x.count ?? "0")}" /></div>
        <div class="field"><label>${esc(t("goals.mix.color"))}</label><input id="pt_color" type="color" value="${esc(color)}" style="height:38px;padding:2px" /></div>
      </div>
    </div>
    <div class="modal__foot"><button class="btn" data-close>${esc(t("btn.cancel"))}</button><button class="btn btn--primary" data-save>${esc(t("btn.save"))}</button></div>`);
  ($("[data-save]") || {}).onclick = () => {
    const typed = $("#pt_type").value.trim();
    const type = typed || x.type || "";
    if (!type) { $("#pt_type").focus(); return; }
    const data = { type, count: $("#pt_count").value, color: $("#pt_color").value };
    if (editing) OS().db.updatePropertyType(p.id, data); else OS().db.addPropertyType(data);
    OS().closeModal(); (OS().render || (() => {}))(); OS().toast(t("goals.saved"));
  };
  $$("[data-close]").forEach(b => b.onclick = OS().closeModal);
}

/* ---------------- view ---------------- */
function view() {
  const tabs = `<div class="seg" id="goalTabs">
    <button data-gtab="okr" class="${goalsTab === "okr" ? "active" : ""}">🎯 ${esc(t("goals.tab.okr"))}</button>
    <button data-gtab="cities" class="${goalsTab === "cities" ? "active" : ""}">🗺️ ${esc(t("goals.tab.cities"))}</button>
    <button data-gtab="mix" class="${goalsTab === "mix" ? "active" : ""}">🥧 ${esc(t("goals.tab.mix"))}</button>
  </div>`;
  let body;
  if (goalsTab === "cities") body = citiesView();
  else if (goalsTab === "mix") body = mixView();
  else body = okrView();
  return `<div><div class="toolbar" style="margin-bottom:14px"><div class="toolbar__left">${tabs}</div></div>${body}</div>`;
}

/* ---------------- mount ---------------- */
function mount(ctx) {
  const reRender = () => (ctx && ctx.render ? ctx.render() : (OS().render && OS().render()));
  $$("[data-gtab]").forEach(b => b.onclick = () => { goalsTab = b.dataset.gtab; reRender(); });

  // OKRs
  const gc = $("#goalCreate"); if (gc) gc.onclick = () => goalModal(null);
  $$(".goal-edit").forEach(b => b.onclick = () => goalModal(goals().find(g => g.id === b.dataset.id)));

  // cities
  const ca = $("#cityAdd"); if (ca) ca.onclick = () => cityModal(null);
  $$(".city-edit").forEach(b => b.onclick = () => cityModal(cities().find(c => c.id === b.dataset.id)));
  $$(".city-del").forEach(b => b.onclick = () => {
    if (!confirm(t("goals.city.confirmDel"))) return;
    OS().db.removeCityTarget(b.dataset.id); reRender(); OS().toast(t("goals.deleted"));
  });

  // property mix
  const ms = $("#mixSetup"); if (ms) ms.onclick = () => {
    DEFAULT_TYPES.forEach(d => OS().db.addPropertyType({ type: d.type, count: "0", color: d.color }));
    reRender(); OS().toast(t("goals.saved"));
  };
  const ma = $("#mixAdd"); if (ma) ma.onclick = () => ptypeModal(null);
  $$(".mix-edit").forEach(b => b.onclick = () => ptypeModal(ptypes().find(p => p.id === b.dataset.id)));
  $$(".mix-del").forEach(b => b.onclick = () => {
    if (!confirm(t("goals.mix.confirmDel"))) return;
    OS().db.removePropertyType(b.dataset.id); reRender(); OS().toast(t("goals.deleted"));
  });
  $$(".mix-count").forEach(inp => inp.onchange = () => {
    OS().db.updatePropertyType(inp.dataset.id, { count: inp.value });
    reRender();
  });
}

/* ---------------- register ---------------- */
registerModule({
  id: "goals",
  icon: "🎯",
  labelKey: "nav.goals",
  titleKey: "page.goals",
  subKey: "page.goals.sub",
  order: 35,
  view,
  mount,
});
