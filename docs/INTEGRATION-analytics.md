# Analytics & Reporting — Integration Notes

Module: `assets/js/modules/analytics.js` (replaces the stub)
Styles: `assets/css/analytics.css` (new file)

## Required coordinator action

Add the stylesheet link to `index.html` `<head>` (after `styles.css`):

```html
<link rel="stylesheet" href="./assets/css/analytics.css" />
```

Without this link the charts/funnel/print layout will be unstyled (the module
still functions and renders, but spacing/colors rely on these classes).

No changes to `app.js` are needed — the module self-registers via
`registerModule()` and is already imported in `app.js`
(`import "./modules/analytics.js";`).

## What was built

### KPI row (4 stat cards)
- Completion rate % (complete / total tasks)
- On-time rate % (completed tasks whose work date <= due date, over completed-with-due)
- Overdue count
- Owner pipeline conversion % (active owners / total owners, div-by-zero guarded)

### Charts (pure hand-rolled SVG/CSS, zero dependencies)
- Tasks by status — SVG donut + legend
- Tasks by team member — horizontal bars (reuses `.barlist`)
- Tasks completed over time — SVG area+line chart bucketed by ISO week
- Content by pillar — bars
- Content by platform — bars (platform is an array; each entry counted)
- Owners by stage — CSS funnel (recruitment → communication → content → active)

All charts are theme-aware (CSS variables only, no hardcoded light colors) and
RTL-aware:
- `.barlist` / flex / grid mirror automatically under `dir="rtl"`.
- The area chart reverses its x-axis order and flips axis-label anchoring in
  Arabic so time still reads correctly.
- The funnel uses logical (inline) alignment so it mirrors in RTL.

### Filters (toolbar, state in module scope)
- Member `<select>` (All + TEAM)
- Date range (two `<date>` inputs) + Reset button
- Changing any filter calls `ctx.render()` to re-render the whole view.
  Filter state (`fMember`, `fFrom`, `fTo`) persists across re-renders because it
  lives at module scope.

Date-range filtering: tasks match if `date` OR `dueDate` is in range; content
matches on `date`; owners match on `lastContact`.

### Export
- Export Tasks / Content / Owners as CSV — built client-side, UTF-8 BOM
  prepended (Excel + Arabic friendly), downloaded via `Blob` + `<a download>`.
  Exports respect the active filters.
- Print report — calls `window.print()`. Print CSS (in `analytics.css`) hides
  `.sidebar/#sidebar`, `.topbar`, toasts, modal host, and the filter/export
  toolbar (`.an-noprint`), and shows a print-only report header
  (`.an-printonly`). It targets shared ids/classes ONLY inside `@media print`
  and does NOT modify `index.html`.

## Data sources (read-only at runtime)
`window.AjrlyOS.db` (`tasks`, `content`, `owners`) and
`window.AjrlyOS.{PILLARS, OWNER_STAGES, TEAM, fmtDate, esc, toast, render}`.
`getLang()` from i18n drives number/date locale (`ar-EG` / `en-GB`).

All labels registered in both `ar` and `en` via `registerStrings` under the
`an.*`, `nav.analytics`, `page.analytics*` keys.

## Validation
`node --check assets/js/modules/analytics.js` → OK.
