---
id: FEAT-005
title: Agent Task Packager
type: guide
phase: 10-roadmap-and-agent-tasks
status: implemented
owner: engineering
related:
  - FEAT-004
  - WS-003
  - TR-09
  - TR-15
updated: 2026-08-16
---

# Agent Task Packager — SpecForge Studio

## 1. Goal

Materialize roadmap task drafts (Prompt 10 / FEAT-004) into **executable,
agent-neutral task packs** in the canonical `tasks` / `task_checklists` /
`task_dependencies` tables. Packs are consumable by Claude, ChatGPT, Qwen,
or any compatible agent: concrete sequential checklist items with
verification hints, explicit inputs, constraints, and a definition of done.

## 2. Task Pack Contract

Every generated task includes (TR-09):

- task ID (`TASK-xxxx`) + draft provenance (`RMP-xxxx-Txx`)
- title, type (`spec|backend|frontend|docs|test|governance|ops`), module, priority, status
- objective, context, constraints, input artifacts (canonical IDs)
- executable checklist (`task_checklists`, verification hint per item)
- verification steps and definition of done
- related artifacts (input_artifacts + source_id)
- approval requirement (`approval_required`)

## 3. Packager Behavior

`backend/src/modules/agent-tasks/packager.ts` — `materializeTaskPack(db, roadmapId)`:

1. Reads the roadmap's task drafts + plan dependencies.
2. Creates one `tasks` row per un-materialized draft (status `open`).
3. Creates `task_checklists` rows with position + verification hint.
4. Records `task_dependencies` TASK→TASK edges (mapped from the plan).
5. Marks drafts `materialized_task_id` + status `approved`.
6. **Idempotent**: re-running skips already-materialized drafts.

## 4. APIs

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/agent-tasks/generate` | Materialize a task pack from `roadmap_id` |
| GET | `/api/agent-tasks?project=` | List task packs (task + checklist + dependencies) |
| GET | `/api/agent-tasks/:id` | Fetch one task pack |

## 5. Frontend (FSD)

- `entities/agent-task/` — types + hooks (generate, list).
- `pages/roadmap/RoadmapPage.tsx` — **Generate task pack** button per
  roadmap; the packaged tasks appear on the existing Tasks page
  (`/projects/:projectId/tasks`) and in the generated workspace
  (`09-agent-plans/tasks.md` + `checklists.md`).

## 6. Definition of Done

- Task packs include executable checklists with verification hints. ✔
- Tasks are traceable to source artifacts (no invented work, TR-15). ✔
- Task dependencies materialized in `task_dependencies`. ✔
- Packager is idempotent; packs survive roadmap deletion. ✔
- Memory updated; next action points to Prompt 11. ✔
