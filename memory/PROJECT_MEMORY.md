# PROJECT_MEMORY

## Project Summary

Project name: SpecForge Studio

Project type: Internal engineering platform

Purpose:
Build a full software engineering lifecycle platform that converts visual planning into structured documentation, diagrams, roadmaps, and agent-executable task packs.

Core product capabilities:
- Visual modeling without manual Mermaid writing
- Automatic generation of Markdown engineering documents
- Automatic generation of workflows, sequence diagrams, ERD, and architecture diagrams
- Full traceability through stable IDs
- Automatic roadmap generation
- Agent-neutral executable checklists
- Human approval gates combined with automation
- Hybrid storage behavior with database as source of truth and Markdown as generated output

## Technology Constraints

Frontend:
- React
- TypeScript
- Vite
- Feature-Sliced Design

Backend:
- Node.js
- TypeScript
- SQLite

Documentation output:
- Markdown only
- English only

Diagram output:
- Mermaid generated automatically from structured data

Storage:
- Database is the source of truth
- Markdown workspace is generated/exported output

Integrations:
- No external SaaS integrations unless explicitly approved

Agent behavior:
- Agent-neutral
- Supports Claude, ChatGPT, Qwen, or compatible agents
- Produces executable checklists

## Current State

Current phase:
- opt-004-skill-matching (approved optional task) — COMPLETE (2026-08-24)

Current prompt:
- OPT-004 skills-to-task matching (DEC-027; implemented additively on main)

Status:
- completed — ALL REQUIRED SCOPE (Prompts 00–20) + OPT-003 + Prompt 21 + OPT-004 implemented and verified 2026-08-24: root typecheck clean; bun run build OK; 242 tests pass / 0 fail (32 files, 1095 expects); smoke SMOKE TEST OK. Awaiting user direction (optional task approval, new requirement, or close).

## Completed Work

- Prompt 00 (bootstrap memory and rules) — completed 2026-08-16:
  - Verified the full memory system exists and is consistent (AGENTS.md, memory/, prompts/).
  - Persisted the user-provided MASTER PROMPT as MASTER_PROMPT.md (governing execution protocol, DEC-001).
  - Recorded user requests and governance constraints in memory.
  - STATE.json now points to Prompt 01 as the next prompt.
- Freebuff preview configuration (operational, NOT started):
  - install: bun install
  - dev/preview: bun run dev --host 0.0.0.0 (port 5173)
  - build: bun run build
- Prompt 01 (product definition) — completed and APPROVED 2026-08-16 (APR-001):
  - Created docs/product/ with: README.md (reading order), PRD.md, vision.md, scope.md, non-goals.md, user-roles.md, success-metrics.md, open-questions.md.
  - PRD covers all 10 required aspects; all 11 mandatory product constraints recorded.
  - Open questions recorded (OQ-01 … OQ-08) with suggested defaults.
  - Product definition is final; status fields in docs/product/ updated to approved.
- Prompt 02 (domain ontology and IDs) — completed 2026-08-16:
  - Created docs/ontology/ with: entity-catalog.md (24 entities), id-convention.md, relationships.md, traceability-rules.md (TR-01…TR-20), status-lifecycle.md, README.md.
  - Recorded DEC-002 (ID convention) and DEC-003 (status model with approval gates).
- Prompt 03 (markdown workspace spec) — completed 2026-08-16:
  - Created docs/workspace/ with: folder-structure.md (WS-001), file-naming.md (WS-002), frontmatter-spec.md (WS-003), README.md, and templates/ (AGENTS.md, workflow, use-case, api, entity, test-case, task, README).
  - Recorded DEC-004 (workspace specification adopted as canonical export format).
- Prompt 04 (database schema) — completed 2026-08-16:
  - Created backend/db/schema.sql (canonical schema, validated with bun:sqlite: 29 tables), backend/db/migrations/README.md, docs/data/database-design.md (DB-DES-001), docs/data/entity-mapping.md (DB-DES-002).
  - Recorded DEC-005 (schema design decisions).
- Prompt 05 (backend core) — completed 2026-08-16:
  - Scaffolded monorepo (root workspace, backend/ package). Backend: Fastify 5 + Zod 3 + bun:sqlite (DEC-006) with config, db init, structured errors, ID allocation, event log, and modules: projects CRUD, requirements, use-cases, workflows, entities, api-endpoints, tasks (+checklist), artifacts index, healthz.
  - Verified: backend + root typecheck pass; smoke test 26/26 PASS. Fixed agent_runs.project_id schema gap.
  - Recorded DEC-006 (bun:sqlite) and DEC-007 (monorepo layout).
- Prompt 06 (frontend foundation FSD) — completed 2026-08-16:
  - Frontend (frontend/): React 18 + Vite 6 + Tailwind 3 + TanStack Query 5 + Zustand 5 + react-router 6, full FSD layers, 8 pages, API client, create-project + status features, AppShell/DataTable widgets.
  - Backend: added GET list endpoints; smoke test 30/30. Root/backend/frontend typechecks pass.
  - Preview command updated to `bun run dev` (port 5173); root dev runs backend + frontend concurrently.
  - Recorded DEC-008 (Tailwind CSS, OQ-02 resolved).
- Prompt 07 (visual modeler) — completed 2026-08-16:
  - Backend (backend/src/modules/modeler.ts): node type catalog (12 types, per-kind availability, colors), graph CRUD (create/list/load/save/delete), validation engine (kind-aware warnings: NO_START, MULTIPLE_START/END, DECISION_EDGE_NO_CONDITION, dangling edges, isolated nodes, parallel edges, unknown types), unknown node/edge types rejected with 400. Save = transactional replace semantics mapping client keys to canonical IDs (GRPH-0001-N01/E01). Registered in app.ts.
  - Schema: added model_graphs, model_nodes, model_edges to backend/db/schema.sql (+ migration backend/db/migrations/001_modeler_graphs.sql, additive-only). GRPH and FEAT prefixes added to docs/ontology/id-convention.md.
  - Frontend: @xyflow/react v12 installed (DEC-009, OQ-01 resolved). entities/model-graph (types + TanStack hooks); features/visual-modeler (ModelerCanvas with drag-drop/palette/connect/delete, NodePalette grouped by category, InspectorPanel editing id/type/title/description/inputs/outputs/preconditions/postconditions/related artifacts + edge label/condition/type, ValidationPanel with severity chips, ModelerToolbar with save/discard/dirty state, useModelerGraph hook with seed/save-reconcile/validate); pages/modeler (ModelerPage hub + CanvasPage full-bleed canvas); AppShell renders canvas routes full-bleed; Workflows/Data Model/Architecture pages link into the modeler.
  - Verified: root tsc -b --noEmit OK; backend smoke test extended to 56 checks (modeler create/save/load/validate/delete) — all PASS.
  - Deliverable: docs/features/visual-modeler.md (FEAT-001).
  - Recorded DEC-009 (React Flow + modeler graph tables) in memory/DECISIONS.md.
- Prompt 08 (diagram generation) — completed 2026-08-16:
  - Backend (backend/src/modules/diagrams/generator.ts + routes.ts, registered in app.ts):
    - Deterministic Mermaid generators (DEC-010): workflow flowchart TD (start/end stadium, decision diamond, edge text label (condition) type, --x for failure); sequence diagram from sequence graphs (nodes = participants, edges = messages) or workflow graphs (roles derived: Actor/UI/API/DB/External/AI Agent/Event/Approver/System); ERD from data-kind graphs (database nodes + metadata.fields + edges as relations with 1:1/1:N/N:M from condition) or from entities/entity_fields/entity_relations tables; architecture flowchart LR with layer subgraphs (boundaries) and protocol edge labels, or from components table by layer.
    - Ordering deterministic (position y, x, id); mermaid ids sanitized canonical IDs (GRPH_0001_N01).
    - generated_diagrams table (DIAG prefix, migration 002) stores mermaid, source artifact IDs, warnings, type, generated timestamp.
    - APIs: GET list, GET :id, POST /diagrams/generate (store), DELETE :id, POST /diagrams/preview (stateless, powers canvas preview).
  - Frontend: entities/diagram (types + hooks: list/generate/preview/delete); features/diagram-preview (MermaidBlock with warnings + copy, DiagramPreviewDialog modal); pages/diagrams/DiagramsPage (generate form + provenance list with expandable Mermaid); route /projects/:projectId/diagrams + nav link; modeler canvas toolbar now has "Preview diagram" (live Mermaid from current unsaved graph via /diagrams/preview).
  - Verified: root tsc -b --noEmit OK; backend smoke test extended to 85 checks (generate+store workflow DIAG-0001, ERD from tables with provenance, preview all four kinds, list/get/delete) — all PASS.
  - Deliverable: docs/features/diagram-generation.md (FEAT-002).
  - Recorded DEC-010 in memory/DECISIONS.md.
- Prompt 09 (document generation) — completed 2026-08-16:
  - Backend (backend/src/modules/docs-generator/ — markdown.ts, generators.ts, workspace.ts, routes.ts — registered in app.ts):
    - Renders the full WS-001 Markdown workspace directly from database rows (database = source of truth).
    - 19+ English document generators (readme, agents guide, project, id-registry, glossary, charter, vision, scope, milestones, risk-register, srs, use-cases, traceability, hld, lld, workflows, erd, api, screens, sequences, test-plan, test-cases, bug-report template, developer/user/deployment guides, adrs, approvals, master plan, tasks, checklists, agent guide).
    - Every file carries YAML frontmatter with stable IDs (WS-003); design docs embed Prompt 08 generators (workflows.md → generateWorkflow, erd.md → erdFromTables + generateErd, sequences.md → generateSequence, hld.md → generateArchitectureFromComponents).
    - Protected sections (`<!-- protected -->` / `protected: true`) survive regeneration; exports stored in docs_exports (DOCS prefix, migration 003) with supersedes chains; folder output under EXPORT_DIR (default data/exports).
    - Fixed Markdown spacing conventions (h/p/frontmatter blank lines; code fences on their own lines after Request:/Response: labels).
  - Frontend: entities/docs (types + hooks: exports list, generate, detail, file content, delete); DocsExportPage rebuilt (generate form, export list, expandable file tree, file viewer with copy + download).
  - Committed regenerable example: docs/workspace/generated-example/ (32 files) via backend/scripts/generate-example.ts (`bun run --cwd backend seed-example`).
  - Verified: root tsc -b --noEmit OK; backend smoke test extended to 106 checks (generate/list/get/regenerate/protected preservation/superseding/delete) — all PASS.
  - Deliverable: docs/features/document-generation.md (FEAT-003).
  - Recorded DEC-011 in memory/DECISIONS.md.
- Prompt 10 (roadmap and agent tasks) — completed 2026-08-16:
  - Backend roadmap engine (backend/src/modules/roadmap/engine.ts + routes.ts, registered in app.ts):
    - Deterministic derivation (DEC-012) of a roadmap snapshot from project artifacts (requirements, workflows, entities, API endpoints, screens, components, risks, non-functional requirements): 5 phases (Definition/Design/Implementation/Validation/Delivery) with approval gates + gate criteria, 5 milestones (relative due dates), epics (one per module + cross-cutting: Requirements & Scope, Architecture & Data Design, Core Implementation, Governance & Approvals, Testing & Validation, Deployment & Delivery), task drafts (concrete sequential checklists with verification hints, priorities from requirement priority/criticality + risk likelihood/impact, approval_required for constraint/critical-risk tasks), dependencies (artifact_links traceability + module ordering entity→api→screen + requirement→referenced artifacts).
    - Storage: roadmaps + roadmap_phases/roadmap_epics/roadmap_milestones/roadmap_tasks/roadmap_task_dependencies tables (migration 004, additive), child IDs RMP-0001-P01/EP01/M01/T01; RMP prefix added to docs/ontology/id-convention.md.
    - APIs: POST /roadmaps/generate, GET /roadmaps?project=, GET /roadmaps/:id, DELETE /roadmaps/:id.
  - Backend agent task packager (backend/src/modules/agent-tasks/packager.ts + routes.ts):
    - Materializes roadmap drafts into canonical tasks/task_checklists (+ verification_hint) and new canonical task_dependencies table; idempotent via roadmap_tasks.materialized_task_id; packs survive roadmap deletion.
    - APIs: POST /agent-tasks/generate (roadmap_id), GET /agent-tasks?project=, GET /agent-tasks/:id (task + checklist + dependencies).
  - Frontend: entities/roadmap + entities/agent-task (types + TanStack hooks); pages/roadmap/RoadmapPage (generate form, roadmap list with expandable detail — phase gates, milestones, tasks grouped by phase/epic with priority + approval badges, dependency edges — Generate task pack button, delete); route /projects/:projectId/roadmap + "Roadmap" nav link.
  - Seed example: backend/scripts/generate-example.ts now generates RMP-0001 and packages 13 tasks (TASK-0002…TASK-0014) into docs/workspace/generated-example/ (09-agent-plans/tasks.md shows executable packs). Fixed TASK id_sequences seeding after manual TASK-0001.
  - Deliverables: docs/features/roadmap-engine.md (FEAT-004) + docs/features/agent-task-packager.md (FEAT-005).
  - Verified: root tsc -b --noEmit OK; backend smoke test extended from 106 to 141 checks (roadmap generate with 5 phases/5 milestones/epics/task drafts/priorities/approval gates/REQ→API dependency, list/get with due dates, agent-tasks generate + idempotent re-run, packs with sequential checklists + verification hints, dependency edges, get/404, delete keeps materialized tasks) — all PASS.
  - Recorded DEC-012 in memory/DECISIONS.md.
- Prompt 11 (governance and approvals) — completed 2026-08-16:
  - Backend (backend/src/modules/governance/lifecycle.ts + routes.ts, registered in app.ts):
    - Nine canonical governance statuses (draft/auto_generated/needs_review/approved/ready_for_agent/in_progress/needs_verification/done/rejected) with an enforced transition map (illegal transitions rejected with the allowed set); 17-type artifact registry (module…roadmap) with per-type governance→domain status translation and best-effort sync of each artifact's own status column.
    - Approval gates (DEC-003) enforced structurally: requirement, workflow, entity, component, api_endpoint, decision, and roadmap cannot become `approved` without an approved APR (GOV_APPROVAL_REQUIRED otherwise); automatic generation never requires approval.
    - Approvals (APR-xxxx): POST /approvals (request → pending + needs_review overlay for gated kinds), POST /approvals/:id/decide (approved|rejected; rejection requires a reason; approval_id recorded on tasks + governance overlay), GET /approvals(?:id).
    - Audit trail: every transition/request/decision appended to event_log; GET /audit (filterable by project/entity_type/entity_id, limit).
    - Validation warnings per TR rules (TR-01/02/05/06/07/08/09/15/19/20) via GET /governance/validation (errors/warnings/infos) and traceability coverage + orphan artifact_links via GET /governance/traceability.
    - New additive table artifact_governance (migration 005).
  - Frontend: entities/governance (types + TanStack hooks); pages/governance/GovernancePage with Status / Approvals / Validation / Traceability tabs; route /projects/:projectId/governance + "Governance" nav link.
  - Seed example: full approval flow (APR-0002 requested → approved by engineering-lead → WF-0001 status synced to approved) + mid-project states (RMP-0001 roadmap needs_review awaiting gate, TASK-0001 in_progress) + audit events in event_log; 08-governance/approvals.md lists APR-0001 + APR-0002.
  - Verified: root tsc -b --noEmit OK; backend smoke test extended to 185 checks (statuses, illegal transition, gated approval required, approval request/decide, rejection without reason blocked, approval_id on task, transitions + domain sync, audit entries, validation warnings levels, traceability coverage + orphans) — all PASS.
  - Deliverables: docs/features/governance.md (FEAT-006) + docs/features/approvals.md (FEAT-007).
  - Recorded DEC-013 in memory/DECISIONS.md.
- Prompt 12 (testing and validation) — completed 2026-08-16:
  - Backend test suites (backend/tests/, bun:test — zero new dependencies):
    - helpers.ts (in-memory app + request helper + seed helpers); api.test.ts (health, projects CRUD, VALIDATION_ERROR, 404s, filters, dangling refs, artifacts index); database.test.ts (34-table schema completeness, foreign keys, id_sequences never reused, CRUD + JSON round-trips, cascade deletes incl. artifact_links); diagrams.test.ts (byte-identical determinism, 4 kinds, generate/store/provenance/delete, ERD from tables); docs.test.ts (30+ file workspace, frontmatter, embedded Mermaid, protected-section preservation, superseding, export CRUD); roadmap.test.ts (5 phases with gates + criteria, 5 milestones with due dates, epics, prioritized drafts with verification-hinted checklists, REQ→API dependency, list/detail); tasks.test.ts (pack materialization, idempotency, dependency edges, packs survive roadmap deletion); approvals.test.ts (registry, GOV_APPROVAL_REQUIRED gate, illegal transitions, auto_generated ungated, request/decide, rejection reason, domain sync, audit); validation.test.ts (NO_START / DECISION_EDGE_NO_CONDITION / MULTIPLE_START/END / UNKNOWN_NODE_TYPE on save, TR-01/05/06/07, traceability uncovered + orphans). 53 tests.
  - Frontend test suites (frontend/tests/, bun:test + react-dom/server static rendering — zero new dependencies):
    - lib.test.ts (format + statusClass); api-client.test.ts (api() envelope unwrap, JSON mutation bodies, DELETE, ApiError status/code/message, generic fallback, errorMessage); visual-modeler.test.ts (metaForType fallbacks, edgeDisplayText, serverNodeToRf, serverEdgeToRf canonical→client-key mapping); ui-states.test.tsx (EmptyState / ErrorState / Spinner rendering); pages.test.tsx (DocsExportPage rendered in MemoryRouter + QueryClientProvider — page shell + synchronous loading state). 22 tests.
  - Schema fix: artifact_links.project_id now REFERENCES projects(id) ON DELETE CASCADE in canonical schema.sql (no orphan traceability rows; DEC-014). Live-DB table-rebuild migration deferred pending explicit APR per migrations policy.
  - Docs: docs/testing/test-plan.md (TEST-001) + docs/testing/validation-rules.md (TEST-002); TEST prefix + previously-missing DOCS prefix added to docs/ontology/id-convention.md.
  - Scripts: root `bun test backend/tests frontend/tests`, backend + frontend `test` scripts; test dirs added to root tsconfig include (tests are typechecked).
  - Verified: 75/75 tests PASS (53 backend + 22 frontend); root tsc -b --noEmit clean; backend smoke 185/185 PASS; seed-example regenerates.
  - Recorded DEC-014 in memory/DECISIONS.md.
- Prompt 13 (platform configuration) — completed 2026-08-16:
  - Schema: five additive tables project_types, stacks, libraries, project_type_assignments, project_type_config, project_libraries in backend/db/schema.sql (+ migration backend/db/migrations/006_platform_configuration.sql, idempotent); `projects.type` marked DEPRECATED but kept for back-compat.
  - Backend (backend/src/modules/platform-config/): seed.ts seeds 4 built-in types (web/mobile/api/ai PTYPE-0001…), 12 stacks (STK-0001…), 32 libraries (LIB-0001…) idempotently on boot (bumps id_sequences); routes.ts exposes GET /platform-config (full tree) + POST/PATCH/DELETE for types/stacks/libraries. Built-in rows editable/disableable but never hard-deletable (400); rows referenced by any project cannot be deleted (409 CONFLICT). All changes logged to event_log (project_type/stack/library created/updated).
  - Backend (backend/src/modules/projects.ts): create/patch accept `types[]` (type_id + stack_id + library_ids); validation rejects unknown/disabled types, stacks not belonging to the type, libraries not belonging to the chosen stack, libraries without a stack; legacy `type` key still works (mapped to seeded type when types omitted); responses include enriched `types[]` (key, label, color, stack id/name/language, libraries) via loadProjectTypes; patch derives the legacy type column from the first assignment.
  - Backend (app.ts): imports + calls seedPlatformConfiguration(db); registers registerPlatformConfigRoutes.
  - Docs generator: genProjectMeta emits a Platform Configuration table + projectTypeSelection helper.
  - Frontend: entities/platform-config (types + all CRUD hooks); features/platform-settings/PlatformSettingsPanel (type cards, stack blocks, library lists, add/edit/disable/delete); features/create-project/CreateProjectForm rewritten for multi-type toggle grid + per-type stack select + library checkboxes + legacy primary select; widgets/platform-badges/PlatformBadges on Dashboard + ProjectDetails; pages/SettingsPage rebuilt with tabs (Platform configuration / Environment / Reference).
  - Seed example: seed-data.ts seeds web + React stack + React Router/Zustand/Tailwind CSS onto Acme PRJ-0001 (fixed FK ordering); seed-example regenerates docs/workspace/generated-example/ (32 files incl. Platform Configuration table in 00-meta/project.md).
  - Tests: backend/tests/platform-config.test.ts (20 tests: seeds, multi-type create/patch, enriched responses, validation failures, back-compat creation, Settings CRUD, built-in/used delete guards, audit events); frontend/tests/platform-config.test.tsx (4 tests: PlatformBadges, loading states).
  - Verified: backend 73/73 tests PASS (9 files), frontend 26/26 tests PASS (6 files), both typechecks PASS, backend smoke extended to 204 checks — all PASS.
  - Deliverable: docs/features/platform-configuration.md (FEAT-008).
  - Recorded DEC-017 in memory/DECISIONS.md.
- Prompt 14 (multi-project workspace) — completed 2026-08-16:
  - Schema: additive `project_dependencies` table in backend/db/schema.sql (PDEP ids, FK cascade on both sides, kind CHECK in workflow_call/data/deploy/other, UNIQUE(project_id, depends_on_project_id, kind), CHECK no self-link) + 2 indexes (+ migration backend/db/migrations/007_multi_project_links.sql).
  - Backend (backend/src/modules/links/routes.ts, registered in app.ts): dependency CRUD (GET/POST /projects/:id/dependencies, DELETE /projects/:id/dependencies/:depId, GET /projects/:id/dependents incl. depending_project_id alias), GET /projects/:id/reference-targets (linked projects first, then all others, each with its workflow graphs — powers the modeler picker), GET /projects/:id/workflow-calls (resolved caller→target rows).
  - Backend (backend/src/modules/modeler.ts): new `workflow_call` node type (category system, color #7c3aed); exported CrossProjectRef, crossProjectRefOf, crossProjectRefStatus; validateGraph accepts options.crossProjectResolves and emits CROSS_PROJECT_REF_MISSING; assertNodeInputsValid rejects structurally-invalid refs with 400; loadGraph + /modeler/validate pass cross-project resolution.
  - Backend diagrams (generator.ts + routes.ts): resolveCrossProjectCalls(db, nodes) → Map; generateWorkflow renders resolved calls as nestˢubgraph `subgraph xp_<node id>[<project name> (<project id>)]`; CROSS_PROJECT_REF_MISSING warning otherwise; generate + preview both resolve so stored/preview stay byte-identical.
  - Backend docs (generators.ts + workspace.ts): genWorkflowsDoc adds "Cross-project Calls" section; new genProjectDependencies; WORKSPACE_FILES appends `00-meta/dependencies.md` at END so existing ART ids never shift (example export now 33 files, dependencies.md = ART-0033).
  - Backend governance (routes.ts): TR-21 check for workflow_call targets; response shape {errors, warnings, infos, all} (tests read .data.all); violation labels name the caller node + broken target.
  - Ontology docs: PDEP prefix row in id-convention.md; TR-21 added (21 rules, README count updated).
  - Frontend: entities/project-link (types + api hooks + lib: dependencyKindLabel, DEPENDENCY_KINDS, buildCrossProjectMetadata, crossProjectRefOf); model-graph CrossProjectRef type; visual-modeler metadata passthrough (ModelerNodeData.metadata, serverNodeToRf, useModelerGraph drafts); InspectorPanel CrossProjectSection (target project dropdown, workflow dropdown for linked projects, manual GRPH id input, projectId prop); widgets/linked-projects/LinkedProjectsCard (add form, outgoing/incoming with kind labels + statuses, remove, empty states, hides already-linked targets) on ProjectDetailsPage; widgets/project-calls/CrossProjectCalls on WorkflowsPage.
  - Tests: backend/tests/links.test.ts (11 tests: dep CRUD + 409/400 self-link, reference-targets linked-first + unlinked third project, workflow_call save/400/missing-ref warning/draft validate, workflow-calls resolution, generate-vs-preview byte-identical subgraph, TR-21 persistent-broken ref) — all PASS; frontend/tests/links.test.tsx (8 tests: lib helpers + LinkedProjectsCard + CrossProjectCalls static render) — all PASS. Fixed pre-existing type errors in backend/tests/platform-config.test.ts.
  - Verified: backend 84/84 tests PASS (10 files), frontend 34/34 tests PASS (7 files), root tsc -b --noEmit clean, backend smoke extended to 226 checks (13 node types; dep CRUD, dependents with including project, cross-project save + resolved workflow-calls, subgraph render, shape-invalid 400, TR-21 clean after valid call, workflows.md Cross-project Calls section, dependencies.md in export, delete) — all PASS. Seed example regenerated (33 files).
  - Deliverable: docs/features/multi-project-links.md (FEAT-009).
  - Recorded DEC-018 in memory/DECISIONS.md.
- Prompt 15 (custom node palette) — completed 2026-08-16:
  - Schema: additive node_categories + node_types tables in backend/db/schema.sql (NCAT/NTYP ids, JSON kinds + fields columns, built_in/disabled flags) + migration backend/db/migrations/008_node_palette.sql.
  - Backend (backend/src/modules/palette/seed.ts + routes.ts, registered in app.ts): seedNodePalette(db) seeds 14 types (the 13 legacy catalog types incl. workflow_call PLUS demo loop type NTYP-0014 in category NCAT-0001 "Flow control" with custom fields iterations number default 1 + mode select [for/while/until] default "for"); first custom type after seed = NTYP-0015, first custom category = NCAT-0005 (asserted in tests/smoke). Routes CRUD under /palette/categories + /palette/node-types with built-in guards (cannot hard-delete, can disable) and in-use delete guards; all changes event-logged.
  - Backend (backend/src/modules/modeler.ts): static NODE_TYPE_CATALOG / NODE_TYPE_SET REMOVED. buildPaletteMap(db) → Map<type,{kinds,enabled}>, enabledNodeTypes(db) → NodeTypeDefinition[] (incl. fields), validateGraph takes palette option and emits UNKNOWN_NODE_TYPE / DISABLED_NODE_TYPE / KIND_NOT_SUPPORTED, assertNodeInputsValid(db, input); both validate/save paths pass palette: buildPaletteMap(db). GET /modeler/node-types preserved and now returns 14 (15 after creating one) enabled types with an added fields?: NodeFieldDef[].
  - Backend diagrams (generator.ts): workflowShape(type) helper — stadium for start/end, decision diamond, generic rounded-box fallback for ALL other/custom types. Fixed backend bugs: listNodeTypes/getNodeType/getNodeTypeByKey now parse JSON kinds/fields via parseJsonArray (toRow helper); updateCategory must not null color when omitted (patch.color || existing.color).
  - Frontend: entities/palette (types.ts + api.ts hooks — useNodePalette, create/update/delete category + node-type hooks invalidating ["node-palette"]; lib.ts allNodeTypes/enabledNodeTypes flat helpers); entities/model-graph/types.ts (ModelNodeType.category widened to string, + NodeFieldType/NodeFieldDef/fields?); visual-modeler/NodePalette.tsx rebuilt (props categories + catalog, groups by DB category with label/color); CanvasPage uses useNodePalette + allNodeTypes (full catalog incl. disabled to canvas/inspector) + enabledNodeTypes (palette list) with paletteLoading spinner; InspectorPanel CustomFieldsSection renders fields by type (text/textarea/number/select/boolean) bound to data.metadata[field.key]; changeType reseeds field defaults; useModelerGraph addNode seeds field defaults into metadata.
  - Frontend Settings: features/palette-settings/NodePaletteSettingsPanel.tsx (category cards with inline add/edit/disable/delete, NodeTypeCard with FieldDefEditor + kind checkboxes + re-parenting; built-in/in-use guards); SettingsPage TABS = ["Platform configuration", "Node palette", "Environment", "Reference"].
  - Docs: NCAT/NTYP rows in docs/ontology/id-convention.md; docs/features/custom-node-palette.md (FEAT-010, updated to note 14 seeds incl. loop demo).
  - Seed: backend/scripts/seed-data.ts calls seedNodePalette(db); seed-example regenerated (33 files).
  - Tests: backend/tests/palette.test.ts (15 tests: 14 seeds, loop fields, enabled list with fields, category CRUD + built-in guards, type CRUD + shape/kind/fields, disable, in-use delete guard, modeler validation disabled/unknown/kind) + backend/tests/database.test.ts now requires node_categories/node_types; frontend/tests/palette.test.tsx (7 tests: lib flatten helpers + NodePalette empty/all data static render; NodePalette type import aliased to NodePaletteData to fix duplicate identifier). Smoke extended to 256 PASS; blocks 19b/19c (usage graph + category CRUD) moved to END because the temporary usage graph shifted the GRPH id sequence hard-coded in the links section.
  - Verified: backend 99/99 tests PASS (11 files), frontend 41/41 tests PASS (8 files), root bun run typecheck clean, bun run build succeeds, backend smoke 256/256 PASS, seed-example regenerates 33 files.
  - Deliverable: docs/features/custom-node-palette.md (FEAT-010).
  - Recorded DEC-019 in memory/DECISIONS.md.
- Prompt 16 (skills + final audit) — completed 2026-08-16:
  - Schema: additive `skills` table in backend/db/schema.sql (SKL ids project-scoped, project_id FK ON DELETE CASCADE, kind CHECK capability/tech, level CHECK beginner/intermediate/advanced/expert, tag TEXT, sort_order, indexes on project_id and (project_id, kind)) + migration backend/db/migrations/009_skills.sql.
  - Backend (backend/src/modules/skills.ts, registered in app.ts): assertKindConsistency — capability skills REQUIRE level; tech skills REJECT level and REQUIRE non-empty tag. CRUD routes GET /skills?project=, POST /skills, PATCH /skills/:id, DELETE /skills/:id; validation 400s (capability without level, tech with level, empty tag, unknown kind, empty name), unknown project 404; all changes event-logged (entity_type skill).
  - Backend docs (generators.ts + workspace.ts): genSkillsDoc (imports listSkills from ../skills) emits 07-guides/skills.md — Capability Skills table, Tech Skills table, Task tie-in — appended at END of WORKSPACE_FILES so existing ART ids never shift (example export now 34 files; ART-0034); genReadme contents now mention "developer and user guides, skills".
  - Seed: backend/scripts/seed-data.ts seeds 4 demo skills (SKL-0001 Payments engineering/expert capability, SKL-0002 Full-stack TypeScript/advanced, SKL-0003 React/frontend, SKL-0004 Node.js/Fastify/backend) with event-log entries; imports SkillKind/SkillLevel types.
  - Frontend: entities/skill (types.ts + api.ts hooks useSkills/useCreateSkill/useUpdateSkill/useDeleteSkill invalidating ["skills", projectId]; lib.ts LEVELS/LEVEL_COLORS/skillKindLabel/skillLevelLabel/splitSkills); pages/SkillsPage.tsx (two-card layout capability + tech, inline add/edit forms, level pill vs tag pill, delete, empty/loading/error states); app/App.tsx route /projects/:projectId/skills; AppShell.tsx Skills nav link; ProjectDetailsPage.tsx SECTIONS gains { to: "skills", title: "Skills" }.
  - Docs: SKL prefix row in docs/ontology/id-convention.md; docs/features/skills.md (FEAT-011); docs/final-audit.md (AUDIT-001 — final audit of the Prompt 13–16 scope).
  - Stale-reference fixes: docs/guide.md (2.1 table "17-prompt sequence (00–16)", repo layout prompts line, §4 The Execution Model (prompts 00–16) table now rows 13–16 = platform configuration/multi-project/palette/skills, §12 Prompt-13-deferred note replaced with "Prompt 13–16 delivered full scope; deployment moved to optional backlog"); docs/tutorial-ecommerce.md (prompts/00–16 reference, Step 13 rewritten as "Platform configuration (Prompts 13–16)" covering the four new phases, Full-flow recap rows 13–16).
  - Tests: backend/tests/skills.test.ts (14 tests: empty list, capability create with level, tech create with tag, kind-consistency 400s, unknown-kind 400, empty-name 400, unknown-project 404, PATCH level update + cross-kind 400, delete 204/404, cascade on project delete, list filter) + backend/tests/database.test.ts now requires skills table; frontend/tests/skills.test.tsx (5 tests: lib splitSkills + SkillsPage loading/empty/rendered static render; fixed TS2532 via optional chaining). Smoke extended to 275 checks: skills block (empty list, create capability + tech with ids SKL-0001/0002, list counts, patch level, capability-without-level 400, tech-with-level 400, unknown project 404, docs generation includes 07-guides/skills.md with Capability/Tech sections + seeded skills, audit logs skill entity, delete 204/404) before app.close(); docs block earlier still asserts file_count >= 30.
  - Verified: backend 113/113 tests PASS (12 files), frontend 46/46 tests PASS (9 files), root bun run typecheck clean, bun run build succeeds, backend smoke 275/275 PASS, seed-example regenerates docs/workspace/generated-example/ (34 files).
  - Deliverables: docs/features/skills.md (FEAT-011), docs/final-audit.md (AUDIT-001).
  - Recorded DEC-020 in memory/DECISIONS.md.
  - ALL REQUIRED SCOPE COMPLETE (Prompts 00–16). Completion report delivered per AGENTS.md.
- Prompt 17 (UI polish and motion) — completed 2026-08-16:
  - Motion utilities in frontend/src/app/index.css: keyframes sf-page-enter (fade + 8px rise, 250ms) / sf-rise (320ms stagger entrance) / sf-scale-in (180ms); `@media (prefers-reduced-motion: reduce)` disables them and restores `scroll-behavior: auto`; `html { scroll-behavior: smooth }`.
  - AppShell (frontend/src/widgets/layout/AppShell.tsx): routed Outlet wrapped in a div keyed by `location.pathname` with sf-page-enter (key stable within a page so canvas/modeler state is preserved); nav links transition-all duration-200 with active `scale-[1.03]` and idle `hover:translate-x-0.5`.
  - Shared UI: Button transition-all duration-150 + active:scale-[0.98] press feedback (disabled stays non-scaled), Card base transition-all duration-200, EmptyState/ErrorState render with sf-rise.
  - Dashboard project grid + ProjectDetails SECTIONS tiles: staggered sf-rise entrance (animationDelay = index * 40ms) with group-hover lift (-translate-y-0.5), shadow-md, and hover:border-slate-300.
  - Tests: frontend/tests/ui-polish.test.tsx (4 tests: Button press classes, Card transition class, Empty/Error sf-rise) via react-dom/server — all PASS.
  - Docs: docs/features/ui-polish.md (FEAT-012); prompts/17-ui-polish-and-motion.md created; prompts/README.md sequence + note updated.
  - No new runtime dependency added (Tailwind utilities + plain CSS keyframes only); no backend/schema/docs-generator changes.
  - Verified: 163 tests pass / 0 fail (620 expects, 22 files), root bun run typecheck clean, bun run build succeeds.
  - Deliverable: docs/features/ui-polish.md (FEAT-012).
  - Recorded DEC-021 in memory/DECISIONS.md.
- Prompt 18 (full-detail e-commerce seeder) — completed 2026-08-17:
  - prompts/18-ecommerce-full-seeder.md created; prompts/README.md sequence updated to 18 + note.
  - backend/scripts/seed-ecommerce.ts: `seedEcommerceProject(db, {projectId?, graphId?})` (defaults live PRJ-0003 / GRPH-0003) + `isEcommerceSeeded(db, projectId)`. Seeds StoreSphere E-Commerce Platform (ASP.NET Core .NET backend API + React TypeScript frontend storefront):
    - Multi-type project: api → .NET stack (STK-0001) + MailKit/Scalar/EF Core/Serilog; web → React stack (STK-0004) + React Router/Zustand/Tailwind CSS (INSERT...SELECT resolved from platform-config seeds; verified those names exist in platform-config/seed.ts).
    - 8 modules MOD-0101..0108, 14 requirements REQ-0101..0114 (functional/constraint/data/nonfunctional with priority/criticality), 5 use cases UC-0101..0105, 4 workflows WF-0101..0104, 4 workflow model graphs (ids derived from the base via graphN(offset) so the committed example at GRPH-0004 never collides), 11 entities DB-0101..0111 + 51 fields + 10 relations REL-0101..0110 (1:1/1:N/N:M per schema CHECK), 13 API endpoints API-0101..0113 with explicit per-endpoint auth, 8 screens SCR-0101..0108, 7 components CMP-0101..0107, 8 skills SKL-0101..0108 (capability requires level, tech requires tag), 4 risks, 3 ADRs, 3 milestones, 6 test cases.
    - Approvals APR-0101 (REQ-0101 approved by Ada Lovelace) + APR-0102 (WF-0101 pending → approved by Alan Turing with artifact_governance sync + workflow status update); 21 artifact_links; storeRoadmap + materializeTaskPack (60 packaged tasks); governance demo (roadmap needs_review + first task in_progress).
    - Child IDs use the 0100+ ranges so the Acme example (0001+) and user projects never collide; TASK ids from the roadmap packager.
  - backend/scripts/generate-ecommerce-example.ts (`bun run --cwd backend seed-ecommerce-example`) → committed docs/workspace/generated-example-ecommerce/ (PRJ-0004, 34 files).
  - backend/scripts/seed-ecommerce-live.ts (`bun run --cwd backend seed-ecommerce-live`) → live DB PRJ-0003 + 3 diagrams (workflow GRPH-0003, ERD, architecture) via the real routes (DIAG-0001/0002/0003); idempotent (skips when PRJ-0003 exists).
  - backend/package.json scripts added (seed-ecommerce-example / seed-ecommerce-live).
  - backend/tests/seed-ecommerce.test.ts (8 tests: content counts, .NET+React type/library assignment, skill rules, roadmap + task pack, approvals/governance/traceability, workflow/ERD/architecture diagrams, docs workspace, coexistence with the Acme demo in one DB).
  - Verified: root typecheck clean, 171 tests pass / 0 fail (23 files, 682 expects), frontend + backend builds succeed, backend smoke 275/275 PASS, seed-ecommerce-example 34 files, seed-ecommerce-live idempotent + 3 diagrams stored.
  - Recorded DEC-022 in memory/DECISIONS.md.
- Prompt 19 (download generated docs as ZIP) — IMPLEMENTED 2026-08-18 (approved by user 2026-08-17, DEC-023):
  - prompts/19-docs-zip-download.md created; prompts/README.md sequence updated to 19 + note.
  - backend/src/utils/zip.ts — zero-dependency ZIP writer (node:zlib deflateRawSync method 8 + table-based CRC-32, local file headers + central directory + EOCD, UTF-8 names, deterministic entry order).
  - backend/src/modules/docs-generator/routes.ts — GET /docs/exports/:id/download (application/zip + Content-Disposition attachment, reuses readExportFiles so paths/content exactly match the detail endpoint, 404 for unknown ids).
  - frontend/src/entities/docs/api.ts — downloadDocsExport + useDownloadDocsExport (raw fetch → Blob → object URL → anchor click, bypassing the JSON API client); frontend/src/pages/DocsExportPage.tsx per-export Download ZIP button with loading/error states.
  - backend/tests/docs-zip.test.ts — PK\x03\x04 signature, Content-Type/Content-Disposition, entry names match files[].path in order, decompressed content matches, 404. Committed to main.
- Prompt 20 (project execution & delivery) — IMPLEMENTED (backend merged to main via PR #4; frontend completed on main 2026-08-18):
  - Backend (merged via PR #4): migration 010 (team_members MEM, issues ISS, releases RLS, tasks.assignee_id, milestones.assignee_id); modules team.ts / issues.ts / releases.ts / health.ts / search.ts / activity.ts; tasks.ts PATCH /tasks/:id (status/assignee_id/priority/objective) + GET /tasks assignee filter; genIssuesDoc (05-testing/issues.md) + genReleasesDoc (06-ops/releases.md) appended at END of WORKSPACE_FILES (ART-0035/ART-0036; examples grow 34 → 36 files); backend/tests/execution.test.ts.
  - Frontend (completed 2026-08-18): entities team-member/issue/release/health/search/activity + task entity assignee_id + useUpdateTask + useTasks assignee filter; pages IssuesPage (filters + create + advance/delete) + ReleasesPage (create + status advance + delete); TasksPage Kanban board (status columns, per-card status + assignee selects, assignee filter, board/table toggle) keeping the table view; widgets HealthCards + HealthMiniCard (Definition/Execution/Delivery metric cards), ActivityFeed (project + dashboard), TeamSection (roster CRUD), SearchBox (AppShell top bar with results dropdown); App.tsx routes + AppShell nav (Issues, Releases) + SearchBox; DashboardPage (HealthMiniCard per project + Recent activity + tips) + ProjectDetailsPage (HealthCards, TeamSection, ActivityFeed, Issues/Releases section cards); docs/features/execution-delivery.md (FEAT-013); MEM/ISS/RLS prefixes in id-convention.md; frontend/tests/execution.test.tsx (11 tests).
  - Seeds: Acme (seed-data.ts) + StoreSphere (seed-ecommerce.ts) both gained team/issues/releases/assignees; example workspaces regenerated to 36 files each. Fixed pre-existing tuple type bug in seed-ecommerce.ts.
- OPT-003 (multi-project roadmap aggregation) — completed 2026-08-18:
  - GET /roadmaps/aggregate?project= + entities/roadmap-aggregate + RoadmapAggregateCard on RoadmapPage; backend/frontend tests; DEC-025.
- Prompt 21 (landing page, pricing & subscribe flow) — completed 2026-08-24 (DEC-026, engine-freeze respected):
  - Backend ADDITIVE ONLY: migration 011_auth_and_billing.sql (+schema.sql): users USR / sessions SES / plans PLAN / subscriptions SUB; seedBillingPlans boot-seeds Free $0 / Plus $19 popular / Premium $49 (yearly $190/$490 = 2 months free); modules/auth.ts — register/login/logout/me with Bun.password argon2id hashes, SHA-256 token hashes, httpOnly sf_session cookie (SameSite=Lax, 30d), requireUser guard, UNAUTHORIZED error code added to utils/errors; modules/billing.ts — GET /plans public, POST /billing/checkout (Luhn+expiry+CVC mock-card validation; card optional for Free; switch cancels previous active sub; period end now+1mo/1yr), GET+DELETE /billing/subscription/me; registered in app.ts after palette routes.
  - Frontend: entities user/plan/subscription (useMe/useLogin/useRegister/useLogout, usePlans, useCheckout/useMySubscription/useCancelSubscription); widgets/background/WaveCanvas (rAF grid blocks + 3 forge wave ribbons, DPR-aware, hidden-tab pause, static frame under reduced motion); widgets/layout/PublicShell (sticky blurred navbar + footer); pages/landing/LandingPage + PricingSection (live plans from GET /plans, monthly↔yearly toggle, glowing Plus card, subscribe → /register?return=checkout or direct when signed in) + sections (bento features, how-it-works steps, FAQ accordion, final CTA); pages/auth/AuthPage (split-screen signin/register modes, ?return= continuation); pages/billing/CheckoutPage (order summary, cycle selector, formatted card inputs, success screen → workspace); app/guards HomeGate (/ guests→landing, users→dashboard) + GuestOnly; AppShell accepts children and footer shows AccountChip (email + plan badge + sign out).
  - Motion: index.css sf-float/sf-glow-pulse/sf-word keyframes + .sf-reveal scroll-reveal classes + shared/ui/Reveal (IntersectionObserver); all disabled under prefers-reduced-motion.
  - Tests: backend/tests/auth-billing.test.ts (14) + smoke block 21 (17 checks → total 292); frontend/tests/landing.test.tsx (10). Docs: FEAT-014 docs/features/landing-billing.md; USR/SES/PLAN/SUB rows in id-convention.md; prompts/21-landing-pricing-auth.md.
  - Verified: root typecheck clean; bun run build OK; 233 tests pass / 0 fail (30 files, 1062 expects); smoke 292/292 PASS.
- OPT-004 (skills-to-task matching) — completed 2026-08-24 (DEC-027, additive only):
  - backend/src/modules/skill-match.ts: deterministic keyword-overlap scoring (skill vocab = name+tag+description tokens; title hit +3, objective +2, context/constraints/DoD +1 per term, task.type match +3 flat; threshold MATCH_THRESHOLD=3; tokenize() drops stopwords/short tokens). GET /skill-matches?project= → ranked per-task skills (score desc, id asc), unmatched_tasks, coverage_gaps (open_matches vs total_matches, zero-open first); 404 unknown project; registered in app.ts after skills routes.
  - Frontend: entities/skill-match (types + useSkillMatches) and widgets/skill-match/SkillMatchPanel rendered on TasksPage — matched-task rows with scored skill chips (reasons on hover, top 4 + overflow), amber coverage-gaps strip for skills with no open matched work, unmatched counter, spinner/error-retry/empty states.
  - Tests: backend/tests/skill-match.test.ts (5), frontend/tests/skill-match.test.tsx (4); smoke block 22. Docs: docs/features/skill-matching.md (FEAT-015).
  - Verified: root typecheck clean; bun run build OK; 242 tests pass / 0 fail (32 files, 1095 expects); smoke SMOKE TEST OK.
- Landing polish batch — completed 2026-08-24 (user-requested fixes):
  - Logo: shared/ui/Logo.tsx SVG anvil+spark mark (forge gradient, useId) replaces "SF" text in PublicShell navbar/footer + AppShell sidebar; public/logo.svg favicon wired in index.html.
  - Nav active states: scroll-spy IntersectionObserver in PublicShell highlights current section (white text + forge underline bar, aria-current).
  - EMPTY SECTIONS FIX: root cause was raw .sf-reveal class (opacity:0 until .is-visible) with no observer attached; new useAutoReveal(dep) hook (shared/ui/Reveal.tsx) called by PublicShell on location.key reveals all .sf-reveal elements per page.
  - Modern footer: 4-column grid (Brand w/ status chips | Product anchors | Get started links | Plans $0/$19/$49 mini-table), glow top line, © bar, Back-to-top.
  - Anchors: all section links are now Link to="/#section" (work from any route e.g. /signin); PublicShell smooth-scrolls to hash targets and resets scroll otherwise. No raw href="#…" remains.
  - Verified: typecheck clean; build OK; 245 tests pass / 0 fail (32 files).

## Pending Work

Required phases pending:
- none — ALL REQUIRED SCOPE (Prompts 00–20) is complete and verified.

Awaiting user approval:
- none — no required work remains and nothing is awaiting approval. Optional candidates live in memory/OPTIONAL_BACKLOG.md and require explicit approval.

Optional backlog (refreshed 2026-08-18):
- Deployment packaging (docker-compose, Dockerfiles, docs/ops/) — moved from removed Prompt 13
- Per-type diagram templates (e.g. API-first sequence templates, mobile flow templates)
- Multi-project roadmap aggregation across linked projects
- Skills-to-task-pack matching (auto-assign tasks to required skills)
- Sprint planning: group the Kanban board into sprints with velocity tracking
- Issue-to-release linking with an auto-generated changelog

## Blockers

No blockers currently recorded.

## User Requests

All user requests are recorded in memory/USER_REQUESTS.md (latest: Prompt 19 — Download generated docs as ZIP plan).

## Constraints

Mandatory constraints:
- Frontend must use React with Feature-Sliced Design.
- Backend must use Node.js with SQLite.
- Generated documents must be English only.
- No manual Mermaid writing by end users.
- Database is source of truth.
- Markdown is generated output.
- No external integrations unless approved.
- Agent task packs must be executable and agent-neutral.

## Decisions

No approved decisions recorded yet.

All future decisions must be recorded in:
- memory/DECISIONS.md

## Next Action

All completed scope (Prompts 00–16 required + user-requested Prompt 17 polish + user-requested Prompt 18 e-commerce seeder) is done and verified. Prompt 19 (Download generated docs as ZIP) plan is created and awaiting the user's approval to implement. Per AGENTS.md, do not start implementation before the plan is approved; deliver the completion report once Prompt 19 is implemented and verified.

## Completion Policy

When all required tasks are complete, the agent must not stop silently.

The agent must:

1. Verify that all required phases are complete.
2. Verify that all deliverables exist.
3. Verify that all definition-of-done conditions are satisfied.
4. Update memory files.
5. Explicitly tell the user that all required tasks are complete.
6. State clearly that there is nothing left to do under the approved required scope.
7. Propose optional additional tasks.
8. Wait for explicit user approval before starting any optional task.

The agent must never start optional work without approval.

## Operational Context (2026-08-16)

- The repository currently contains only planning/memory files (AGENTS.md, MASTER_PROMPT.md, memory/, prompts/, docs/product/). No application code, package.json, or source files exist yet.
- Freebuff preview commands are configured but the preview cannot run until the application is scaffolded (backend in Prompt 05, frontend in Prompt 06).
- No env vars or secrets are required yet. Future needs: backend config (port, SQLite database path) and frontend API base URL (VITE_API_URL) once code exists.
- Product definition (docs/product/) is APPROVED (APR-001, 2026-08-16).
- Ontology (docs/ontology/) is complete per Prompt 02 (draft status; feeds schema and backend validation).
- Workspace spec (docs/workspace/) is complete per Prompt 03; templates define the generated export format.
- Database schema (backend/db/schema.sql) is complete and validated; migrations are additive-only.
- Backend (backend/) is scaffolded and smoke-tested (141 checks PASS): Fastify 5 + Zod 3 + bun:sqlite (DEC-006), monorepo workspace layout (DEC-007), modeler module (Prompt 07), diagrams module (Prompt 08), docs-generator module (Prompt 09), roadmap module + agent-tasks module (Prompt 10).
- Freebuff preview commands: install `bun install`, dev `bun run dev` (port 5173), build `bun run build`. Root dev runs backend + frontend concurrently; preview is a real web app.
- Preview is RUNNING and verified (2026-08-16, user deferred old Prompt 13): https://5173-7cda6598-6ac8-43d9-b39b-563aae04b353.daytonaproxy01.net — root 200, /api/healthz 200, /api/projects 200. Two fixes were required to make it work: (1) backend dev script pins `PORT=3000` because Freebuff injects PORT=5173 which collided with Vite (EADDRINUSE); (2) the Vite /api proxy now rewrites/strips the /api prefix because backend routes are unprefixed (was 404 on every API call). server.hmr: false preserved.
- Frontend is a full FSD app; visual modeler (Prompt 07) at /projects/:id/modeler, diagrams (Prompt 08) at /projects/:id/diagrams, docs export (Prompt 09) at /projects/:id/docs, roadmap (Prompt 10) at /projects/:id/roadmap with generate + task-pack packaging, and governance (Prompt 11) at /projects/:id/governance with status/approvals/validation/traceability tabs. Testing and validation (Prompt 12) complete: 75/75 tests PASS, backend smoke 185/185.
- SCOPE CHANGE (2026-08-16, DEC-015/DEC-016): old Prompt 13 (deployment-and-final-audit) was REMOVED from required scope by user request and replaced with new required Prompts 13–16 (platform configuration, multi-project workspace, custom node palette, skills + final audit). Plans created in prompts/ (files 13–16); prompts/README.md updated. Deployment deliverables moved to the optional backlog. Known stale references to fix during Prompt 16: docs/guide.md "14-prompt execution model" and docs/tutorial-ecommerce.md "deployment (pending)".
- PLATFORM CONFIGURATION COMPLETE (2026-08-16, DEC-017): Prompt 13 delivered DB-backed project types/stacks/libraries (migration 006), /platform-config CRUD with built-in/used delete guards, multi-type project creation with enriched types[] responses, legacy projects.type kept back-compatible, Settings > Platform configuration tab, multi-type CreateProjectForm, PlatformBadges, docs Platform Configuration table, PTYPE/STK/LIB prefixes. Verified: backend 73/73 tests, frontend 26/26 tests, both typechecks, backend smoke 204/204, seed-example regenerated.
- MULTI-PROJECT WORKSPACE COMPLETE (2026-08-16, DEC-018): Prompt 14 delivered project_dependencies (PDEP, migration 007) with CRUD/dependents/reference-targets/workflow-calls APIs, workflow_call modeler node with cross-project metadata (validated 400 on malformed refs, CROSS_PROJECT_REF_MISSING on missing targets), nested-subgraph Mermaid rendering (byte-identical generate/preview), dependencies.md workspace file (ART-0033), TR-21 governance rule, InspectorPanel cross-project picker + manual GRPH id, LinkedProjectsCard + CrossProjectCalls widgets, links tests (backend 11, frontend 8). Verified: backend 84/84 tests, frontend 34/34 tests, root typecheck, smoke 226/226, seed-example 33 files. FEAT-009.
- CUSTOM NODE PALETTE COMPLETE (2026-08-16, DEC-019): Prompt 15 delivered node_categories/node_types DB tables (migration 008, NCAT/NTYP), palette module (seedNodePalette 14 types incl. loop demo NTYP-0014 with iterations/mode fields + CRUD routes with built-in/in-use guards), modeler DB-driven (buildPaletteMap/enabledNodeTypes, static catalog removed, UNKNOWN/DISABLED/KIND validation, /modeler/node-types 14→15 with fields), generic workflowShape diagram rendering, entities/palette + NodePalette rebuilt by DB categories, InspectorPanel CustomFieldsSection + changeType reseeds, NodePaletteSettingsPanel in Settings > Node palette tab, NCAT/NTYP + FEAT-010 docs, seed integration, palette suites (backend 15, frontend 7). Verified: backend 99/99 tests, frontend 41/41 tests, root typecheck clean, bun run build succeeds, smoke 256/256, seed-example 33 files. Remaining required scope: only Prompt 16 (skills + final audit).
- SKILLS + FINAL AUDIT COMPLETE (2026-08-16, DEC-020): Prompt 16 delivered skills table (migration 009, SKL ids), skills module CRUD with kind-consistent validation (capability→level, tech→tag), 07-guides/skills.md appended at END of WORKSPACE_FILES (example export now 34 files, ART-0034), 4 seeded demo skills, SkillsPage + entities/skill + route/nav/section, SKL id-convention row, FEAT-011 + docs/final-audit.md (AUDIT-001), stale references fixed in guide.md + tutorial-ecommerce.md, skills suites (backend 14, frontend 5). Verified: backend 113/113 tests, frontend 46/46 tests (159 pass / 0 fail), root typecheck clean, bun run build succeeds, smoke 275/275, seed-example 34 files. ALL REQUIRED SCOPE (Prompts 00–16) COMPLETE.
- UI POLISH AND MOTION COMPLETE (2026-08-16, DEC-021): Prompt 17 (user-requested) delivered sf-page-enter/sf-rise/sf-scale-in CSS keyframes + prefers-reduced-motion block in index.css, AppShell page-transition wrapper keyed by location.pathname + nav micro-interactions, Button/Card/States polish, staggered Dashboard + ProjectDetails grid entrance with hover lift, frontend/tests/ui-polish.test.tsx (4 tests), FEAT-012, prompts/17-ui-polish-and-motion.md. No new runtime dependency. Verified: 163 tests pass / 0 fail (620 expects, 22 files), root typecheck clean, build succeeds. All completed scope done.
- E-COMMERCE SEEDER COMPLETE (2026-08-17, DEC-022): Prompt 18 (user-requested) delivered a second full-detail demo — StoreSphere E-Commerce Platform (ASP.NET Core .NET backend API + React TypeScript frontend storefront) — via backend/scripts/seed-ecommerce.ts (seedEcommerceProject/isEcommerceSeeded; multi-type api→.NET + web→React with libraries; 8 modules, 14 requirements, 5 use cases, 4 workflows + 4 model graphs with base-derived graph ids, 11 entities + 51 fields + 10 relations, 13 API endpoints, 8 screens, 7 components, 8 skills, 4 risks, 3 ADRs, 3 milestones, 6 test cases, APR-0101/APR-0102 governance demo, 21 artifact_links, roadmap + 60 packaged tasks), scripts generate-ecommerce-example.ts (committed docs/workspace/generated-example-ecommerce/, PRJ-0004, 34 files) + seed-ecommerce-live.ts (live PRJ-0003 + 3 diagrams via real routes, idempotent), package.json scripts, and backend/tests/seed-ecommerce.test.ts (8 tests). Child IDs use 0100+ ranges. Verified: 171 tests pass / 0 fail (23 files, 682 expects), root typecheck clean, builds succeed, smoke 275/275, seed-example 34 files. Committed to main as a0b783e.
- DOCS ZIP DOWNLOAD COMPLETE (2026-08-18, DEC-023): Prompt 19 (user-requested) implemented and committed to main — zero-dependency ZIP writer (backend/src/utils/zip.ts), GET /docs/exports/:id/download endpoint, useDownloadDocsExport hook + per-export Download ZIP button on DocsExportPage, backend/tests/docs-zip.test.ts.
- ROADMAP AGGREGATION COMPLETE (2026-08-18, DEC-025, OPT-003 approved optional task): GET /roadmaps/aggregate?project=:id in backend/src/modules/roadmap/routes.ts aggregates the root project + every directly linked project (PDEP dependencies + dependents) with per-project latest-roadmap summaries (phases/epics/milestones counts, task-draft total, packaged count, canonical done count, completion %) + workspace totals; deterministic ordering (root first, then name/id); 404 for unknown projects. Frontend: entities/roadmap-aggregate (types + useRoadmapAggregate + linkKindLabel) + widgets/roadmap-aggregate/RoadmapAggregateCard (per-project rows with link-kind badges, roadmap status, progress bars, totals) rendered on RoadmapPage; frontend/tests/roadmap-aggregate.test.tsx (3 tests). Backend/tests/roadmap-aggregate.test.ts (5 tests). Docs: roadmap-engine.md (FEAT-004) section 7. Verified: typecheck clean, 209 tests pass / 0 fail (28 files, 977 expects), backend smoke PASS.
- EXECUTION & DELIVERY COMPLETE (2026-08-18, DEC-024): Prompt 20 implemented. Backend merged to main via PR #4 (migration 010: team_members/issues/releases + assignee columns; team/issues/releases/health/search/activity modules; tasks PATCH + assignee filter; issues.md/releases.md workspace files ART-0035/ART-0036; execution.test.ts). Frontend layer completed on main this session: entities + IssuesPage/ReleasesPage + TasksPage Kanban board + HealthCards/ActivityFeed/TeamSection/SearchBox widgets + routes/nav/dashboard/overview integrations + FEAT-013 + MEM/ISS/RLS prefixes + execution.test.tsx. Demo seeds (Acme + StoreSphere) carry team/issues/releases/assignees; example workspaces regenerated to 36 files each. Verified: typecheck clean, 201 tests / 0 fail (26 files, 926 expects), backend smoke PASS. ALL REQUIRED SCOPE (Prompts 00–20) COMPLETE.
- PREVIEW RECONFIGURED (2026-08-18): repo re-connected to Freebuff (MohammedRamiAlzend/specforge-studio). freebuff-preview commands re-saved — install `bun install`, dev `bun run dev` (port 5173), build `bun run build` — configured but NOT started; user starts the preview from the UI. NOTE (memory staleness): main already contains implemented Prompt 19 (backend/src/utils/zip.ts, /docs/exports/:id/download, docs-zip tests) and Prompt 20 (execution & delivery: migration 010, team/issues/releases/search/activity modules, execution tests); STATE.json/NEXT_ACTION/PROJECT_MEMORY above still describe Prompt 19 as plan-only. Reconcile memory with the repo state in a follow-up session.
- LANDING / PRICING / AUTH COMPLETE (2026-08-24, DEC-026) + OPT-004 skill matching (DEC-027) + landing polish batch: public landing with live pricing from GET /plans ($0/$19/$49, yearly $190/$490), mock-card checkout (Luhn; test card 4242…), SQLite cookie sessions (USR/SES/SUB ids), SVG anvil-spark Logo + scroll-spy nav + useAutoReveal fix + modern footer + /#anchors. FEAT-014/FEAT-015.
- AUTH HARDENING COMPLETE (2026-08-25, DEC-028): email OTP verification now gates login (403 EMAIL_NOT_VERIFIED); register emails a 6-digit code and POST /auth/verify-email consumes it, marks the account verified and sets the session cookie; forgot/reset password via emailed codes (anti-enumeration, reset revokes all sessions; codes SHA-256 hashed, 10-min expiry, 5-attempt CODE_LOCKED, 60s resend RATE_LIMITED). Hand-rolled zero-dependency SMTP mailer (node:net/node:tls, AUTH LOGIN, 465 implicit TLS / STARTTLS) injected through buildApp({mailer}); SMTP_* env vars are HARD-REQUIRED at startup — backend/.env needs Gmail App Password settings (guide: docs/features/auth-otp-recovery.md, FEAT-017). Migration 012: users.email_verified (legacy users grandfathered as verified via migrate0012EmailVerified patch in db/index.ts; fresh installs keep new registrations unverified) + otp_codes table. Frontend AuthPage gained verify/forgot/reset steps (60s resend countdown, ?return= preserved); sign-out bug FIXED (useLogout: qc.clear() + window.location.replace('/')). Tests: FakeMailer/bootAppWithMailer/registerVerifiedUser helpers; auth-otp.test.ts (10 cases); smoke block 23. Verified: typecheck clean, build OK, 254 tests pass / 0 fail (33 files), SMOKE TEST OK.
- PARKED PLAN (not approved): full analytics — workspace /analytics page + per-project /projects/:id/analytics + dashboard strip using hand-built SVG charts (StatCard/BarList/DonutRing/Sparkline), GET /analytics/workspace + GET /projects/:id/analytics reusing computeProjectHealth/collectValidationWarnings/buildSkillMatchReport/event_log time-series, FEAT-016. Do NOT start without explicit user approval.


## Technical Assessment — 2026-08-25

- User requested a deep project analysis of `D:\specforge-studio`; the completed report is `docs/reviews/technical-assessment-2026-08-25.md`.
- Assessment was non-destructive. The local dependency tree was initially incomplete (package folders existed without package contents), so it was rebuilt from `bun.lock` using `bun install --frozen-lockfile`; no source or lockfile changes resulted.
- Verification after the clean dependency restore: `bun test backend/tests frontend/tests` passed 295 tests / 0 failures / 1,339 assertions; `bun run --cwd backend smoke` reported `SMOKE TEST OK`.
- Release blockers found: root `bun run typecheck` and `bun run build` fail with 11 TypeScript errors. The main defects are in the PresentationPage integration (default/named export mismatch, invalid Axios-style calls against the functional API client, unsupported Button props, and unsafe indexed slide access), plus two strict test typing errors.
- High-priority architecture finding: public user/session functionality does not provide project authorization or tenant isolation; existing internal APIs intentionally remain open. Treat the system as a trusted internal workspace only unless an ownership/membership/role authorization model is explicitly approved and implemented.
- Additional prioritized findings: cross-origin cookie deployment is incomplete, SMTP is a hard startup dependency with no visible readiness/operational mitigation, and the repository has no CI/deployment/backup packaging. The report provides a remediation sequence; no optional work was started.


## Implementation Batch — 2026-08-25

The user approved execution of priorities 1–7 from the technical assessment. The batch repaired the presentation TypeScript/build regressions and restored passing `bun run typecheck` and `bun run build`.

Authorization hardening added secure-by-default `AUTH_REQUIRED`, additive `project_members` migration 015, owner membership creation, project list/read/update isolation, centralized project-scope checks for common route/query/body/id shapes, project-member CRUD routes, and frontend protected workspace routes. Auth operations now support explicit Secure cookies, exact credentialed CORS, per-app throttling, and public `/readyz` readiness reporting. The frontend API sends credentials and the AppShell navigation is grouped into Planning, Design, and Outputs.

Delivery work added CI quality gates, backend/frontend Dockerfiles, Nginx SPA/proxy configuration, Compose with a persistent SQLite volume, `.dockerignore`, operations documentation, and an executable SQLite backup helper. Docker execution was not possible because Docker is not installed on the attached Windows machine.

Verification passed after the implementation: typecheck; production build; backend suite (198 tests across 24 files); frontend suite (100 tests across 18 files); authorization regression tests (3 tests); targeted auth-billing tests (14 tests); and backend smoke (`SMOKE TEST OK`).

No new unapproved backlog feature was started. OPT-003 and OPT-004 were already implemented. OPT-005 Sprint Planning, OPT-006 Issue-to-Release/Changelog, and the parked analytics plan remain pending explicit feature-level approval.


## Business Model and Presentation Visual Integration — 2026-08-25

The user approved a full visual and integration pass for Business Model and Presentation. Added reusable `frontend/src/widgets/experience/ExperiencePreview.tsx` components with dark/glass previews for the nine-block Business Model Canvas and generated pitch presentation. Dashboard now includes quick-action cards for the most recently visible project, linking directly to Business Model and Presentation.

The public landing page now includes a dedicated “Build the case, then tell the story” showcase section with both previews and calls to action. The internal Business Model page now has a dark strategy hero, per-block note counts, color-coded canvas accents, and a project return action while preserving note CRUD. The internal Presentation page now has a dark narrative hero, metadata chips, project return action, improved slide cards, and preserved PPTX download, navigation, keyboard, and print behavior.

Verification: typecheck passed; production build passed; focused frontend tests passed (16 tests across four files); new preview tests passed; complete frontend suite passed with 102 tests across 19 files and 0 failures. Existing server functionality was preserved.


## Dashboard User-Flow Test — 2026-08-25

Started the development preview on the attached Windows machine at frontend port 5173 and backend port 3000. The landing page responded with HTTP 200 and contained the expected SpecForge markers. The backend `/healthz` endpoint responded successfully with database status `ok`. An anonymous dashboard summary request returned HTTP 401 as intended.

The first disposable registration attempt was made against the raw backend `/api/auth/register` path and exposed a route-prefix mismatch: the backend routes are unprefixed while the frontend Vite proxy owns the `/api` prefix. The actual user-facing frontend proxy path `http://127.0.0.1:5173/api/auth/register` succeeded with HTTP 201. The centralized authorization hook was updated to normalize an optional `/api/` prefix so public authentication and protected route checks behave consistently across proxy and direct-server contexts. Typecheck and authorization tests passed after the fix.

Full browser rendering could not be completed through the sandbox browser because it could not connect to the attached Windows localhost/LAN preview. The local Windows HTTP checks verified the served landing page, API health, anonymous dashboard protection, and user-facing registration path. A verified dashboard session still requires an accessible mailbox or user-provided credentials because registration correctly requires email verification.


## Dashboard Side Navigation Redesign — 2026-08-25

The dashboard workspace shell was redesigned for user clarity and faster navigation. The side navigation now uses clearer Plan, Design, and Outputs groups; collapsible group headers; route-aware active states with accent indicators; familiar SVG glyphs; project context with an active-project card and overview action; a no-project empty state; and improved labels/tooltips. The desktop sidebar width was increased for readability.

On smaller screens, navigation is now a slide-in drawer with backdrop dismissal, close controls, automatic closing after route changes, and a compact top bar with hamburger access, logo, and current project context. The navigation remains keyboard-accessible through real buttons and links with `aria-expanded`, `aria-label`, `title`, and active-route semantics.

Verification passed: typecheck; complete frontend suite (102 tests across 19 files, 0 failures); and production build. The build still emits the existing Vite chunk-size advisory but completes successfully.


## Guided Dashboard Redesign — 2026-08-25

The dashboard was redesigned from a dense project list into a guided command center. The new layout leads with a modern dark hero and personalized greeting, makes “New project” prominent, explains that Business Model and Presentation are created inside a project, and provides direct actions: “Create Business Model” opens the per-project nine-block canvas, while “Generate Presentation” opens the live project-generated pitch deck. It also includes a simple three-step recommended flow: define the business, model the system, and share the story.

The project list remains available below the guided area with filtering, sorting, health, and activity. A dedicated no-project state explains the required sequence and provides a direct create-project action. The existing “Welcome back, <name>” greeting contract was preserved after regression testing.

Verification passed: typecheck; dashboard regression tests (6 pass); and production build. The build still emits the existing Vite large-chunk advisory but completes successfully.


## Settings and Account Navigation Pass — 2026-08-25

The settings and account experience was redesigned in response to user feedback. `AppShell` no longer places the account/sign-out control in the scrollable sidebar footer; a persistent `AccountMenu` now appears in the desktop header and mobile top bar with avatar initials, display name, email, plan badge, Profile, Billing, Workspace settings, and confirmed Sign out actions. The old `AccountChip` remains only as a compatibility re-export.

A dedicated protected `/account` route was added through `AccountPage`. It shows editable display name, email verification state, member-since date, account ID, and current plan. The backend now exposes an authenticated name-only `PATCH /auth/me` endpoint, updates the React Query cache, and records `profile_updated` in the audit log. Password, email, and payment-secret mutation are not exposed.

`SettingsPage` was simplified to two areas: Workspace and Billing. Workspace groups advanced Project setup and Node palette configuration; Billing keeps subscription and invoice management. The low-value Environment and Reference tabs were removed from the normal user-facing settings IA. Focused account/settings frontend tests and auth-billing profile tests were added. Typecheck passed; the focused dashboard, account/settings, and auth-billing suites passed. Full frontend-suite execution remained affected by the existing runner hang and should be retried separately if needed.


## Branding and Admin Monitoring Audit — 2026-08-25

The shared SpecForge mark was replaced across the React application and browser favicon. The new mark is a blueprint-style system symbol: a central forge-colored node connected to four rails on a dark technical tile. It contains no letter-based SF monogram or generated wordmark and remains scalable at landing, dashboard, and favicon sizes.

The landing footer was rebuilt as a commercial and technical product footer. It now includes a stronger conversion band, explicit engineering positioning, DB-first and traceability proof points, product capability links, account and plan entry points, and a more credible plans-at-a-glance section. The existing no-unapproved-SaaS and simulated-checkout constraints remain unchanged.

An admin-monitoring audit was documented in `docs/reviews/admin-monitoring-audit-2026-08-25.md` as AUDIT-002. The result is that admin monitoring is not complete: current foundations include user dashboard aggregation, project health analytics, user-scoped billing, public `/healthz`, and public `/readyz`; missing are a protected global admin role, admin plan catalog, admin subscription management, admin payment inspection, safe operations dashboard, and admin access-control routes. The project’s scenario matrix requires these surfaces before admin monitoring can be considered done.

Verification passed after this pass: root typecheck, production build, focused landing/UI-polish tests (17). The Vite large-chunk message remains advisory only. Human visual review is still recommended in the running preview.


## Checkpoint 2026-08-26 — Protected admin monitoring and Windows application path

The user approved the saved preview review and the security-sensitive admin-control-plane work, then added a Windows dashboard-application requirement. The attached Windows preview was restarted and returned HTTP 200 for the landing page and backend health endpoint. A sandbox browser could not connect to the attached Windows localhost for visual inspection, so visual review remains a human-preview limitation.

The admin implementation adds `users.is_admin` via additive migration 016, legacy-database fallback migration logic, exact-email `ADMIN_EMAILS` bootstrap, a `requireAdmin` guard, and centralized protection for `/admin/*`. The protected API now includes operations overview, safe counts, SMTP/readiness and migration metadata, recent audit events, plan listing and safe metadata editing, masked subscription search with audited cancel/reactivate actions, and masked invoice inspection. The frontend adds a protected `/admin` route, conditional Admin operations navigation, operations cards, plan visibility, subscription actions, invoices, and audit events. Real payment charging remains out of scope.

The Windows application path is an Electron shell under `desktop/`. It reuses the hosted React dashboard and does not create a second backend or local database. The shell uses context isolation, sandboxing, disabled Node integration, same-origin navigation restrictions, and configurable `SPECFORGE_APP_URL` or packaged JSON configuration. Root scripts expose desktop development and distribution commands. A Windows GitHub Actions workflow builds NSIS and portable artifacts and publishes tagged releases. The landing CTA/footer activates a real installer link only when `VITE_WINDOWS_DOWNLOAD_URL` is configured; otherwise it says the release is preparing and avoids a misleading fake download.

Final verification for this checkpoint: backend admin tests passed (3 tests, 0 failures), root typecheck passed, production frontend build passed, and focused dashboard/account/UI tests passed (10 tests, 0 failures in the final run). The local Windows packaging check reached electron-builder and downloaded Electron but was stopped before an installer artifact was produced; the reproducible release path is the Windows CI workflow. Release completion still requires production `ADMIN_EMAILS`, backup telemetry, a real deployed app URL, Authenticode signing, published installer assets, and a frontend rebuild with `VITE_WINDOWS_DOWNLOAD_URL`.


## Checkpoint 2026-08-26 — Release requirements execution

The user requested that all remaining release requirements be completed. Backup telemetry is now implemented: `ops/backup.sh` writes an integrity-verified `last-backup.json` record, the backend reads it through `BACKUP_STATUS_FILE`, `/admin/overview` reports fresh/stale/not-reported status and age, Docker includes the sqlite3 CLI and backup helper, Compose persists `/app/backups`, and `ops/backup.cron.example` provides a daily host schedule.

The Windows desktop package was corrected and built successfully. Missing Electron source/config files were restored, the archive glob was fixed, the branded `desktop/assets/icon.ico` was added, and electron-builder generated `SpecForge-Studio-0.1.0-win-x64.exe` plus its blockmap. The Windows workflow now validates signing secrets for tagged releases and maps `WIN_CSC_LINK`/`WIN_CSC_KEY_PASSWORD` to electron-builder signing variables. The local artifact is a QA build; public release still requires certificate-backed signing and publication.

Verification: admin tests passed 3/3; root typecheck passed; production frontend build passed; focused UI tests passed previously 10/10; Windows `bun run desktop:dist` exited 0 and produced the installer artifact. WSL/bash syntax verification could not run because virtualization/Hyper-V is unavailable on the attached machine; the backup shell syntax was inspected and the runtime helper is intended for the Linux backend image.

Remaining external actions are production-only: set `ADMIN_EMAILS`, install the backup cron entry on the Docker host, set a real HTTPS `SPECFORGE_APP_URL`, configure Authenticode secrets in GitHub, run the signed tagged release workflow, publish the installer, set `VITE_WINDOWS_DOWNLOAD_URL`, redeploy the frontend, and perform human visual review in the attached preview. Docker execution and real deployment cannot be verified without the host environment and credentials.


## Checkpoint 2026-08-26 — Trusted signup domains and seeded administrator

The requested administrator was seeded into the local database through the explicit `bun run --cwd backend seed-admin` command as `admin@specforge.com` with the requested password `password123`; the account is verified, global-admin, idempotent, and stores only a password hash. The seed command accepts environment overrides and is not run automatically during server boot.

New registrations are now restricted by `TRUSTED_SIGNUP_DOMAINS`, defaulting to `specforge.com` and allowing exact domains plus subdomains. Registrations outside the allowlist are rejected before user/OTP creation with `SIGNUP_DOMAIN_NOT_ALLOWED`; existing accounts remain able to sign in. The auth UI explains the trusted-work-email requirement. Test configuration explicitly allows its fixture domains.

Verification: 18 auth/billing tests passed, including blocked-domain and idempotent-admin-seed coverage; root typecheck passed; production frontend build passed. Documentation added at `docs/features/auth-domain-policy.md`; backend environment example documents the allowlist and seed command.


## Checkpoint 2026-08-26 — Landing Windows download activated

The landing page no longer shows a disabled “Windows app · soon” state. The verified 84 MB `SpecForge-Studio-0.1.0-win-x64.exe` artifact is bundled at `frontend/public/downloads/SpecForge-Studio-0.1.0-win-x64.exe`, and `PublicShell` defaults to the same-site `/downloads/...` URL. `VITE_WINDOWS_DOWNLOAD_URL` remains available as an optional override for a later signed GitHub release. The built `frontend/dist` contains the installer and the running preview serves it with HTTP 200 and `application/octet-stream`.

Verification: landing tests passed, root typecheck passed, and production build passed. The test suite now asserts the download href and rejects the old “soon” placeholder.


## Checkpoint 2026-08-26 — Business Model Canvas and Presentation Studio enhancement

The Business Model Canvas was upgraded from a rigid nine-block CRUD grid into a spatial Miro-style board. Nine canonical frames remain the source structure, and notes are now color-coded sticky cards with drag placement, persisted `position_x`/`position_y`, colors, block reassignment, inspector editing, filtering, zoom/fit controls, mini-map, add-note flow, and automatic save behavior. Additive migration 017 and the BMC API support position, color, and block updates; legacy notes use deterministic fallback positions.

The Presentation page was upgraded into Presentation Studio with thumbnails, current-slide editing, talking-point add/remove, slide add/duplicate/delete/reorder, Paper/Graphite/Violet themes, zoom, grid, speaker notes, presenter mode with full-screen navigation/progress, keyboard shortcuts, reset-to-live-data, and explicit synced/local-edit state. Existing live-data generation, print rendering, and PPTX download remain intact.

Verification: focused backend BMC suite 6/6; focused frontend BMC/Presentation suites 8/8 with 60 assertions; backend Presentation suite 4/4; root typecheck passed; production build passed; preview landing/BMC/Presentation/health routes returned HTTP 200. Full frontend test invocation stalled without output and was stopped; focused suites passed.


## Workflow Rule — Per-session Markdown results (2026-08-26)

The user requires every completed session result to be saved as a dedicated English Markdown file inside `docs/session-results/`. The directory includes a README naming convention, and the latest completed BMC/Presentation session is recorded in `docs/session-results/2026-08-26-bmc-presentation-studio.md`. Future sessions must create a new dated result file in addition to updating the memory logs.


## Checkpoint 2026-08-26 — Authenticated workflow and exports

Signed in successfully as `mouazalkhatib2022@gmail.com`. The Free plan correctly blocked creation of a second project with `PLAN_LIMIT_REACHED`; after user approval, the existing project `PRJ-0002` (`mouaz res`) was used. The project now has nine BMC notes across all nine blocks, and the presentation data endpoint returns nine slides. Docs generation created `DOCS-0001` with 38 Markdown files, and the complete ZIP download was verified at `ops/PRJ-0002-workspace.zip`.

The BMC now exposes direct `Export MD` and `Export JSON` actions. Markdown is the recommended human-facing format; JSON is available for structured integrations and backups; the Docs workspace ZIP is the best complete-project handoff. Focused backend/frontend tests passed with 79 assertions, root typecheck passed, and the production build passed. The detailed user-facing result is saved at `docs/session-results/2026-08-26-authenticated-export-workflow.md`.


## Checkpoint 2026-08-26 — Fixed dashboard and Presentation editor

The dashboard shell now uses `h-screen overflow-hidden`; the desktop sidebar is fixed to the viewport while the main workspace scrolls independently, and mobile drawer behavior is preserved. Presentation Studio was rebuilt with a PowerPoint-inspired local editor: add/select/edit text, images, and shapes; use common Microsoft-style font choices; upload images or set image URLs; change shape type/color; move elements with directional controls; reorder layers; remove elements; manage slides; and enter a redesigned Presenter View with clean navigation and progress.

The backend live presentation and PPTX contracts remain unchanged. Arbitrary slide elements are local working-draft state with reset-to-live-data behavior. Root typecheck and production build passed; Presentation tests passed 4/4 with 18 assertions; dashboard/account/settings tests passed 12/12 with 37 assertions; connected preview routes returned HTTP 200. The detailed result is saved at `docs/session-results/2026-08-26-dashboard-presentation-editor.md`.


## Checkpoint 2026-08-26 — Presentation canvas resizing and colors

Presentation Studio now renders four direct corner resize handles on selected text, image, and shape elements. Pointer resizing updates bounded local canvas percentages with minimum sizes and keeps elements within the slide. Text has a live Text color picker; shapes have a live Color picker for rectangle, circle, and line variants. Slide elements use accessible selectable containers rather than nested buttons. Typecheck, production build, and the Presentation regression suite passed (4 tests, 20 assertions). The detailed result is saved at `docs/session-results/2026-08-26-presentation-resize-colors.md`.


## Navigation and project-generation agent checkpoint — 2026-08-26

Added a desktop dashboard sidebar collapse/expand control with a double-chevron icon. Collapsed mode becomes a tooltip-enabled icon rail, keeps active indicators, adjusts the content margin, and persists the preference locally; mobile remains a full drawer. Focused dashboard/UI-polish tests passed and root typecheck passed.

Studied the proposed project-generation agent. The intended workflow is database-backed context snapshot from Business Model, Presentation, Markdown, requirements, model graphs, roadmap, skills, and governance; sensitive-value filtering; strict structured draft; validation; user approval; artifact materialization; and exports. A hybrid commercial model is proposed: customer-owned keys for flexibility and lower SpecForge variable cost, plus SpecForge-managed provider access on paid plans with quotas, model tiers, cost controls, and admin audit/kill-switch operations. OpenAI is the initial managed-provider candidate, with Anthropic and Gemini as later adapters, based on official pricing/privacy pages retrieved 2026-08-26. External provider credential storage and managed billing remain pending explicit provider/storage approval. Detailed design: `docs/features/project-generation-agent.md`. Session result: `docs/session-results/2026-08-26-nav-and-project-agent-design.md`.


## Leona Agent overlay and plan messaging — 2026-08-26

Added a global Leona Agent dashboard launcher and overlay. The UI explains the four-step project-aware flow: read project context, build a structured draft, review the diff, then approve and export. It presents BYOK and SpecForge-managed provider modes and links to provider settings, but does not collect raw credentials before the provider adapter and secret-storage approach are approved.

Updated built-in landing plan copy so Free and Plus describe customer-owned provider keys and Premium describes managed-provider access subject to usage policy. Existing plan rows merge the new capability text without overwriting administrator-customized feature copy. Added a Leona pricing explainer to the landing page. Focused landing/dashboard/UI tests and root typecheck passed. Session result: `docs/session-results/2026-08-26-leona-agent-overlay-and-plans.md`.

Pending: explicit approval for OpenAI as first managed provider and encrypted/reference-based production secret storage before implementing external calls, Premium entitlement enforcement, quotas, admin provider controls, context snapshot, draft validation, and materialization.


## Project gap analysis � 2026-08-26

Created docs/session-results/2026-08-26-project-gap-analysis.md and added it to docs/analysis-index.md. The core platform is implemented, while Leona backend/provider integration, secure provider persistence, AI quotas, production security hardening, green full verification, real payments, production deployment, visual QA, Docker verification, Presentation draft persistence, bundle optimization, and repository cleanup/commit remain incomplete or conditional. Recommended order: green tests, secure Leona backend, AI controls, production hardening, then distribution and QA.
