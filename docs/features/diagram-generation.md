---
id: FEAT-002
title: Diagram Generation
type: guide
phase: 08-diagram-generation
status: implemented
owner: engineering
related:
  - FEAT-001
  - ONT-002
  - DB-DES-001
  - REQ-0001
updated: 2026-08-16
---

# Diagram Generation — SpecForge Studio

## 1. Goal

Generate Mermaid diagrams **automatically from structured model data**.
Users never write Mermaid: the diagram generator derives deterministic,
stable diagrams from the modeler graphs (Prompt 07), the entities tables,
and the components table, and stores every generated diagram with its
provenance.

## 2. Supported Diagram Types

| Type | Mermaid flavor | Structured input |
|------|----------------|------------------|
| Workflow | `flowchart TD` | workflow model graph (nodes + edges) |
| Sequence | `sequenceDiagram` | sequence graph (nodes = participants, edges = messages) or workflow graph (roles derived) |
| ERD | `erDiagram` | data model graph (`database` nodes + `metadata.fields` + edges as relations) or `entities`/`entity_fields`/`entity_relations` tables |
| Architecture | `flowchart LR` | architecture graph grouped into layer subgraphs (boundaries), edge labels as protocols; or `components` table grouped by layer |

## 3. Determinism Rules

- Nodes are ordered by canvas position (y, then x, then id).
- Edges are ordered by source node order, then target node order, then id.
- Mermaid node ids are sanitized canonical IDs (e.g. `GRPH-0001-N01` →
  `GRPH_0001_N01`), so diagrams are stable across regeneration.
- Node shapes map to types: `start`/`end` → stadium, `decision` → diamond,
  others → rounded rectangle.
- Edge arrows: `-->` for success/next/related, `--x` for failure.
- Edge text renders `label (condition) type`, omitting empty parts.
- Sequence message arrows: `->>` success/next, `--x` failure, `-->>` retry,
  `-x` escalation.

## 4. Sequence Derivation (workflow → sequence)

When a workflow graph is the source, participants are derived from node
roles: Actor (start/end), UI (screen), API (api_call), DB (database),
External (external_system), AI Agent (ai_agent), Event (event),
Approver (approval), System (step/decision/wait). Every edge becomes a
message between the roles of its endpoints.

## 5. Storage & Provenance

Every generated diagram is stored in `generated_diagrams`
(migration `backend/db/migrations/002_generated_diagrams.sql`) with:

- mermaid code (`mermaid`)
- diagram type (`diagram_type`)
- source artifact IDs (`source_artifacts` — graph id, node ids, or entity ids)
- validation warnings at generation time (`warnings`)
- generated timestamp (`created_at`)

IDs use the `DIAG` prefix (`DIAG-0001`), added to `docs/ontology/id-convention.md`.

## 6. Backend APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/diagrams?project=PRJ-xxxx` | List generated diagrams |
| GET | `/api/diagrams/:id` | Fetch one diagram |
| POST | `/api/diagrams/generate` | Generate from a model graph (or DB tables) and store |
| DELETE | `/api/diagrams/:id` | Delete a generated diagram |
| POST | `/api/diagrams/preview` | Live preview from a draft graph payload (no storage; used by the canvas) |

Generation warnings are kind-aware: `NO_START`, `NO_END`,
`EDGE_MISSING_SOURCE/TARGET`, `EMPTY_GRAPH`, `NO_PARTICIPANTS`,
`NO_MESSAGES`, `NO_ENTITIES`, `ENTITY_NO_FIELDS`, `NO_COMPONENTS`.

Note: ERD entities without fields cannot be represented as Mermaid
attribute blocks; they are skipped with an `ENTITY_NO_FIELDS` info
warning (add fields via `metadata.fields` on `database` nodes to include them).

## 7. Frontend (FSD)

- `entities/diagram/` — types + TanStack Query hooks (list, generate, preview, delete).
- `features/diagram-preview/` — `MermaidBlock` (warnings + copyable Mermaid source)
  and `DiagramPreviewDialog` (modal used from the modeler canvas).
- `pages/diagrams/` — `DiagramsPage` (generate form + list with expandable
  Mermaid, provenance, and delete). Route `/projects/:projectId/diagrams`.
- The modeler canvas toolbar has **Preview diagram**, generating Mermaid
  from the current (possibly unsaved) graph via `/api/diagrams/preview`.

## 8. Definition of Done

- All four diagram types can be generated. ✔
- Mermaid output is valid, deterministic, and stable. ✔
- Output is based on structured data only — no manual Mermaid. ✔
- Every generated diagram stores mermaid, source IDs, timestamp, type, warnings. ✔
- Memory updated; next action points to Prompt 09. ✔
