---
id: FEAT-003
title: Document Generation
type: guide
phase: 09-document-generation
status: implemented
owner: engineering
related:
  - FEAT-002
  - WS-001
  - WS-002
  - WS-003
  - DB-DES-001
updated: 2026-08-16
---

# Document Generation — SpecForge Studio

## 1. Goal

Generate the **Markdown project workspace** directly from the database —
the database is the source of truth, Markdown is generated output.
Every document carries stable IDs and YAML frontmatter (WS-003), embeds
generated diagrams (Prompt 08), and supports protected sections so manual
edits survive regeneration.

## 2. Generated Workspace

The export is a folder following `docs/workspace/folder-structure.md`
(WS-001). An example is committed and regenerable at
`docs/workspace/generated-example/` via `bun run --cwd backend seed-example`.

```
README.md
AGENTS.md
00-meta/        project.md · id-registry.md · glossary.md
01-planning/    project-charter.md · vision.md · scope.md · milestones.md · risk-register.md
02-requirements/ srs.md · use-cases.md · traceability.md
03-design/      hld.md · lld.md · workflows.md · erd.md · api.md · sequences.md
04-ui/          screens.md
05-testing/     test-plan.md · test-cases.md · templates/bug-report.md
06-ops/         deployment-guide.md
07-guides/      developer-guide.md · user-guide.md
08-governance/  adrs.md · approvals.md
09-agent-plans/ master-plan.md · tasks.md · checklists.md · agent-guide.md
```

19+ generators (`backend/src/modules/docs-generator/generators.ts`), each
rendering one English Markdown document from database rows:
readme, agent-guide, project, id-registry, glossary, charter, vision,
scope, milestones, risk-register, srs, use-cases, traceability, hld,
lld, workflows, erd, api, screens, sequences, test-plan, test-cases,
bug-report template, developer guide, user guide, deployment guide,
adrs, approvals, master plan, tasks, checklists, agent guide.

## 3. Diagram Embedding

Design documents embed the Prompt 08 generators from structured data —
never hand-written Mermaid:

- `03-design/workflows.md` → `generateWorkflow` per workflow-kind graph (GRPH).
- `03-design/erd.md` → `erdFromTables` (entities/entity_fields/entity_relations) + `generateErd`.
- `03-design/sequences.md` → `generateSequence` per sequence-kind graph.
- `03-design/hld.md` → `generateArchitectureFromComponents` (components table, grouped by layer).

## 4. Protected Sections

Manual edits survive regeneration when a file contains the marker
`<!-- protected -->` (or frontmatter `protected: true`). On regeneration,
the previous export is preserved, protected content is carried over, and
the new export supersedes the old one (`docs_exports.supersedes`).

## 5. Storage & APIs

- `docs_exports` table (migration `003_docs_exports.sql`, `DOCS` prefix):
  id, project_id, folder, file_count, supersedes, created_at, created_by.
- `EXPORT_DIR` config (default `data/exports`) holds folder output.
- `backend/src/modules/docs-generator/routes.ts`:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/docs/exports?project=` | List exports (newest first) |
| POST | `/api/docs/exports/generate` | Generate + store a workspace export |
| GET | `/api/docs/exports/:id` | Fetch export metadata + file tree |
| GET | `/api/docs/exports/:id/files/:path` | Fetch one generated file |
| DELETE | `/api/docs/exports/:id` | Delete an export (latest export may not be deleted) |

## 6. Frontend (FSD)

- `entities/docs/` — types + TanStack Query hooks (exports list, generate, detail, file content, delete).
- `pages/DocsExportPage.tsx` — rebuild of the export page: generate form
  (name, folder), export list with status, expandable file tree, and
  file viewer with copy + download.

## 7. Definition of Done

- Full workspace generated from the database in one call. ✔
- Every file has YAML frontmatter with stable IDs (WS-003). ✔
- Diagrams embedded from generated Mermaid (never hand-written). ✔
- Protected sections survive regeneration; superseding recorded. ✔
- Committed regenerable example at `docs/workspace/generated-example/`. ✔
- Smoke tests cover generate / list / get / regenerate / protected / delete. ✔
- Memory updated; next action points to Prompt 10. ✔
