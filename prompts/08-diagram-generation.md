# Prompt 08 — Diagram Generation

Read all memory files before doing anything.

This is Prompt 08: Diagram Generation.

## Objective

Generate Mermaid diagrams automatically from structured model data.

## Deliverables

Create or update:

- backend/src/modules/diagrams/
- frontend/src/features/diagram-preview/
- docs/features/diagram-generation.md

## Required Diagram Types

Support automatic generation for:

1. Workflow diagram
2. Sequence diagram
3. ERD diagram
4. Architecture diagram

## Requirements

- Mermaid code must be generated from database/model data
- users must not need to write Mermaid manually
- generated diagrams must be deterministic and stable
- diagram generation must preserve artifact IDs in labels or metadata where useful

## Workflow Diagram Rules

Generate flowchart diagrams from workflow nodes and edges.

## Sequence Diagram Rules

Generate sequence diagrams from workflows that include:
- user actions
- screens
- API calls
- database operations
- responses

## ERD Rules

Generate ERD diagrams from:
- entities
- fields
- relations
- cardinalities

## Architecture Rules

Generate architecture diagrams from:
- components
- links
- protocols
- boundaries

## Output Requirements

For every generated diagram store:
- mermaid code
- source artifact IDs
- generated timestamp
- diagram type
- validation warnings

## Memory Update

After finishing:
- update memory files
- set next prompt to Prompt 09

## Definition of Done

Prompt 08 is complete only when:
- all four diagram types can be generated
- Mermaid output is valid
- output is based on structured data only
- memory is updated
- next action points to Prompt 09