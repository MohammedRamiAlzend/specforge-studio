# Prompt 16 — Skills Section, Per-Project Docs Integration, and Final Audit

Read all memory files before doing anything.

This is Prompt 16: Skills Section, Per-Project Docs Integration, and Final Audit.

## Objective

Add the per-project **Skills** section (the new section alongside Workflows, Data Model, Architecture, Docs Export, Tasks), integrate the Prompt 13/14/15 additions into each project's own exported docs, and run the final audit of the new multi-project scope. This is the last prompt of the new required sequence (13–16).

## Confirmed Design (user answers, 2026-08-16)

- Skills section: BOTH capability skills (with level) AND tech skills.
- Each project keeps its own exported docs (existing docs_exports behavior, now including skills + platform config + dependencies/cross-project calls).

## Deliverables

Create or update:

- backend/db/schema.sql
- backend/db/migrations/009_skills.sql
- backend/src/modules/skills.ts (CRUD + routes, registered in app.ts)
- backend/src/modules/docs-generator/ (skills.md generator; project metadata includes platform config; dependencies file from Prompt 14; workspace index updated)
- frontend/src/entities/skill/ (types + hooks)
- frontend/src/pages/SkillsPage.tsx
- frontend/src/pages/ProjectDetailsPage.tsx (SECTIONS + Skills card)
- frontend/src/widgets/layout/AppShell.tsx (Skills nav link)
- frontend/src/app/App.tsx (route /projects/:projectId/skills)
- docs/features/skills.md (FEAT-011)
- docs/ontology/id-convention.md (add SKL prefix)
- docs/final-audit.md (audit of the 13–16 scope)
- docs/guide.md and docs/tutorial-ecommerce.md (fix references to the removed Prompt 13 / stale "14-prompt" text)
- backend/tests/skills.test.ts + frontend/tests/skills.test.tsx
- memory files (final memory update for the 13–16 scope)

## Requirements

1. **skills table** (id SKL-0001, project_id REFERENCES projects ON DELETE CASCADE, kind CHECK ('capability','tech'), name, description, level CHECK ('beginner','intermediate','advanced','expert') nullable — used for capability skills, tag (free text, e.g. 'frontend', 'payments', 'smtp') nullable — used for tech skills, sort_order, created_at, updated_at). Both skill kinds live in one table.
2. **Skills API**: GET /skills?project=, POST /skills, PATCH /skills/:id, DELETE /skills/:id. Validation: name required, kind required, level required for capability, tag optional for tech; project must exist.
3. **SkillsPage** (route /projects/:projectId/skills): two sections — Capability skills (name, description, level select) and Tech skills (name, description, tag) — with add/edit/delete, empty states, and loading/error states following existing page conventions.
4. **Project page + nav**: ProjectDetailsPage SECTIONS gains { to: "skills", title: "Skills", blurb: ... }; AppShell nav gains the Skills link for a project workspace. The Skills section exists per project (each project has its own skills).
5. **Docs integration**: a skills.md generator renders both skill kinds (07-guides/skills.md or an appropriate workspace location) with frontmatter per WS-003; the workspace index/README is updated; 00-meta/project.md includes the project's types + chosen stacks + libraries (from Prompt 13); dependencies + cross-project calls (from Prompt 14) appear in the workspace. Docs exports remain per project (docs_exports.project_id) — verify each project exports only its own artifacts.
6. **Task-pack tie-in (light)**: task packs may reference required skills (skill names) in verification hints or metadata where relevant — keep it additive and optional; do not change the task pack format destructively.
7. **Final audit of the 13–16 scope**: write docs/final-audit.md verifying, against the memory constraints and definition-of-done of Prompts 13–16:
   - project types/stacks/libraries are DB-driven and editable from a global Settings page
   - projects support multiple types with per-type stack + library selection
   - linked projects exist; cross-project workflow calls work via dropdown and manual ID and render in diagrams/docs
   - node palette + categories are customizable with custom fields
   - each project has its own workflow/data/architecture/docs/tasks/skills and its own exported docs
   - generated docs are English only; Mermaid stays auto-generated; database is the source of truth; no external SaaS
8. **Doc consistency**: update docs/guide.md and docs/tutorial-ecommerce.md to reflect the new prompt sequence (00–16, Prompt 13 replaced) and remove "deployment (pending)"/Prompt-13 references that are now stale.
9. **IDs/governance**: SKL prefix added to docs/ontology/id-convention.md; skills logged to event_log (entity_type skill).
10. **Verification**: root `bun tsc -b --noEmit` clean; backend smoke extended (skills CRUD + validation + docs include skills/config/dependencies); backend + frontend tests pass; seed-example regenerates; preview verified.

## Definition of Done

Prompt 16 is complete only when:

- Skills section exists per project (capability + tech skills) with full CRUD UI
- per-project docs exports include skills, platform configuration, and dependencies/cross-project calls; exports stay isolated per project
- docs/final-audit.md written for the 13–16 scope; stale Prompt-13 references in docs corrected
- all memory files updated and consistent (final memory update for the new required scope)
- all required work under Prompts 13–16 is complete and reported per AGENTS.md completion protocol

## Mandatory Completion Rule

This is the final prompt of the required scope. If all required tasks are complete, the agent must explicitly report completion to the user using the AGENTS.md completion report structure:

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

Then present optional additional tasks (e.g. deployment packaging from the removed Prompt 13, per-type diagram templates, multi-project roadmap aggregation) and wait for explicit user approval.
