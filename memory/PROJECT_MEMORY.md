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
- deployment-and-final-audit

Current prompt:
- 13-deployment-and-final-audit

Status:
- awaiting_continue (Prompts 00–12 complete; Prompt 13 — deployment and final audit — starts when the user says "continue")

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

## Pending Work

Required phases pending:
- 13-deployment-and-final-audit

## Blockers

No blockers currently recorded.

## User Requests

No user requests recorded yet in this memory file.

All future user requests must be recorded in:
- memory/USER_REQUESTS.md

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

Execute Prompt 13 (deployment-and-final-audit) when the user says "continue". Prepares deployment (docker-compose, backend/frontend Dockerfiles, SQLite volume, env config, local + internal production modes), documents hybrid workspace behavior (central DB as source of truth, local Markdown workspace export, local agent workspace usage), writes the final audit against all 10 constraints, and reports completion with optional backlog.

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
- Preview is RUNNING and verified (2026-08-16, user deferred Prompt 13): https://5173-7cda6598-6ac8-43d9-b39b-563aae04b353.daytonaproxy01.net — root 200, /api/healthz 200, /api/projects 200. Two fixes were required to make it work: (1) backend dev script pins `PORT=3000` because Freebuff injects PORT=5173 which collided with Vite (EADDRINUSE); (2) the Vite /api proxy now rewrites/strips the /api prefix because backend routes are unprefixed (was 404 on every API call). server.hmr: false preserved.
- Frontend is a full FSD app; visual modeler (Prompt 07) at /projects/:id/modeler, diagrams (Prompt 08) at /projects/:id/diagrams, docs export (Prompt 09) at /projects/:id/docs, roadmap (Prompt 10) at /projects/:id/roadmap with generate + task-pack packaging, and governance (Prompt 11) at /projects/:id/governance with status/approvals/validation/traceability tabs. Testing and validation (Prompt 12) are next.