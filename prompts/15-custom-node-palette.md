# Prompt 15 — Customizable Node Palette and Categories

Read all memory files before doing anything.

This is Prompt 15: Customizable Node Palette and Categories.

## Objective

Make the modeler's node palette fully configurable from Settings: node **categories** and **node types** are stored in the database instead of the hardcoded catalog, so the user can add node types like `loop`, edit existing ones, group them by category, and manage categories themselves (add/edit/delete/reorder/color). Custom node types can define their own custom fields (e.g. a loop count, a retry limit) that the inspector renders into the node's metadata.

## Confirmed Design (user answers, 2026-08-16)

- Node palette customizable from Settings; categories customizable too.
- Custom node types can define CUSTOM FIELDS (rendered in the inspector, stored in node metadata).
- The existing 12 built-in types remain as editable seeds so behavior is unchanged until the user edits them.

## Deliverables

Create or update:

- backend/db/schema.sql
- backend/db/migrations/008_node_palette.sql
- backend/src/modules/palette/ (routes.ts: categories + node types CRUD, GET /node-palette aggregate)
- backend/src/modules/modeler.ts (replace static catalog reads with DB palette; validation against DB)
- backend/src/modules/diagrams/generator.ts (generic rendering for custom node types)
- frontend/src/entities/palette/ (types + hooks)
- frontend/src/features/palette-settings/ (categories + node types editors on the Settings page)
- frontend/src/features/visual-modeler/NodePalette.tsx, ModelerCanvas.tsx, nodeTypes.tsx, InspectorPanel.tsx, useModelerGraph.ts (palette from DB, generic custom-node rendering, custom-field editing)
- docs/features/custom-node-palette.md (FEAT-010)
- docs/ontology/id-convention.md (add NCAT, NTYP prefixes)
- backend/tests/palette.test.ts + frontend/tests/palette.test.tsx
- memory files

## Requirements

1. **node_categories table** (id NCAT-0001, key UNIQUE, label, color, sort_order, enabled, built_in, created_at, updated_at). Seed the current four categories: flow, system, governance, ai.
2. **node_types table** (id NTYP-0001, key UNIQUE, label, category_id REFERENCES node_categories, description, color, kinds TEXT JSON (array of model kinds: workflow/data/architecture/sequence), default_title, fields TEXT JSON (array of custom field definitions: { key, label, type: text|textarea|number|select|boolean, options?, required?, default? }), enabled, built_in, sort_order, created_at, updated_at). Seed all 12 existing types (start, end, step, decision, wait, event, screen, api_call, database, external_system, approval, ai_agent) with their exact current properties (colors, kinds, categories) so nothing changes until edited.
3. **Loop example**: add a `loop` node type as an enabled seed (category flow, kinds workflow, default title "Loop") demonstrating a custom node with custom fields (e.g. fields: [ { key: "iterations", label: "Iterations", type: "number" }, { key: "mode", label: "Mode", type: "select", options: ["for","while","until"] } ]).
4. **Palette API**: GET /node-palette returns { categories: [ { ...category, nodeTypes: [...] } ] } with enabled categories and their enabled node types, ordered by sort_order — used by both the modeler and the Settings editor.
5. **Modeler**: all catalog lookups (node type meta, colors, default titles, per-kind availability) read from the DB palette; the static NODE_TYPE_CATALOG is replaced. UNKNOWN_NODE_TYPE validation and per-kind enforcement use the DB keys/kinds. Saving a graph with a node type that was later disabled still loads the graph (types retained, flagged as disabled).
6. **Custom nodes on canvas**: custom node types render generically (label + color from DB, default title). Known built-in keys keep their existing behavior (start/end shapes, decision diamond, edge-condition requirement) — the generator keeps special-casing by key and falls back to a generic rounded box for any other key.
7. **Inspector**: for a custom node, InspectorPanel renders the node type's defined fields (from node_types.fields) editing node.metadata; built-in fields (title, description, inputs, outputs, preconditions, postconditions, related artifacts) remain for all nodes.
8. **Settings UI** (global Settings page, Node palette tab):
   - Categories: add/edit (label, color, sort order), enable/disable, reorder; delete blocked while node types reference the category (re-parent first).
   - Node types: add/edit (key unique + immutable after creation, label, category, color, description, kinds checkboxes, custom field definitions, enable/disable, sort order); delete blocked while any saved model node uses the type (checked against model_nodes.node_type).
9. **Seed regeneration**: seed scripts keep the canonical 4 categories + 12 types (+ loop) so fresh databases and the demo project are reproducible.
10. **IDs/governance**: NCAT/NTYP prefixes added to docs/ontology/id-convention.md; palette edits logged to event_log (entity_type node_category/node_type).
11. **Verification**: root `bun tsc -b --noEmit` clean; backend smoke extended (palette CRUD, add custom node type with fields, modeler save with custom type, unknown-type rejection, kind mismatch rejection, delete-in-use blocked, node-palette aggregate); backend + frontend tests pass; seed-example regenerates; preview verified.

## Definition of Done

Prompt 15 is complete only when:

- categories and node types are stored in DB and editable from Settings (add/edit/disable/reorder/delete with in-use protection)
- the modeler reads its palette from the DB; existing 12 types behave identically by default
- custom node types render generically, persist custom fields through the inspector, and survive validation
- the diagram generator renders custom node types deterministically (generic box fallback)
- FEAT-010 doc written; id-convention updated; tests and smoke checks pass

## Mandatory Completion Rule

After finishing, update all memory files and report completion per AGENTS.md. The next required prompt is 16-skills-and-final-audit.
