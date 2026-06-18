/* ============================================================
   Ajrly OS — Customer Service (CS Inbox) module  [WS-C]
   Dependency-free, RTL-aware, theme-aware (CSS variables only).
   A unified ticket inbox: list (filter by status/assignee/channel) +
   conversation view (thread + reply) + assign + status change +
   SLA timers (first-response & resolution countdowns).
   Reads the cloud API via fetch(credentials:'include'); degrades
   gracefully to a "enable cloud" note when /api/health is unavailable.
   ============================================================ */
import { registerModule } from "../registry.js";
import { registerStrings, t, getLang } from "../i18n.js";

/* ---------------- i18n ---------------- */
registerStrings({
  ar: {
    "nav.support": "خدمة العملاء",
    "page.support": "خدمة العملاء",
    "page.support.sub": "صندوق وارد موحّد للتذاكر عبر كل القنوات",

    "sup.cloudOff.title": "فعّل السحابة لاستخدام مكتب الخدمة",
    "sup.cloudOff.body": "يعمل صندوق التذاكر في الوضع السحابي فقط. عند توفّر الخادم السحابي (D1 + الدوال) ستظهر التذاكر الواردة من النموذج وواتساب والبريد والدردشة هنا.",

    "sup.kpi.open": "تذاكر مفتوحة",
    "sup.kpi.firstResp": "متوسط أول رد",
    "sup.kpi.resolvedToday": "محلولة اليوم",
    "sup.kpi.unassigned": "غير مُسندة",

    "sup.filter.status": "الحالة",
    "sup.filter.assignee": "المُسند إليه",
    "sup.filter.channel": "القناة",
    "sup.filter.all": "الكل",
    "sup.filter.me": "أنا",
    "sup.filter.unassigned": "غير مُسندة",
    "sup.refresh": "تحديث",

    "sup.status.open": "مفتوحة",
    "sup.status.pending": "قيد المتابعة",
    "sup.status.resolved": "محلولة",
    "sup.status.closed": "مغلقة",

    "sup.channel.form": "نموذج",
    "sup.channel.whatsapp": "واتساب",
    "sup.channel.email": "بريد",
    "sup.channel.chat": "دردشة",

    "sup.list.empty": "لا توجد تذاكر مطابقة",
    "sup.list.title": "التذاكر",
    "sup.select.hint": "اختر تذكرة لعرض المحادثة",

    "sup.sla.firstResp": "أول رد",
    "sup.sla.resolution": "الحل",
    "sup.sla.breached": "تجاوز المهلة",
    "sup.sla.done": "تم",
    "sup.sla.left": "متبقٍ",

    "sup.assign": "إسناد",
    "sup.assign.none": "بدون إسناد",
    "sup.priority": "الأولوية",
    "sup.reply.placeholder": "اكتب ردك للعميل...",
    "sup.reply.send": "إرسال",
    "sup.reply.sent": "تم إرسال الرد",
    "sup.markResolved": "وضع كمحلولة",
    "sup.reopen": "إعادة فتح",
    "sup.sender.customer": "العميل",
    "sup.sender.agent": "الوكيل",
    "sup.thread.empty": "لا توجد رسائل بعد",
    "sup.err": "تعذّر تنفيذ العملية",
    "sup.customer": "العميل",
    "sup.contact": "التواصل",
    "sup.minutes": "د",
    "sup.hours": "س",
    "sup.na": "—",
  },
  en: {
    "nav.support": "Customer Service",
    "page.support": "Customer Service",
    "page.support.sub": "Unified ticket inbox across every channel",

    "sup.cloudOff.title": "Enable cloud to use the service desk",
    "sup.cloudOff.body": "The ticket inbox runs in cloud mode only. Once the cloud backend (D1 + Functions) is live, tickets from the website form, WhatsApp, email and live chat will appear here.",

    "sup.kpi.open": "Open tickets",
    "sup.kpi.firstResp": "Avg first response",
    "sup.kpi.resolvedToday": "Resolved today",
    "sup.kpi.unassigned": "Unassigned",

    "sup.filter.status": "Status",
    "sup.filter.assignee": "Assignee",
    "sup.filter.channel": "Channel",
    "sup.filter.all": "All",
    "sup.filter.me": "Me",
    "sup.filter.unassigned": "Unassigned",
    "sup.refresh": "Refresh",

    "sup.status.open": "Open",
    "sup.status.pending": "Pending",
    "sup.status.resolved": "Resolved",
    "sup.status.closed": "Closed",

    "sup.channel.form": "Form",
    "sup.channel.whatsapp": "WhatsApp",
    "sup.channel.email": "Email",
    "sup.channel.chat": "Chat",

    "sup.list.empty": "No matching tickets",
    "sup.list.title": "Tickets",
    "sup.select.hint": "Select a ticket to view the conversation",

    "sup.sla.firstResp": "First response",
    "sup.sla.resolution": "Resolution",
    "sup.sla.breached": "SLA breached",
    "sup.sla.done": "Met",
    "sup.sla.left": "left",

    "sup.assign": "Assign",
    "sup.assign.none": "Unassigned",
    "sup.priority": "Priority",
    "sup.reply.placeholder": "Type your reply to the customer...",
    "sup.reply.send": "Send",
    "sup.reply.sent": "Reply sent",
    "sup.markResolved": "Mark resolved",
    "sup.reopen": "Reopen",
    "sup.sender.customer": "Customer",
    "sup.sender.agent": "Agent",
    "sup.thread.empty": "No messages yet",
    "sup.err": "Action failed",
    "sup.customer": "Customer",
    "sup.contact": "Contact",
    "sup.minutes": "m",
    "sup.hours": "h",
    "sup.na": "—",
  },
});

/* ---------------- helpers ---------------- */
const OS = () => window.AjrlyOS || {};
const esc = (s) => (OS().esc ? OS().esc(s) : String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"));
const isRTL = () => getLang() === "ar";
const toast = (m) => { if (OS().toast) OS().toast(m); };

/* SLA targets (minutes). Reasonable defaults for a small CS desk. */
const SLA_FIRST_RESPONSE_MIN = 60;       // 1h to first agent reply
const SLA_RESOLUTION_MIN = 24 * 60;      // 24h to resolution

const STATUS_ORDER = ["open", "pending", "resolved", "closed"];
const STATUS_COLOR = {
  open: "var(--st-pending)", pending: "var(--st-progress)",
  resolved: "var(--st-complete)", closed: "var(--st-closed)",
};
const CHANNELS = ["form", "whatsapp", "email", "chat"];
const CHANNEL_ICON = { form: "📝", whatsapp: "🟢", email: "✉️", chat: "💬" };

/* ---------------- module state ---------------- */
const S = {
  cloud: null,           // null=unknown, true/false after probe
  loading: false,
  tickets: [],
  selectedId: null,
  thread: null,          // { ticket, messages }
  threadLoading: false,
  fStatus: "",
  fAssignee: "",
  fChannel: "",
  loadedOnce: false,
};

/* ---------------- API ---------------- */
async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  let data = null;
  try { data = await res.json(); } catch (_) { data = null; }
  if (!res.ok) throw new Error((data && data.error) || ("http_" + res.status));
  return data;
}

async function probeCloud() {
  try {
    const res = await fetch("/api/health", { credentials: "include" });
    if (!res.ok) return false;
    const d = await res.json().catch(() => ({}));
    return !!(d && d.ok);
  } catch (_) { return false; }
}

async function loadTickets() {
  const q = new URLSearchParams();
  if (S.fStatus) q.set("status", S.fStatus);
  if (S.fAssignee) q.set("assignee", S.fAssignee);
  if (S.fChannel) q.set("channel", S.fChannel);
  const data = await api("/api/tickets" + (q.toString() ? "?" + q.toString() : ""));
  S.tickets = (data && data.tickets) || [];
}

async function loadThread(id) {
  const data = await api("/api/tickets/" + encodeURIComponent(id) + "/messages");
  S.thread = data;
}

/* ---------------- time / SLA ---------------- */
function parseTs(s) {
  if (!s) return null;
  // D1 stamps "YYYY-MM-DD HH:MM:SS" (UTC). Make it ISO-UTC so Date parses it.
  const iso = /\dT\d/.test(s) ? s : String(s).replace(" ", "T") + "Z";
  const d = new Date(iso);
  return isNaN(d) ? null : d;
}
function minutesBetween(a, b) {
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 60000);
}
function fmtMins(mins) {
  if (mins == null) return t("sup.na");
  const sign = mins < 0 ? "-" : "";
  let m = Math.abs(mins);
  if (m < 60) return sign + m + t("sup.minutes");
  const h = Math.floor(m / 60), rem = m % 60;
  return sign + h + t("sup.hours") + (rem ? " " + rem + t("sup.minutes") : "");
}

/* SLA descriptor for one stage.
   Returns { label, value, breached, met } */
function slaState(createdAt, doneAt, targetMin, labelKey) {
  const created = parseTs(createdAt);
  const now = new Date();
  if (doneAt) {
    const done = parseTs(doneAt);
    const took = minutesBetween(created, done);
    const breached = took != null && took > targetMin;
    return { label: t(labelKey), value: `${t("sup.sla.done")} · ${fmtMins(took)}`, breached, met: !breached };
  }
  // still pending: countdown to the deadline
  const elapsed = minutesBetween(created, now);
  if (elapsed == null) return { label: t(labelKey), value: t("sup.na"), breached: false, met: false };
  const remaining = targetMin - elapsed;
  if (remaining < 0) return { label: t(labelKey), value: t("sup.sla.breached"), breached: true, met: false };
  return { label: t(labelKey), value: `${fmtMins(remaining)} ${t("sup.sla.left")}`, breached: false, met: false };
}

/* ---------------- KPI ---------------- */
function computeKPIs() {
  const tk = S.tickets;
  const open = tk.filter(x => x.status === "open" || x.status === "pending").length;
  const unassigned = tk.filter(x => (!x.assignee) && (x.status === "open" || x.status === "pending")).length;

  // avg first response (resolved+responded), in minutes
  const responded = tk.filter(x => x.first_response_at);
  let avgFirst = null;
  if (responded.length) {
    const sum = responded.reduce((a, x) => {
      const m = minutesBetween(parseTs(x.created_at), parseTs(x.first_response_at));
      return a + (m || 0);
    }, 0);
    avgFirst = Math.round(sum / responded.length);
  }

  const today = new Date().toISOString().slice(0, 10);
  const resolvedToday = tk.filter(x => x.resolved_at && String(x.resolved_at).slice(0, 10) === today).length;

  return { open, unassigned, avgFirst, resolvedToday };
}

/* ---------------- view pieces ---------------- */
function statCard(icon, color, value, label) {
  return `<div class="card stat">
    <div class="stat__top">
      <span class="stat__icon" style="background:color-mix(in srgb, ${color} 14%, transparent);color:${color}">${icon}</span>
    </div>
    <span class="stat__value">${esc(value)}</span>
    <span class="stat__label">${esc(label)}</span>
  </div>`;
}

function channelBadge(ch) {
  const c = CHANNELS.includes(ch) ? ch : "form";
  return `<span class="sup-badge sup-badge--${c}" title="${esc(t("sup.channel." + c))}">
    <span class="sup-badge__ic">${CHANNEL_ICON[c]}</span>${esc(t("sup.channel." + c))}</span>`;
}

function statusPill(st) {
  const s = STATUS_ORDER.includes(st) ? st : "open";
  return `<span class="sup-pill" style="background:color-mix(in srgb, ${STATUS_COLOR[s]} 16%, transparent);color:${STATUS_COLOR[s]}">${esc(t("sup.status." + s))}</span>`;
}

function teamOptions(selected) {
  const team = (OS().team ? OS().team() : (OS().TEAM || [])) || [];
  return team.map(m => `<option value="${esc(m)}" ${selected === m ? "selected" : ""}>${esc(m)}</option>`).join("");
}

function ticketRow(x) {
  const active = x.id === S.selectedId ? " is-active" : "";
  const fr = slaState(x.created_at, x.first_response_at, SLA_FIRST_RESPONSE_MIN, "sup.sla.firstResp");
  const slaDot = (x.status === "resolved" || x.status === "closed")
    ? ""
    : `<span class="sup-row__sla ${fr.breached ? "is-breached" : ""}">${esc(fr.value)}</span>`;
  return `<button class="sup-row${active}" data-ticket="${esc(x.id)}">
    <div class="sup-row__top">
      ${channelBadge(x.channel)}
      ${statusPill(x.status)}
    </div>
    <div class="sup-row__subj">${esc(x.subject || t("sup.na"))}</div>
    <div class="sup-row__meta">
      <span class="muted">${esc(x.customer_name || t("sup.na"))}</span>
      ${x.assignee ? `<span class="sup-row__assignee">@${esc(x.assignee)}</span>` : `<span class="muted">${esc(t("sup.assign.none"))}</span>`}
    </div>
    ${slaDot}
  </button>`;
}

function listView() {
  if (!S.tickets.length) {
    return `<div class="empty"><div class="empty__icon">📭</div><p class="muted">${esc(t("sup.list.empty"))}</p></div>`;
  }
  return `<div class="sup-list">${S.tickets.map(ticketRow).join("")}</div>`;
}

function slaBlock(ticket) {
  const fr = slaState(ticket.created_at, ticket.first_response_at, SLA_FIRST_RESPONSE_MIN, "sup.sla.firstResp");
  const resolvedDone = (ticket.status === "resolved" || ticket.status === "closed") ? ticket.resolved_at : null;
  const rs = slaState(ticket.created_at, resolvedDone, SLA_RESOLUTION_MIN, "sup.sla.resolution");
  const cell = (s) => `<div class="sup-sla ${s.breached ? "is-breached" : (s.met ? "is-met" : "")}">
      <span class="sup-sla__lbl">${esc(s.label)}</span>
      <span class="sup-sla__val">${esc(s.value)}</span>
    </div>`;
  return `<div class="sup-sla-row">${cell(fr)}${cell(rs)}</div>`;
}

function messageBubble(m) {
  const agent = m.sender === "agent";
  return `<div class="sup-msg ${agent ? "sup-msg--agent" : "sup-msg--cust"}">
    <div class="sup-msg__who">${esc(agent ? t("sup.sender.agent") : t("sup.sender.customer"))}${m.agent_id ? " · " + esc(m.agent_id) : ""}</div>
    <div class="sup-msg__body">${esc(m.body || "").replace(/\n/g, "<br>")}</div>
    <div class="sup-msg__ts muted">${esc(fmtWhen(m.created_at))}</div>
  </div>`;
}

function fmtWhen(s) {
  const d = parseTs(s);
  if (!d) return "";
  try {
    return d.toLocaleString(getLang() === "ar" ? "ar-EG" : "en-GB",
      { dateStyle: "short", timeStyle: "short" });
  } catch (_) { return String(s); }
}

function conversationView() {
  if (!S.selectedId) {
    return `<div class="empty sup-conv-empty"><div class="empty__icon">💬</div><p class="muted">${esc(t("sup.select.hint"))}</p></div>`;
  }
  if (S.threadLoading || !S.thread) {
    return `<div class="empty"><p class="muted">…</p></div>`;
  }
  const tkt = S.thread.ticket || {};
  const msgs = S.thread.messages || [];
  const closed = tkt.status === "resolved" || tkt.status === "closed";

  const head = `<div class="sup-conv__head">
    <div class="sup-conv__title">
      <div class="sup-conv__subj">${esc(tkt.subject || t("sup.na"))}</div>
      <div class="sup-conv__meta">
        ${channelBadge(tkt.channel)} ${statusPill(tkt.status)}
        <span class="muted">${esc(tkt.customer_name || "")}${tkt.customer_contact ? " · " + esc(tkt.customer_contact) : ""}</span>
      </div>
    </div>
  </div>`;

  const controls = `<div class="sup-conv__controls">
    <label class="sup-ctl"><span class="muted">${esc(t("sup.assign"))}</span>
      <select class="input" id="sup_assign">
        <option value="">${esc(t("sup.assign.none"))}</option>
        ${teamOptions(tkt.assignee)}
      </select></label>
    <label class="sup-ctl"><span class="muted">${esc(t("sup.priority"))}</span>
      <select class="input" id="sup_priority">
        ${["High", "Medium", "Low"].map(p => `<option value="${p}" ${tkt.priority === p ? "selected" : ""}>${p}</option>`).join("")}
      </select></label>
    <label class="sup-ctl"><span class="muted">${esc(t("sup.filter.status"))}</span>
      <select class="input" id="sup_status">
        ${STATUS_ORDER.map(s => `<option value="${s}" ${tkt.status === s ? "selected" : ""}>${esc(t("sup.status." + s))}</option>`).join("")}
      </select></label>
    <button class="btn btn--sm ${closed ? "" : "btn--primary"}" id="sup_resolve_toggle">
      ${closed ? "↺ " + esc(t("sup.reopen")) : "✓ " + esc(t("sup.markResolved"))}
    </button>
  </div>`;

  const thread = msgs.length
    ? `<div class="sup-thread">${msgs.map(messageBubble).join("")}</div>`
    : `<div class="empty"><p class="muted">${esc(t("sup.thread.empty"))}</p></div>`;

  const reply = `<div class="sup-reply">
    <textarea class="input sup-reply__box" id="sup_reply" rows="3" placeholder="${esc(t("sup.reply.placeholder"))}"></textarea>
    <button class="btn btn--primary" id="sup_reply_send">➤ ${esc(t("sup.reply.send"))}</button>
  </div>`;

  return `<div class="sup-conv">${head}${slaBlock(tkt)}${controls}${thread}${reply}</div>`;
}

/* ---------------- top-level view ---------------- */
function cloudOffView() {
  return `<div class="card sup-cloudoff">
    <div class="empty__icon">🎧</div>
    <h3 class="card__title">${esc(t("sup.cloudOff.title"))}</h3>
    <p class="muted" style="max-width:48ch;margin:8px auto 0;text-align:center">${esc(t("sup.cloudOff.body"))}</p>
  </div>`;
}

function toolbar() {
  return `<div class="toolbar sup-toolbar">
    <div class="toolbar__left">
      <select class="input" id="sup_f_status" aria-label="${esc(t("sup.filter.status"))}">
        <option value="">${esc(t("sup.filter.status"))}: ${esc(t("sup.filter.all"))}</option>
        ${STATUS_ORDER.map(s => `<option value="${s}" ${S.fStatus === s ? "selected" : ""}>${esc(t("sup.status." + s))}</option>`).join("")}
      </select>
      <select class="input" id="sup_f_assignee" aria-label="${esc(t("sup.filter.assignee"))}">
        <option value="" ${S.fAssignee === "" ? "selected" : ""}>${esc(t("sup.filter.assignee"))}: ${esc(t("sup.filter.all"))}</option>
        <option value="me" ${S.fAssignee === "me" ? "selected" : ""}>${esc(t("sup.filter.me"))}</option>
        <option value="unassigned" ${S.fAssignee === "unassigned" ? "selected" : ""}>${esc(t("sup.filter.unassigned"))}</option>
        ${teamOptions(S.fAssignee)}
      </select>
      <select class="input" id="sup_f_channel" aria-label="${esc(t("sup.filter.channel"))}">
        <option value="">${esc(t("sup.filter.channel"))}: ${esc(t("sup.filter.all"))}</option>
        ${CHANNELS.map(c => `<option value="${c}" ${S.fChannel === c ? "selected" : ""}>${esc(t("sup.channel." + c))}</option>`).join("")}
      </select>
    </div>
    <div class="toolbar__right">
      <button class="btn btn--sm" id="sup_refresh">↻ ${esc(t("sup.refresh"))}</button>
    </div>
  </div>`;
}

function kpisView() {
  const k = computeKPIs();
  return `<div class="grid cards-4">
    ${statCard("📨", "var(--st-pending)", String(k.open), t("sup.kpi.open"))}
    ${statCard("⏱", "var(--st-progress)", k.avgFirst == null ? t("sup.na") : fmtMins(k.avgFirst), t("sup.kpi.firstResp"))}
    ${statCard("✅", "var(--st-complete)", String(k.resolvedToday), t("sup.kpi.resolvedToday"))}
    ${statCard("🙋", "var(--accent)", String(k.unassigned), t("sup.kpi.unassigned"))}
  </div>`;
}

function view() {
  if (S.cloud === false) return cloudOffView();
  if (S.cloud === null) {
    // first paint while we probe; mount() triggers the probe + reload.
    return `<div class="empty"><p class="muted">…</p></div>`;
  }
  const inbox = `<div class="sup-inbox">
    <aside class="card sup-pane sup-pane--list">
      <div class="card__head"><span class="card__title">${esc(t("sup.list.title"))}</span></div>
      <div id="sup_list">${listView()}</div>
    </aside>
    <section class="card sup-pane sup-pane--conv" id="sup_conv">
      ${conversationView()}
    </section>
  </div>`;
  return `<div class="sup-wrap">${toolbar()}${kpisView()}${inbox}</div>`;
}

/* ---------------- mount / events ---------------- */
function reRender(ctx) { if (ctx && ctx.render) ctx.render(); else if (OS().render) OS().render(); }

async function refreshAll(ctx) {
  if (S.cloud === false) return;
  S.loading = true;
  try {
    await loadTickets();
    if (S.selectedId) {
      const stillThere = S.tickets.some(x => x.id === S.selectedId);
      if (stillThere) { await loadThread(S.selectedId); }
      else { S.selectedId = null; S.thread = null; }
    }
  } catch (e) {
    toast(t("sup.err"));
  } finally {
    S.loading = false;
    reRender(ctx);
  }
}

async function selectTicket(id, ctx) {
  S.selectedId = id;
  S.threadLoading = true;
  reRender(ctx);
  try { await loadThread(id); }
  catch (e) { toast(t("sup.err")); }
  finally { S.threadLoading = false; reRender(ctx); }
}

function deepLinkTicket() {
  // support #/support?ticket=ID
  try {
    const h = location.hash || "";
    const q = h.split("?")[1];
    if (!q) return null;
    const params = new URLSearchParams(q);
    return params.get("ticket");
  } catch (_) { return null; }
}

function mount(ctx) {
  const $ = (s) => document.querySelector(s);

  // First-time probe: detect cloud, then load.
  if (S.cloud === null && !S.loading) {
    S.loading = true;
    probeCloud().then(async (ok) => {
      S.cloud = ok;
      if (ok) {
        const dl = deepLinkTicket();
        try {
          await loadTickets();
          if (dl && S.tickets.some(x => x.id === dl)) { S.selectedId = dl; await loadThread(dl); }
        } catch (_) {}
      }
      S.loading = false;
      S.loadedOnce = true;
      reRender(ctx);
    });
    return;
  }

  if (S.cloud !== true) return;

  // filters
  const fs = $("#sup_f_status");
  if (fs) fs.onchange = (e) => { S.fStatus = e.target.value; refreshAll(ctx); };
  const fa = $("#sup_f_assignee");
  if (fa) fa.onchange = (e) => { S.fAssignee = e.target.value; refreshAll(ctx); };
  const fc = $("#sup_f_channel");
  if (fc) fc.onchange = (e) => { S.fChannel = e.target.value; refreshAll(ctx); };
  const rf = $("#sup_refresh");
  if (rf) rf.onclick = () => refreshAll(ctx);

  // ticket rows
  document.querySelectorAll("[data-ticket]").forEach(b => {
    b.onclick = () => selectTicket(b.dataset.ticket, ctx);
  });

  if (!S.selectedId || !S.thread) return;
  const tkt = S.thread.ticket || {};

  // patch helper
  const patch = async (payload) => {
    try {
      await api("/api/tickets/" + encodeURIComponent(S.selectedId), {
        method: "PATCH", body: JSON.stringify(payload),
      });
      await loadTickets();
      await loadThread(S.selectedId);
    } catch (e) { toast(t("sup.err")); }
    reRender(ctx);
  };

  const asg = $("#sup_assign");
  if (asg) asg.onchange = (e) => patch({ assignee: e.target.value });
  const pri = $("#sup_priority");
  if (pri) pri.onchange = (e) => patch({ priority: e.target.value });
  const st = $("#sup_status");
  if (st) st.onchange = (e) => patch({ status: e.target.value });

  const toggle = $("#sup_resolve_toggle");
  if (toggle) toggle.onclick = () => {
    const closed = tkt.status === "resolved" || tkt.status === "closed";
    patch({ status: closed ? "open" : "resolved" });
  };

  const send = $("#sup_reply_send");
  const box = $("#sup_reply");
  if (send && box) {
    send.onclick = async () => {
      const body = box.value.trim();
      if (!body) return;
      send.disabled = true;
      try {
        await api("/api/tickets/" + encodeURIComponent(S.selectedId) + "/messages", {
          method: "POST", body: JSON.stringify({ body }),
        });
        box.value = "";
        toast(t("sup.reply.sent"));
        await loadTickets();
        await loadThread(S.selectedId);
      } catch (e) { toast(t("sup.err")); }
      finally { send.disabled = false; reRender(ctx); }
    };
  }
}

/* ---------------- register ---------------- */
registerModule({
  id: "support",
  icon: "🎧",
  labelKey: "nav.support",
  titleKey: "page.support",
  subKey: "page.support.sub",
  order: 45,
  view,
  mount,
});
