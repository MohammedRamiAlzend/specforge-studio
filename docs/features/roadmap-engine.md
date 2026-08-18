---
id: FEAT-004
title: Roadmap Engine
type: guide
phase: 10-roadmap-and-agent-tasks
status: implemented
owner: engineering
related:
  - FEAT-005
  - ONT-002
  - DB-DES-001
  - TR-15
updated: 2026-08-16
---

# Roadmap Engine — SpecForge Studio

## 1. Goal

Generate the project **roadmap automatically from the database** — phases,
milestones, epics, tasks, dependencies, priorities, and approval gates —
derived from requirements, workflows, entities, API endpoints, screens,
architecture components, risks, and non-functional requirements. The
derivation is deterministic: the same project state always produces the
same plan (the database is the source of truth).

## 2. What is Derived

| Element | Derived from |
|---------|--------------|
| Phases (5) | Fixed lifecycle skeleton: Definition, Design, Implementation, Validation, Delivery |
| Milestones (1 per phase) | Phase gates + relative due dates (2/4/8/10/12 weeks) |
| Epics | One per module (Implementation) + cross-cutting: Requirements & Scope, Architecture & Data Design, Core Implementation, Governance & Approvals, Testing & Validation, Deployment & Delivery |
| Tasks | Requirements (functional → implement; constraint/non-functional → enforce with approval), API endpoints → backend, entities → data model, screens → frontend, workflows → implementation, open risks → mitigation, critical requirements → test coverage (TR-07) |
| Dependencies | Traceability links (artifact_links) + module ordering (entity → api → screen) + requirement → referenced artifact |
| Priorities | Requirement priority/criticality (must/critical → high), module criticality, risk likelihood/impact |
| Approval gates | Per phase (Definition, Design, Validation) and per task (constraints, critical/high risks) per DEC-003 |

## 3. Task Draft Rules

Every task draft is **concrete, sequential, verifiable, and agent-neutral**:

- references its source artifact by canonical ID (`input_artifacts`, `source_id`) — tasks never invent requirements (TR-15)
- carries objective, context, constraints, type, priority, module
- checklist items each have a `description` and a `verification` hint
- definition of done is verifiable and references the source artifact
- `approval_required` set for constraint enforcement and critical/high risks

## 4. Storage

Migration `backend/db/migrations/004_roadmaps_and_task_dependencies.sql`
(additive). Child IDs follow the ontology: `RMP-0001-P01` (phase),
`RMP-0001-EP01` (epic), `RMP-0001-M01` (milestone), `RMP-0001-T01` (task
draft). `RMP` was added to `docs/ontology/id-convention.md`.

- `roadmaps` — snapshot header + metadata (input/derived counts)
- `roadmap_phases`, `roadmap_epics`, `roadmap_milestones`, `roadmap_tasks`
- `roadmap_task_dependencies` — plan-level ordering with reason
- `task_dependencies` — canonical TASK→TASK edges recorded by the packager

## 5. APIs

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/roadmaps/generate` | Derive + store a roadmap snapshot |
| GET | `/api/roadmaps?project=` | List roadmap summaries |
| GET | `/api/roadmaps/:id` | Full detail (phases, milestones, epics, tasks, dependencies) |
| DELETE | `/api/roadmaps/:id` | Delete a roadmap (materialized task packs are kept) |

## 6. Frontend (FSD)

- `entities/roadmap/` — types + hooks (list, generate, detail, delete).
- `pages/roadmap/RoadmapPage.tsx` — generate form; roadmap list with
  expandable detail (phase gates, milestones, tasks grouped by phase/epic
  with priority + approval badges, dependency edges) and **Generate task
  pack** (materializes via `/api/agent-tasks/generate`). Route
  `/projects/:projectId/roadmap` + nav link.

## 7. Workspace aggregation (OPT-003, approved optional task 2026-08-18)

Linked projects (PDEP, Prompt 14) get a combined roadmap view for portfolio
planning:

- `GET /api/roadmaps/aggregate?project=:id` — read-only aggregation over the
  root project plus every directly linked project (dependencies + dependents).
  Per project: latest roadmap summary, phase/epic/milestone counts, task-draft
  total, packaged count (`materialized_task_id`), and execution progress
  (canonical tasks done among packaged drafts). Workspace totals include
  projects, roadmaps, tasks, packaged, done, and completion %. Ordering is
  deterministic (root first, then project name/id); unrelated projects are
  excluded.
- Frontend: `entities/roadmap-aggregate/` (types + `useRoadmapAggregate`) and
  `widgets/roadmap-aggregate/RoadmapAggregateCard` on the Roadmap page —
  per-project rows with link-kind badges, roadmap status, progress bars, and
  totals, linking into each project's own roadmap page.
- No schema changes; the database stays the source of truth.

## 8. Definition of Done

- Roadmap generated automatically from project artifacts. ✔
- Phases, milestones, epics, tasks, dependencies, priorities, approval gates present. ✔
- Task drafts reference source artifacts (no invented work). ✔
- Deterministic, stored snapshot with provenance. ✔
- Workspace aggregation endpoint + widget + tests (OPT-003). ✔
- Memory updated; next action points to Prompt 11. ✔
