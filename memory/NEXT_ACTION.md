# NEXT_ACTION

## Status Note — 2026-08-25

A non-destructive deep technical assessment was completed at `docs/reviews/technical-assessment-2026-08-25.md` in response to the user’s request to analyze the project.

The assessment verified the current repository after rebuilding only its lockfile-pinned dependency folders. The full automated suite passed with **295 tests, 0 failures, and 1,339 assertions**, and the backend smoke scenario reported `SMOKE TEST OK`. However, the root `bun run typecheck` and `bun run build` gates currently fail because of **11 TypeScript integration errors**. The errors are concentrated in the pitch-presentation frontend integration, with two additional strict test typing errors.

The assessment also identified the principal production-readiness decisions: the current public-account layer does not impose project authorization or tenant isolation; cross-origin cookie deployment is incomplete; SMTP is a hard startup dependency; and deployment/CI/backup packaging does not yet exist.

## Current Next Action

Await the user’s review and explicit approval of a remediation priority. The recommended first action is to repair the 11 build/typecheck errors. Do not begin optional implementation, tenancy redesign, deployment packaging, or any other enhancement without explicit user approval.

## Required Memory Updates After the Next Action

- `memory/PROJECT_MEMORY.md`
- `memory/STATE.json`
- `memory/NEXT_ACTION.md`
- `memory/SESSION_LOG.md`

## Completion State

All previously approved implementation phases remain complete. This assessment is an additional user-requested deliverable; it does not approve or start any optional backlog task.


## Implementation Checkpoint — 2026-08-25

The user-approved priorities 1–7 batch is complete for currently approved work. Build repair, secure mode, project ownership/membership, centralized scope checks, project-member CRUD, credentialed CORS, Secure-cookie configuration, auth throttling, readiness, CI, Docker/Compose packaging, SQLite backup helper, protected frontend routes, grouped navigation, and regression coverage are implemented.

Verification passes: `bun run typecheck`, `bun run build`, frontend tests (100), backend tests (198), authorization tests (3), targeted auth-billing tests (14), and backend smoke (`SMOKE TEST OK`). Docker is not installed on the attached Windows machine, so Compose execution is not verified.

OPT-005 Sprint Planning, OPT-006 Issue-to-Release/Changelog, and the parked analytics plan remain unapproved in project memory. Do not begin those feature tasks without explicit approval for the specific item. Next action is to obtain that decision or resume container verification when Docker is available.


## Business Model and Presentation Visual Pass — 2026-08-25

Completed the requested full UI integration. Added shared visual previews, dashboard quick-action cards, a landing-page showcase section, a premium Business Model strategy hero with color-coded blocks and counts, and a premium Presentation narrative hero with metadata, project return, improved slide cards, and preserved PPTX/download/keyboard/print behavior.

Verification passed: `bun run typecheck`; `bun run build`; focused frontend tests (16 across four files); and complete frontend tests (102 across 19 files, 0 failures). The next action is to review the visual result in the running preview and request any refinements.


## Dashboard User-Flow Test — 2026-08-25

The development preview is running on the attached Windows machine. Landing HTTP 200, backend health/database readiness OK, anonymous dashboard API returns 401 as intended, and registration through the real frontend `/api` proxy returns 201. A route-prefix normalization fix was applied and verified with typecheck plus authorization tests.

The sandbox browser cannot connect to the attached Windows localhost/LAN preview, so rendered browser inspection is still pending. Completing an authenticated dashboard session requires a verified disposable mailbox or user-provided test credentials.


## Side Navigation Usability Pass — 2026-08-25

Completed the dashboard side-navigation redesign. The shell now has collapsible Plan/Design/Outputs groups, active-route indicators, SVG glyphs, active-project context, overview shortcut, no-project empty state, mobile drawer/backdrop/close behavior, automatic drawer dismissal on navigation, and a compact mobile top bar.

Verification passed: typecheck; complete frontend suite (102 tests across 19 files, 0 failures); and production build. Remaining advisory: Vite reports a large JavaScript chunk, but the build succeeds. Next action is human visual review in the running preview.


## Guided Dashboard Redesign — 2026-08-25

Replaced the dense dashboard presentation with a guided command center. The dashboard now clearly explains the sequence: create a project, create the Business Model inside it, then open the generated Presentation. Added prominent “New project”, “Create Business Model”, and “Generate Presentation” actions, a recommended-flow panel, a no-project explanation, and preserved project filters, sorting, health, attention, milestones, and activity.

Verification passed: typecheck; dashboard tests (6 pass); and production build. Next action is human visual review of the redesigned dashboard in the running preview.


## Settings and Account Navigation Checkpoint — 2026-08-25

The user reported that dashboard Settings contains unacceptable low-value items, account/sign-out is buried at the bottom of the scrollable sidebar, and there is no modern profile surface. The implementation response is complete for this pass: `AccountMenu` is now always available in the desktop header and mobile top bar; `/account` provides an authenticated profile page with editable display name and account status; `PATCH /auth/me` updates only the display name and audit-logs the change; and Settings is reduced to Workspace and Billing areas. Environment and Reference tabs were removed from the normal user-facing IA. `AccountChip` is retained only as a compatibility re-export.

Verification: root typecheck passed; production frontend build should be run after this pass; focused dashboard tests passed (6); focused account/settings tests passed (2); focused auth-billing tests passed (16). The broad frontend runner previously stalled without output and was stopped. Docker remains unavailable on the attached Windows machine. Next action is human visual review in the running preview, especially desktop dropdown placement, mobile top-bar menu, profile save feedback, and responsive settings tabs.


## Branding and Admin Monitoring Checkpoint — 2026-08-25

The shared logo and favicon were replaced with a blueprint-style central-system mark that is consistent on the landing page, dashboard shell, profile/account surfaces, and browser tab. The landing footer was rebuilt around technical credibility and commercial conversion: stronger CTA band, engineering positioning, DB-first/traceability proof points, product links, account entry points, and plan links.

Admin monitoring is not complete. The user dashboard and project health pages are workspace telemetry, while `/healthz` and `/readyz` are basic diagnostics. The required protected global admin control plane is still missing: global admin role and route protection, admin plan catalog, admin subscription management, masked simulated payment inspection, operations overview, and admin audit-event access. This gap is documented in `docs/reviews/admin-monitoring-audit-2026-08-25.md` (AUDIT-002).

Verification: root typecheck passed; production build passed; focused landing/UI-polish tests passed (17). Next action is human visual review of the new brand mark/footer in the running preview, followed by explicit approval before implementing the global admin control plane because it is a security-sensitive and production-related scope.


## Admin Monitoring and Windows App Checkpoint — 2026-08-26

The user approved the admin-control-plane implementation and the Windows dashboard application. The attached Windows preview was restarted successfully: landing page and backend health endpoint returned HTTP 200. Sandbox browser visual inspection could not connect to the attached Windows localhost, so the remaining visual review must happen in the attached preview.

Implemented: additive global-admin migration 016; `ADMIN_EMAILS` exact-email bootstrap; deny-by-default `requireAdmin`; protected `/admin/*` authorization; admin overview with DB/SMTP/migration/audit diagnostics; safe plan catalog listing/editing; masked subscriptions and invoices; audited subscription cancel/reactivate; `/admin` frontend route and conditional navigation; Electron Windows wrapper; desktop packaging scripts and release workflow; release-safe `VITE_WINDOWS_DOWNLOAD_URL` landing CTA.

Verification: admin regression suite 3/3 passed; root typecheck passed; production build passed; focused dashboard/account/UI suite 10/10 passed. The local desktop package check reached electron-builder and downloaded Electron but produced no installer before it was stopped. Windows CI is the intended packaging path.

Exact next actions:

1. Configure production `ADMIN_EMAILS` and verify the operator account is email-verified.
2. Connect `ops/backup.sh` success metadata to the admin overview.
3. Set a real deployed `SPECFORGE_APP_URL`, build/sign/publish the Windows installer, and configure `VITE_WINDOWS_DOWNLOAD_URL` in the frontend build.
4. Complete human visual review of the logo/footer and admin page in the attached Windows preview.
5. Keep real payment charging out of scope until provider approval, webhook verification, refunds, and payment-security review are completed.
6. Docker/Compose execution remains unverified because Docker is not installed on the attached Windows machine.


## Trusted Signup and Seeded Admin Checkpoint — 2026-08-26

The requested administrator was seeded locally through `bun run --cwd backend seed-admin` as `admin@specforge.com` with the requested `password123` credential; the password is stored as a hash, the account is email-verified and global-admin, and reseeding is idempotent. New registrations now require `TRUSTED_SIGNUP_DOMAINS`, defaulting to `specforge.com`, with exact-domain and subdomain matching. Untrusted signup requests are rejected before user/OTP creation with `SIGNUP_DOMAIN_NOT_ALLOWED`; the auth UI explains the trusted-work-email requirement. Existing accounts can still sign in.

Verification: 18 auth/billing tests passed, root typecheck passed, and the production frontend build passed. `docs/features/auth-domain-policy.md` and `backend/.env.example` document the configuration. Before public deployment, replace `password123`, configure the real trusted domains, and set the production `ADMIN_EMAILS` value.


## Landing Windows Download Activated — 2026-08-26

The landing page now provides a real Windows download instead of “Windows app · soon”. The verified 84 MB installer is bundled at `frontend/public/downloads/SpecForge-Studio-0.1.0-win-x64.exe`, the public shell defaults to `/downloads/SpecForge-Studio-0.1.0-win-x64.exe`, and `VITE_WINDOWS_DOWNLOAD_URL` remains an optional override for a future signed hosted release. The running preview serves the installer with HTTP 200 and the production build includes the asset.

Next action: deploy the updated frontend build so the bundled installer is published with the site. For a later production release, replace the unsigned bundled artifact with a signed installer or configure the external release URL override.


## BMC and Presentation Studio Enhancement — 2026-08-26

The requested workspace upgrade is implemented. Business Model Canvas now offers a Miro-style spatial board with nine block frames, draggable color-coded sticky notes, persisted coordinates, block reassignment, inspector editing, filtering, zoom/fit, mini-map, and automatic save. Presentation is now Presentation Studio with thumbnails, draft editing, slide lifecycle tools, theme panel, grid/zoom, speaker notes, presenter mode, shortcuts, reset-to-live-data, and retained PPTX/print delivery.

Verification passed for the focused BMC and Presentation frontend/backend suites, root typecheck, production build, and preview route availability. The full frontend test invocation stalled without output and was stopped; targeted suites passed. Next action is human visual review in the attached preview, followed by optional persistence of edited presentation drafts if the user wants deck edits to feed the backend PPTX generator.


## Session Result File Rule — 2026-08-26

The user requires a dedicated Markdown result file after every completed session. This rule is now recorded in `memory/CONSTRAINTS.md`, documented in `docs/session-results/README.md`, and applied retroactively to the latest BMC/Presentation session at `docs/session-results/2026-08-26-bmc-presentation-studio.md`.

Next action: for every future completed session, create a dated descriptive file under `docs/session-results/` before delivering the final response.


## Authenticated workflow and export checkpoint — 2026-08-26

The existing project workflow was completed after the user approved bypassing the Free-plan one-project creation limit. Project `PRJ-0002` now has nine BMC notes across all blocks; presentation data returns nine slides; Docs Export `DOCS-0001` contains 38 Markdown files; and its ZIP download was verified. Direct Business Model `Export MD` and `Export JSON` actions are implemented and tested. The required session result is saved at `docs/session-results/2026-08-26-authenticated-export-workflow.md`.

Next action: visually review the BMC export buttons in the browser when the preview is reachable. Optional future work is to persist Presentation Studio local drafts and include those edits in PPTX generation.


## Fixed dashboard and Presentation editor checkpoint — 2026-08-26

Completed the user-requested fixed desktop sidebar and Presentation Studio redesign. The dashboard main content scrolls independently; Presentation Studio supports local text/image/shape elements, common PowerPoint-style fonts, image URL/upload, element movement, layer ordering, deletion, slide lifecycle actions, and redesigned Presenter View. Typecheck, production build, focused presentation tests, dashboard/account/settings tests, and preview route checks passed.

The completed session result is saved at `docs/session-results/2026-08-26-dashboard-presentation-editor.md`. Next optional enhancement: add persisted slide-element drafts and backend-aware PPTX rendering, which requires a new additive presentation-draft contract and should be approved before implementation.


## Presentation resize and color checkpoint — 2026-08-26

Completed direct in-canvas resizing for text, images, and shapes with bounded corner handles, plus custom text and shape color controls. Focused tests, typecheck, and production build passed. Session result: `docs/session-results/2026-08-26-presentation-resize-colors.md`.

Next optional enhancement remains persisted presentation drafts and backend PPTX rendering for arbitrary user-created elements.


## Navigation and project-generation agent checkpoint — 2026-08-26

The dashboard now supports a persistent desktop collapse/expand icon control and compact icon rail; focused dashboard/UI-polish tests and root typecheck passed.

The project-generation agent proposal is documented at `docs/features/project-generation-agent.md`. The recommended commercial shape is hybrid: customer-owned API keys plus SpecForge-managed provider access on paid plans. Before implementing provider credentials or managed AI calls, obtain explicit approval for the first provider (OpenAI is recommended for the first adapter) and secret storage method (production secret manager/reference, never raw key in browser or logs). The safe flow is context snapshot → strict structured draft → validation → user approval → materialization → exports.


## Leona Agent overlay and plans checkpoint — 2026-08-26

Completed the global Leona Agent dashboard launcher and project-aware usage overlay. Updated landing pricing and seeded plan feature copy for BYOK and Premium managed-provider access while preserving admin-customized plan features. Root typecheck and focused landing/dashboard/UI tests passed.

The overlay is currently a safe activation placeholder: no raw API key is collected, no external provider call is made, and the Generate project draft control remains disabled until the provider adapter, entitlement, quota, and secret-storage decisions are approved. Next action requires approval of OpenAI as first managed provider and production secret-manager/reference-based storage, then implementation of provider settings, context snapshot, structured draft validation, approval, and artifact materialization.


## Project gap analysis — 2026-08-26

Completed the clear inventory of what is done and what remains. Full gap analysis: docs/session-results/2026-08-26-project-gap-analysis.md; indexed in docs/analysis-index.md. Next best action is repair the red tests and implement the approved secure Leona provider backend, then production hardening and deployment.


## Leona OpenAI BYOK Generation Checkpoint — 2026-08-27

The first real Leona generation path is implemented. `POST /leona/generate` authenticates the user, verifies project membership, decrypts the active encrypted OpenAI BYOK connection server-side, builds a sanitized project snapshot, calls the official OpenAI API host, validates a structured draft, persists safe run metadata, and returns a review-ready draft without writing project changes. The dashboard overlay is wired to trigger it and show summary, counts, warnings, loading, and error states.

Verification passed: root typecheck, production frontend build, and focused Leona/dashboard/execution/activity tests (19 tests, 73 assertions). No real provider request was executed because no user API key was supplied.

Next actions: add draft review/approval and materialization APIs, usage/quota accounting, managed-provider routing, provider health validation, and an end-to-end test using a controlled BYOK key. The dated session result is `docs/session-results/2026-08-27-leona-openai-byok-generation.md`.
