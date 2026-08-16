---
id: FEAT-009
title: Multi-Project Workspace Links
type: guide
phase: 14-multi-project-workspace
status: implemented
owner: engineering
related:
  - FEAT-007
  - ONT-001
  - TR-21
  - PDEP-0001
updated: 2026-08-16
---

# Multi-Project Workspace Links — SpecForge Studio

## 1. Goal

A workspace can hold many projects. Prompt 14 makes those relationships
**explicit and machine-readable** instead of hidden in prose:

1. **Project dependencies** — a declared, typed link from one project to
   another (`workflow_call`, `data`, `deploy`, `other`), stored in
   `project_dependencies` with stable `PDEP` ids.
2. **Cross-project workflow calls** — a new `workflow_call` modeler node whose
   `metadata.cross_project` points at a workflow-kind graph of another project.
   Diagrams nest the target graph, docs list the calls, and governance
   verifies the target exists (TR-21).

Users never write Mermaid by hand: picking a target in the inspector, or
typing a workflow id, is enough — rendering and validation are derived from
the database.

## 2. Domain Model

```
project_dependencies
  project_id ──▶ depends_on_project_id   (kind: workflow_call|data|deploy|other)

model_nodes.metadata.cross_project     (workflow_call nodes)
  { project_id: "PRJ-xxxx", graph_id: "GRPH-xxxx", node_id? }
```

Rules enforced in `backend/src/modules/links/routes.ts` and `modeler.ts`:

- A project cannot depend on itself (`400`).
- Duplicate `(project_id, depends_on_project_id, kind)` is rejected (`409`).
- A `workflow_call` node **requires** a structurally valid reference
  (`project_id` + `graph_id`, graph must be `kind = 'workflow'`); a malformed
  reference fails saving with `400`.
- A reference that is well-formed but points at a missing/non-workflow target
  is allowed to save but reported as `CROSS_PROJECT_REF_MISSING` and as a
  governance **TR-21** violation.
- Deleting a dependency is cascade-safe (FOREIGN KEY `ON DELETE CASCADE` on
  both sides).

## 3. ID / Traceability

- New prefix row `PDEP` in `docs/ontology/id-convention.md`.
- New rule **TR-21** (21 rules total) in
  `docs/ontology/traceability-rules.md`: every `workflow_call` node must
  reference an existing workflow-kind graph, or it is flagged.

## 4. Backend APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects/:id/dependencies` | Outgoing dependency list (enriched with target name/type/status) |
| POST | `/api/projects/:id/dependencies` | Declare a dependency (`depends_on_project_id`, `kind`, `note?`) |
| DELETE | `/api/projects/:id/dependencies/:depId` | Remove a dependency |
| GET | `/api/projects/:id/dependents` | Incoming dependents list |
| GET | `/api/projects/:id/reference-targets` | Linked projects first, then all others, each with its workflow graphs — powers the modeler picker |
| GET | `/api/projects/:id/workflow-calls` | Every resolved `workflow_call` in the project's workflows |

Diagrams: `diagrams/generator.ts` resolves calls at generate *and* preview
time (`resolveCrossProjectCalls`), rendering each call as a nested Mermaid
subgraph `subgraph xp_<node id>[<project name> (<project id>)]` containing the
target graph node. Generate/store/preview stay byte-identical.

Docs: the workspace export gains `00-meta/dependencies.md` (appended to
`WORKSPACE_FILES` so existing `ART` ids never shift) and a **Cross-project
Calls** section in `03-design/workflows.md`, both derived from structured
data.

## 5. Frontend (FSD)

- `entities/project-link/` — types + TanStack Query hooks
  (`useProjectDependencies`, `useProjectDependents`, `useReferenceTargets`,
  `useWorkflowCalls`, `useCreate/DeleteProjectDependency`) and lib helpers
  (`dependencyKindLabel`, `DEPENDENCY_KINDS`, `buildCrossProjectMetadata`,
  `crossProjectRefOf`).
- `features/visual-modeler/InspectorPanel` — new **Cross-project section** on
  `workflow_call` nodes: a target-project dropdown, a workflow dropdown for
  linked projects, and a manual workflow-id input so users can type a `GRPH`
  id directly. Writes `data.metadata.cross_project`; drafts preserve metadata.
- `widgets/linked-projects/LinkedProjectsCard` — add form, outgoing/incoming
  lists with kind labels + names + statuses, remove buttons; already-linked
  targets are hidden from the picker; empty states included. Shown on the
  project details page.
- `widgets/project-calls/CrossProjectCalls` — groups every cross-project call
  by workflow with the target project badge; shown on the workflows page.

## 6. Governance

`GET /api/governance/validation?project=` returns a consolidated
`{ errors, warnings, infos, all }` payload. **TR-21** emits a warning naming
the caller node and the broken target (`GRPH-0002:N01 → PRJ-0004/GRPH-9999`);
calls without a reference are reported too.

## 7. Definition of Done

- `project_dependencies` table + migration `007_multi_project_links.sql`. ✔
- Dependency CRUD, dependents, reference-targets, workflow-calls APIs. ✔
- `workflow_call` node: catalog, validation, diagram subgraphs, docs sections. ✔
- Governance TR-21 with a consolidated report shape. ✔
- Frontend picker + linked-projects card + cross-project calls widget. ✔
- Smoke extended (node count 13) and 11 new backend tests / 8 frontend tests. ✔
- Backend 84 pass, frontend 34 pass, root typecheck clean, smoke 226/226. ✔