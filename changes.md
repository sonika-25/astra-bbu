# Change log

## 2026-07-15 — Computed status model, launch creation, subtasks

- Launch readiness is now COMPUTED from task statuses, not hand-set. Each status carries a weight (not-started 0, delayed 1, at-risk 2, on-track 3, completed 4); readiness = Σ weight / (task count × 4). Launch status follows the score: ≥80% on track, ≥55% at risk, below that delayed (red only when real overdue work exists). Weights live in one constant (STATUS_WEIGHT) for easy tuning.
- Task status is date-aware: an overdue, incomplete task auto-flags delayed; one due within a month flags at risk. Completed/not-started stick. Portfolio now spreads 5 on-track / 7 at-risk / 4 delayed; the Italy demo stays 78% at-risk with 3 delayed Medical tasks.
- Renamed the "Portfolio" nav item and page heading to "Overview Dashboard".
- Activated the Create Launch button: a modal (Brand, Country, Status, Phase, Target Date) clones the task template via the generator, inherits the launch lead from an existing same-brand or same-country launch, and opens the new launch. Accepts dates like "Jul/26".
- Every task now ships with 2–3 pre-generated subtasks, rendered as indented, numbered sub-rows (1.1, 1.2) with their own checkbox, status, owner and dates. Adding subtasks still works; the old detail-panel Subtasks tab was removed as redundant.

- Report-tab exports are now genuine files built from live launch data, not mock names: CSV (native), Excel via SheetJS, PDF via jsPDF + autotable, PowerPoint via pptxgenjs.
- "PPT of gantt" requests render an actual drawn Gantt — status-coloured bars on a date axis, task/brand labels, legend, paginated 12 tasks per slide.
- Every other artifact (task table, milestone timeline, launch calendar, launch summary, handoff report) exports as a real formatted table in the requested format.
- Generating a report triggers an immediate browser download; the Downloads tab keeps the blobs so files can be re-downloaded any time in the session.

## 2026-07-15 — Unified floating AI assistant

- Consolidated every on-page bot (Analytics Advisor, Report Generator, Action Bot, Export Assistant, My Tasks assistant) into a single floating ✦ button, bottom-right, available on every page.
- The assistant opens a tabbed panel: Analytics (intent-parsed data answers scoped by portfolio/brand/function), Report (natural-language export builder, e.g. "ppt of gantt of medical tasks"), Action (dropdown controls to update task status or launch date), and Downloads (session export history).
- Removed the old bot boxes from Launch Summary, Launch Pipeline and My Tasks; deleted the now-orphaned AiAssistants and ActionBot components.
- Fixed a latent duplicate-key bug: generated task IDs used the first three letters of the function name, so "Marketing" and "Market Access & Pricing" collided within a phase. IDs now use the function index and are unique.

## 2026-07-15 — Home and portfolio refresh

- Reworked the home screen into a denser, more deliberate dashboard composition with a branded readiness hero and clearer visual hierarchy.
- Improved card hierarchy, hover states, priority treatments, and the milestone timeline so information is easier to scan.
- Refined the portfolio overview with a stronger page header, KPI cards, filters, and launch-list presentation.
- Added responsive rules so the key dashboard areas remain usable on smaller screens.

## 2026-07-15 — Country matrix visibility

- Increased the matrix viewport height so more product rows remain visible before scrolling.
- Expanded the country matrix to use the full available screen width and tightened column spacing so more countries are visible at once.
- Set the portfolio overview to open on the country matrix by default.

## 2026-07-15 — Action Bot

- Added Action Bot to the launch workspace, with session-based controls to update the launch date, status, and assigned launch lead.
- Moved Action Bot into the open summary-grid slot beside Global → Market handoffs, and converted it to a prompt-and-response interface.
- Added a compact Action Bot shortcut to Launch Pipeline, with a launch selector and direct open action.
- Replaced the Pipeline shortcut-only experience with the same in-page Action Bot used in launch summaries; Pipeline updates now reflect within the active session.
- Removed the Pipeline Action Bot launch selector; it now opens directly for the first launch in the active filtered set.
- Condensed Export Assistant into inline Excel and PDF controls beside the Pipeline filters.

## 2026-07-15 — Home banner

- Replaced the Home banner's decorative background treatment with a clean, solid navy colour.

## 2026-07-15 — Task View interactions

- Added inline task-name editing and work-area task creation.
- Added expandable task panels with functional subtasks (including add and complete), plus mock dependency and comment views.

## 2026-07-15 — Home page simplification

- Rebuilt Home around a simple dashboard structure: user statistics, upcoming launches, six quick actions, upcoming personal tasks, and an always-open AI assistant.
- Replaced the decorative Home layout with straightforward white cards, compact lists, and practical navigation actions based on the supplied dashboard and layout references.
- Repositioned the expanded, real AI Assistant as a permanent Home-page panel beside Quick Actions; the floating assistant remains available on other pages.
- Refined the Home visual hierarchy with a compact greeting bar, icon-led quick actions, stronger card accents, and a two-by-two working layout.
- Further condensed the Home greeting and stats bar to reduce its vertical footprint.
- Tightened Home card spacing and transformed Quick Actions into compact, icon-led navigation tiles with clear colour accents.
- Enlarged and refined Quick Action icons for stronger visual scanning.

## 2026-07-15 — Task View subtasks

- Added a Task View control to expand or collapse all task Subtasks panels in one action.
- Added a separate Task View control to expand or collapse all task-detail panels.

## 2026-07-15 — Task View density and navigation

- Compressed the Task View workspace header, milestone dates, tabs, and filters so task content appears substantially higher on the page.
- Added a collapsible Focus Areas sidebar with a compact edge toggle.
- Repositioned the open-state Focus Areas toggle to the outside edge so it does not cover labels.
- Updated “Expand all tasks” to expand the task groups within every Focus Area, rather than individual task-detail panels.

## 2026-07-15 — Launch summary density

- Condensed the launch-summary header, readiness panel, governance timeline, and content-card spacing to bring actionable content higher on the page.
- Restructured the top launch header and governance milestones as compact information strips instead of tall cards.

## 2026-07-15 — Task View defaults and editing

- Set Task View to open all Focus Area task groups by default while keeping subtasks collapsed and the Focus Areas sidebar visible.
- Replaced inline task-name editing with a full task editor modal covering task metadata, ownership, dates, status, flags, and comments.

## 2026-07-15 — Home AI panel

- Kept the permanent Home AI panel at its compact embedded size; enlarged the floating AI panel opened from other pages instead.
- Anchored the floating assistant's message box at the bottom and moved Analytics answers into the main conversation area above it.

## 2026-07-15 — Portfolio overview density

- Replaced the Portfolio overview's bright banner with a short neutral header consistent with Home.
- Tightened KPI cards, controls, filters, legend, and matrix spacing so portfolio content begins higher on the page.
- Moved portfolio KPI counts into the Overview header, improved the Create Launch call-to-action, and replaced filters with Disease Area, Brand, Status, and Country.
- Expanded the My Tasks workspace to the full content width.
- Restored comfortable header and table insets in Portfolio Overview while retaining the compact overall layout.
- Synced the default Task View button state so initially expanded task groups correctly show “Collapse all tasks”.
- Made the floating AI Action tab automatically select the launch open in Launch Overview or Task View.
- Added Italy, Canada, Brazil, China, and Russia to the launch data and Country Matrix; the matrix now uses compact brand/disease labels and a sticky first column for horizontal scrolling.
- Began CSS modularization by moving the Portfolio Overview's page-specific layout, filters, list, and matrix styles into `src/styles/overview.css`.
- Rebalanced Home to a 70/30 content split, added soft KPI and assistant-tab colours, and compacted the Portfolio controls and country matrix with status-tinted launch cards.
- Added a Home high-risk task callout that links directly to the high-risk My Tasks view, plus a live portfolio-readiness ring beside the KPI cards.
- Flattened Country Matrix launch cards into landscape status tiles and reduced the Home KPI-card and readiness-ring footprint.
- Arranged Country Matrix tiles with phase and target date on the top row, then the readiness bar and percentage beneath.
- Corrected compact Country Matrix tile sizing so phase/date text cannot overlap and the status bar remains fully visible.
- Shortened matrix phase labels to the current L-X value, tightened tile typography, and darkened the progress-track background.
- Narrowed and centered Home KPI cards while enlarging the readiness ring; removed bold filter typography from Portfolio Overview.
- Reduced Home KPI cards in both dimensions and synchronized Task View edits with shared in-memory launch data so blocked summaries update during the same session.
- Resized Home KPI cards to compact square-like tiles with larger, bolder values and labels matching the provided reference.
- Changed the Home Active KPI value from black to the app's dark navy.
- Lightened the Home Active KPI value to a clearly visible medium-dark blue.
- Matched the Home Active KPI label colour to its blue value.
- Converted Home KPI tiles from navigation buttons into non-interactive informational cards.
- Updated Home quick actions so At-risk launches opens a pre-filtered Overview and Upcoming launches opens the Pipeline calendar on the current year.
- Moved the Country Matrix status legend into the center of the Overview filter toolbar and compacted it to fit alongside the controls.
- Removed the Launch Summary footer actions and placed Task View and Functional View navigation at the bottom of their relevant summary cards.
- Added prominent Task View and Functional View actions above the Launch Summary content boxes while retaining the contextual card links.
- Reworked Portfolio Overview controls to match the reference: moved the list/matrix switcher beside KPIs and added CSV Export, Clear, and the status legend to the filter row.
- Added fuzzy report-intent matching so common one-character typos such as `gant` still resolve to the intended export artifact.
- Reconciled Global handoff status with task completion: completed tasks now always show as Accepted, including after Task View and AI status updates.
- Added a Render blueprint for static deployment with `npm ci && npm run build`, `./dist` publishing, and SPA route rewrites to `index.html`.
