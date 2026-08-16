---
id: AGT-0000
title: Workspace Agent Guide
type: guide
status: generated
project: {{ project.id }}
related:
  - {{ project.id }}
updated: {{ updated }}
---

# AGENTS.md — {{ project.name }}

This workspace is the generated documentation for project **{{ project.name }}** ({{ project.id }}). The database is the source of truth; this workspace is a regenerable export.

## 1. Reading Order

1. `README.md` — workspace index
2. `01-planning/vision.md` and `01-planning/scope.md` — why and what
3. `02-requirements/` — requirements and use cases
4. `03-design/` — architecture, data model, workflows, sequences
5. `04-ui/` — screens
6. `05-testing/` — test cases and validation
7. `06-ops/` — deployment and operations
8. `08-governance/` — approvals and decisions
9. `09-agent-plans/` — tasks to execute

## 2. How to Find Artifacts

- Every artifact has a stable ID (e.g. `REQ-0001`). Use `00-meta/id-registry.md` to locate its file.
- `related` frontmatter links traceable artifacts. Follow IDs, not titles.
- Statuses follow `docs/ontology/status-lifecycle.md`; treat `approved` artifacts as binding.

## 3. Task Execution Protocol

When you execute a task from `09-agent-plans/tasks/`:

1. Read the task file fully: objective, context, inputs, constraints.
2. Read all input artifacts referenced in `inputs` and `related`.
3. Execute checklist items **in order**; mark each as done only when truly complete.
4. Run the verification steps from the task file.
5. Report completion against the task ID (TASK-xxxx), including verification results and any deviations.

## 4. Rules for Agents

1. Generate English-only output.
2. Never edit `02-`/`03-`/`04-` artifact files directly as a source of truth; propose changes to the model instead.
3. Never invent new IDs or requirements (TR-15: no invented work).
4. Preserve stable IDs in every artifact you produce.
5. Do not start work that requires approval unless the approval (APR) exists in `08-governance/approvals.md`.
6. If blocked, record the blocker with the artifact ID and stop — do not skip checklist items.

## 5. Open Points

See `00-meta/open-questions.md` for unresolved decisions and their suggested defaults.
