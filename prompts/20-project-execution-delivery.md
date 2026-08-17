# Prompt 20 — Project Execution & Delivery Management

Read all memory files before doing anything.

This is Prompt 20: Project Execution & Delivery Management.

## Objective

Close the biggest development-lifecycle gaps in SpecForge so projects can be
**managed** end-to-end, not just specified. Today the platform covers
specification → diagrams → docs → roadmap → task packs → governance, but it
has no way to track **who is doing what**, move work **through execution**,
track **defects/releases**, or see **project health at a glance**.

This prompt adds an execution & delivery layer:

1. **Team members + assignments** — a per-project team roster and assignees on
   tasks, milestones, and issues, so every work item has an owner.
2. **Execution board (Kanban)** — a board view of the existing task pack
   grouped by status with status transitions and assignee filtering.
3. **Issues tracker** — structured bugs/enhancements/tech-debt/questions with
   severity + status, linkable to requirements, tasks, and test cases, and
   rendered into the generated workspace (`05-testing/issues.md`).
4. **Releases** — versioned release artifacts with status and release notes,
   rendered into the workspace (`06-ops/releases.md`).
5. **Project health dashboard** — computed health metrics (requirements
   completion, task progress, approval coverage, validation warnings,
   traceability coverage) surfaced on the project overview and dashboard.
6. **Global search** — cross-artifact search across projects and artifact types.
7. **Activity / notification feed** — a project activity feed built on the
   existing `event_log` (recent changes, pending approvals, audit trail).

## Context

- Tasks already exist with a canonical status set (`open`, `in_progress`,
  `blocked`, `done`, `cancelled`) plus `task_checklists`; the task packager
  materializes roadmap drafts into them. There is **no** UI to move a task
  through execution and no assignee concept.
- `milestones` exist (`planned/in_progress/reached/missed/cancelled`).
- `event_log` is the append-only audit trail; `GET /audit` already exposes it.
- The docs workspace (`WORKSPACE_FILES` in docs-generator/workspace.ts) is
  stable-ordered (ART-0001…) with files appended **at the end** so existing
  ART ids never shift.
- The skills module (`backend/src/modules/skills.ts`) is the canonical CRUD
  template to mirror for the new modules.
- Branch rule: this work is implemented on a dedicated branch and delivered as
  a pull request. The user has explicitly forbidden merging to main/master.
  Memory/STATE updates still happen normally.

## Constraints (must hold)

- Backend stays Node.js + SQLite; schema changes are **additive only** (new
  tables + `ALTER TABLE ... ADD COLUMN` for assignee columns) via a new
  migration `010_execution_and_delivery.sql`. No destructive changes.
- No external SaaS integrations. English-only output. Database stays the
  source of truth; Markdown is generated.
- New workspace files must be appended at the END of `WORKSPACE_FILES` so
  existing ART ids stay stable (example exports grow 34 → 36 files).
- Tests must follow the existing bun:test patterns (in-memory app via
  backend/tests/helpers.ts; frontend react-dom/server static rendering).
- Do not break the existing Acme / e-commerce seeds or the docs/example
  regeneration.

## Deliverables

Create or update:

- prompts/20-project-execution-delivery.md (this file)
- prompts/README.md (prompt sequence 20 + note)
- backend/db/schema.sql — additive `team_members`, `issues`, `releases`
  tables + `tasks.assignee_id` / `milestones.assignee_id` columns (canonical
  schema)
- backend/db/migrations/010_execution_and_delivery.sql — the same additions
- backend/src/modules/team.ts — team member CRUD (MEM prefix)
- backend/src/modules/issues.ts — issue CRUD (ISS prefix, severity/status
  CHECKs, linkable to requirement/task/test_case)
- backend/src/modules/releases.ts — release CRUD (RLS prefix)
- backend/src/modules/tasks.ts — extend with PATCH `/tasks/:id` (status +
  assignee_id + priority + objective updates) and `GET /tasks` assignee filter
- backend/src/modules/health.ts — `GET /projects/:id/health` computed metrics
- backend/src/modules/search.ts — `GET /search?q=` cross-artifact search
- backend/src/modules/activity.ts — `GET /activity?project=` feed from
  event_log (+ pending approvals)
- backend/src/modules/docs-generator/ — new `genIssuesDoc` +
  `genReleasesDoc` appended at END of WORKSPACE_FILES; README contents updated
- backend/src/app.ts — register all new modules
- frontend entities: team-member, issue, release, health, search, activity
- frontend pages: IssuesPage, ReleasesPage, TeamPage (or section), health
  cards on ProjectDetailsPage + DashboardPage, search box + activity feed
- frontend: tasks page gains a **board view** (status columns + move buttons +
  assignee filter)
- backend tests: team, issues, releases, health, search, activity (+ tasks
  PATCH coverage)
- frontend tests: static render for the new pages/widgets
- docs: FEAT-013 feature doc + id-convention prefixes (MEM/ISS/RLS)
- memory files (STATE, PROJECT_MEMORY, NEXT_ACTION, SESSION_LOG, DECISIONS,
  USER_REQUESTS)

## Requirements

1. **Team members** (`team_members`, MEM-0001): id, project_id (FK CASCADE),
   name, email, role, created/updated. CRUD: GET /team?project=, POST /team,
   PATCH /team/:id, DELETE /team/:id. Assignees reference team member ids
   (validated 400 on unknown member). Milestones and tasks gain `assignee_id`.
2. **Execution board**: `GET /tasks?project=&status=&assignee=` plus
   `PATCH /tasks/:id` accepting `{ status, assignee_id, priority, objective }`
   (valid status transitions validated; unknown assignee → 400; status change
   event-logged). Frontend board groups tasks into columns and moves tasks via
   PATCH; assignee filter dropdown.
3. **Issues** (`issues`, ISS-0001): id, project_id, kind
   (bug/enhancement/tech_debt/question), severity (low/medium/high/critical),
   status (open/in_progress/resolved/closed), title, description, optional
   links to requirement_id / task_id / test_case_id (validated), created_by.
   CRUD routes. `genIssuesDoc` → `05-testing/issues.md` (grouped by kind with
   links).
4. **Releases** (`releases`, RLS-0001): id, project_id, version (e.g.
   v1.0.0), name, status (planned/in_progress/released/archived), release
   notes, released_at, created/updated. CRUD routes. `genReleasesDoc` →
   `06-ops/releases.md` (table + notes).
5. **Health endpoint** `GET /projects/:id/health`: computed metrics —
   requirements completion (approved/total), task progress (done/total +
   in_progress/blocked counts), approval coverage (approved APR / requested),
   validation warnings count (TR-rule severities), traceability coverage
   (linked artifacts / total), milestone progress (reached/total). Returned as
   stable metric keys; frontend renders progress bars on the project overview
   + dashboard cards.
6. **Global search** `GET /search?q=&project=`: searches projects,
   requirements, use cases, tasks, entities, api-endpoints, screens, issues,
   releases, skills by title/name/description (LIKE). Returns typed results
   with artifact_type + id + title + project_id. Frontend search box in the
   AppShell with a results dropdown/page.
7. **Activity feed** `GET /activity?project=&limit=` from event_log
   (newest first) plus pending approvals merged in; `GET /activity` without
   project returns recent cross-project events. Frontend: activity widget on
   the project overview + a dashboard "Recent activity" panel.
8. **Tests**: each new backend module gets focused tests (CRUD + validation +
   event-log) mirroring skills.test.ts; tasks PATCH transition tests; health
   metric math; search matching; activity ordering. Frontend static-render
   tests for the new pages/widgets. Full suite + typecheck + builds must pass.
9. **Seed integration (optional but good)**: demo seeds (Acme, StoreSphere)
   get a small team (2–3 members) + a couple of issues/releases + an assignee
   on the in-progress task so the live example demonstrates the new features;
   regenerated example workspaces reflect the two new docs files.

## ID strategy

- New prefixes: MEM (team members), ISS (issues), RLS (releases) — added to
  docs/ontology/id-convention.md.
- Child IDs: tasks keep TASK-…; assignees store the team member id (MEM-…).

## Definition of Done

Prompt 20 is complete only when:

- the execution & delivery layer works end-to-end: team CRUD + assignees,
  task status PATCH + board UI, issues + releases CRUD with generated docs
  files, health endpoint with UI, global search, and the activity feed
- the full backend + frontend test suites pass (new suites included), root
  typecheck clean, frontend + backend builds succeed
- example regeneration still works and now includes 36 files (two new docs)
- memory updated; work delivered on a dedicated branch via pull request
  (NOT merged to main)