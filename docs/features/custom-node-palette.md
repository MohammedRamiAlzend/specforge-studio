---
id: FEAT-010
title: Customizable Node Palette
type: guide
phase: 15-custom-node-palette
status: implemented
owner: engineering
related:
  - FEAT-007
  - FEAT-008
  - FEAT-009
  - ONT-002
  - NCAT-0001
updated: 2026-08-16
---

# Customizable Node Palette — SpecForge Studio

## 1. Goal

The modeler's node catalog is no longer hard-coded in source. **Node
categories and node types live in the database** and are managed from a
dedicated **Settings → Node palette** tab. Categories and types can be added,
edited, reordered, colored, and disabled. Custom node types can define
**custom fields** (e.g. loop count, retry limit) that the inspector renders
and that are stored in the node's `metadata`.

The 12 original types from Prompt 07 plus `workflow_call` (Prompt 14) and a
`loop` demo type with custom fields remain as editable seeds, so behavior is
unchanged until a user edits them.

## 2. Domain Model

```
node_categories
  ├── key, label, color, sort_order, enabled, built_in
  └── node_types
        ├── key, label, color, description, default_title
        ├── kinds         (workflow | data | architecture | sequence)
        ├── fields        (JSON: custom field definitions)
        └── sort_order, enabled, built_in
```

- **`node_categories`** — palette grouping (Flow, System, Governance,
  AI & Agents by default). Carries `key`, `label`, `color`, `sort_order`,
  `enabled`, `built_in`.
- **`node_types`** — a node type inside a category. Carries `key`, `label`,
  `category_id`, `description`, `color`, `kinds` (JSON array of `ModelKind`),
  `default_title`, `fields` (JSON array of `NodeFieldDef`), `sort_order`,
  `enabled`, `built_in`. Deleting a category with node types is blocked
  (`409`) — move the types first; a node type used by any saved
  `model_nodes` row is also blocked (`409`).

### Custom fields (`fields`)

```ts
type NodeFieldType = "text" | "textarea" | "number" | "select" | "boolean";

interface NodeFieldDef {
  key: string;
  label: string;
  type: NodeFieldType;
  options?: string[];          // required for select
  required?: boolean;
  default?: string | number | boolean;
}
```

Field values are stored in the node's `metadata[field.key]` when a graph is
saved. Defaults are seeded onto the node on creation (`useModelerGraph.addNode`)
and when the node's type is changed in the inspector.

## 3. Built-in Seeds

Four categories and fourteen node types are seeded on first boot
(`backend/src/modules/palette/seed.ts`) with stable fixed IDs: the 13 types
from the previous hard-coded catalog exactly (start, end, step, decision,
wait, event, screen, api_call, database, external_system, approval, ai_agent,
workflow_call) plus a `loop` demo type (NTYP-0014) that carries two custom
fields (`iterations`, `mode`) so custom-field behavior is visible out of the
box:

| Prefix | Count | Rows |
|--------|-------|------|
| `NCAT` | 4 | flow, system, governance, ai (labels Flow, System, Governance, AI & Agents) |
| `NTYP` | 14 | start, end, step, decision, wait, event, screen, api_call, database, external_system, approval, ai_agent, workflow_call, loop |

Built-in rows may be **edited, reordered, or disabled but never hard-deleted**.
The first custom type/key allocated after the seed is `NTYP-0015` / first
custom category `NCAT-0005`.

## 4. Backend APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/node-palette` | Full palette: categories with nested node types |
| POST | `/api/node-palette/categories` | Create a category |
| PATCH | `/api/node-palette/categories/:id` | Edit/disable a category |
| DELETE | `/api/node-palette/categories/:id` | Delete an unused, non-built-in category |
| POST | `/api/node-palette/types` | Create a node type |
| PATCH | `/api/node-palette/types/:id` | Edit/disable a node type (incl. `fields`) |
| DELETE | `/api/node-palette/types/:id` | Delete an unused, non-built-in node type |

The modeler's legacy catalog endpoint is preserved for compatibility:

- `GET /api/modeler/node-types` → enabled types flattened to the classic
  `NodeTypeDefinition[]` shape (now including `fields`), sourced from the DB.

Validation (all `400 BAD_REQUEST`, or `409 CONFLICT` for key collisions and
delete guards): unknown categories, duplicate `key`s, fields with invalid
`type`, and deleting categories/types that are still referenced.

Graph validation now reads the palette from the DB: nodes whose type is absent
→ `UNKNOWN_NODE_TYPE` (error); disabled types → `DISABLED_NODE_TYPE`
(warning); types not supporting the graph kind → `KIND_NOT_SUPPORTED`
(warning). Audit events are written for every palette change
(`node_category`/`node_type` → `created`/`updated`).

## 5. Diagram Rendering

The diagrams generator already falls back to a generic rounded box
(`workflowShape` → `"generic"`) for any unknown/custom node type, so custom
types render in every workflow/sequence/architecture diagram without generator
changes. Built-in shapes (stadium for start/end, diamond for decision,
subgraph for resolved workflow calls) are unchanged.

## 6. Frontend (FSD)

- `entities/palette/` — types + TanStack Query hooks
  (`useNodePalette`, `useCreate/Update/DeleteNodeCategory`,
  `useCreate/Update/DeleteNodeType`) and `allNodeTypes`/`enabledNodeTypes`
  flatten helpers.
- `features/palette-settings/` — `NodePaletteSettingsPanel`: category cards
  with per-category node-type lists; inline add/edit/disable/delete;
  built-in/in-use locks; a custom-field editor (key/label/type/options/
  required/default) for create and edit.
- `features/visual-modeler/` — `NodePalette` groups enabled types by the
  **DB categories** (label/color/order from the database, no hard-coded
  ordering); `CanvasPage` resolves metadata from the full palette (disabled
  types stay resolvable for saved graphs) and lists only enabled types for
  drag/drop; `InspectorPanel` renders custom fields bound to
  `metadata[field.key]`; `useModelerGraph` seeds field defaults on add.
- `pages/SettingsPage` — tabs now include **Node palette**.

## 7. Definition of Done

- Categories/types are DB-backed and seeded automatically. ✔
- Settings edits/adds/reorders/colors/disables categories and types. ✔
- Custom node types define custom fields; inspector renders and saves them. ✔
- Modeler palette groups by DB categories; disabled types are hidden but
  resolvable on saved graphs. ✔
- Generic diagram rendering covers custom node types. ✔
- Smoke covers the new APIs; backend + frontend typechecks and tests pass. ✔