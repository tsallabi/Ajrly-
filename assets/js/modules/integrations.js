/* Integrations & Automation module — stub (implemented by workstream agent) */
import { registerModule } from "../registry.js";
import { registerStrings, t } from "../i18n.js";

registerStrings({
  ar: { "nav.integrations": "التكاملات", "page.integrations": "التكاملات والأتمتة", "page.integrations.sub": "واتساب، البريد، واستيراد الملاك" },
  en: { "nav.integrations": "Integrations", "page.integrations": "Integrations & Automation", "page.integrations.sub": "WhatsApp, email, owner import" },
});

registerModule({
  id: "integrations",
  icon: "🔗",
  labelKey: "nav.integrations",
  titleKey: "page.integrations",
  subKey: "page.integrations.sub",
  order: 60,
  view: () => `<div class="card"><div class="empty"><div class="empty__icon">🔗</div><p class="muted">${t("page.integrations.sub")}…</p></div></div>`,
  mount: () => {},
});
