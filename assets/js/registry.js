/* ============================================================
   Ajrly OS — Module registry
   Lets feature modules self-register routes/nav without editing
   app.js. Each module file imports this and calls registerModule().
   ============================================================ */

export const moduleRoutes = [];

/**
 * Register a feature module as a routed page.
 * @param {Object} m
 * @param {string} m.id        route id (used in #/id)
 * @param {string} m.icon      nav emoji/icon
 * @param {string} m.labelKey  i18n key for nav label
 * @param {string} m.titleKey  i18n key for page title
 * @param {string} m.subKey    i18n key for page subtitle
 * @param {Function} m.view    () => HTML string
 * @param {Function} [m.mount] () => void  (bind events after render)
 * @param {number} [m.order]   nav ordering hint
 */
export function registerModule(m) {
  moduleRoutes.push(m);
  moduleRoutes.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}
