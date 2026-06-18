/* ============================================================
   Ajrly OS — Account / Auth / Roles module
   Routed page (#/account). Three states:
     1. Not configured  -> Supabase setup card (URL + anon key)
     2. Configured + logged out -> email/password login
     3. Logged in -> profile, role badge, team list, sign out
   Bilingual (ar/en), RTL & dark aware. Degrades gracefully:
   the whole app keeps working on localStorage regardless.
   ============================================================ */

import { registerModule } from "../registry.js";
import { registerStrings, t, getLang } from "../i18n.js";
import { isConfigured, getConfig, saveConfig, clearConfig } from "../supabaseClient.js";
import {
  signIn, signOut, currentUser, getProfile, listProfiles, onChange,
} from "../auth.js";

registerStrings({
  ar: {
    "nav.account": "الحساب",
    "page.account": "الحساب والصلاحيات",
    "page.account.sub": "تسجيل الدخول وإدارة الفريق",
    "acc.setup.title": "ربط قاعدة البيانات (Supabase)",
    "acc.setup.desc": "التطبيق يعمل محليًا بدون إعداد. لتفعيل المزامنة والصلاحيات أدخل بيانات مشروع Supabase الخاص بك.",
    "acc.setup.url": "رابط المشروع (Project URL)",
    "acc.setup.key": "المفتاح العام (anon public key)",
    "acc.setup.save": "حفظ الإعداد",
    "acc.setup.how": "كيفية الإعداد",
    "acc.setup.how1": "أنشئ مشروعًا على supabase.com",
    "acc.setup.how2": "شغّل ملفات schema.sql ثم policies.sql ثم seed.sql",
    "acc.setup.how3": "انسخ Project URL و anon key من إعدادات الـ API",
    "acc.setup.note": "المفتاح العام آمن للمشاركة — الحماية الحقيقية عبر سياسات RLS. لا تستخدم مفتاح service_role هنا أبدًا.",
    "acc.login.title": "تسجيل الدخول",
    "acc.login.email": "البريد الإلكتروني",
    "acc.login.pw": "كلمة المرور",
    "acc.login.btn": "دخول",
    "acc.login.wait": "جارٍ الدخول...",
    "acc.login.err": "تعذّر تسجيل الدخول. تحقق من البيانات.",
    "acc.me.title": "حسابي",
    "acc.me.role": "الصلاحية",
    "acc.me.signout": "تسجيل الخروج",
    "acc.team.title": "الفريق",
    "acc.team.empty": "لا توجد ملفات أعضاء بعد",
    "acc.reconfig": "تغيير إعداد قاعدة البيانات",
    "acc.connected": "متصل بـ Supabase",
    "role.admin": "مدير عام", "role.manager": "مدير", "role.member": "عضو", "role.viewer": "مشاهد",
  },
  en: {
    "nav.account": "Account",
    "page.account": "Account & Roles",
    "page.account.sub": "Sign-in and team management",
    "acc.setup.title": "Connect database (Supabase)",
    "acc.setup.desc": "The app runs locally with no setup. To enable sync and roles, enter your Supabase project credentials.",
    "acc.setup.url": "Project URL",
    "acc.setup.key": "anon public key",
    "acc.setup.save": "Save configuration",
    "acc.setup.how": "How to set up",
    "acc.setup.how1": "Create a project at supabase.com",
    "acc.setup.how2": "Run schema.sql, then policies.sql, then seed.sql",
    "acc.setup.how3": "Copy the Project URL and anon key from API settings",
    "acc.setup.note": "The anon key is safe to share — RLS policies are the real guard. Never use the service_role key here.",
    "acc.login.title": "Sign in",
    "acc.login.email": "Email",
    "acc.login.pw": "Password",
    "acc.login.btn": "Sign in",
    "acc.login.wait": "Signing in...",
    "acc.login.err": "Sign-in failed. Check your credentials.",
    "acc.me.title": "My account",
    "acc.me.role": "Role",
    "acc.me.signout": "Sign out",
    "acc.team.title": "Team",
    "acc.team.empty": "No member profiles yet",
    "acc.reconfig": "Change database configuration",
    "acc.connected": "Connected to Supabase",
    "role.admin": "Admin", "role.manager": "Manager", "role.member": "Member", "role.viewer": "Viewer",
  },
});

const esc = (s) => (window.AjrlyOS && window.AjrlyOS.esc ? window.AjrlyOS.esc(s)
  : String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));

const roleColors = {
  admin:   "var(--brand)",
  manager: "var(--st-complete, #16a34a)",
  member:  "var(--muted)",
  viewer:  "var(--muted)",
};

function roleBadge(role) {
  const r = role || "member";
  const color = roleColors[r] || "var(--muted)";
  return `<span class="badge" style="background:transparent;border:1px solid ${color};color:${color}">${esc(t("role." + r))}</span>`;
}

const initials = (s) => String(s || "?").trim().slice(0, 2).toUpperCase();

/* ---------- View (synchronous shell; data loaded in mount) ---------- */

function view() {
  if (!isConfigured()) return setupCard();
  // Configured: render a placeholder; mount() decides login vs profile.
  return `<div id="accRoot" class="grid"><div class="card"><div class="empty"><div class="empty__icon">⏳</div></div></div></div>`;
}

function setupCard() {
  const { url, anonKey } = getConfig();
  return `
  <div class="grid">
    <div class="card">
      <h3 style="margin-top:0">🔌 ${esc(t("acc.setup.title"))}</h3>
      <p class="muted">${esc(t("acc.setup.desc"))}</p>
      <div class="field"><label>${esc(t("acc.setup.url"))}</label>
        <input id="sb_url" placeholder="https://xxxx.supabase.co" value="${esc(url)}" /></div>
      <div class="field"><label>${esc(t("acc.setup.key"))}</label>
        <input id="sb_key" placeholder="eyJhbGciOi..." value="${esc(anonKey)}" /></div>
      <button class="btn btn--primary" id="sb_save">${esc(t("acc.setup.save"))}</button>
    </div>
    <div class="card">
      <h3 style="margin-top:0">📖 ${esc(t("acc.setup.how"))}</h3>
      <ol class="muted" style="padding-inline-start:18px;line-height:1.9">
        <li>${esc(t("acc.setup.how1"))}</li>
        <li>${esc(t("acc.setup.how2"))}</li>
        <li>${esc(t("acc.setup.how3"))}</li>
      </ol>
      <p class="muted" style="font-size:.85em;border-top:1px solid var(--border);padding-top:10px">
        🔒 ${esc(t("acc.setup.note"))}</p>
    </div>
  </div>`;
}

function loginCard(errMsg) {
  return `
  <div class="card" style="max-width:420px">
    <h3 style="margin-top:0">🔑 ${esc(t("acc.login.title"))}</h3>
    <p class="muted" style="font-size:.85em">✅ ${esc(t("acc.connected"))}</p>
    <div class="field"><label>${esc(t("acc.login.email"))}</label>
      <input id="li_email" type="email" autocomplete="username" /></div>
    <div class="field"><label>${esc(t("acc.login.pw"))}</label>
      <input id="li_pw" type="password" autocomplete="current-password" /></div>
    ${errMsg ? `<p style="color:#dc2626;font-size:.9em;margin:6px 0">${esc(errMsg)}</p>` : ""}
    <button class="btn btn--primary" id="li_btn">${esc(t("acc.login.btn"))}</button>
    <button class="btn" id="li_reconfig" style="margin-inline-start:8px">${esc(t("acc.reconfig"))}</button>
  </div>`;
}

function profileCard(user, profile, team, canManage) {
  const name = (profile && profile.full_name) || user.email;
  const role = profile && profile.role;
  let teamHtml = "";
  if (canManage) {
    teamHtml = `
    <div class="card">
      <h3 style="margin-top:0">👥 ${esc(t("acc.team.title"))}</h3>
      ${team.length ? `<div class="grid">${team.map(p => `
        <div class="flex" style="gap:10px;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);padding:8px 0">
          <span class="flex" style="gap:10px;align-items:center">
            <span class="avatar-sm">${esc(initials(p.full_name))}</span>
            <span>${esc(p.full_name || "—")}</span>
          </span>
          ${roleBadge(p.role)}
        </div>`).join("")}</div>`
      : `<div class="empty"><p class="muted">${esc(t("acc.team.empty"))}</p></div>`}
    </div>`;
  }
  return `
  <div class="grid cards-2">
    <div class="card">
      <h3 style="margin-top:0">👤 ${esc(t("acc.me.title"))}</h3>
      <div class="flex" style="gap:12px;align-items:center;margin-bottom:12px">
        <span class="avatar-sm" style="width:42px;height:42px;font-size:1em">${esc(initials(name))}</span>
        <div>
          <div style="font-weight:600">${esc(name)}</div>
          <div class="muted" style="font-size:.85em">${esc(user.email)}</div>
        </div>
      </div>
      <div class="flex" style="gap:8px;align-items:center;margin-bottom:14px">
        <span class="muted">${esc(t("acc.me.role"))}:</span> ${roleBadge(role)}
      </div>
      <button class="btn btn--primary" id="me_signout">${esc(t("acc.me.signout"))}</button>
      <button class="btn" id="me_reconfig" style="margin-inline-start:8px">${esc(t("acc.reconfig"))}</button>
    </div>
    ${teamHtml}
  </div>`;
}

/* ---------- Mount ---------- */

let unsub = null;

async function mount(ctx) {
  const { render, toast } = ctx;

  // State 1: setup card
  if (!isConfigured()) {
    const save = document.querySelector("#sb_save");
    if (save) save.onclick = () => {
      const url = (document.querySelector("#sb_url").value || "").trim();
      const key = (document.querySelector("#sb_key").value || "").trim();
      if (!url || !key) { toast(t("acc.login.err")); return; }
      saveConfig(url, key);
      toast(t("toast.saved"));
      render();
    };
    return;
  }

  const root = document.querySelector("#accRoot");
  if (!root) return;

  // Subscribe to auth changes so the page reacts to sign in/out.
  if (unsub) { unsub(); unsub = null; }
  unsub = onChange(() => render());

  const user = await currentUser();

  // State 2: logged out -> login form
  if (!user) {
    root.innerHTML = loginCard("");
    bindLogin(root, render, toast);
    return;
  }

  // State 3: logged in -> profile + team
  const profile = await getProfile();
  const canManage = profile && (profile.role === "admin" || profile.role === "manager");
  const team = canManage ? await listProfiles() : [];
  root.innerHTML = profileCard(user, profile, team, canManage);

  const out = root.querySelector("#me_signout");
  if (out) out.onclick = async () => { await signOut(); toast(t("acc.me.signout")); render(); };
  const re = root.querySelector("#me_reconfig");
  if (re) re.onclick = () => { reconfigure(render); };
}

function bindLogin(root, render, toast) {
  const btn = root.querySelector("#li_btn");
  const re = root.querySelector("#li_reconfig");
  if (re) re.onclick = () => reconfigure(render);
  if (!btn) return;
  btn.onclick = async () => {
    const email = root.querySelector("#li_email").value;
    const pw = root.querySelector("#li_pw").value;
    btn.disabled = true;
    btn.textContent = t("acc.login.wait");
    const { error } = await signIn(email, pw);
    if (error) {
      root.innerHTML = loginCard(error.message || t("acc.login.err"));
      bindLogin(root, render, toast);
      return;
    }
    toast(t("toast.saved"));
    render();
  };
}

function reconfigure(render) {
  // Sign out (best effort) then clear stored config to return to setup.
  signOut().finally(() => { clearConfig(); render(); });
}

registerModule({
  id: "account",
  icon: "👤",
  labelKey: "nav.account",
  titleKey: "page.account",
  subKey: "page.account.sub",
  order: 95,
  view,
  mount,
});
