/* ============================================================
   Ajrly OS — Account & Team management (self-contained)
   Routed page (#/account):
     • Everyone: their profile + change password + sign out.
     • Admin: full user management (add employee, set role,
       activate/deactivate, reset password, delete).
   No backend — uses the local auth engine.
   ============================================================ */
import { registerModule } from "../registry.js";
import { registerStrings, t, getLang } from "../i18n.js";
import { currentUser, users, can, ROLES, logout, updateUser, addUser, setPassword, removeUser } from "../auth.js";

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
    "acc.team.empty": "لا يوجد مستخدمون",
    "acc.team.name": "الاسم", "acc.team.email": "البريد", "acc.team.role": "الصلاحية",
    "acc.team.status": "الحالة", "acc.team.active": "نشط", "acc.team.disabled": "معطّل",
    "acc.team.activate": "تفعيل", "acc.team.deactivate": "تعطيل",
    "acc.team.resetpw": "تعيين كلمة مرور", "acc.team.delete": "حذف",
    "acc.team.added": "تمت إضافة الموظف", "acc.team.updated": "تم التحديث", "acc.team.deleted": "تم الحذف",
    "acc.team.err.exists": "البريد مستخدم مسبقاً", "acc.team.err.missing": "أكمل كل الحقول",
    "acc.team.err.lastadmin": "لا يمكن إزالة آخر مدير عام",
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
    "acc.team.empty": "No users",
    "acc.team.name": "Name", "acc.team.email": "Email", "acc.team.role": "Role",
    "acc.team.status": "Status", "acc.team.active": "Active", "acc.team.disabled": "Disabled",
    "acc.team.activate": "Activate", "acc.team.deactivate": "Deactivate",
    "acc.team.resetpw": "Set password", "acc.team.delete": "Delete",
    "acc.team.added": "Employee added", "acc.team.updated": "Updated", "acc.team.deleted": "Deleted",
    "acc.team.err.exists": "Email already used", "acc.team.err.missing": "Fill all fields",
    "acc.team.err.lastadmin": "Cannot remove the last admin",
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
const initials = (s) => String(s || "?").trim().slice(0, 2).toUpperCase();
const roleColor = { admin: "var(--brand)", manager: "var(--st-complete)", member: "var(--st-progress)", viewer: "var(--muted)" };
function roleBadge(r) { const c = roleColor[r] || "var(--muted)"; return `<span class="badge" style="background:color-mix(in srgb, ${c} 14%, transparent);color:${c}">${esc(t("role." + r))}</span>`; }

function view() {
  const me = currentUser();
  if (!me) return `<div class="card"><div class="empty"><div class="empty__icon">🔒</div></div></div>`;
  const manage = can("manageUsers", me);

  const profile = `
  <div class="card">
    <div class="flex" style="gap:14px;align-items:center;margin-bottom:14px">
      <div class="user-chip__avatar" style="width:54px;height:54px;font-size:20px">${esc(initials(me.name))}</div>
      <div>
        <div style="font-weight:700;font-size:17px">${esc(me.name)}</div>
        <div class="muted">${esc(me.email)}</div>
        <div style="margin-top:6px">${roleBadge(me.role)}</div>
      </div>
    </div>
    <div class="field"><label>${t("acc.me.newpw")}</label>
      <div class="flex" style="gap:8px">
        <input id="me_pw" type="password" class="input" style="flex:1" placeholder="••••••" />
        <button class="btn" id="me_pw_btn">${t("acc.me.changepw")}</button>
      </div>
    </div>
    <button class="btn btn--danger" id="me_signout" style="margin-top:14px">⎋ ${t("acc.me.signout")}</button>
  </div>`;

  let team = "";
  if (manage) {
    const list = users();
    team = `
    <div class="card">
      <div class="card__head">
        <span class="card__title">${t("acc.team.title")}</span>
        <button class="btn btn--primary btn--sm" id="usr_add">${t("acc.team.add")}</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>${t("acc.team.name")}</th><th>${t("acc.team.email")}</th>
          <th>${t("acc.team.role")}</th><th>${t("acc.team.status")}</th><th></th>
        </tr></thead>
        <tbody>${list.map(u => `<tr data-uid="${u.id}">
          <td><span class="flex" style="gap:8px"><span class="avatar-sm">${esc(initials(u.name))}</span>${esc(u.name)}</span></td>
          <td class="muted">${esc(u.email)}</td>
          <td>
            <select class="input usr-role" data-uid="${u.id}">
              ${ROLES.map(r => `<option value="${r}" ${u.role === r ? "selected" : ""}>${esc(t("role." + r))}</option>`).join("")}
            </select>
          </td>
          <td>${u.active ? `<span class="badge badge--complete">${t("acc.team.active")}</span>` : `<span class="badge badge--closed">${t("acc.team.disabled")}</span>`}</td>
          <td><div class="flex" style="gap:6px">
            <button class="btn btn--sm usr-toggle" data-uid="${u.id}">${u.active ? t("acc.team.deactivate") : t("acc.team.activate")}</button>
            <button class="btn btn--sm usr-pw" data-uid="${u.id}">🔑</button>
            <button class="btn btn--sm btn--danger usr-del" data-uid="${u.id}">🗑</button>
          </div></td>
        </tr>`).join("")}</tbody>
      </table></div>
      <div class="muted" style="margin-top:12px;line-height:1.9">
        ${ROLES.map(r => `<div>${roleBadge(r)} <span style="font-size:12px">${esc(t("role." + r + ".d"))}</span></div>`).join("")}
      </div>
    </div>`;
  }

  return `<div class="grid cards-2" style="align-items:start">${profile}${team}</div>`;
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
    const r = await addUser({ name: q("#u_name").value, email: q("#u_email").value, password: q("#u_pw").value, role: q("#u_role").value });
    if (r.error) { q("#u_err").textContent = t("acc.team.err." + r.error) || r.error; return; }
    op.closeModal(); op.toast(t("acc.team.added")); op.render();
  };
  document.querySelectorAll("[data-close]").forEach(b => b.onclick = op.closeModal);
}

function mount() {
  const op = OS();
  const me = currentUser();
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  $("#me_signout") && ($("#me_signout").onclick = () => { logout(); op.render(); });
  $("#me_pw_btn") && ($("#me_pw_btn").onclick = async () => {
    const v = $("#me_pw").value;
    const r = await setPassword(me.id, v);
    if (r.error) { op.toast(t("role.viewer")); return; }
    $("#me_pw").value = ""; op.toast(t("acc.me.pwchanged"));
  });

  if (can("manageUsers", me)) {
    $("#usr_add") && ($("#usr_add").onclick = addUserModal);
    $$(".usr-role").forEach(sel => sel.onchange = () => {
      const r = updateUser(sel.dataset.uid, { role: sel.value });
      if (r.error) { op.toast(t("acc.team.err." + r.error)); }
      op.render();
    });
    $$(".usr-toggle").forEach(b => b.onclick = () => {
      const u = users().find(x => x.id === b.dataset.uid);
      const r = updateUser(b.dataset.uid, { active: !u.active });
      op.toast(r.error ? t("acc.team.err." + r.error) : t("acc.team.updated")); op.render();
    });
    $$(".usr-pw").forEach(b => b.onclick = async () => {
      const pw = prompt(t("acc.me.newpw"));
      if (pw) { await setPassword(b.dataset.uid, pw); op.toast(t("acc.me.pwchanged")); }
    });
    $$(".usr-del").forEach(b => b.onclick = () => {
      if (!confirm(t("acc.team.delete") + "؟")) return;
      const r = removeUser(b.dataset.uid);
      op.toast(r.error ? t("acc.team.err." + r.error) : t("acc.team.deleted")); op.render();
    });
  }
}

registerModule({
  id: "account", icon: "👤", labelKey: "nav.account",
  titleKey: "page.account", subKey: "page.account.sub", order: 95,
  view, mount,
});
