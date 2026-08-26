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
### 2026-08-24 — Modern landing page + plans + subscribe/auth/pay flow (Prompt 21)
- request: "make a landing page modern one for our project design it and make modern with animated background waves blocks like a real ai and add plans free plus premuam and with subscribe and the user takes to auth session register then pay or sign in then pay ... use react and the components and all of react skills the landing page must be powerfull animated transtion"
- implication: New public marketing layer at / (guests only; signed-in users keep the Dashboard), DB-backed plans Free/Plus/Premium (//, yearly = 2 months free — user-approved via pricing question), real backend cookie-session auth (users/sessions tables, Bun.password argon2id — zero new deps), simulated checkout (respects no-SaaS constraint; Stripe swap deferred). Animated canvas background + scroll reveals + transitions with ZERO new runtime dependencies.
- execution constraint (user): "dont edit the engine" — all backend changes additive only: migration 011 + new auth/billing modules + registration lines in app.ts. No changes to roadmap engine/modeler/diagrams/docs-generator/governance/seeds.
- mandatory or optional: mandatory (user-requested post-completion scope)
- affected phase or artifact: prompts/21-landing-pricing-auth.md, backend migration 011 + schema.sql + modules/auth.ts + modules/billing.ts + app.ts registration, frontend entities user/plan/subscription + widgets WaveCanvas/PublicShell + pages Landing/Auth/Checkout + App.tsx gating + AppShell account chip, tests, docs/features/landing-billing.md (FEAT-014)

### Request 2026-08-24 (post-OPT-004) — Landing page polish & fixes

User requests (verbatim intent):
1. Logo: create a real logo mark — NOT the letters 'SF' (user says that is wrong).
2. Nav menu elements have no active/inactive state — add active-state styling.
3. Features and How-it-works sections on the landing page appear EMPTY — fix content visibility.
4. Make a very nice modern footer on the landing page.
5. Anchor bug: while on /signin, clicking 'Features' produces /signin#features which scrolls nowhere; must be /#features (navigate home, then scroll).
6. Question: does create account / sign in actually work? (answer clearly)
7. Provide a summary of what we did.

Status: accepted — implementation started same day.

### Request 2026-08-24 (cont.) — Auth hardening: OTP + forgot password + sign-out bug

User requests:
1. Fix sign-out: user stays stuck on dashboard after clicking Sign out.
2. Add email OTP verification for registration.
3. Add forgot-password / password-reset flow.
4. Email sending via the user's own Gmail account (SMTP).

User decisions (via questions):
- Login BLOCKED until email verified (existing account grandfathered as verified).
- Hand-rolled zero-dependency SMTP client over node:net/node:tls (no nodemailer).
- SMTP config HARD REQUIRED when running (no console fallback).
- Analytics plan remains PARKED awaiting approval.

Status: accepted — implementation started same day (DEC-028).

### 2026-08-25 — Dev bring-up bug reports (after auth hardening)

1. Show/hide password toggle missing on AuthPage password fields. -> FIXED: PasswordInput component with eye toggle on both password fields.
2. Plans not shown on landing page. -> ROOT CAUSE shared with (3): API refused to start without SMTP config, so GET /plans was ECONNREFUSED. Resolves once backend/.env is configured.
3. Terminal log showed SmtpConfigError at boot. -> BY DESIGN (DEC-028 hard require). User chose to configure Gmail now rather than a dev console fallback: created backend/.env.example (committed template) + backend/.env (gitignored, user pastes Gmail App Password).

## Request (2026-08-25): Handle payment plans
User: authentication/sign-in/sign-out/OTP/forgot-password are done; next task is "handle the payment plans". Existing base: DEC-026 plans/subscriptions tables, simulated Luhn checkout, cancel endpoint, CheckoutPage. Direction (simulated vs real provider) pending user decision because real providers violate the no-SaaS constraint without explicit approval.

## Request (2026-08-25): Business model + presentation inside projects + dashboard redesign
User wants: (1) when creating a project the user can also create a business model and a presentation inside the project - all in one place; (2) the dashboard itself is bad - do a FULL analysis of it and the data it shows, then rebuild it.
Clarifying answers (question round): Business Model Canvas format; presentation delivery = HTML deck + PDF print PLUS real .pptx export (pptxgenjs dependency explicitly approved); dashboard depth = full redesign + aggregate GET /dashboard/summary endpoint.
Phase order agreed with user: C dashboard-redesign -> A business-model-canvas -> B pitch-presentation (B consumes A's data).

### 2026-08-25 — Deep project analysis
- request: "analyze the project dive in it" — perform a thorough assessment of the available `D:\specforge-studio` codebase.
- implication: Conduct a non-destructive architecture, implementation, dependency, quality, verification, operational, and risk review; deliver prioritized findings and recommended next actions without starting optional implementation.
- mandatory or optional: mandatory (user-requested analysis)
- affected phase or artifact: repository-wide source, configuration, tests, documentation, and memory records; final technical assessment.


### 2026-08-25 — Execute priorities 1 through 7
- request: User approved starting with priority 1 and executing all seven recommended workstreams: build repair; ownership/authorization; authentication and operational hardening; CI and deployment packaging; UX and browser-level verification; and remaining approved backlog enhancements.
- implication: Convert the assessment recommendations into an implementation program. Preserve React/FSD, Node.js/SQLite, English-only documentation, additive-first migrations, no manual Mermaid, database-as-source-of-truth, and no unapproved external SaaS.
- mandatory or optional: mandatory (explicit user approval for this implementation scope)
- affected phase or artifact: build/typecheck integration, backend authorization and migrations, auth/runtime configuration, CI/deployment files, frontend UX/tests, optional backlog features, project memory, and verification report.

### 2026-08-25 — Simplify settings and add modern account navigation
- request: Analyze the dashboard settings because some settings are unacceptable and unnecessary; redesign the sidebar so account controls do not require scrolling; add a modern profile/account surface with easy access to the account and sign-out.
- implication: Audit and simplify SettingsPage; separate personal account/profile from workspace administration; move account actions into an always-visible desktop/mobile profile menu; preserve billing and necessary workspace configuration; add a dedicated profile route backed by existing authenticated user data.
- mandatory or optional: mandatory (user-requested UX correction)
- affected phase or artifact: frontend AppShell, AccountChip/account menu, SettingsPage, App routes, new account profile page, frontend verification and memory files.

### 2026-08-25 — Replace logo, rebuild landing footer, and confirm admin monitoring scope

The user requested a stronger logo on both the landing page and dashboard, a more technical and commercially credible landing-page footer, and a clear answer about whether the admin monitoring dashboard is complete. The implementation should update the shared logo and favicon consistently, keep the frontend within React/FSD and zero unapproved SaaS integrations, and audit the existing admin/operations requirements before claiming completion.

### 2026-08-26 — Approve admin monitoring, resume preview, and add a Windows dashboard app

The user approved both pending actions: resume the running-preview visual review and implement the protected global admin monitoring control plane. The user also requested a Windows desktop application for the dashboard and a landing-page download path for that app.

Implications: add a security-sensitive global admin role and protected admin operations/billing surfaces without exposing secrets; inspect and verify the preview when available; add a Windows desktop packaging workspace or wrapper that reuses the existing React dashboard and provide a download CTA that points only to a real configured release artifact, never a misleading placeholder. Preserve React/FSD, Node.js/SQLite, English-only docs, database-as-source-of-truth, and no unapproved SaaS integrations.

Mandatory or optional: mandatory user-requested scope for this task; the desktop release artifact may remain pending if a Windows signing/build environment or release URL is not available.

Affected phase or artifact: backend admin authorization/schema/modules, frontend admin routes, desktop workspace/package scripts, landing-page download CTA, operational docs, tests, and memory checkpoints.


### 2026-08-26 — Seed administrator and restrict signup domains
- request: Create a seeded administrator `admin@specforge.com` with password `password123`, and block spam registrations so only trusted domains may sign up.
- implication: Added explicit idempotent `backend/scripts/seed-admin.ts` / `seed-admin` command, verified email/admin flags, hashed password storage, configurable `TRUSTED_SIGNUP_DOMAINS`, and a clear signup rejection error/UI message. Existing users can still sign in; the signup allowlist applies only to new registrations.
- mandatory or optional: mandatory (user-requested)
- affected phase or artifact: backend auth/config/seed command, frontend AuthPage, backend auth regression tests, backend/.env.example


### 2026-08-26 — Activate Windows download on landing page
- request: The Windows action on the landing page must let users download the Windows app now instead of showing “soon”.
- implication: Bundle the verified Windows installer as a same-site public asset, make the landing CTA use that asset by default, preserve `VITE_WINDOWS_DOWNLOAD_URL` as an optional hosted-release override, and verify the built asset is served.
- mandatory or optional: mandatory (user-reported blocking issue)
- affected phase or artifact: frontend/public/downloads, PublicShell Windows CTA, frontend environment documentation, landing tests, production build.


### 2026-08-26 — Upgrade Business Model and Presentation workspaces
- request: Continue editing the Business Model engine to feel like Miro and enhance the Presentation to feel like a real presentation with tools.
- implication: Upgraded the BMC into a spatial sticky-note canvas with persisted coordinates/colors, filtering, zoom/fit, mini-map, block reassignment, inspector editing, and auto-save. Upgraded the Presentation into a Presentation Studio with slide thumbnails, draft editing, add/duplicate/delete/reorder, themes, grid/zoom, speaker notes, presenter mode, keyboard navigation, reset-to-live-data, and preserved PPTX/print flows.
- mandatory or optional: mandatory (user-requested product enhancement)
- affected phase or artifact: BMC migration/API/types/page/tests, Presentation page/tests, project docs, and memory checkpoints.


### 2026-08-26 — Save every session result in a Markdown file
- request: At the end of every session, save the result inside an MD file in the project.
- implication: Added `docs/session-results/` with a README convention and created a dated result file for the latest BMC/Presentation session. Every future completed session must add its own dated English Markdown result file in addition to updating memory logs.
- mandatory or optional: mandatory (permanent user workflow requirement)
- affected phase or artifact: session-result documentation workflow, docs/session-results/, memory/CONSTRAINTS.md, and all future session completion steps.


### 2026-08-26 — Fixed dashboard navigation and realistic Presentation Studio editor

- request: Make the dashboard sidebar strict/fixed so it does not scroll away with dashboard content; improve the Presentation Studio layout; add image tools, Microsoft PowerPoint-style fonts, a polished Presenter View, and full slide-element add/remove/edit/reorder capabilities.
- implication: Updated the AppShell overflow model and rebuilt the Presentation Studio as a local draft element editor while preserving live-data/PPTX backend boundaries.
- mandatory or optional: mandatory (user-requested enhancement)
- affected phase or artifact: frontend/src/widgets/layout/AppShell.tsx, frontend/src/pages/PresentationPage.tsx, frontend/tests/presentation.test.tsx, docs/features/business-model-presentation-studio.md, docs/session-results/2026-08-26-dashboard-presentation-editor.md


### 2026-08-26 — Resize presentation elements and customize colors

The user requested that Presentation Studio support resizing elements directly inside the slide canvas and allow users to customize text and shape colors freely. Implemented as local working-draft canvas behavior with bounded resize handles and live color inputs.


### 2026-08-26 — Dashboard nav collapse and project-generation agent

- request: Add an expand/collapse icon to the dashboard navigation. Design and eventually implement an agent that connects to a project, reads its Business Model, Presentation, and generated Markdown context, and generates a complete structured project. Support both customer-owned provider keys and a SpecForge-managed provider, with managed access costing more through paid plans and controlled by administrators.
- implication: Navigation compact mode is implemented. A new project-aware generation agent requires provider selection, secure secret handling, plan entitlements, quota/cost controls, structured draft-first generation, authorization, validation, and admin operations. Provider/API implementation remains gated on an explicit first-provider and secret-storage decision.
- mandatory or optional: mandatory for navigation; agent implementation pending architecture approval.
- affected phase or artifact: frontend AppShell, docs/features/project-generation-agent.md, future additive agent/provider modules and admin controls.
