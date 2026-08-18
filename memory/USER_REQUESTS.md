# USER_REQUESTS

This file records every user request that affects the project.

The agent must update this file whenever the user gives a new request.

Each request must include:
- date
- request
- implication
- mandatory or optional
- affected phase or artifact

## Request Log

### 2026-08-16 — Inspect repo and configure Freebuff preview
- request: Inspect the connected GitHub repo MohammedRamiAlzend/specforge-studio, configure (but do NOT start) the install, dev/preview, and build commands via the freebuff-preview tooling, and summarize what the project does plus its env var/setup needs.
- implication: Freebuff preview configuration only. Repo has no application code yet, so commands were configured for the planned stack and the preview cannot run until the app is scaffolded.
- follow-up (2026-08-18): Request re-issued after the GitHub repo was re-connected to Freebuff. The repo now contains the FULL application (backend + frontend; Prompts 00–20 code on main). Preview commands re-configured via freebuff-preview tooling — install `bun install`, dev `bun run dev` (port 5173), build `bun run build` — configured but NOT started; the user starts the preview from the Freebuff UI.
- mandatory or optional: mandatory (operational)
- affected phase or artifact: Freebuff preview config; later app phases (05 backend, 06 frontend)

### 2026-08-16 — Adopt MASTER PROMPT as execution OS
- request: Adopt the provided MASTER PROMPT (Project Execution Operating System) as the governing execution protocol and execute the project end-to-end using the memory-driven prompt sequence (00–13).
- implication: Master prompt governs continuity, approval gates, traceability, task pack rules, and completion reporting. Prompt sequence is the required scope.
- mandatory or optional: mandatory
- affected phase or artifact: all phases

### 2026-08-16 — Live example preview for e-commerce project creation
- request: "make live example preview for how creation whould be for eccomerce project" — the preview should show a fully built e-commerce project so the creation flow is demonstrable live.
- implication: Extracted the demo seed into backend/scripts/seed-data.ts (parameterized by projectId/graphId) and added `bun run --cwd backend seed-live` (seed-live.ts). The live DB (backend/data/specforge.db) now contains the Acme Commerce demo as PRJ-0002 (graph GRPH-0002, roadmap RMP-0003, 13 task packs, DIAG-0001 workflow + DIAG-0002 ERD, governance demo APR-0002) alongside the user's own PRJ-0001 "BabRizq" project — user data preserved, never overwritten. Verified through the preview proxy: /api/projects, /api/roadmaps?project=PRJ-0002, /api/diagrams?project=PRJ-0002, /api/governance/validation?project=PRJ-0002 all return real data.
- mandatory or optional: mandatory (user-requested)
- affected phase or artifact: backend/scripts/seed-data.ts, backend/scripts/seed-live.ts, backend/package.json (seed-live script), live preview DB

### 2026-08-16 — Step-by-step guide with example for making an e-commerce project
- request: "generate step by step guid with example for making eccomerce project" — a tutorial that walks through building an e-commerce project with SpecForge Studio, with a concrete example at every step.
- implication: New deliverable docs/tutorial-ecommerce.md (GUIDE-002) — 14 steps (0–13) using the committed Acme Commerce example (PRJ-0001) with real generated outputs (workflow Mermaid, ERD, TASK-0001 pack, APR-0002 flow).
- mandatory or optional: mandatory (user-requested deliverable)
- affected phase or artifact: docs/tutorial-ecommerce.md

### 2026-08-16 — Generate a full detailed project guide
- request: "generate full detaild guid for this projec" — create a comprehensive, detailed guide for the SpecForge Studio project.
- implication: New deliverable docs/guide.md (GUIDE-001) covering principles, layout, stack, execution model, backend/frontend architecture, feature tour, workspace, governance, ops, limitations; GUIDE prefix added to id-convention. Non-phase documentation work.
- mandatory or optional: mandatory (user-requested deliverable)
- affected phase or artifact: docs/guide.md, docs/ontology/id-convention.md

### 2026-08-16 — Defer Prompt 13 and run the preview
- request: "ignore prompt 13 for currnet and run /preview" — pause the required Prompt 13 (deployment and final audit) and launch/verify the Freebuff preview now.
- implication: Prompt 13 remains in the required scope but its execution is explicitly deferred by the user; it must resume when the user says so (it is still the pending next action). Preview run surfaced two fixes: backend dev port pinned to 3000 (Freebuff injects PORT=5173, colliding with Vite) and the Vite /api proxy now strips the /api prefix (backend routes are unprefixed).
- mandatory or optional: mandatory (user-directed ordering override)
- affected phase or artifact: 13-deployment-and-final-audit (deferred); preview/dev config (backend/package.json dev script, frontend/vite.config.ts proxy rewrite)

### 2026-08-16 — Remove plan 13; add plans for complex multi-project functionality
- request: "i want to remove plan 13 and add new plans for it" — remove prompts/13-deployment-and-final-audit.md from the required scope and replace it with new plan(s) covering: (a) project types configurable from Settings (stored in DB, not the static Web/Mobile/API/AI), (b) project creation with a chosen stack per type (.NET, Laravel…) and selectable libraries per stack (MailKit, Scalar…), (c) multi-type projects (Web+Mobile+API, API-only, API+Web) and workspaces that connect projects, (d) per-project sections workflow/data/model/architecture/docs export/tasks plus a new Skills section, (e) cross-project workflow calls (a web-app workflow can call a workflow from the API project by workflow reference), (f) per-project exported docs, (g) customizable node palette with customizable categories (e.g. add a "loop" node) managed from Settings.
- implication: Prompt 13 is removed from required scope; new prompts (13+) replace it. Requires schema changes (project types/stacks/libraries tables, node palette config tables, cross-project reference fields), Settings UI, project creation flow, modeler palette + cross-project node, Skills section, and per-project docs exports.
- mandatory or optional: mandatory (user-requested scope change)
- affected phase or artifact: prompts/13-deployment-and-final-audit.md (removed); new prompts 13+; backend schema + modules; frontend pages (Settings, project creation, modeler, project details, skills)
- confirmed answers (2026-08-16, recorded in DEC-016): multiple types per project; global Settings page for configuration; stacks/libraries editable + pre-seeded; cross-project references via dropdown AND manual ID; explicit linked projects; Skills section = capability skills + tech skills; custom node types can define custom fields; execution = create plans only (no implementation yet).

### 2026-08-16 — Commit completed changes to master
- request: "when u finish commit changes to master" — after all required work (Prompt 16) is complete and the completion report is delivered, commit all changes to the local git repository on the master branch.
- implication: Once the completion protocol is satisfied (all required scope done, memory updated, completion report delivered), stage and commit all project changes to master with a clear message. No push/PR unless subsequently requested.
- mandatory or optional: mandatory (user-requested)
- affected phase or artifact: git repository (master branch), all completed deliverables

### 2026-08-16 — Add an animation/polish prompt for smoother navigation
- request: "add animation prompt at prompts\ for navigation etc.. any thing make website smother" — add a new prompt covering navigation/UI animations and anything making the website smoother; then "implement the plan".
- implication: New Prompt 17 (UI Polish & Motion) created at prompts/17-ui-polish-and-motion.md and implemented: page transitions (sf-page-enter keyed by route), nav micro-interactions, button press feedback, card hover lift, staggered entrances, and prefers-reduced-motion support — implemented WITHOUT a new runtime dependency (Tailwind + plain CSS keyframes). Prompt 16 completion report was already delivered; this is new post-completion scope.
- mandatory or optional: mandatory (user-requested)
- affected phase or artifact: prompts/17-ui-polish-and-motion.md, frontend/src/app/index.css, AppShell.tsx, shared/ui/Button.tsx + Card.tsx + States.tsx, DashboardPage.tsx, ProjectDetailsPage.tsx, frontend/tests/ui-polish.test.tsx, docs/features/ui-polish.md (FEAT-012)

### 2026-08-17 — Second full-detail e-commerce demo (Prompt 18)
- request: "create another full detail seed example of most common ecommerce project" — add a second, full-detail demo seeder for the most common e-commerce project (.NET backend + React frontend) as a new prompt (Prompt 18).
- implication: New prompt prompts/18-ecommerce-full-seeder.md + prompts/README.md update; backend/scripts/seed-ecommerce.ts full-detail seeder (StoreSphere E-Commerce Platform, PRJ-0003/GRPH-0003 live, PRJ-0004/GRPH-0004 committed example, 0100+ child-ID ranges); scripts generate-ecommerce-example.ts + seed-ecommerce-live.ts (+ package.json scripts seed-ecommerce-example / seed-ecommerce-live); committed docs/workspace/generated-example-ecommerce/ (34 files); backend/tests/seed-ecommerce.test.ts (8 tests); memory updates; commit to main.
- mandatory or optional: mandatory (user-requested deliverable)
- affected phase or artifact: prompts/18-ecommerce-full-seeder.md, prompts/README.md, backend/scripts/seed-ecommerce.ts, generate-ecommerce-example.ts, seed-ecommerce-live.ts, backend/package.json, backend/tests/seed-ecommerce.test.ts, docs/workspace/generated-example-ecommerce/, memory/ files, git main branch

### 2026-08-17 — Download generated docs as ZIP (Prompt 19)
- request: "add prompt to prompts/ for adding download as zip button for generated docs" — add a new prompt covering a "Download as ZIP" button for generated docs.
- implication: New prompt prompts/19-docs-zip-download.md + prompts/README.md sequence update to 19. Plan scope (create-plans-only, not yet implemented): a zero-dependency ZIP writer (backend/src/utils/zip.ts using node:zlib deflateRawSync + CRC-32), a new GET /docs/exports/:id/download endpoint (application/zip + Content-Disposition, same paths/content as the detail endpoint, 404 for unknown ids), a Download ZIP button per export on DocsExportPage with loading/error states, a useDownloadDocsExport hook (raw fetch → Blob → object URL → anchor click, bypassing the JSON API client), and backend ZIP tests (validity, entry set/order/content, headers, 404). No schema changes.
- mandatory or optional: mandatory (user-requested)
- affected phase or artifact: prompts/19-docs-zip-download.md, prompts/README.md, backend/src/utils/zip.ts, backend/src/modules/docs-generator/routes.ts, frontend/src/entities/docs/api.ts, frontend/src/pages/DocsExportPage.tsx, backend/tests/docs-zip.test.ts (or docs.test.ts), memory/ files

### 2026-08-17 — Development lifecycle management feature (new branch + PR, no merge)
- request: "think as product owner for specforge and u r professional software engineer what is the missing points exist at project needed for development life cycle? think making specforge more usefull and easy to manamgment projects etc... create plan and implement it in new branch then push changes and generate pull request but u r not allowed to merge it to master" — analyze SpecForge from a product/engineering perspective, identify missing development-lifecycle capabilities, plan + implement improvements on a NEW branch, push, and open a PR (do NOT merge).
- implication: New feature scope (Prompt 20) implemented on a dedicated branch and proposed via PR. Product-owner gap analysis performed first. Scope selected: project execution & delivery management — team members + task assignees, Kanban execution board with task status transitions, release management, issue/defect tracking, project health analytics, global search, and an activity/notification feed. Additive schema (migration 010), new backend modules + doc generators (releases/issues workspace files), FSD frontend pages/widgets, tests, docs (FEAT-013), id-convention prefixes (MEM/RLS/ISS). Prompt 19 (docs ZIP) was finished and committed to main first so the branch starts clean.
- mandatory or optional: mandatory (user-requested)
- affected phase or artifact: prompts/20-project-execution-management.md, prompts/README.md, backend schema + modules + docs generator, frontend FSD pages, tests, docs, git new branch + PR (no merge to main)
- follow-up (2026-08-18): Prompt 20 implementation COMPLETED. Backend was merged to main via PR #4 (migration 010, team/issues/releases/health/search/activity modules, tasks PATCH + assignee filter, issues.md/releases.md workspace files, execution.test.ts). The remaining FRONTEND layer was completed on main in the 2026-08-18 continuation session: entities team-member/issue/release/health/search/activity (+ task assignee_id/useUpdateTask), IssuesPage + ReleasesPage, TasksPage Kanban board (status columns, per-card status/assignee selects, assignee filter, board/table toggle), widgets HealthCards/HealthMiniCard/ActivityFeed/TeamSection/SearchBox, routes + nav + dashboard/overview integrations, FEAT-013 + MEM/ISS/RLS prefixes, frontend/tests/execution.test.tsx. Demo seeds (Acme + StoreSphere) carry team/issues/releases/assignees; example workspaces regenerated to 36 files each. Verified: typecheck clean, 201 tests / 0 fail (26 files, 926 expects), backend smoke PASS. ALL REQUIRED SCOPE (Prompts 00–20) COMPLETE.