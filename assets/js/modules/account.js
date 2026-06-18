/* ============================================================
   Ajrly OS — Account & Team management
   Works in BOTH modes:
     • Cloud mode  → users come from the server (/api/users).
     • Local mode  → users come from the local auth store.
   Admin: add employees, set role, activate/deactivate, delete.
   ============================================================ */
import { registerModule } from "../registry.js";
import { registerStrings, t, getLang } from "../i18n.js";
import {
  currentUser as localCurrentUser, users as localUsers, can as localCan,
  ROLES, logout as localLogout, updateUser as localUpdate,
  addUser as localAdd, setPassword as localSetPw, removeUser as localRemove,
} from "../auth.js";

registerStrings({
  ar: {
    "nav.account": "الحساب",
    "page.account": "الحساب والصلاحيات",
    "page.account.sub": "ملفّك الشخصي وإدارة الفريق",
    "acc.me.title": "حسابي",
    "acc.me.role": "الصلاحية",
    "acc.me.signout": "تسجيل الخروج",
    "acc.me.changepw": "تغيير كلمة المرور",
    "acc.me.newpw": "كلمة مرور جديدة",
    "acc.me.pwchanged": "تم تغيير كلمة المرور",
    "acc.team.title": "إدارة الفريق والمستخدمين",
    "acc.team.add": "➕ إضافة موظف",
    "acc.team.loading": "جارٍ التحميل…",
    "acc.team.empty": "لا يوجد مستخدمون بعد — أضف أول موظف",
    "acc.team.name": "الاسم", "acc.team.email": "البريد", "acc.team.role": "الصلاحية",
    "acc.team.status": "الحالة", "acc.team.active": "نشط", "acc.team.disabled": "معطّل",
    "acc.team.activate": "تفعيل", "acc.team.deactivate": "تعطيل",
    "acc.team.resetpw": "كلمة مرور", "acc.team.delete": "حذف",
    "acc.team.added": "تمت إضافة الموظف", "acc.team.updated": "تم التحديث", "acc.team.deleted": "تم الحذف",
    "acc.team.err.exists": "البريد مستخدم مسبقاً", "acc.team.err.missing": "أكمل كل الحقول",
    "acc.team.err.weak": "كلمة المرور قصيرة (4 أحرف على الأقل)",
    "acc.team.err.lastadmin": "لا يمكن إزالة آخر مدير عام",
    "acc.team.err.generic": "تعذّر تنفيذ العملية",
    "acc.team.cloudhint": "هؤلاء يستطيعون الدخول من أي جهاز/بلد ببريدهم وكلمة المرور.",
    "acc.add.title": "إضافة موظف",
    "role.admin": "مدير عام", "role.manager": "مدير", "role.member": "عضو", "role.viewer": "مشاهد",
    "role.admin.d": "صلاحية كاملة + إدارة المستخدمين",
    "role.manager.d": "كل العمليات وتكليف المهام (بلا إدارة مستخدمين)",
    "role.member.d": "تعديل مهامه وإضافة محتوى",
    "role.viewer.d": "عرض فقط",
    "fld.name": "الاسم", "fld.email": "البريد الإلكتروني", "fld.password": "كلمة المرور",
    "btn.save": "حفظ", "btn.cancel": "إلغاء",
  },
  en: {
    "nav.account": "Account",
    "page.account": "Account & Roles",
    "page.account.sub": "Your profile and team management",
    "acc.me.title": "My account",
    "acc.me.role": "Role",
    "acc.me.signout": "Sign out",
    "acc.me.changepw": "Change password",
    "acc.me.newpw": "New password",
    "acc.me.pwchanged": "Password changed",
    "acc.team.title": "Team & User management",
    "acc.team.add": "➕ Add employee",
    "acc.team.loading": "Loading…",
    "acc.team.empty": "No users yet — add your first employee",
    "acc.team.name": "Name", "acc.team.email": "Email", "acc.team.role": "Role",
    "acc.team.status": "Status", "acc.team.active": "Active", "acc.team.disabled": "Disabled",
    "acc.team.activate": "Activate", "acc.team.deactivate": "Deactivate",
    "acc.team.resetpw": "Password", "acc.team.delete": "Delete",
    "acc.team.added": "Employee added", "acc.team.updated": "Updated", "acc.team.deleted": "Deleted",
    "acc.team.err.exists": "Email already used", "acc.team.err.missing": "Fill all fields",
    "acc.team.err.weak": "Password too short (min 4)",
    "acc.team.err.lastadmin": "Cannot remove the last admin",
    "acc.team.err.generic": "Operation failed",
    "acc.team.cloudhint": "These people can sign in from any device/country with their email + password.",
    "acc.add.title": "Add employee",
    "role.admin": "Admin", "role.manager": "Manager", "role.member": "Member", "role.viewer": "Viewer",
    "role.admin.d": "Full access + user management",
    "role.manager.d": "All ops and task assignment (no user mgmt)",
    "role.member.d": "Edit own tasks and add content",
    "role.viewer.d": "Read only",
    "fld.name": "Name", "fld.email": "Email", "fld.password": "Password",
    "btn.save": "Save", "btn.cancel": "Cancel",
  },
});

const OS = () => window.AjrlyOS || {};
const esc = (s) => (OS().esc ? OS().esc(s) : String(s ?? ""));
const isCloud = () => !!(OS().isCloud && OS().isCloud());
const cloud = () => OS().cloud;
const me = () => (OS().currentUser ? OS().currentUser() : localCurrentUser());
const canManage = () => (OS().can ? OS().can("manageUsers") : localCan("manageUsers"));
const initials = (s) => String(s || "?").trim().slice(0, 2).toUpperCase();
const roleColor = { admin: "var(--brand)", manager: "var(--st-complete)", member: "var(--st-progress)", viewer: "var(--muted)" };
function roleBadge(r) { const c = roleColor[r] || "var(--muted)"; return `<span class="badge" style="background:color-mix(in srgb, ${c} 14%, transparent);color:${c}">${esc(t("role." + r))}</span>`; }
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

/* ---------------- view ---------------- */
function view() {
  const u = me();
  if (!u) return `<div class="card"><div class="empty"><div class="empty__icon">🔒</div></div></div>`;
  const manage = canManage();

  const profile = `
  <div class="card">
    <div class="flex" style="gap:14px;align-items:center;margin-bottom:14px">
      <div class="user-chip__avatar" style="width:54px;height:54px;font-size:20px">${esc(initials(u.name))}</div>
      <div>
        <div style="font-weight:700;font-size:17px">${esc(u.name)}</div>
        <div class="muted">${esc(u.email)}</div>
        <div style="margin-top:6px">${roleBadge(u.role)}</div>
      </div>
    </div>
    ${isCloud() ? "" : `<div class="field"><label>${t("acc.me.newpw")}</label>
      <div class="flex" style="gap:8px">
        <input id="me_pw" type="password" class="input" style="flex:1" placeholder="••••••" />
        <button class="btn" id="me_pw_btn">${t("acc.me.changepw")}</button>
      </div></div>`}
    <button class="btn btn--danger" id="me_signout" style="margin-top:14px">⎋ ${t("acc.me.signout")}</button>
  </div>`;

  const team = manage ? `
    <div class="card">
      <div class="card__head">
        <span class="card__title">${t("acc.team.title")}</span>
        <button class="btn btn--primary btn--sm" id="usr_add">${t("acc.team.add")}</button>
      </div>
      ${isCloud() ? `<p class="muted" style="margin:-4px 0 12px">☁️ ${t("acc.team.cloudhint")}</p>` : ""}
      <div id="usrTeam"><div class="empty"><div class="empty__icon">⏳</div><p class="muted">${t("acc.team.loading")}</p></div></div>
      <div class="muted" style="margin-top:12px;line-height:1.9">
        ${ROLES.map(r => `<div>${roleBadge(r)} <span style="font-size:12px">${esc(t("role." + r + ".d"))}</span></div>`).join("")}
      </div>
    </div>` : "";

  return `<div class="grid cards-2" style="align-items:start">${profile}${team}</div>`;
}

function teamTable(list) {
  if (!list.length) return `<div class="empty"><p class="muted">${t("acc.team.empty")}</p></div>`;
  return `<div class="table-wrap"><table>
    <thead><tr>
      <th>${t("acc.team.name")}</th><th>${t("acc.team.email")}</th>
      <th>${t("acc.team.role")}</th><th>${t("acc.team.status")}</th><th></th>
    </tr></thead>
    <tbody>${list.map(u => `<tr data-uid="${esc(u.id)}">
      <td><span class="flex" style="gap:8px"><span class="avatar-sm">${esc(initials(u.name))}</span>${esc(u.name)}</span></td>
      <td class="muted">${esc(u.email)}</td>
      <td><select class="input usr-role" data-uid="${esc(u.id)}">
        ${ROLES.map(r => `<option value="${r}" ${u.role === r ? "selected" : ""}>${esc(t("role." + r))}</option>`).join("")}
      </select></td>
      <td>${u.active ? `<span class="badge badge--complete">${t("acc.team.active")}</span>` : `<span class="badge badge--closed">${t("acc.team.disabled")}</span>`}</td>
      <td><div class="flex" style="gap:6px">
        <button class="btn btn--sm usr-toggle" data-uid="${esc(u.id)}">${u.active ? t("acc.team.deactivate") : t("acc.team.activate")}</button>
        ${isCloud() ? "" : `<button class="btn btn--sm usr-pw" data-uid="${esc(u.id)}">🔑</button>`}
        <button class="btn btn--sm btn--danger usr-del" data-uid="${esc(u.id)}">🗑</button>
      </div></td>
    </tr>`).join("")}</tbody>
  </table></div>`;
}

/* ---------------- data ops (cloud or local) ---------------- */
async function fetchUsers() {
  if (isCloud()) { try { return await cloud().listUsers(); } catch (e) { return []; } }
  return localUsers();
}
async function opUpdate(id, patch) {
  if (isCloud()) { try { await cloud().updateUser(id, patch); return {}; } catch (e) { return { error: e.code || "generic" }; } }
  return localUpdate(id, patch);
}
async function opRemove(id) {
  if (isCloud()) { try { await cloud().removeUser(id); return {}; } catch (e) { return { error: e.code || "generic" }; } }
  return localRemove(id);
}
async function opAdd(payload) {
  if (isCloud()) { try { const u = await cloud().createUser(payload); return { user: u }; } catch (e) { return { error: e.code || "generic" }; } }
  return localAdd(payload);
}
const errMsg = (code) => { const k = "acc.team.err." + code; const m = t(k); return m === k ? t("acc.team.err.generic") : m; };

/* ---------------- mount ---------------- */
function mount() {
  const op = OS();
  const u = me();

  $("#me_signout") && ($("#me_signout").onclick = async () => {
    if (isCloud()) { try { await cloud().logout(); } catch (_) {} location.reload(); }
    else { localLogout(); op.render(); }
  });
  $("#me_pw_btn") && ($("#me_pw_btn").onclick = async () => {
    const v = $("#me_pw").value;
    const r = await localSetPw(u.id, v);
    if (r.error) { op.toast(errMsg(r.error)); return; }
    $("#me_pw").value = ""; op.toast(t("acc.me.pwchanged"));
  });

  if (!canManage()) return;
  $("#usr_add") && ($("#usr_add").onclick = addUserModal);

  // load + render the team table
  fetchUsers().then(list => {
    const host = $("#usrTeam");
    if (!host) return;
    host.innerHTML = teamTable(list);
    bindTeamRows();
  });
}

function bindTeamRows() {
  const op = OS();
  $$(".usr-role").forEach(sel => sel.onchange = async () => {
    const r = await opUpdate(sel.dataset.uid, { role: sel.value });
    op.toast(r.error ? errMsg(r.error) : t("acc.team.updated"));
    if (r.error) op.render(); else refreshTeam();
  });
  $$(".usr-toggle").forEach(b => b.onclick = async () => {
    const list = await fetchUsers();
    const cur = list.find(x => x.id === b.dataset.uid);
    const r = await opUpdate(b.dataset.uid, { active: !(cur && cur.active) });
    op.toast(r.error ? errMsg(r.error) : t("acc.team.updated"));
    refreshTeam();
  });
  $$(".usr-pw").forEach(b => b.onclick = async () => {
    const pw = prompt(t("acc.me.newpw"));
    if (pw) { await localSetPw(b.dataset.uid, pw); op.toast(t("acc.me.pwchanged")); }
  });
  $$(".usr-del").forEach(b => b.onclick = async () => {
    if (!confirm(t("acc.team.delete") + "؟")) return;
    const r = await opRemove(b.dataset.uid);
    op.toast(r.error ? errMsg(r.error) : t("acc.team.deleted"));
    refreshTeam();
  });
}

function refreshTeam() {
  fetchUsers().then(list => { const host = document.querySelector("#usrTeam"); if (host) { host.innerHTML = teamTable(list); bindTeamRows(); } });
}

function addUserModal() {
  const op = OS();
  op.openModal(`
    <div class="modal__head"><h3>${t("acc.add.title")}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal__body">
      <div class="field"><label>${t("fld.name")}</label><input id="u_name" /></div>
      <div class="field"><label>${t("fld.email")}</label><input id="u_email" type="email" /></div>
      <div class="field"><label>${t("fld.password")}</label><input id="u_pw" type="text" placeholder="••••" /></div>
      <div class="field"><label>${t("acc.team.role")}</label>
        <select id="u_role">${ROLES.filter(r => r !== "admin").map(r => `<option value="${r}">${esc(t("role." + r))}</option>`).join("")}<option value="admin">${esc(t("role.admin"))}</option></select>
      </div>
      <p id="u_err" style="color:var(--st-overdue);font-size:12.5px"></p>
    </div>
    <div class="modal__foot">
      <button class="btn" data-close>${t("btn.cancel")}</button>
      <button class="btn btn--primary" id="u_save">${t("btn.save")}</button>
    </div>`);
  const q = (s) => document.querySelector(s);
  q("#u_save").onclick = async () => {
    q("#u_save").disabled = true;
    const r = await opAdd({ name: q("#u_name").value, email: q("#u_email").value, password: q("#u_pw").value, role: q("#u_role").value });
    if (r.error) { q("#u_err").textContent = errMsg(r.error); q("#u_save").disabled = false; return; }
    op.closeModal(); op.toast(t("acc.team.added")); refreshTeam();
  };
  $$("[data-close]").forEach(b => b.onclick = op.closeModal);
}

registerModule({
  id: "account", icon: "👤", labelKey: "nav.account",
  titleKey: "page.account", subKey: "page.account.sub", order: 95,
  view, mount,
});
