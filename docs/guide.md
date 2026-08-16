---
id: GUIDE-001
title: SpecForge Studio — Full Project Guide
type: guide
phase: 12-testing-and-validation
status: implemented
owner: engineering
related:
  - MASTER_PROMPT
  - AGENTS
  - FEAT-001
  - FEAT-002
  - FEAT-003
  - FEAT-004
  - FEAT-005
  - FEAT-006
  - FEAT-007
  - TEST-001
  - TEST-002
  - WS-001
updated: 2026-08-16
---

# SpecForge Studio — Full Project Guide

SpecForge Studio converts **visual planning and structured specifications**
into engineering documentation, diagrams, roadmaps, and executable agent task
packs — with full traceability, governed approval gates, and a database as the
single source of truth.

This guide is the entry point for humans **and** agents. Read
`AGENTS.md` + the memory files first if you are an agent executing work here.

---

## 1. Core Principles

| Principle | Meaning |
|-----------|---------|
| Database is the source of truth | Every artifact lives in SQLite; Markdown, diagrams, and task packs are **generated output** |
| No manual Mermaid | All diagrams are generated deterministically from structured model data |
| Stable IDs everywhere | `PRJ-0001`, `REQ-0001`, `GRPH-0001-N01`, … back all traceability (`docs/ontology/id-convention.md`) |
| Traceability is enforced | Requirements ↔ use cases ↔ workflows ↔ APIs ↔ entities ↔ tests ↔ tasks (TR rules, `docs/ontology/traceability-rules.md`) |
| Approval gates are structural | No artifact reaches `approved` without a recorded approval (APR) |
| Agent-neutral execution | Task packs are executable checklists consumable by Claude, ChatGPT, Qwen, or any compatible agent |
| Memory-driven protocol | The repo executes a 14-prompt sequence with a persistent memory system (`memory/`, `AGENTS.md`, `MASTER_PROMPT.md`) |

---

## 2. Repository Layout

```
.
├── AGENTS.md                # Agent execution protocol (read first!)
├── MASTER_PROMPT.md         # Governing execution OS (DEC-001)
├── memory/                  # Execution memory (STATE, DECISIONS, NEXT_ACTION, …)
├── prompts/                 # The 14-phase prompt sequence (00–13) + commands
├── backend/                 # Node.js + Fastify + SQLite API
│   ├── db/
│   │   ├── schema.sql       # Canonical schema (34 tables, idempotent)
│   │   └── migrations/      # Additive-only migrations 001–005
│   ├── src/
│   │   ├── app.ts           # buildApp: wires config, db, plugins, all modules
│   │   ├── server.ts        # Entry point (binds PORT/HOST)
│   │   ├── config/          # Zod env config
│   │   ├── db/              # openDatabase (bun:sqlite + schema bootstrap)
│   │   ├── modules/         # One folder/file per domain (see §6)
│   │   └── utils/           # ids, events (audit), errors, exists
│   ├── tests/               # 53 bun:test files (Prompt 12)
│   └── scripts/
│       ├── smoke.ts         # 185-check end-to-end suite
│       └── generate-example.ts  # Regenerates the committed example workspace
├── frontend/                # React 18 + Vite + Tailwind + FSD
│   ├── src/
│   │   ├── app/             # App shell, router, store, global CSS
│   │   ├── pages/           # Route-level pages (incl. modeler/, roadmap/, …)
│   │   ├── features/        # visual-modeler, diagram-preview, create-project, …
│   │   ├── widgets/         # layout/AppShell, data-table, project-summary
│   │   ├── entities/        # Per-domain types + TanStack Query hooks
│   │   └── shared/          # api client, config, ui kit, lib
│   └── tests/               # 22 bun:test files (Prompt 12)
├── docs/                    # Product, ontology, workspace spec, features, testing
│   ├── product/             # PRD, vision, scope (APR-001 approved)
│   ├── ontology/            # Entities, IDs, relationships, TR rules, statuses
│   ├── workspace/           # WS-001 spec + templates + generated example
│   ├── features/            # FEAT-001…FEAT-007
│   ├── testing/             # TEST-001 test plan, TEST-002 validation rules
│   └── guide.md             # ← this file
└── package.json             # Bun workspace (backend + frontend)
```

---

## 3. Technology Stack

**Backend** — Node.js (Bun runtime), TypeScript, Fastify 5, Zod 3, `bun:sqlite`
(DEC-006: better-sqlite3's native binary is incompatible with Bun in this
environment). Synchronous driver, WAL mode, foreign keys on.

**Frontend** — React 18, TypeScript, Vite 6, Tailwind CSS 3 (forge accent
palette), TanStack Query 5 (server state), Zustand 5 (canvas/app state),
react-router 6, React Flow (`@xyflow/react` 12) for the visual modeler.

**Tooling** — Bun workspaces, `bun:test` (no test framework deps),
`tsc -b --noEmit` for typechecking (tests included).

---

## 4. The Execution Model (prompts 00–13)

The project is built and maintained through a **memory-driven prompt
sequence** (`prompts/`). Each phase has defined deliverables and a
definition of done; state is persisted in `memory/STATE.json`.

| # | Phase | Delivered |
|---|-------|-----------|
| 00 | Bootstrap memory and rules | `AGENTS.md`, `memory/`, `MASTER_PROMPT.md` |
| 01 | Product definition | `docs/product/` (APR-001 approved) |
| 02 | Domain ontology and IDs | `docs/ontology/` (24 entities, TR-01…TR-20) |
| 03 | Markdown workspace spec | `docs/workspace/` (WS-001…WS-003 + templates) |
| 04 | Database schema | `backend/db/schema.sql` + design docs |
| 05 | Backend core | Fastify app, projects/requirements/use-cases/workflows/entities/api/tasks/artifacts |
| 06 | Frontend foundation | FSD shell, 8 pages, API client, providers |
| 07 | Visual modeler | React Flow canvas + graph CRUD + validation engine |
| 08 | Diagram generation | Deterministic Mermaid (workflow/sequence/ERD/architecture) |
| 09 | Document generation | Full Markdown workspace rendered from the DB |
| 10 | Roadmap and agent tasks | Roadmap engine + task packager |
| 11 | Governance and approvals | Status lifecycle, APR records, audit trail |
| 12 | Testing and validation | 75 tests, validation rules, quality gates |
| 13 | Deployment and final audit | **Deferred by user request (2026-08-16)** — still required |

**Agent commands:** `continue` (resume from memory), `status` (report state),
`approve` (mark a pending approval). Every meaningful unit of work updates
the memory files — never skip this.

---

## 5. Getting Started

### 5.1 Install

```bash
bun install
```

### 5.2 Run the full app (backend :3000 + frontend :5173)

```bash
bun run dev
```

- Frontend dev server: `http://localhost:5173` (Vite, `server.hmr: false`)
- Backend API: `http://localhost:3000` (Fastify)
- The Vite `/api` proxy forwards to the backend and **strips the `/api`
  prefix** (backend routes are unprefixed). The backend dev script pins
  `PORT=3000` because the platform injects `PORT` for the web server.

### 5.3 Freebuff preview (managed)

Commands are configured: install `bun install`, dev `bun run dev` (port
5173), build `bun run build`. Use `freebuff-preview start|restart|status|logs`
to manage the preview; never start/stop servers from the terminal manually.

### 5.4 Verification commands

```bash
bun tsc -b --noEmit                 # typecheck everything (incl. tests)
bun test backend/tests frontend/tests  # 75 tests (53 backend + 22 frontend)
bun run --cwd backend smoke         # 185-check end-to-end smoke
bun run --cwd backend seed-example  # regenerate docs/workspace/generated-example/
```

---

## 6. Backend Architecture

### 6.1 Modules (`backend/src/modules/`)

| Module | Purpose |
|--------|---------|
| `projects.ts` | Project CRUD (`PRJ-xxxx`) |
| `requirements.ts` | Requirements (`REQ-xxxx`, priority/criticality) |
| `use-cases.ts` | Use cases (`UC-xxxx`, JSON flows) |
| `workflows.ts` | Workflows (`WF-xxxx`) |
| `entities.ts` | Data model (`DB-xxxx`, fields `DB-xxxx-Fxx`, relations `REL-xxxx`) |
| `api-endpoints.ts` | API contracts (`API-xxxx`, request/response/errors) |
| `tasks.ts` | Tasks + checklists (`TASK-xxxx`, `TASK-xxxx-Cxx`) |
| `artifacts.ts` | Cross-cutting artifacts index |
| `modeler.ts` | Visual model graphs (`GRPH-xxxx`, nodes `-Nxx`, edges `-Exx`) + validation engine (12 node types) |
| `diagrams/` | Deterministic Mermaid generation + `generated_diagrams` (`DIAG-xxxx`) |
| `docs-generator/` | Markdown workspace rendering (19+ generators) + `docs_exports` (`DOCS-xxxx`) |
| `roadmap/` | Roadmap engine (`RMP-xxxx` + `-P01/-EP01/-M01/-T01`) |
| `agent-tasks/` | Task pack materialization (idempotent) |
| `governance/` | Status lifecycle, approvals (`APR-xxxx`), audit, validation, traceability |

### 6.2 API surface (all under the `/api` mount in the UI, unprefixed on the backend)

- `GET /healthz` — health + db check
- `/projects`, `/requirements`, `/use-cases`, `/workflows`, `/entities`,
  `/api-endpoints`, `/tasks`, `/artifacts` — CRUD + `?project=` filters
- `/modeler/node-types`, `/modeler/graphs`, `/modeler/validate`
- `/diagrams/generate`, `/diagrams/preview`, `/diagrams`
- `/docs/generate`, `/docs/exports`
- `/roadmaps/generate`, `/roadmaps`, `/agent-tasks/generate`, `/agent-tasks`
- `/governance/statuses`, `/governance/status`, `/governance/validation`,
  `/governance/traceability`, `/approvals`, `/audit`

**Response envelope:** every endpoint returns `{ data: … }` on success and
`{ error: { code, message, details? } }` on failure (codes: `VALIDATION_ERROR`,
`NOT_FOUND`, `BAD_REQUEST`, `GOV_APPROVAL_REQUIRED`, …).

### 6.3 Database

- Canonical schema `backend/db/schema.sql` (34 tables) — idempotent, applied
  at every `openDatabase`.
- **Migrations are additive-only** (`backend/db/migrations/001…005`);
  destructive/constraint changes require a recorded approval (APR).
- `id_sequences` allocates public IDs per prefix (never reused).
- `artifact_links` is the traceability backbone (now cascades on project
  delete — DEC-014).
- `event_log` is the append-only audit trail.
- JSON columns only for flow/schema/flexible metadata (main flows, schemas,
  checklists, positions, metadata).

---

## 7. Frontend Architecture (Feature-Sliced Design)

```
app/      App shell, router, providers, store, index.css (Tailwind tokens)
pages/    Route-level composition (dashboard, project, modeler/, roadmap/, …)
features/ User-facing capabilities (visual-modeler, diagram-preview, …)
widgets/  Reusable composites (AppShell layout, DataTable, ProjectSummaryCard)
entities/ Domain types + TanStack Query hooks (workflow, data-entity, diagram, …)
shared/   API client, config, UI kit (Button, Card, Badge, States, Spinner), lib
```

### 7.1 Routes

| Route | Page |
|-------|------|
| `/` | Dashboard |
| `/projects/:projectId` | Project details |
| `/projects/:projectId/modeler` · `/modeler/:graphId` | Modeler hub · canvas |
| `/projects/:projectId/workflows` · `/data-model` · `/architecture` | Model browsing (links into the modeler) |
| `/projects/:projectId/diagrams` | Diagram generation + library |
| `/projects/:projectId/roadmap` | Roadmap + task pack generation |
| `/projects/:projectId/governance` | Status / Approvals / Validation / Traceability |
| `/projects/:projectId/docs` | Docs export (file tree + viewer) |
| `/projects/:projectId/tasks` | Task packs |
| `/settings` | Settings |

### 7.2 Data flow

React Query owns server state (reactive, no duplication). Zustand holds
client-only canvas state (dirty flag, current selections). The shared
`api<T>()` client unwraps the `{ data } / { error }` envelope and throws
`ApiError` with status + code.

---

## 8. Feature Tour

### 8.1 Visual modeler (Prompt 07 — `docs/features/visual-modeler.md`)
Drag-and-drop React Flow canvas with a 12-type node catalog (start, end,
step, decision, screen, api_call, database, external_system, event, wait,
approval, ai_agent), edge conditions, a property inspector, a live
validation panel (severity-coded), and transactional save mapping client keys
to canonical IDs. Four graph kinds: **workflow, data, architecture, sequence**.

### 8.2 Diagram generation (Prompt 08 — `docs/features/diagram-generation.md`)
Deterministic Mermaid from structured data only: workflow flowcharts,
sequence diagrams, ERDs (from graphs or entity tables), architecture
diagrams with layer subgraphs. Stored with provenance (`DIAG-xxxx`); a
stateless `/diagrams/preview` powers the canvas live preview.

### 8.3 Document generation (Prompt 09 — `docs/features/document-generation.md`)
Renders the full WS-001 Markdown workspace directly from the database:
README, AGENTS guide, planning, SRS, use cases, HLD/LLD, workflows (embedded
Mermaid), ERD, API docs, screens, test plan/cases, ops, guides, governance
(ADRs + approvals), master plan, task packs, checklists. Stable YAML
frontmatter on every file; `<!-- protected -->` sections survive
regeneration; exports supersede cleanly (`DOCS-xxxx`).

### 8.4 Roadmap + agent tasks (Prompt 10 — `docs/features/roadmap-engine.md`, `docs/features/agent-task-packager.md`)
The roadmap engine deterministically derives a 5-phase plan (with approval
gates + criteria), 5 milestones, per-module + cross-cutting epics, prioritized
task drafts with verification-hinted checklists, and dependencies — from the
project's requirements, workflows, entities, APIs, screens, components, and
risks. The packager materializes drafts into canonical `tasks`/`task_checklists`/
`task_dependencies` — idempotent, agent-neutral, traceable (TR-15: no invented
work), and surviving roadmap deletion.

### 8.5 Governance + approvals (Prompt 11 — `docs/features/governance.md`, `docs/features/approvals.md`)
Nine canonical statuses with an enforced transition map; approval gates on
requirements, workflows, entities, components, API contracts, decisions, and
roadmaps (`GOV_APPROVAL_REQUIRED`); APR records with rejection reasons;
full audit trail in `event_log`; TR-rule validation and traceability coverage
(including orphan-link detection) surfaced in the Governance page.

### 8.6 Testing + validation (Prompt 12 — `docs/testing/test-plan.md`, `docs/testing/validation-rules.md`)
75 deterministic tests (`bun:test`, fresh in-memory DB per backend file,
static rendering for the frontend) + a 185-check smoke suite. Validation
rules are enforced in code with clear messages, visible in the UI, and
gated by quality rules (e.g. no phase completion while critical validation
fails).

---

## 9. The Generated Markdown Workspace

For every project the system exports `docs/workspace/generated-example/`
(spec: `docs/workspace/`, folder structure WS-001). It is **regenerable at
any time** (`bun run --cwd backend seed-example` for the committed example)
and must never be hand-maintained as a source of truth.

```
00-meta/       project profile, id registry, glossary, decisions
01-planning/   vision, scope, milestones, roadmap
02-requirements/ srs, per-REQ files, use cases, traceability
03-design/     architecture, components, data model, workflows, sequences, api
04-ui/         screens
05-testing/    test plan, test cases, bug-report template
06-ops/        deployment, environments, runbooks, risks
07-guides/     user, developer, agent guides
08-governance/ adrs, approvals
09-agent-plans/ master plan, phases, tasks, checklists, agent guide
```

---

## 10. Governance Model (in short)

1. Artifacts move through `draft → auto_generated → needs_review → approved →
   ready_for_agent → in_progress → needs_verification → done` (plus `rejected`,
   which can recover).
2. Transitions are validated; gated kinds need an approved **APR** to become
   `approved`.
3. Rejections require a reason; everything is audited in `event_log`.
4. Validation (TR rules) and traceability coverage are live endpoints and
   visible in the **Governance** page tabs.

---

## 11. Operational Notes

- **Ports:** Vite `5173` (platform-injected `PORT`), backend `3000` (pinned in
  the dev script to avoid collision — the Vite proxy targets it).
- **Env vars:** backend `PORT/HOST/DATABASE_PATH/EXPORT_DIR/LOG_LEVEL/NODE_ENV`;
  frontend `VITE_API_BASE_URL` (defaults to `/api`, proxied in dev). No secrets
  are required.
- **Data:** dev database at `data/specforge.db`; doc exports at
  `data/exports/`.
- **Preview:** managed by Freebuff (`freebuff-preview start`). Verified
  working end-to-end (root, `/api/healthz`, `/api/projects` all 200).

---

## 12. Known Limitations & Next Steps

- **Prompt 13 (deployment + final audit) is deferred** by explicit user
  request (2026-08-16). Remaining deliverables: docker-compose,
  backend/frontend Dockerfiles, `docs/ops/` (deployment, backup,
  local-runner), `docs/final-audit.md`, and the completion report.
- The `artifact_links` cascade (DEC-014) is in the canonical schema; a
  table-rebuild migration for existing live databases still needs a recorded
  approval.
- No external SaaS integrations exist (by constraint) — the system is fully
  self-contained (SQLite + generated Markdown).
