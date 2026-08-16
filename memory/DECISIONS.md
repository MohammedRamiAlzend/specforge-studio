# DECISIONS

This file records all approved and rejected decisions.

The agent must update this file whenever a decision is made.

Each decision must include:
- decision ID
- date
- decision
- reason
- status
- impact

## Approved Decisions

### APR-001 — Approve product definition (final requirements)
- decision ID: APR-001
- date: 2026-08-16
- decision: Approve the SpecForge Studio product definition (docs/product/: PRD-001, VSN-001 vision, SCP-001 scope, NGL-001 non-goals, ROL-001 user roles, MET-001 success metrics, OQ-001 open questions).
- reason: User issued the approve command while APR-001 was pending (master prompt sections 10 and 17 — final requirements approval gate).
- status: approved
- impact: Product requirements are final. Prompt 02 (domain ontology and IDs) may proceed. Open questions (OQ-01…OQ-08) remain open with suggested defaults until individually decided.

### DEC-002 — Adopt the ontology ID convention
- decision ID: DEC-002
- date: 2026-08-16
- decision: IDs are `<PREFIX>-<SEQUENCE>` (zero-padded, ≥ 4 digits) for top-level entities and `<PARENT-ID>-<CHILD><2-digit-seq>` for children (WF-…-N/E, DB-…-F, TASK-…-C). Extended the base prefix set with ART, CMP, REL, AGT, OQ. IDs are immutable, never reused, registry-backed in SQLite.
- reason: Prompt 02 required a clear, stable ID convention; child IDs keep traceability local to parents.
- status: approved
- impact: All schema, Markdown frontmatter, diagrams, and task packs must use this convention (docs/ontology/id-convention.md).

### DEC-003 — Ontology status model with approval gates
- decision ID: DEC-003
- date: 2026-08-16
- decision: Adopt the status lifecycles in docs/ontology/status-lifecycle.md. Approval-dependent artifacts (final REQ, ARCH, DB schema, API contracts, security workflows) cannot reach `approved` without a recorded Approval (APR). Child entities (workflow nodes/edges, entity fields, checklist items) inherit the parent lifecycle.
- reason: Prompt 02 required status values and the master prompt requires approval gates; tying approval to state transitions enforces governance structurally.
- status: approved
- impact: Backend validation and the governance module enforce these transitions.

### DEC-004 — Adopt the Markdown workspace specification
- decision ID: DEC-004
- date: 2026-08-16
- decision: Adopt docs/workspace/ (folder structure WS-001, file naming WS-002, frontmatter spec WS-003, and the template set under docs/workspace/templates/) as the canonical generated workspace export format.
- reason: Prompt 03 required an exact, regenerable workspace definition; templates ensure consistent, agent-readable output.
- status: approved
- impact: The document generator (Prompt 09) must render these templates; every generated file must satisfy the frontmatter spec and traceability rules.

### DEC-005 — SQLite schema design decisions
- decision ID: DEC-005
- date: 2026-08-16
- decision: Adopt the canonical schema backend/db/schema.sql with: TEXT public-ID primary keys (per DEC-002), id_sequences for prefix counters, artifact_links as the relational traceability backbone, component_links for component associations, event_log for audit, JSON columns only for flow/schema/flexible metadata, and application-layer validation for circular (workflow start/end) and polymorphic (approval targets) references.
- reason: Prompt 04 required a simple, portable SQLite schema; these choices keep the schema relational where queried and validated (traceability) and pragmatic elsewhere.
- status: approved
- impact: Backend (Prompt 05) implements repositories against this schema; traceability reports (Prompt 08/10) query artifact_links; migrations are additive per backend/db/migrations/README.md.

### DEC-006 — Use bun:sqlite as the SQLite driver
- decision ID: DEC-006
- date: 2026-08-16
- decision: Use bun:sqlite (Bun's built-in synchronous SQLite driver) instead of better-sqlite3 for the backend. The repository layer isolates the driver so it can be swapped later.
- reason: better-sqlite3's native binary fails to load under the Bun runtime used by this environment (ERR_DLOPEN_FAILED, Bun issue #4290). bun:sqlite is an equivalent synchronous SQLite driver per the master prompt, with zero native-build risk in the Freebuff sandbox/preview/deploy.
- status: approved
- impact: backend/src/db and all repositories use bun:sqlite; schema.sql is unchanged (pure SQL).

### DEC-007 — Monorepo workspace layout
- decision ID: DEC-007
- date: 2026-08-16
- decision: Root package.json is a Bun workspace with "backend" (and later "frontend") workspaces. Root scripts dev/build/typecheck drive the Freebuff preview; typescript and @types/bun are root devDependencies so the platform's root-level `tsc -b --noEmit` resolves.
- reason: The prompts mandate a backend/ + frontend/ split; the Freebuff preview runs one install/dev/build command at the repo root, so workspace scripts are required for it to work.
- status: approved
- impact: All phases add code under their workspace; preview commands stay `bun install` / `bun run dev --host 0.0.0.0` / `bun run build`.

### DEC-008 — Tailwind CSS for the frontend (OQ-02 resolved)
- decision ID: DEC-008
- date: 2026-08-16
- decision: Use Tailwind CSS (v3, config + PostCSS) as the styling system for the frontend, with a custom "forge" accent palette. This resolves open question OQ-02 (Tailwind vs CSS Modules).
- reason: Prompt 06 requires one recorded choice; Tailwind gives fast, consistent theming for the engineering-platform UI.
- status: approved
- impact: All frontend styling uses Tailwind utilities + forge palette; global styles live in frontend/src/app/index.css.

### DEC-001 — Adopt MASTER_PROMPT.md as governing execution protocol
- decision ID: DEC-001
- date: 2026-08-16
- decision: Adopt the user-provided "Project Execution Operating System" master prompt as the governing execution protocol, persisted at MASTER_PROMPT.md.
- reason: The user supplied it as the operating instruction for executing the project end-to-end.
- status: approved
- impact: Governs continuity, memory updates, approval gates, traceability, task pack rules, and completion reporting for all phases.

### DEC-009 — React Flow canvas + modeler graph tables (OQ-01 resolved)
- decision ID: DEC-009
- date: 2026-08-16
- decision: Use React Flow (@xyflow/react v12) as the visual modeling canvas library, resolving open question OQ-01 (default was React Flow). Persist canvases in three new SQLite tables (model_graphs, model_nodes, model_edges) with GRPH-0001 IDs and child IDs GRPH-0001-N01/E01; node/edge types are validated in the application-layer catalog (backend/src/modules/modeler.ts), not by CHECK constraints, so the type set can grow without destructive migrations. Added GRPH and FEAT to the extended ID prefix table (docs/ontology/id-convention.md).
- reason: Prompt 07 requires a canvas that generates structured model data; React Flow is the master-prompt-recommended library; separate tables avoid the restrictive CHECK on workflow_nodes and keep one graph per modeled artifact.
- status: approved
- impact: Diagram generation (Prompt 08) consumes model_graphs/model_nodes/model_edges as structured input; new node/edge types are added to the catalog, not the schema.

### DEC-011 — Document generation approach (Markdown workspace rendered from the database)
- decision ID: DEC-011
- date: 2026-08-16
- decision: Render the portable Markdown workspace directly from database rows (database = source of truth) in backend/src/modules/docs-generator/ (markdown.ts helpers, generators.ts with 19+ per-document generators, workspace.ts assembly, routes.ts). Every file carries YAML frontmatter with stable IDs per WS-003; design docs embed Prompt 08 Mermaid generators from structured data (workflows.md → generateWorkflow, erd.md → erdFromTables + generateErd, sequences.md → generateSequence, hld.md → generateArchitectureFromComponents). Files containing the `<!-- protected -->` marker (or `protected: true`) are preserved across regenerations; exports are stored in a new docs_exports table (DOCS prefix, migration 003) with supersedes chains; folder output goes under EXPORT_DIR (default data/exports). A committed regenerable example lives at docs/workspace/generated-example/ (generated by backend/scripts/generate-example.ts, `bun run --cwd backend seed-example`).
- reason: Prompt 09 requires the full Markdown workspace generated from the database with stable IDs, embedded generated diagrams, and regeneration safety; protected sections let humans keep manual notes without losing them.
- status: approved
- impact: Roadmaps and task packs (Prompt 10) and the final audit (Prompt 13) read this generated workspace; regeneration is additive (new export supersedes old).

### DEC-012 — Roadmap engine + agent task packager (derive plan, then materialize packs)
- decision ID: DEC-012
- date: 2026-08-16
- decision: Two-layer planning in backend/src/modules/roadmap/ (engine.ts deterministic derivation + routes.ts) and backend/src/modules/agent-tasks/ (packager.ts + routes.ts). The roadmap engine derives a stored snapshot (RMP-0001 with child IDs RMP-0001-P01/EP01/M01/T01; tables roadmaps, roadmap_phases, roadmap_epics, roadmap_milestones, roadmap_tasks, roadmap_task_dependencies — migration 004, additive) from project artifacts (requirements, workflows, entities, API endpoints, screens, components, risks, non-functional requirements): 5 phases with approval gates, 5 milestones, per-module + cross-cutting epics, task drafts (concrete sequential verifiable checklists with verification hints, priorities from requirement priority/criticality and risk likelihood/impact, approval_required for constraint/critical-risk tasks), and dependencies (traceability links + module ordering entity→api→screen + requirement→referenced artifacts). The agent task packager materializes drafts into canonical tasks/task_checklists + a new canonical task_dependencies table (idempotent via roadmap_tasks.materialized_task_id; packs survive roadmap deletion). RMP prefix added to docs/ontology/id-convention.md.
- reason: Prompt 10 requires automatic roadmap generation (phases/milestones/epics/tasks/dependencies/priorities/approval gates) and agent-neutral task packs with executable checklists, without inventing requirements (TR-15) — a derived plan snapshot + a materialization step keeps planning separate from execution records and reuses the canonical task tables the docs generator already renders.
- status: approved
- impact: Governance (Prompt 11) can reference generated tasks; testing/validation (Prompt 12) validates task packs; the final audit (Prompt 13) reads roadmap + task traceability.

### DEC-010 — Diagram generation approach (deterministic graph-based Mermaid)
- decision ID: DEC-010
- date: 2026-08-16
- decision: Generate Mermaid deterministically from structured data in backend/src/modules/diagrams/generator.ts: workflow (flowchart TD from workflow graphs), sequence (sequenceDiagram from sequence graphs or workflow graphs with role-derived participants), ERD (erDiagram from data-kind graphs — database nodes with metadata.fields and edges as relations — or from entities/entity_fields/entity_relations tables), architecture (flowchart LR from architecture graphs grouped into layer subgraphs, or from the components table by layer). Ordering is deterministic (position y, x, then id); mermaid ids are sanitized canonical IDs. Generated diagrams are stored in a new generated_diagrams table (DIAG prefix, migration 002) with mermaid, source artifact IDs, warnings, and generated timestamp. A stateless /diagrams/preview endpoint powers the canvas live preview.
- reason: Prompt 08 requires automatic, deterministic, stable Mermaid generation from model data with full provenance storage; reusing the Prompt 07 graphs keeps the canvas and generated output consistent.
- status: approved
- impact: Document generation (Prompt 09) can embed stored diagrams (DIAG ids) into the Markdown workspace; new diagram rules are added to the generator, not the schema.

### DEC-013 — Governance lifecycle + approvals (artifact_governance overlay, APR records, audit trail)
- decision ID: DEC-013
- date: 2026-08-16
- decision: Implement Prompt 11 governance in backend/src/modules/governance/ (lifecycle.ts + routes.ts, registered in app.ts). Nine canonical governance statuses (draft/auto_generated/needs_review/approved/ready_for_agent/in_progress/needs_verification/done/rejected) with an enforced transition map; a 17-type artifact registry with per-type governance→domain status translation (best-effort sync of each artifact's own status column); approval gates (DEC-003) enforced structurally — requirement, workflow, entity, component, api_endpoint, decision, and roadmap cannot become `approved` without an approved APR (GOV_APPROVAL_REQUIRED otherwise). Approvals (APR-xxxx) are first-class records (request → decide; rejection requires a reason; approval_id recorded on tasks + governance overlay). Every transition/request/decision is appended to event_log and exposed via /audit. Validation warnings (TR-01/02/05/06/07/08/09/15/19/20) and a traceability coverage report (per-requirement coverage + orphan artifact_links) are exposed via /governance/validation and /governance/traceability. New additive table artifact_governance (migration 005).
- reason: Prompt 11 requires approval gates, decision records (ADR/APR), and an audit trail for generated artifacts; tying gates to the status-transition layer enforces governance structurally instead of by convention.
- status: approved
- impact: Testing/validation (Prompt 12) validates the approval flow and validation rules; the final audit (Prompt 13) reads approvals + audit trail; seed example demonstrates a full approval flow (APR-0002 → WF-0001 approved) and mid-project lifecycle states.

### DEC-014 — artifact_links cascade + testing approach (Prompt 12)
- decision ID: DEC-014
- date: 2026-08-16
- decision: (a) Add `ON DELETE CASCADE` on artifact_links.project_id to the canonical schema so deleting a project can never orphan traceability rows (no orphan artifacts, quality rule 2). Applied to backend/db/schema.sql only — per the migrations policy, a table-rebuild migration for existing live databases is a constraint change and is deferred until an explicit approval (APR) exists. (b) Adopt the Prompt 12 test approach: backend suites in backend/tests/ using bun:test with a fresh in-memory app per file (deterministic IDs, isolated workers); frontend suites in frontend/tests/ using bun:test + react-dom/server static rendering inside MemoryRouter + QueryClientProvider (zero new dependencies); test dirs added to the root tsconfig include so tests are typechecked; root script `bun test backend/tests frontend/tests` plus `bun run --cwd backend test` / `bun run --cwd frontend test`; docs/testing/test-plan.md (TEST-001) + docs/testing/validation-rules.md (TEST-002); TEST prefix added to docs/ontology/id-convention.md (and the missing DOCS prefix from Prompt 09 added).
- reason: Prompt 12 requires backend tests (API/DB/diagrams/docs/roadmap/tasks/approvals/validation), frontend checks (rendering, modeler interactions, loading/error, export actions), enforced validation rules, and quality gates — with deterministic tests; bun:test + static rendering avoids adding a browser/DOM dependency stack.
- status: approved
- impact: The final audit (Prompt 13) can run `bun test` as the quality gate; future suites follow the same helpers pattern; any live-DB migration for the artifact_links FK needs a recorded APR.

### DEC-015 — Remove required Prompt 13; replace with new required Prompts 13–16
- decision ID: DEC-015
- date: 2026-08-16
- decision: Remove prompts/13-deployment-and-final-audit.md (Deployment and Final Audit) from the required scope and replace it with four new required prompts: 13-platform-configuration (dynamic project types, stacks, libraries, multi-type projects), 14-multi-project-workspace (explicit linked projects + cross-project workflow calls), 15-custom-node-palette (customizable node categories/types with custom fields), 16-skills-and-final-audit (per-project Skills section, per-project docs integration, final audit of the 13–16 scope). Deployment packaging (docker-compose, Dockerfiles, ops docs) is no longer required scope and becomes an optional-backlog candidate.
- reason: User request "remove plan 13 and add new plans for it" with new functionality for complex multi-project products (configurable project types, stack/library selection, connected workspaces, cross-project workflow calls, customizable node palette, Skills section).
- status: approved (user-directed scope change)
- impact: prompts/13-deployment-and-final-audit.md deleted; prompts/README.md sequence updated to 00–16 with a note; STATE.json required_scope/pending_phases updated; docs/guide.md and docs/tutorial-ecommerce.md still reference the old sequence and must be fixed during Prompt 16.

### DEC-016 — Confirmed design decisions for Prompts 13–16 (clarifying answers)
- decision ID: DEC-016
- date: 2026-08-16
- decision: Adopt the user's clarifying answers as the design for the new prompts: (1) a project can have MULTIPLE types at once (Web + API, API-only, etc.); (2) configuration (project types, stacks, libraries, node palette/categories) is managed in a GLOBAL Settings page stored in DB tables; (3) stacks and libraries are editable in Settings AND pre-seeded with common defaults (.NET → MailKit/Scalar/EF Core, Laravel → Sanctum/Swagger, etc.); (4) cross-project workflow references support BOTH a dropdown picker (project → workflow) and manual workflow-ID entry; (5) explicit linked-project dependencies exist at the project level (project_dependencies, PDEP prefix); (6) the Skills section supports BOTH capability skills (with level) and tech skills (with tag); (7) custom node types can define custom FIELDS rendered by the inspector into node metadata; (8) execution mode is "create plans only" — no implementation starts until the user approves/continues.
- reason: The user was asked clarifying questions before creating plans and selected these options.
- status: approved (user-selected)
- impact: Prompts 13–16 encode these choices; new ID prefixes PTYPE/STK/LIB (13), PDEP (14), NCAT/NTYP (15), SKL (16) must be added to docs/ontology/id-convention.md during execution.

### DEC-017 — Platform configuration implementation (Prompt 13)
- decision ID: DEC-017
- date: 2026-08-16
- decision: Implement Prompt 13 (Dynamic Platform Configuration) as DB-backed, workspace-global configuration. Five additive tables (project_types, stacks, libraries, project_type_assignments, project_type_config, project_libraries — migration 006) in backend/db/schema.sql. Four built-in types (web/mobile/api/ai, PTYPE-0001…), twelve stacks (STK-0001…), and thirty-two libraries (LIB-0001…) seeded idempotently on boot (backend/src/modules/platform-config/seed.ts, bumping id_sequences). Configuration APIs under /platform-config (GET full tree; POST/PATCH/DELETE for types/stacks/libraries); built-in rows are editable/disableable but never hard-deletable; rows referenced by any project cannot be deleted (409 CONFLICT). Projects accept a `types[]` array on create/patch (type_id + stack_id + library_ids) via project_type_assignments/project_type_config/project_libraries, and responses carry an enriched `types[]` (key, label, color, stack, libraries). The legacy `projects.type` column is DEPRECATED but preserved: single-type callers keep working (type key → seeded type) and the column is derived from the first assignment on patch. Settings → Platform configuration tab (PlatformSettingsPanel), multi-type CreateProjectForm (type toggles + per-type stack select + library checkboxes), PlatformBadges widget on dashboard/project pages. Docs generator genProjectMeta emits a Platform Configuration table from loadProjectTypes. New prefixes PTYPE/STK/LIB added to docs/ontology/id-convention.md. Demo seed (seed-data.ts) attaches web + React (+ React Router/Zustand/Tailwind CSS) to the Acme project. New backend suite backend/tests/platform-config.test.ts (20 tests) + frontend suite frontend/tests/platform-config.test.tsx (4 tests); smoke extended to 204 checks.
- reason: Prompt 13 requires project types/stacks/libraries to be configuration rather than hard-coded, multi-type project creation with per-type stack/library selection, and a global Settings UI (DEC-016 items 1–3).
- status: approved
- impact: Prompt 14 (multi-project workspace) can reuse platform-config types for cross-project workflow calls; the id-registry in generated workspaces now counts PTYPE/STK/LIB; future types/stacks/libraries are data, not code.

### DEC-018 — Multi-project workspace links implementation (Prompt 14)
- decision ID: DEC-018
- date: 2026-08-16
- decision: Implement Prompt 14 (Multi-Project Workspace) as explicit, database-backed project links plus cross-project workflow calls. New additive table project_dependencies (PDEP ids, FKs project_id + depends_on_project_id both ON DELETE CASCADE, kind CHECK in workflow_call/data/deploy/other, UNIQUE(project_id, depends_on_project_id, kind), CHECK no self-link) + 2 indexes (migration 007). New links module (backend/src/modules/links/routes.ts): dependency CRUD (GET/POST /projects/:id/dependencies, DELETE /projects/:id/dependencies/:depId, GET /projects/:id/dependents with depending_project_id alias), GET /projects/:id/reference-targets (linked projects first, then all others, each with workflow graphs — modeler picker source), GET /projects/:id/workflow-calls (resolved rows). New `workflow_call` modeler node (category system, color #7c3aed; catalog now 13 types) whose metadata.cross_project = { project_id, graph_id, node_id? } is validated at save: structurally-invalid refs → 400; well-formed but missing/non-workflow targets → allowed to save plus CROSS_PROJECT_REF_MISSING warning. Diagrams resolve calls via resolveCrossProjectCalls and render each as a nested Mermaid subgraph `subgraph xp_<node id>[<project name> (<project id>)]` at both generate and preview time (byte-identical stored/preview). Docs: 00-meta/dependencies.md appended to WORKSPACE_FILES (END so ART ids never shift; example export now 33 files) + "Cross-project Calls" section in 03-design/workflows.md. Governance TR-21 added (21 rules; validation response shape {errors, warnings, infos, all}); violation labels name caller + broken target. Toggle/tooling: InspectorPanel cross-project section (target dropdown, workflow dropdown for linked targets, manual GRPH id input), LinkedProjectsCard widget (add/remove, outgoing/incoming, empty states, hides already-linked targets), CrossProjectCalls widget on workflows page. New suites: backend/tests/links.test.ts (11 tests) + frontend/tests/links.test.tsx (8 tests); fixed pre-existing TS errors in backend/tests/platform-config.test.ts. PDEP prefix + TR-21 added to ontology docs; dashboard/docs counts updated. Deliverable docs/features/multi-project-links.md (FEAT-009).
- reason: Prompt 14 requires explicit project-level links (PDEP), cross-project workflow references via BOTH dropdown picker and manual workflow-ID entry, and diagram/docs/governance rendering derived from structured data (DEC-016 items 4–5).
- status: approved
- impact: Project-level dependency graph feeds docs (dependencies.md), governance (TR-21), and the workflows page; modeler node catalog is now 13 types; smoke expects 226 checks; Prompts 15–16 remain as the only required scope (Prompts 00–14 verified).

### DEC-019 — Custom node palette implementation (Prompt 15)
- decision ID: DEC-019
- date: 2026-08-16
- decision: Implement Prompt 15 (Customizable Node Palette) as DB-backed node categories and node types. New additive tables node_categories (NCAT ids, key/label/color/description/built_in/disabled) + node_types (NTYP ids, category_id FK, key/label/description/color/shape/kind/default_metadata/fields JSON, built_in/disabled) in backend/db/schema.sql (migration 008_node_palette.sql). Palette module (backend/src/modules/palette/seed.ts + routes.ts): seedNodePalette seeds 14 types (the 13 legacy catalog types incl. workflow_call PLUS a demo loop type NTYP-0014 in category NCAT-0001 'Flow control' with custom fields {iterations: number default 1, mode: select [for/while/until] default "for"}); first custom type after seed = NTYP-0015, first custom category = NCAT-0005. CRUD under /palette/categories and /palette/node-types with built-in guards (cannot hard-delete, can disable), delete guarded by in-use checks; all changes event-logged. Backend modeler.ts: static NODE_TYPE_CATALOG/NODE_TYPE_SET REMOVED; buildPaletteMap(db) → Map<type,{kinds,enabled}>, enabledNodeTypes(db) → NodeTypeDefinition[] (incl. fields), validateGraph takes palette (UNKNOWN_NODE_TYPE/DISABLED_NODE_TYPE/KIND_NOT_SUPPORTED), assertNodeInputsValid(db, input), GET /modeler/node-types preserved and returns 14 (later 15) enabled types with fields. Diagrams generator.ts: workflowShape(type) helper — stadium for start/end, decision diamond, generic rounded-box fallback for ALL other/custom types (no more catalog switch). Frontend: entities/palette (types + api.ts hooks + lib.ts flatten helpers), entities/model-graph types widened (category: string, NodeFieldDef, fields? on ModelNodeType), visual-modeler/NodePalette rewritten (DSB categories with label/color), CanvasPage uses useNodePalette + allNodeTypes/enabledNodeTypes, InspectorPanel CustomFieldsSection (text/textarea/number/select/boolean bound to data.metadata[field.key]) + changeType reseeds defaults, useModelerGraph addNode seeds field defaults. Features/palette-settings/NodePaletteSettingsPanel.tsx (category cards with inline edit/disable/delete + NodeTypeCard with FieldDefEditor + kind checkboxes + re-parenting, built-in/in-use guards) wired into SettingsPage "Node palette" tab. Docs: NCAT/NTYP prefix rows in docs/ontology/id-convention.md, docs/features/custom-node-palette.md (FEAT-010, notes 14 seeds incl. loop demo). Seed: seed-data.ts calls seedNodePalette(db); seed-example regenerated (33 files). Tests: backend/tests/palette.test.ts (15 tests) + node_categories/node_types added to database.test.ts required tables; frontend/tests/palette.test.tsx (7 tests; NodePalette type import aliased to NodePaletteData to fix duplicate identifier); smoke extended to 256 checks (blocks 19b/19c usage graph + category CRUD moved to END because the temp usage graph shifted the GRPH id sequence hard-coded in the links section).
- reason: Prompt 15 requires the modeler palette to be user-configurable from Settings (categories + node types with custom fields stored in the database) instead of a hard-coded catalog, with generic diagram rendering so custom nodes still produce Mermaid.
- status: approved
- impact: Modeler palette is now data-driven; the modeler node-type endpoint remains a compatibility view; custom node types with fields get inspector-editable metadata and generic diagram rendering; Prompts 00–15 verified, only 16-skills-and-final-audit remains.

### DEC-020 — Skills + final audit implementation (Prompt 16)
- decision ID: DEC-020
- date: 2026-08-16
- decision: Implement Prompt 16 (Skills + Final Audit) completing the required scope. New additive table `skills` (SKL ids project-scoped, project_id FK ON DELETE CASCADE, kind CHECK capability/tech, level CHECK beginner/intermediate/advanced/expert, tag TEXT, sort_order, indexes on project_id and (project_id, kind) — migration 009_skills.sql). Skills module (backend/src/modules/skills.ts): capability skills require `level`; tech skills reject `level` and require a non-empty `tag` (assertKindConsistency); CRUD routes GET /skills?project=, POST /skills, PATCH /skills/:id, DELETE /skills/:id; all changes event-logged (entity_type skill). Docs generator genSkillsDoc (imports listSkills) emits 07-guides/skills.md (Capability Skills table + Tech Skills table + Task tie-in) appended at END of WORKSPACE_FILES (ART ids stable; example export becomes 34 files); genReadme contents list skills. Seed-data seeds 4 demo skills (SKL-0001 Payments engineering/expert capability, SKL-0002 Full-stack TypeScript/advanced, SKL-0003 React/frontend, SKL-0004 Node.js/Fastify/backend). Frontend: entities/skill (types + api hooks useSkills/useCreateSkill/useUpdateSkill/useDeleteSkill invalidating ["skills", projectId] + lib LEVELS/LEVEL_COLORS/skillKindLabel/skillLevelLabel/splitSkills), pages/SkillsPage.tsx (capability + tech cards, inline add/edit forms, level pill vs tag pill, delete, empty/loading/error states), /projects/:projectId/skills route, AppShell Skills nav link, ProjectDetailsPage section. SKL prefix added to docs/ontology/id-convention.md; FEAT-011 docs/features/skills.md; docs/final-audit.md (AUDIT-001, Prompts 13–16 scope). New suites: backend/tests/skills.test.ts (14 tests) + frontend/tests/skills.test.tsx (5 tests); smoke extended to 275 checks; seed-example regenerates 34 files. Stale references fixed in docs/guide.md (execution model table 00–16, 17-prompt sequence, Prompt-13 deferred note) and docs/tutorial-ecommerce.md (prompts/00–16, Step 13 rewritten to Prompts 13–16, recap rows 13–16).
- reason: Prompt 16 (last required phase) requires a per-project Skills section (capability + tech skills with SKL ids), per-project docs integration (skills + platform configuration + dependencies), and a final audit of the Prompt 13–16 scope plus cleanup of stale Prompt-13/deployment references.
- status: approved
- impact: All required scope (Prompts 00–16) complete and verified: 159 backend+frontend tests (615 expects), 275-check smoke, typecheck/build clean, 34-file regenerable example. Only the optional backlog (deployment packaging, diagram templates, roadmap aggregation, skills-to-task matching) remains, pending user approval. Completion report delivered per AGENTS.md protocol.

### DEC-021 — UI polish and motion implementation (Prompt 17)
- decision ID: DEC-021
- date: 2026-08-16
- decision: Implement Prompt 17 (UI Polish & Motion) as dependency-free frontend polish, honoring prefers-reduced-motion and the zero-new-deps approach. Motion utilities in frontend/src/app/index.css: keyframes sf-page-enter (fade + 8px rise, 250ms) / sf-rise (320ms stagger entrance) / sf-scale-in (180ms), a `@media (prefers-reduced-motion: reduce)` block disabling them, and `html { scroll-behavior: smooth }`. AppShell wraps the routed Outlet in a div keyed by `location.pathname` with sf-page-enter (key stable within a page → canvas/modeler state preserved), and nav links switch to transition-all duration-200 with active `scale-[1.03]` and idle `hover:translate-x-0.5`. Button gets `transition-all duration-150 active:scale-[0.98]` (disabled stays non-scaled); Card gains base transition-all duration-200; EmptyState/ErrorState render with sf-rise. Dashboard project grid and ProjectDetails SECTIONS tiles enter with staggered sf-rise (animationDelay = index * 40ms) and lift on hover (group-hover:-translate-y-0.5, shadow-md, border-slate-300). New frontend/tests/ui-polish.test.tsx (4 tests) asserts the motion classes appear in react-dom/server static markup. docs/features/ui-polish.md (FEAT-012); prompts/17-ui-polish-and-motion.md + prompts/README.md updated. No backend/schema/docs-generator changes.
- reason: User requested an animation/navigation-polish prompt ("add animation prompt for navigation etc., anything to make the website smoother") after the Prompt 16 completion report; this is the implemented plan.
- status: approved
- impact: Navigation now cross-fades/slides, with tasteful micro-interactions and reduced-motion support. Verified: 163 tests pass / 0 fail (620 expects, 22 files), root typecheck clean, bun run build succeeds. Pending: completion report, commit, and optional-backlog approval.

### DEC-022 — Full-detail e-commerce seeder (Prompt 18)
- decision ID: DEC-022
- date: 2026-08-17
- decision: Add a second, full-detail demo seeder for the "most common e-commerce project" — an ASP.NET Core (.NET) backend API + React (TypeScript) frontend storefront — as Prompt 18. Implemented backend/scripts/seed-ecommerce.ts (seedEcommerceProject(db, {projectId?, graphId?}) defaulting to live PRJ-0003 / GRPH-0003; isEcommerceSeeded(db, projectId) idempotency guard) which seeds the StoreSphere E-Commerce Platform: multi-type project (api → .NET stack STK-0001 + MailKit/Scalar/EF Core/Serilog; web → React stack STK-0004 + React Router/Zustand/Tailwind CSS via INSERT...SELECT resolved from platform-config seeds), 8 modules MOD-0101..0108, 14 requirements REQ-0101..0114 (functional/constraint/data/nonfunctional), 5 use cases UC-0101..0105, 4 workflows WF-0101..0104 with 4 workflow model graphs (graph IDs derived from base: base +0/1/2/3 so the committed example at GRPH-0004 never collides with the hard-coded graphs), 11 entities DB-0101..0111 with 51 fields + 10 relations REL-0101..0110 (only 1:1/1:N/N:M per CHECK), 13 API endpoints API-0101..0113 with per-endpoint auth, 8 screens SCR-0101..0108, 7 components CMP-0101..0107, 8 skills SKL-0101..0108 (capability needs level, tech needs tag), 4 risks, 3 ADRs, 3 milestones, 6 test cases, approvals APR-0101 (REQ-0101 approved by Ada Lovelace) + APR-0102 (WF-0101 pending → approved by Alan Turing with artifact_governance sync), 21 artifact_links, storeRoadmap + materializeTaskPack (60 packaged tasks), governance demo (roadmap needs_review + first task in_progress). New scripts generate-ecommerce-example.ts (`seed-ecommerce-example` → committed docs/workspace/generated-example-ecommerce/, PRJ-0004) and seed-ecommerce-live.ts (`seed-ecommerce-live` → live DB PRJ-0003 + 3 diagrams via real routes). New backend/tests/seed-ecommerce.test.ts (8 tests). ID strategy: child IDs use 0100+ ranges so Acme (0001+) and user projects never collide. Child graph IDs derived from the base graphId via graphN(offset).
- reason: User requested a second "most common" e-commerce demo (Prompt 18) in a previous session; implementation continued and completed in this session after the summary review.
- status: approved
- impact: The preview and generated example now demonstrate a second full-detail project (.NET + React) alongside Acme; all verification gates green (typecheck, 171 tests / 0 fail across 23 files, frontend + backend builds, backend smoke 275/275, seed-ecommerce-example 34 files, seed-ecommerce-live idempotent + 3 diagrams). Note: root tsconfig include does NOT cover backend/scripts, so the seeder/test pair was also verified via bun test + backend build.

## Rejected Options

No rejected options recorded yet.