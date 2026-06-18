/* Account / Auth / Roles module — stub (implemented by backend agent) */
import { registerModule } from "../registry.js";
import { registerStrings, t } from "../i18n.js";

registerStrings({
  ar: { "nav.account": "الحساب", "page.account": "الحساب والصلاحiات", "page.account.sub": "تسجيل الدخول وإدارة الفريق" },
  en: { "nav.account": "Account", "page.account": "Account & Roles", "page.account.sub": "Sign-in and team management" },
});

registerModule({
  id: "account",
  icon: "👤",
  labelKey: "nav.account",
  titleKey: "page.account",
  subKey: "page.account.sub",
  order: 95,
  view: () => `<div class="card"><div class="empty"><div class="empty__icon">👤</div><p class="muted">${t("page.account.sub")}…</p></div></div>`,
  mount: () => {},
});
