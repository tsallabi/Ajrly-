/* Analytics & Reporting module — stub (implemented by workstream agent) */
import { registerModule } from "../registry.js";
import { registerStrings, t } from "../i18n.js";

registerStrings({
  ar: { "nav.analytics": "التحليلات", "page.analytics": "التحليلات والتقارير", "page.analytics.sub": "مؤشرات أداء متقدمة" },
  en: { "nav.analytics": "Analytics", "page.analytics": "Analytics & Reports", "page.analytics.sub": "Advanced performance insights" },
});

registerModule({
  id: "analytics",
  icon: "📈",
  labelKey: "nav.analytics",
  titleKey: "page.analytics",
  subKey: "page.analytics.sub",
  order: 50,
  view: () => `<div class="card"><div class="empty"><div class="empty__icon">📈</div><p class="muted">${t("page.analytics.sub")}…</p></div></div>`,
  mount: () => {},
});
