---
id: FEAT-001
title: Visual Modeler
type: guide
phase: 07-visual-modeler
status: implemented
owner: engineering
related:
  - OQ-001
  - ONT-002
  - DB-DES-001
  - REQ-0001
updated: 2026-08-16
---

# Visual Modeler — SpecForge Studio

## 1. Goal

The Visual Modeler is the core SpecForge UX: a canvas where engineers model
workflows, data models, architecture, and sequences **without writing Mermaid
by hand**. The canvas produces structured data, persists it to the database,
and feeds the diagram generator (Prompt 08), the document generator (Prompt
09), and task pack generation (Prompt 10).

The user never writes Mermaid. The UI generates the model as structured data;
Mermaid is derived from that data automatically.

## 2. Capabilities

| # | Capability | Where |
|---|------------|-------|
| 1 | Add nodes | Node palette (drag onto canvas or click) |
| 2 | Connect nodes | Drag from a node's source handle to a target handle |
| 3 | Edit node properties | Inspector panel for the selected node |
| 4 | Delete nodes and edges | Backspace/Delete key or inspector Delete button |
| 5 | Save graph to backend | Toolbar "Save graph" → `PUT /api/modeler/graphs/:id` |
| 6 | Load graph from backend | Canvas page loads `GET /api/modeler/graphs/:id` |
| 7 | Validation warnings | Backend rules + "Validate" button → `POST /api/modeler/validate` |

## 3. Node Types

Twelve node types are supported (catalog served from
`GET /api/modeler/node-types`, with per-kind availability):

| Type | Category | Kind availability |
|------|----------|-------------------|
| start | flow | workflow, architecture, sequence |
| end | flow | workflow, architecture, sequence |
| step | flow | workflow, architecture, sequence |
| decision | flow | workflow |
| wait | flow | workflow, sequence |
| event | system | workflow, architecture, sequence |
| screen | system | workflow, architecture, sequence |
| api_call | system | workflow, architecture, sequence |
| database | system | workflow, data, architecture, sequence |
| external_system | system | workflow, architecture, sequence |
| approval | governance | workflow, sequence |
| ai_agent | ai | workflow, architecture, sequence |

Each node carries: canonical ID (after save), client key, type, title,
description, inputs, outputs, preconditions, postconditions, related
artifacts, metadata (JSON), and canvas position.

## 4. Edge Rules

Every edge supports:

- `label` — short branch label (e.g. "Yes").
- `condition` — expression/guard (required on decision-node edges, TR-04).
- `type` — one of `success | failure | next | retry | escalation | related`.

Semantics enforced on the canvas: `start` nodes expose a source handle only,
`end` nodes a target handle only; all other nodes expose both.

## 5. Inspector Requirements

Selecting a node lets the user edit:

- id (read-only; canonical after first save)
- type (select from the catalog, filtered by graph kind)
- title
- description
- inputs (one per line)
- outputs (one per line)
- preconditions (one per line)
- postconditions (one per line)
- related artifacts (canonical IDs, one per line)

Selecting an edge lets the user edit label, condition, and edge type, and
delete the edge.

## 6. Backend APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/modeler/node-types` | List the 12 node types with metadata |
| GET | `/api/modeler/graphs?project=PRJ-xxxx&kind=` | List graphs |
| POST | `/api/modeler/graphs` | Create an empty graph |
| GET | `/api/modeler/graphs/:id` | Load graph (nodes, edges, warnings) |
| PUT | `/api/modeler/graphs/:id` | Save graph (replace semantics, transactional) |
| DELETE | `/api/modeler/graphs/:id` | Delete graph |
| POST | `/api/modeler/validate` | Validate a graph payload, return warnings |

Save uses replace semantics inside one transaction: nodes are cleared
(edges cascade) and re-inserted with canonical child IDs
(`GRPH-0001-N01`, `GRPH-0001-E01`) while preserving client keys for
frontend reconciliation. Unknown node/edge types are rejected with 400.

## 7. Validation Warnings

Rules (kind-aware for workflow):

- `NO_START` / `MULTIPLE_START` — workflow must have exactly one Start.
- `NO_END` / `MULTIPLE_END` — workflow should have exactly one End.
- `START_HAS_INCOMING`, `START_DEAD_END` — Start node semantics.
- `END_HAS_OUTGOING` — End node semantics.
- `DECISION_EDGE_NO_CONDITION` — decision outgoing edges need conditions (TR-04).
- `DEAD_END_NODE` — non-terminal node with no outgoing edges.
- `EDGE_MISSING_SOURCE` / `EDGE_MISSING_TARGET` — dangling edges.
- `SELF_LOOP`, `PARALLEL_EDGES` — graph hygiene.
- `ISOLATED_NODE` — node with no connections.
- `UNKNOWN_NODE_TYPE` / `UNKNOWN_EDGE_TYPE` — catalog violations.
- `EMPTY_GRAPH` — informational empty state.

Warnings carry `error | warning | info` severity and are also returned by
load and save, so the panel is always in sync.

## 8. Persistence

- Tables: `model_graphs`, `model_nodes`, `model_edges` (added to
  `backend/db/schema.sql`, migration `backend/db/migrations/001_modeler_graphs.sql`).
- The database is the source of truth; the canvas is a view over it.
- `client_key` on nodes preserves stable client identity across saves.
- Graph saves are recorded in the `event_log` audit trail.

## 9. Frontend Structure (FSD)

- `entities/model-graph/` — types + TanStack Query hooks.
- `features/visual-modeler/` — canvas (`ModelerCanvas`), palette
  (`NodePalette`), inspector (`InspectorPanel`), validation
  (`ValidationPanel`), toolbar (`ModelerToolbar`), state hook
  (`useModelerGraph`), custom node types.
- `pages/modeler/` — hub (`ModelerPage`) and canvas (`CanvasPage`) routes.
- Canvas library: React Flow (`@xyflow/react`), per OQ-01 default (DEC-009).

## 10. Definition of Done

- Canvas works (add/connect/edit/delete). ✔
- Nodes and edges can be created and saved to the backend. ✔
- Graph persists in the database and round-trips on load. ✔
- Validation warnings exist and are surfaced in the UI. ✔
- Memory updated; next action points to Prompt 08. ✔
