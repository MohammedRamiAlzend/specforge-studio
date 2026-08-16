# Prompt 13 — Deployment and Final Audit

Read all memory files before doing anything.

This is Prompt 13: Deployment and Final Audit.

## Objective

Prepare the system for internal deployment, hybrid usage, and final audit.

## Deliverables

Create or update:

- docker-compose.yml
- Dockerfile.backend
- Dockerfile.frontend
- docs/ops/deployment.md
- docs/ops/backup.md
- docs/ops/local-runner.md
- docs/final-audit.md

## Deployment Requirements

Prepare deployment for:
- backend service
- frontend service
- SQLite volume
- environment configuration
- local development mode
- internal production-like mode

## Hybrid Requirements

Support:
- central database as source of truth
- local Markdown workspace export
- local agent workspace usage
- manual import of updated Markdown or task results if needed

## Final Audit Requirements

Audit the full system against the original constraints:

1. frontend uses React and FSD
2. backend uses Node.js and SQLite
3. generated docs are English-only
4. Mermaid is generated automatically
5. workflows are linked by IDs
6. Markdown workspace is complete
7. roadmap and task packs are generated
8. approvals and governance exist
9. memory protocol is respected
10. continue behavior works from memory

## Final Memory Update

After finishing:
- update all memory files
- write final project state
- write known limitations
- write future improvement backlog
- set status to complete or ready-for-review

## Definition of Done

Prompt 13 is complete only when:
- deployment files exist
- hybrid workspace behavior is documented
- final audit is written
- all memory files are consistent
- the project can be resumed or closed cleanly

## Mandatory Completion Rule

If all required tasks are complete, the agent must explicitly report completion to the user.

The agent must state that:
- all required tasks are complete
- there is nothing left to execute under the approved required scope
- optional additional tasks are available if the user wants them

The agent must not:
- stop silently
- start optional work without approval
- claim completion without verifying all required deliverables

When completion is reached, the agent must update:
- memory/STATE.json
- memory/PROJECT_MEMORY.md
- memory/OPTIONAL_BACKLOG.md
- memory/NEXT_ACTION.md

Then the agent must present optional additional tasks and wait for explicit user approval.