# Prompt 13 — Dynamic Platform Configuration

Read all memory files before doing anything.

This is Prompt 13: Dynamic Platform Configuration.

## Objective

Make project platform types, stacks, and libraries fully dynamic and configurable from a global Settings page, stored in the database instead of hardcoded code. A project can have MULTIPLE types at once (e.g. Web + API, API-only, Web + Mobile + API). Project creation asks for one or more types and, per selected type, a chosen stack (e.g. .NET, Laravel) and selectable libraries for that stack (e.g. MailKit for SMTP, Scalar for API docs).

## Confirmed Design (user answers, 2026-08-16)

- Project types: MULTIPLE types per project.
- Settings scope: global Settings page (workspace-wide; every project sees the same list).
- Stacks and libraries: editable in Settings AND pre-seeded with common defaults.
- Execution: this prompt pack only creates plans; implementation starts when the user approves/continues.

## Deliverables

Create or update:

- backend/db/schema.sql
- backend/db/migrations/006_platform_configuration.sql
- backend/src/modules/platform-config/ (routes.ts + seed.ts + types)
- backend/src/modules/projects.ts (multi-type creation + per-type stack/library config)
- frontend/src/entities/platform-config/ (types + TanStack hooks)
- frontend/src/features/platform-settings/ (type/stack/library management UI)
- frontend/src/features/create-project/CreateProjectForm.tsx (multi-type + stack + library picker)
- frontend/src/pages/SettingsPage.tsx (rebuilt: Platform Configuration tab)
- frontend/src/pages/DashboardPage.tsx and frontend/src/pages/ProjectDetailsPage.tsx (type/stack badges)
- docs/features/platform-configuration.md (FEAT-008)
- docs/ontology/id-convention.md (add PTYPE, STK, LIB prefixes)
- backend/tests/platform-config.test.ts
- frontend/tests/platform-config.test.tsx
- memory files (DECISIONS, PROJECT_MEMORY, STATE.json, NEXT_ACTION, SESSION_LOG)

## Requirements

1. **project_types table** (id PTYPE-0001, key UNIQUE, label, description, color, icon, sort_order, enabled, built_in, created_at, updated_at). Seed the four current types (web, mobile, api, ai) as built_in enabled rows so behavior is unchanged until edited. Settings CRUD: add/edit/disable/reorder/delete; built_in rows may be edited or disabled but not hard-deleted (or delete only when unused).
2. **Multi-type projects**: new join table project_type_assignments (project_id REFERENCES projects ON DELETE CASCADE, type_id REFERENCES project_types, PRIMARY KEY (project_id, type_id)). The existing projects.type column stays (stores the first/primary type for backward compatibility) — mark it deprecated in schema comments; the assignment table is the source of truth for the full type set.
3. **stacks table** (id STK-0001, type_id REFERENCES project_types, name, language, description, sort_order, enabled, built_in). A stack belongs to one project type. Seed per type, e.g. api → .NET, Laravel, Node/Express; web → React, Next.js, Vue; mobile → Flutter, React Native, Swift, Kotlin; ai → Python/FastAPI, Node/TypeScript.
4. **libraries table** (id LIB-0001, stack_id REFERENCES stacks, name, purpose, category, url, sort_order, enabled, built_in). A library belongs to one stack. Seed per stack with real, useful defaults, e.g. .NET → MailKit (SMTP), Scalar (automatic API docs), EF Core (ORM), Serilog (logging); Laravel → Laravel Sanctum (auth), Swagger/OpenAPI (API docs), Mailgun (SMTP). Category values are free text (smtp, api-docs, auth, orm, logging, ...).
5. **Per-project selection tables**: project_type_config (project_id, type_id, stack_id, PRIMARY KEY (project_id, type_id)) and project_libraries (project_id, type_id, library_id) so each project records which stack it chose per type and which libraries it uses.
6. **Project creation API**: POST /projects accepts the existing fields plus `types: [{ type_id, stack_id?, library_ids?: string[] }]` (at least one type required). The legacy `type` field stays accepted and maps to the primary type for back-compat. Validation: type_id must exist and be enabled; stack_id must belong to that type; library_ids must belong to the chosen stack. Store assignments + config in the same transaction; log one event.
7. **Read APIs**: GET /platform-config returns enabled types with nested enabled stacks and libraries (drives the creation form and Settings). GET /projects/:id returns the project with its types + per-type stack/libraries. PATCH /projects/:id accepts an optional types array to update the selection.
8. **Settings UI** (global, on the Settings page): manage project types (add/edit/disable/reorder, color/icon), stacks per type, libraries per stack. Deleting a type/stack/library that is referenced by any project is blocked with a clear error; disabled rows disappear from the creation form but remain readable on existing projects.
9. **Frontend creation flow**: CreateProjectForm lets the user select one or more types (checkbox cards). For each selected type: choose a stack from that type's enabled stacks, then check libraries from the chosen stack. Show a summary before submit.
10. **Display**: Dashboard and ProjectDetailsPage show a badge per project type (and the chosen stack, e.g. "API · .NET").
11. **Docs integration**: the docs generator (Prompt 09 workspace) must include project types + stack/library configuration in the project metadata (00-meta/project.md) — extend generators.ts.
12. **Governance/IDs**: PTYPE/STK/LIB prefixes added to docs/ontology/id-convention.md; event_log entries for settings changes (entity_type project_type/stack/library).
13. **Seeds**: backend seed script (scripts/seed-data.ts / generate-example.ts) updated so the demo projects carry types + stacks + libraries.
14. **Verification**: root `bun tsc -b --noEmit` clean; backend smoke test extended (platform-config CRUD, multi-type create with stack/libs, validation failures, back-compat single-type create, delete-in-use blocked); new backend + frontend tests pass; seed-example regenerates; preview verified.

## Definition of Done

Prompt 13 is complete only when:

- project types, stacks, and libraries are stored in DB tables and editable from a global Settings page (no hardcoded enum in the creation flow)
- a project can have multiple types, each with an optional chosen stack and libraries
- project creation records the type selection + stack + libraries
- migration 006 is additive; seeds are present; existing single-type projects and callers still work
- FEAT-008 doc written; id-convention updated; tests and smoke checks pass

## Mandatory Completion Rule

After finishing, update all memory files and report completion per AGENTS.md. The next required prompt is 14-multi-project-workspace.
