---
id: TEST-001
title: Test Plan
type: test-plan
phase: 12-testing-and-validation
status: implemented
owner: engineering
related:
  - TEST-002
  - FEAT-001
  - FEAT-002
  - FEAT-003
  - FEAT-004
  - FEAT-005
  - FEAT-006
  - FEAT-007
updated: 2026-08-16
---

# Test Plan — SpecForge Studio

## 1. Objective

Automated, **deterministic** test suites for the backend (Fastify API + SQLite
model) and the frontend (React/FSD), plus the existing end-to-end smoke suite.
Every suite runs headless with zero external services.

## 2. Commands

| Scope | Command |
|-------|---------|
| Backend unit/integration | `bun run --cwd backend test` |
| Frontend tests | `bun run --cwd frontend test` |
| Both (root) | `bun test backend/tests frontend/tests` |
| End-to-end smoke | `bun run --cwd backend smoke` |
| Typecheck (incl. tests) | `bun tsc -b --noEmit` |

The root `test` script runs both suites; the backend `smoke` script keeps the
185-check end-to-end pass (Prompt 05–11 regression guard).

## 3. Backend Suites (`backend/tests/`)

Run with `bun:test` (Bun's built-in runner — no extra dependencies). Each
file boots its own app against a fresh `:memory:` database, so IDs restart at
`-0001` per file and tests are fully deterministic.

| File | Covers | Prompt-12 requirement |
|------|--------|-----------------------|
| `api.test.ts` | Health, projects CRUD, validation errors (`VALIDATION_ERROR`), 404s, project-filtered lists, dangling project references, artifacts index | backend API |
| `database.test.ts` | Canonical schema completeness (34 tables), foreign keys, `id_sequences` allocation (never reused), CRUD round-trips, JSON columns, cascade deletes (project, model graph) | database operations |
| `diagrams.test.ts` | **Determinism** (identical input → identical Mermaid + warnings), workflow/sequence/architecture/ERD previews, generate + store + provenance + delete, ERD from tables | diagram generation |
| `docs.test.ts` | Full workspace generation (30+ files, frontmatter, embedded Mermaid), protected-section preservation, superseding, export CRUD | document generation |
| `roadmap.test.ts` | 5 phases (gated with criteria), 5 milestones with due dates, epics, task drafts (prioritized, verification-hinted checklists), REQ→API dependency, list/detail | roadmap generation |
| `tasks.test.ts` | Pack materialization (sequential checklists + verification hints), **idempotency**, dependency edges, packs survive roadmap deletion | task generation |
| `approvals.test.ts` | Status lifecycle registry, gate enforcement (`GOV_APPROVAL_REQUIRED`), illegal transitions with clear messages, auto-generated without gate, request/decide, rejection reason, domain sync, audit trail | approval flow |
| `validation.test.ts` | Modeler rules (NO_START, DECISION_EDGE_NO_CONDITION, MULTIPLE_START/END, UNKNOWN_NODE_TYPE rejected on save), TR-01/05/06/07 validation, traceability uncovered requirements + orphan links | validation rules |

## 4. Frontend Suites (`frontend/tests/`)

Run with `bun:test` + `react-dom/server` static rendering (no browser, no
extra dependencies).

| File | Covers | Prompt-12 requirement |
|------|--------|-----------------------|
| `lib.test.ts` | `format` (dates, title-case) and `statusClass` helpers | — (unit) |
| `api-client.test.ts` | `api()` envelope unwrapping, JSON mutation bodies, DELETE, `ApiError` status/code/message, generic fallback, `errorMessage` | export actions |
| `visual-modeler.test.ts` | `metaForType` fallbacks, `edgeDisplayText`, `serverNodeToRf`, `serverEdgeToRf` (canonical→client-key mapping) | modeler interactions |
| `ui-states.test.tsx` | `EmptyState`, `ErrorState` (message + retry), `Spinner` rendering | loading and error states |
| `pages.test.tsx` | Real page (`DocsExportPage`) rendered inside `MemoryRouter` + `QueryClientProvider` — page shell + synchronous loading state | page rendering |

## 5. Determinism

- Fresh in-memory database per test file → stable ID sequences and no shared
  state between files.
- `bun:test` runs each file in an isolated worker process.
- Diagram generation is asserted byte-identical for identical input.
- No wall-clock timestamps are asserted; relative ordering only.

## 6. Quality Gate

Run before marking any phase complete:

```bash
bun tsc -b --noEmit && bun test backend/tests frontend/tests && bun run --cwd backend smoke
```

A phase may not be marked complete while **critical validation fails**
(see `validation-rules.md` §6).
