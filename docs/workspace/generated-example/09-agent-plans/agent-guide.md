---
id: ART-0032
title: Agent Guide
type: guide
status: generated
project: PRJ-0001
updated: "2026-08-25"
---

# Agent Guide — Executing Task Packs

## How to Execute

1. Read 09-agent-plans/tasks.md and pick the highest-priority open task.
2. Read the task's objective, context, constraints, and input artifacts.
3. Follow the checklist in order; verify each item (hint in parentheses).
4. Complete the definition of done before marking the task done.
5. Update the checklist and task status, then record results.
## Ground Rules

- Never edit generated files unless they are marked `<!-- protected -->`.
- Never invent requirements — the SRS is the source of requirements.
- Reference artifacts by canonical ID.
- Ask for approval when a task is marked approval_required.
## Verification

Run `bun tsc -b --noEmit` and the backend smoke tests before declaring backend work done.

