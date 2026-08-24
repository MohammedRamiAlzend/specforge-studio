# OPTIONAL_BACKLOG

This file stores optional tasks that may be executed after the required scope is complete.

The agent must not start any task in this file without explicit user approval.

Each optional task must include:
- task ID
- title
- reason
- expected benefit
- estimated effort
- risk
- approval status

## Optional Tasks

### OPT-001 — Deployment packaging (docker-compose, Dockerfiles, ops docs)
- task ID: OPT-001
- title: Deployment packaging from the removed Prompt 13
- reason: The original Prompt 13 (deployment-and-final-audit) was removed from required scope (DEC-015); deployment packaging is still useful for running SpecForge outside the Freebuff sandbox.
- expected benefit: Portable, documented self-hosting (backend + frontend + SQLite volume + migrations).
- estimated effort: Medium
- risk: Low
- approval status: not approved

### OPT-002 — Per-type diagram templates
- task ID: OPT-002
- title: Per-type diagram templates (e.g. API-first sequence templates, mobile flow templates)
- reason: Diagram generation is deterministic but template-driven starting points would speed up common product shapes.
- expected benefit: Faster modeling for recurring architectures.
- estimated effort: Medium
- risk: Low
- approval status: not approved

### OPT-003 — Multi-project roadmap aggregation
- task ID: OPT-003
- title: Multi-project roadmap aggregation across linked projects
- reason: Workspaces link projects (PDEP); a combined roadmap view across a workspace would help portfolio planning.
- expected benefit: Cross-project milestone and task visibility.
- estimated effort: High
- risk: Medium
- approval status: APPROVED (2026-08-18, DEC-025) — execution in progress/complete

### OPT-004 — Skills-to-task-pack matching
- task ID: OPT-004
- title: Skills-to-task-pack matching (auto-assign tasks to required skills)
- reason: Projects record skills (SKL) and task packs are generated; matching tasks to required skills would improve agent assignment.
- expected benefit: Smarter task assignment for executing agents.
- estimated effort: Medium
- risk: Low
- approval status: IMPLEMENTED (2026-08-24, DEC-027)

### OPT-005 — Sprint planning on the Kanban board
- task ID: OPT-005
- title: Sprint planning (sprints + velocity tracking on the execution board)
- reason: Prompt 20 added the Kanban board; grouping tasks into sprints with velocity metrics completes the execution management loop.
- expected benefit: Iteration planning and progress analytics.
- estimated effort: High
- risk: Medium
- approval status: not approved

### OPT-006 — Issue-to-release linking with changelog generator
- task ID: OPT-006
- title: Issue-to-release linking + auto-generated changelog
- reason: Issues (ISS) and releases (RLS) are tracked but not linked; a changelog derived from resolved issues per release would close the delivery loop.
- expected benefit: Auto-generated release notes from resolved issues.
- estimated effort: Medium
- risk: Low
- approval status: not approved
