# Prompt 14 — Multi-Project Workspace and Cross-Project Workflow Calls

Read all memory files before doing anything.

This is Prompt 14: Multi-Project Workspace and Cross-Project Workflow Calls.

## Objective

Let workspaces connect projects with each other. Two capabilities:

1. **Explicit linked projects** — a project declares dependencies on other projects (e.g. a Web app project depends on the API project) with a kind and note; links are visible on the project page in both directions.
2. **Cross-project workflow calls** — while drawing a workflow, the user can call a workflow from another project by picking the target project → its workflow (dropdown), or by typing the workflow ID manually. The reference is stored on the node and rendered in diagrams and docs.

## Confirmed Design (user answers, 2026-08-16)

- Cross-project references: BOTH mechanisms — dropdown picker AND manual workflow-ID entry.
- Linked projects: YES — explicit, declared links at the project level.
- Each project keeps its own workflow, data model, architecture, docs export, tasks, and skills; references point at another project's workflow (GRPH id) without merging the projects.

## Deliverables

Create or update:

- backend/db/schema.sql
- backend/db/migrations/007_multi_project_links.sql
- backend/src/modules/links/ (routes.ts: dependency CRUD + reference-targets)
- backend/src/modules/modeler.ts (workflow_call node type + cross-project reference validation)
- backend/src/modules/diagrams/generator.ts (deterministic cross-project rendering)
- backend/src/modules/docs-generator/ (dependencies file + cross-project calls in workflows.md)
- frontend/src/entities/project-link/ (types + hooks)
- frontend/src/entities/model-graph/ (cross-project reference types on nodes)
- frontend/src/features/visual-modeler/InspectorPanel.tsx (cross-project picker + manual ID field)
- frontend/src/pages/ProjectDetailsPage.tsx (Linked Projects section)
- frontend/src/pages/WorkflowsPage.tsx (cross-project calls per workflow)
- docs/features/multi-project-workspace.md (FEAT-009)
- docs/ontology/id-convention.md (add PDEP prefix)
- backend/tests/links.test.ts + frontend/tests/links.test.tsx
- memory files

## Requirements

1. **project_dependencies table** (id PDEP-0001, project_id REFERENCES projects ON DELETE CASCADE, depends_on_project_id REFERENCES projects ON DELETE CASCADE, kind CHECK ('workflow_call','data','deploy','other'), note, created_at, UNIQUE (project_id, depends_on_project_id, kind)). Self-links are rejected; cycles are allowed but flagged as warnings in validation.
2. **Dependency API**: GET /projects/:id/dependencies returns outgoing links joined with target project name/type/status; GET /projects/:id/dependents returns incoming links (who depends on me); POST /projects/:id/dependencies; DELETE /projects/:id/dependencies/:depId. Log events.
3. **Reference targets API**: GET /projects/:id/reference-targets returns the linked projects first (their id, name, type) plus an "all projects" option, each with its workflow-kind graphs (graph id, name) so the modeler picker has real data. Manual ID entry accepts a GRPH id directly.
4. **Modeler — workflow_call node**: add a built-in `workflow_call` node type (category system, kinds ['workflow'], color + default title "Workflow call") to the palette catalog. The node stores metadata.cross_project = { project_id, graph_id, node_id? }. The InspectorPanel shows a "Cross-project call" section: project dropdown → workflow dropdown, plus a manual field to paste/type the target graph id (works for unlinked projects too; the target must exist and be a workflow-kind graph).
5. **Validation**: on save, every workflow_call node is checked — target project exists, target graph exists and has kind workflow. Broken or missing references produce warning CROSS_PROJECT_REF_MISSING (validation panel + save-time warning list); structurally invalid payloads (non-GRPH id, missing fields) are rejected with 400.
6. **Diagram generation**: generated Mermaid for a workflow containing workflow_call nodes renders each call deterministically as a subgraph reference — `subgraph PRJ_0002["API project"]` with a labeled stub node (target graph name + id) inside, with the deterministic ordering rules from Prompt 08 preserved. Both /diagrams/preview and stored generation must be byte-identical for the same input.
7. **Docs generation**: workflows.md lists every cross-project call (caller workflow, target project id/name, target workflow id/name). A new generated file (00-meta/dependencies.md or an extension of 02-requirements/traceability.md) lists project dependencies with kind + note. Per-project exports remain isolated: each project's docs export only contains its own artifacts plus the dependency/call metadata (no merging of workspaces).
8. **Frontend — linked projects**: ProjectDetailsPage gains a "Linked projects" card: add a link (search/select project, choose kind, optional note), list outgoing links with remove, list incoming links read-only with the depending project name.
9. **Frontend — workflows page**: for each workflow, show its cross-project calls (target project + workflow) with the project badge.
10. **IDs/governance**: PDEP prefix added to docs/ontology/id-convention.md; validation warnings follow the TR rule pattern (new rule TR-21 CROSS_PROJECT_REF for broken references).
11. **Verification**: root `bun tsc -b --noEmit` clean; backend smoke extended (dep create/delete, reverse listing, self-link rejected, reference-targets payload, workflow_call save + validation warning, diagram contains subgraph, byte-identical preview); backend + frontend tests pass; seed-example regenerates; preview verified.

## Definition of Done

Prompt 14 is complete only when:

- explicit linked projects exist with outgoing + incoming views and add/remove
- the modeler supports workflow_call nodes via dropdown AND manual ID
- broken cross-project references are surfaced in validation
- diagrams and docs render cross-project calls deterministically
- per-project docs exports remain isolated per project
- FEAT-009 doc written; id-convention updated; tests and smoke checks pass

## Mandatory Completion Rule

After finishing, update all memory files and report completion per AGENTS.md. The next required prompt is 15-custom-node-palette.
