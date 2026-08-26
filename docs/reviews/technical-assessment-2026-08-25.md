# SpecForge Studio Technical Assessment

**Author:** Manus AI  
**Date:** 25 August 2026  
**Assessment scope:** Architecture, implementation structure, quality gates, operational readiness, and security posture of the local `D:\specforge-studio` repository. This review is non-destructive except for restoring lockfile-pinned dependencies and adding this assessment document.

## Executive Assessment

SpecForge Studio is a **substantive, well-structured engineering-lifecycle platform**, not a prototype shell. It combines a React Feature-Sliced Design frontend with a Fastify/Bun/SQLite backend, persistent visual models, deterministic diagram and documentation generation, roadmap/task packaging, governance, execution management, identity and billing flows, a Business Model Canvas, and a live-generated pitch deck. Its core architectural idea is coherent: **structured database artifacts are the source of truth; Markdown, Mermaid, ZIP exports, and presentations are derived outputs**. [1] [2]

The repository has strong domain breadth and unusually good deterministic test coverage: after a clean reinstallation from `bun.lock`, the full test suite passed **295 tests with 1,339 assertions**, and the backend smoke scenario completed successfully. However, the current branch is **not releasable** because the root typecheck and production frontend build both fail with eleven TypeScript integration errors. The most important strategic defect is not compilation: the public account system is present, but almost all project/workspace APIs remain intentionally unauthenticated and unscoped. Therefore, the system must currently be treated as a **trusted single-workspace/internal tool**, not a secure multi-tenant SaaS. [3] [4] [5]

> **Bottom line:** The underlying product architecture is strong and feature-rich. Before any public deployment, fix the build, explicitly decide and enforce the tenancy boundary, then add a deployable operational baseline.

| Dimension | Assessment | Current verdict |
|---|---|---|
| Product/domain design | Broad, coherent, and traceability-first | **Strong** |
| Backend architecture | Clear modules over a comprehensive SQLite model | **Strong, with scaling/authorization caveats** |
| Frontend architecture | React/FSD foundation with rich product navigation | **Good, currently build-blocked** |
| Automated verification | Strong unit/API/smoke coverage | **Good, but missing end-to-end and CI enforcement** |
| Security for an internal tool | Basic account, session, OTP, and password-recovery controls | **Moderate** |
| Security for a public SaaS | No workspace authorization or tenant isolation | **Not ready** |
| Operations/deployment | Local development and SMTP setup documented | **Not production-ready** |

## What the System Actually Contains

The repository is a Bun monorepo with `backend` and `frontend` workspaces. The codebase contains **51 backend TypeScript files**, **137 frontend TypeScript/TSX files**, **61 SQLite tables**, **117 registered HTTP routes**, **14 additive migration files**, **41 test files**, and **127 Markdown documentation files**. The application is significantly more complete than its small `0.1.0` package version suggests.

| Layer | Primary responsibilities | Main implementation evidence |
|---|---|---|
| Product workspace | Projects, requirements, use cases, workflows, data entities, APIs, components, risks, decisions, milestones, and tests | SQLite core artifact tables and feature routes [2] |
| Visual engineering | React Flow modeler, configurable node palette, structured graphs, workflow/data/architecture/sequence diagrams | Graph and node tables; modeler and diagram modules [2] [4] |
| Derived artifacts | Deterministic Mermaid, generated Markdown workspaces, ZIP downloads, PPTX pitch decks | Diagram, docs-generator, ZIP, and presentation modules [4] [6] |
| Delivery management | Roadmaps, task packs, approvals, governance overlays, issues, releases, team members, health, activity, and search | Roadmap, governance, execution, health, activity, and search modules [4] |
| Commercial/public surface | Landing page, user registration, email OTP, password reset, plans, simulated checkout, invoices, and project limits | Auth, billing, plans/subscription/invoice schema, and public frontend routes [2] [5] |
| Business planning | Per-project Business Model Canvas and a computed nine-slide presentation | BMC notes and presentation module [2] [6] |

The backend is composed through one explicit application root. It opens SQLite, turns on foreign-key enforcement and WAL mode, seeds platform/node-palette/billing reference data idempotently, installs central errors, and registers the feature modules. This keeps service composition easy to audit. [4] [7]

## Architectural Strengths

### 1. The database-centered artifact model is well aligned with the product

The schema uses stable public IDs, relational ownership, foreign keys, indexes, lifecycle status values, traceability links, event logging, governance overlays, and project-scoped child artifacts. This is exactly the right direction for a system that must generate reproducible documentation and agent-executable task packs. Diagram, Markdown, ZIP, and presentation outputs are derived from structured data instead of becoming separate editable sources of truth. [1] [2]

### 2. The platform layers compose rather than duplicate data

Recent capabilities reuse existing artifacts. For example, the dashboard aggregates project, task, issue, approval, milestone, subscription, and quota data without creating a competing reporting store; the pitch deck computes its slides from project, BMC, platform, requirement, delivery, and health data and can render the same model to JSON or PPTX. This is a healthy extension pattern for a product of this kind. [6] [8]

### 3. Validation and traceability are first-class capabilities

The project does more than store specifications. It validates visual graphs, tracks approval-gated governance status, creates audit events, models traceability relationships, derives roadmaps, and materializes executable task packs. The schema comments and module registration show a deliberate lifecycle model rather than disconnected CRUD pages. [2] [4]

### 4. Dependency footprint is restrained

The runtime dependencies are intentionally small: Fastify and Zod on the backend, React/React Query/React Router/Zustand/React Flow on the frontend, and `pptxgenjs` for the explicitly approved deck export. This improves reproducibility and lowers maintenance overhead, although the custom SMTP implementation introduces a distinct operational trade-off. [9] [10]

## Verification Results

I first found an incomplete local dependency tree: package directories existed but lacked actual package files, causing immediate `MODULE_NOT_FOUND` failures. Rebuilding only `node_modules` from the committed lockfile with `bun install --frozen-lockfile` restored the expected packages and did not modify the lockfile or source code.

| Verification command | Result | Interpretation |
|---|---:|---|
| `bun install --frozen-lockfile` | **Passed** | Lockfile resolves reproducibly once dependency folders are rebuilt. |
| `bun test backend/tests frontend/tests` | **Passed: 295 / 0 failed; 1,339 assertions** | Runtime behavior covered by the suite remains green. |
| `bun run --cwd backend smoke` | **Passed: `SMOKE TEST OK`** | Backend end-to-end in-process scenario is green, including auth, billing, BMC, presentation, diagrams, governance, and task features. |
| `bun run typecheck` | **Failed: 11 errors** | Release-blocking source/test TypeScript regressions exist. |
| `bun run build` | **Failed** | Frontend production build is blocked by the TypeScript/source integration errors. |

The build issue is a real quality-gate failure, even though the test suite is green. The root TypeScript configuration includes both production source and tests under strict mode, so every listed compiler error should be resolved rather than suppressed. [11]

## Prioritized Findings

### Critical — Public accounts do not establish project authorization or tenant isolation

Authentication protects the account and billing endpoints, but the code explicitly states that existing internal APIs remain open. The project list is global, project creation accepts a client value for `created_by` when there is no session, and project reads/updates are not owner- or membership-scoped. The internal frontend route tree also does not put product pages behind a route guard. [3] [4] [5]

This is acceptable only if the backend is **never exposed outside one trusted workspace**. If exposed as a public web application, any party able to reach the API can enumerate and mutate project artifacts, configuration, tasks, roadmaps, docs, and other shared data. The present `created_by` column is not a foreign key to `users`, and the schema has no project-membership/role model, so this cannot be solved safely with a single route check.

**Recommendation:** make a product decision before release. Either document and enforce a trusted-internal deployment boundary, or introduce a proper tenant model: `projects.owner_user_id`, project memberships/roles, authorization helpers/prehandlers, ownership filtering in every query, and authorization tests for every resource family. This is the highest-value architectural next step if SpecForge will support more than one user or organization.

### Critical — Production build is currently broken

The root typecheck reports eleven errors. Two are test strictness/type-harness errors; the remaining source errors are concentrated in the pitch-presentation integration. The route imports a named `PresentationPage` while that component is a default export; the page calls an Axios-style `api.get` although the shared client is a function; it passes unsupported `outline` and `icon` Button variants/sizes; and it passes a possibly undefined indexed slide to a component requiring a slide. [11] [12] [13]

| Affected area | Defect class | Consequence |
|---|---|---|
| `frontend/src/app/App.tsx` | Named/default import mismatch | App route cannot typecheck. |
| `frontend/src/pages/PresentationPage.tsx` | API-client contract mismatch | Presentation data/PPTX calls are invalid in the compiled client. |
| `frontend/src/pages/PresentationPage.tsx` | Shared Button contract mismatch | UI code uses variants/sizes not supported by `Button`. |
| `frontend/src/pages/PresentationPage.tsx` | Strict indexed-access violation | Slide rendering is not type-safe for an empty/depleted deck. |
| `backend/tests/business-model.test.ts` | Strict indexed-access violation | Test source fails the root typecheck. |
| `backend/tests/presentation.test.ts` | Test-context type mismatch | Test harness use fails the root typecheck. |

**Recommendation:** repair these contract mismatches as a single short regression-fix change, then require typecheck, tests, smoke, and build all to be green before merging any further feature work. The passing runtime suite is positive evidence, but it must not override a failing production build.

### High — Cross-origin deployments will break cookie authentication without additional work

The client documentation permits a deployed `VITE_API_BASE_URL`, but its fetch wrapper does not set `credentials: "include"`. The backend has no visible CORS configuration. Same-origin development works through the Vite `/api` proxy, but a separately hosted frontend and API would not send the `sf_session` cookie by default and would also require deliberate CORS and cookie-domain policy. [14] [15]

**Recommendation:** deploy frontend and API on the same origin initially, or explicitly add a hardened cross-origin strategy: `credentials: "include"`, exact allowed origins, credentialed CORS, `Secure` cookies, appropriate `SameSite` policy, and integration tests covering the deployed topology.

### High — SMTP is both a startup dependency and a custom protocol implementation

The application constructs the SMTP mailer while building the app and fails startup if any SMTP configuration value is absent. This is an explicit product decision that ensures OTP/password flows are never silently disabled, but it also means that public plans, the landing flow, and all backend endpoints are unavailable during a mail configuration outage or first-time local setup. [4] [16] [17]

The custom mailer has positive qualities—TLS support, timeouts, explicit SMTP state transitions, injected test doubles, and no plaintext secret persistence—but it now carries ongoing protocol/security ownership. There is no visible service health separation between database readiness and mail readiness, nor IP-level controls around registration, login, resend, or password reset.

**Recommendation:** retain the hard requirement if it matches the product decision, but add a readiness endpoint with a dependency breakdown, environment validation in deployment automation, structured mail failure metrics, and IP/account-based rate limiting. Ensure the session cookie adds `Secure` whenever the environment is HTTPS. Consider a reviewed mail library or a carefully abstracted provider seam when external integrations become permitted.

### Medium — Operations are not yet deployable or continuously enforced

There are no Dockerfiles, Compose files, CI workflow files, infrastructure assets, or backup/restore automation in the repository. The root build only invokes the frontend build; the backend's `build` is a TypeScript no-emit validation command. SQLite WAL is a good local and small-workspace choice, but a production deployment still needs a documented persistent volume, scheduled backups, restore exercises, migration runbook, log collection, and a process supervisor. [7] [9] [18]

**Recommendation:** approve the existing deployment-packaging backlog item and define one supported runtime topology. The minimum baseline should include Docker/Compose (or an equivalent host deployment), a persistent SQLite volume, backup/restore commands tested on a copy, environment validation, health/readiness endpoints, and CI gates for typecheck, test, smoke, and frontend build.

### Medium — Test depth is strong, but the escaped build regression reveals a coverage gap

The test suite is substantial and meaningful, particularly on backend API paths and smoke flows. However, frontend tests use `bun:test` and static React rendering; they did not stop an invalid default/named import, an incompatible API client invocation, or unsupported Button props from reaching the branch. There is no visible browser-level end-to-end test suite or CI workflow to reject the failed build. [9] [11] [12]

**Recommendation:** first make `bun run typecheck` and `bun run build` non-negotiable CI checks. Then add a small Playwright-style critical-path suite once deployment tooling exists: registration/OTP/login, project creation, modeler save, diagram preview, Markdown ZIP download, billing settings, and pitch-deck download.

### Medium — Query patterns and user interface scale will need attention as usage grows

The project-list helper enriches each project by loading type selections and then libraries per type, creating an N+1 pattern. Dashboard and activity queries are global by design, and the navigation exposes fourteen project sections in a single long sidebar. These choices are fine for early internal usage, but they will degrade with workspace growth and make discoverability harder. [4] [8] [19]

**Recommendation:** add query-count/performance checks once real data volumes are known; batch project enrichment in SQL; paginate global activity/search/dashboard lists; and group the sidebar into Planning, Design, Delivery, and Outputs with progressive disclosure.

### Medium — Some relational integrity remains application-enforced by design

The schema wisely uses foreign keys for concrete ownership, but traceability links and several cross-artifact relationships are polymorphic or JSON-backed. This supports flexibility, yet the database cannot enforce all target existence, cross-project ownership, or type compatibility. The governance/validation layer compensates for much of this, but the same application validations must remain consistent as features are added. [2]

**Recommendation:** maintain an explicit artifact registry/type map as the single source of allowed polymorphic targets; add database-adjacent integrity sweeps to CI; and place cross-project ownership checks in shared authorization/validation helpers rather than individual route handlers.

### Product Boundary — Billing is simulated, not a payment system

The billing module records subscriptions and invoices and validates mock card input, but it is explicitly a simulated lifecycle. It has no payment-provider tokenization, webhook reconciliation, payment-state machine, tax handling, refunds workflow, PCI scope controls, or idempotency keys for external financial events. [2] [20]

**Recommendation:** present the current feature as a **product-plan simulation** until a provider is explicitly approved. Do not market it as processing real payments. If real monetization becomes a goal, design a separate provider-integrated payment domain rather than extending mock-card logic incrementally.

## Recommended Sequence

| Order | Action | Why it comes now | Expected result |
|---:|---|---|---|
| 1 | Repair the eleven type/build errors and add an import/API-client/Button contract test around PresentationPage. | The production build is blocked today. | `typecheck`, tests, smoke, and build all pass. |
| 2 | Decide the trust boundary: internal single-workspace tool or multi-tenant product. | This choice determines the security architecture. | Clear deployment policy or approved tenant/role plan. |
| 3 | If public/multi-user, implement ownership, membership roles, centralized authorization, and tenant-scoped queries. | Prevents cross-user data exposure and mutation. | Securely scoped resources with authorization test coverage. |
| 4 | Add CI quality gates and a minimal browser critical-path suite. | Prevents a repeat of the current green-tests/red-build condition. | Merges cannot bypass compilation/build regressions. |
| 5 | Implement deployment packaging, readiness, backups, and restore testing. | The system needs an operational baseline before any durable use. | One documented, repeatable, recoverable deployment. |
| 6 | Address rate limits, cookie deployment policy, mail observability, pagination, and nav grouping. | Improves resilience and usability after the core trust/release gaps. | Safer and smoother first production operations. |

## Final Judgment

SpecForge Studio has a **very solid core concept and a large amount of genuine, interconnected implementation**. The most successful choices are the structured-artifact model, deterministic generated outputs, governance/traceability, task materialization, and the reuse of existing data to produce dashboards and presentations. The project is substantially closer to an internal alpha than a greenfield build.

Its readiness is currently constrained by one immediate release regression and one architectural product decision. Fix the presentation/build integration first. Then, before exposing the service to untrusted users, move from account authentication to true project authorization and tenant isolation. With those two initiatives plus a modest deployment baseline, the project will have a credible path from an impressive internal engineering platform to a production-capable product.

## Repository Evidence

[1]: ../product/PRD.md "SpecForge Studio product definition"
[2]: ../../backend/db/schema.sql "Canonical SQLite schema"
[3]: ../../backend/src/modules/auth.ts "Authentication module and its internal-API boundary"
[4]: ../../backend/src/app.ts "Backend application composition"
[5]: ../../backend/src/modules/projects.ts "Project route and ownership behavior"
[6]: ../../backend/src/modules/presentation.ts "Live-computed presentation and PPTX export"
[7]: ../../backend/src/db/index.ts "SQLite bootstrap and compatibility patch"
[8]: ../../backend/src/modules/dashboard.ts "Cross-project dashboard aggregation"
[9]: ../../package.json "Root workspace scripts and dependencies"
[10]: ../../backend/package.json "Backend dependencies and scripts"
[11]: ../../tsconfig.json "Strict project compilation scope"
[12]: ../../frontend/src/pages/PresentationPage.tsx "Pitch-deck client implementation"
[13]: ../../frontend/src/shared/ui/Button.tsx "Shared Button contract"
[14]: ../../frontend/src/shared/api/client.ts "Fetch wrapper"
[15]: ../../frontend/vite.config.ts "Development API proxy"
[16]: ../../backend/src/utils/mailer.ts "Custom SMTP transport"
[17]: ../../backend/.env.example "Required SMTP configuration"
[18]: ../../backend/db/migrations/README.md "Migration policy"
[19]: ../../frontend/src/widgets/layout/AppShell.tsx "Authenticated workspace navigation"
[20]: ../../backend/src/modules/billing.ts "Simulated billing lifecycle"
