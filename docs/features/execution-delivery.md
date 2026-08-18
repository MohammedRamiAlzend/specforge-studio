---
id: FEAT-013
title: Project Execution & Delivery Management
type: guide
phase: 20-project-execution-delivery
status: implemented
owner: engineering
related:
  - FEAT-010
  - FEAT-011
  - ONT-002
  - MEM-0001
  - ISS-0001
  - RLS-0001
updated: 2026-08-18
---

# Project Execution & Delivery Management — SpecForge Studio

## 1. Goal

SpecForge used to cover **specification → diagrams → docs → roadmap → task
packs → governance**, but nothing tracked *who is doing what*, moved work
*through execution*, or surfaced *project health at a glance*. This feature
closes those development-lifecycle gaps:

1. **Team members + assignments** — a per-project roster (MEM) with task and
   issue assignees.
2. **Execution board (Kanban)** — tasks grouped by status with transitions
   and assignee filtering.
3. **Issues tracker** — bugs, enhancements, tech debt, and questions (ISS)
   with severity + status, rendered into the workspace
   (`05-testing/issues.md`).
4. **Releases** — versioned release artifacts (RLS) with status and notes,
   rendered into the workspace (`06-ops/releases.md`).
5. **Project health dashboard** — computed metrics surfaced on the project
   overview and the dashboard.
6. **Global search** — cross-artifact search across projects and types.
7. **Activity / notification feed** — recent changes, pending approvals, and
   audit trail built on the existing `event_log`.

## 2. Domain Model (additive schema — migration 010)

```
team_members
  ├── id          MEM-0001
  ├── project_id  FK → projects ON DELETE CASCADE
  ├── name        required
  ├── email       optional
  └── role        optional

issues
  ├── id             ISS-0001
  ├── project_id     FK → projects ON DELETE CASCADE
  ├── kind           bug | enhancement | tech_debt | question
  ├── severity       low | medium | high | critical
  ├── status         open | in_progress | resolved | closed
  ├── title / description
  ├── requirement_id / task_id / test_case_id   (optional, validated refs)
  └── created_by

releases
  ├── id          RLS-0001
  ├── project_id  FK → projects ON DELETE CASCADE
  ├── version     e.g. 1.0.0
  ├── name        required
  ├── status      planned | in_progress | released | archived
  ├── notes
  └── released_at

tasks.assignee_id     ADD COLUMN (nullable FK-style ref to team_members.id)
milestones.assignee_id ADD COLUMN (nullable)
```

All operations are audit-logged (`entity_type: team_member | issue | release`
and task `status_change` events).

## 3. Backend APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/team?project=:id` | List a project's team members |
| POST | `/api/team` | Add a team member |
| PATCH | `/api/team/:id` | Edit a team member |
| DELETE | `/api/team/:id` | Remove a team member |
| GET | `/api/issues?project=&status=&kind=` | List/filter issues |
| POST | `/api/issues` | Create an issue |
| PATCH | `/api/issues/:id` | Update an issue (incl. status) |
| DELETE | `/api/issues/:id` | Delete an issue |
| GET | `/api/releases?project=:id` | List releases |
| POST | `/api/releases` | Create a release |
| PATCH | `/api/releases/:id` | Update a release (incl. status) |
| DELETE | `/api/releases/:id` | Delete a release |
| GET | `/api/tasks?project=&status=&assignee=` | List/filter tasks (assignee filter) |
| PATCH | `/api/tasks/:id` | Update task status / assignee / priority / objective |
| GET | `/api/projects/:id/health` | Computed health metrics |
| GET | `/api/search?q=&project=&limit=` | Cross-artifact search |
| GET | `/api/activity?project=&limit=&approvals=` | Activity feed (+ pending approvals) |

Validation: unknown team member referenced as an assignee → `400
BAD_REQUEST`; unknown project → `404 NOT_FOUND`; invalid status transitions
and unknown referenced artifacts are rejected.

## 4. Health Metrics

`GET /projects/:id/health` returns stable metric keys, never stored:

- `requirements` — approved/total + completion %
- `tasks` — open/in_progress/blocked/done/cancelled counts + completion %
- `approvals` — approved/pending + coverage %
- `validation` — error/warning/info counts from governance rules
- `traceability` — covered/total requirements + coverage %
- `milestones` — reached/in_progress + completion %
- `issues` — total/open/resolved
- `releases` — total/released

## 5. Frontend (FSD)

- New entities with TanStack Query hooks: `entities/team-member/`,
  `entities/issue/`, `entities/release/`, `entities/health/`,
  `entities/search/`, `entities/activity/`.
- `entities/task/` extended: `assignee_id` on the type, `useUpdateTask`
  mutation, and assignee filter on `useTasks`.
- `pages/IssuesPage.tsx` — route `/projects/:projectId/issues`: status/kind
  filters, inline create form, per-issue advance + delete.
- `pages/ReleasesPage.tsx` — route `/projects/:projectId/releases`: create
  form, status advance (planned → in_progress → released), delete.
- `pages/TasksPage.tsx` — board/table toggle: the board groups tasks into
  status columns with per-card status and assignee selects; an assignee
  filter is applied server-side.
- `widgets/health/HealthCards.tsx` — three grouped metric cards (Definition,
  Execution, Delivery) with progress bars + chips; `HealthMiniCard` for the
  dashboard project cards.
- `widgets/team/TeamSection.tsx` — roster with inline add/edit/remove.
- `widgets/activity/ActivityFeed.tsx` — project-scoped or cross-project feed.
- `widgets/search/SearchBox.tsx` — global search in the AppShell top bar with
  a results dropdown; project-scoped when inside a project.
- `pages/ProjectDetailsPage.tsx` — health cards, team section, activity feed;
  section cards for Issues and Releases.
- `pages/DashboardPage.tsx` — per-project health mini-cards + recent activity
  panel.

## 6. Docs Integration

Two workspace files are appended **at the end** of `WORKSPACE_FILES` (existing
ART ids stay stable; example exports grow 34 → 36 files):

- `05-testing/issues.md` — issues grouped by kind with severity/status and
  linked artifact IDs.
- `06-ops/releases.md` — releases table (version, status, released_at) with
  release notes.

## 7. Definition of Done

- Team CRUD + assignees, task status PATCH + board UI, issues + releases CRUD
  with generated docs files, health endpoint with UI, global search, and the
  activity feed all work end-to-end. ✔
- Backend + frontend suites pass (new `execution.test.ts` backend suite +
  `frontend/tests/execution.test.tsx`), root typecheck clean. ✔
- Example regeneration still works and now includes 36 files (two new docs). ✔
- MEM/ISS/RLS prefixes recorded in the ontology; memory updated. ✔
- Delivered on a dedicated branch via pull request (NOT merged to main). ✔
