# Prompt 07 — Visual Modeler

Read all memory files before doing anything.

This is Prompt 07: Visual Modeler.

## Objective

Build the visual modeling canvas where users create workflows, entities, APIs, screens, and architecture components without writing Mermaid manually.

## Deliverables

Create or update:

- frontend/src/features/visual-modeler/
- frontend/src/pages/modeler/
- backend/src/modules/modeler/
- docs/features/visual-modeler.md

## Required Capabilities

Implement a visual editor that supports:

1. adding nodes
2. connecting nodes
3. editing node properties
4. deleting nodes and edges
5. saving graph to backend
6. loading graph from backend
7. validation warnings

## Node Types

Support at least these node types:

- start
- end
- step
- decision
- screen
- api_call
- database
- external_system
- event
- wait
- approval
- ai_agent

## Edge Rules

Each edge must support:
- label
- condition
- type such as success, failure, next, retry, escalation

## Inspector Requirements

Each selected node must allow editing:
- id
- title
- type
- description
- inputs
- outputs
- preconditions
- postconditions
- related artifacts

## Backend Requirements

Create APIs for:
- saving workflow graph
- loading workflow graph
- validating workflow graph
- listing available node types

## UX Requirements

- user must not write Mermaid manually
- UI must generate the model as structured data
- canvas must be easy to use for software engineers
- graph must persist to backend

## Memory Update

After finishing:
- update memory files
- set next prompt to Prompt 08

## Definition of Done

Prompt 07 is complete only when:
- canvas works
- nodes and edges can be created and saved
- graph persists in backend
- validation warnings exist
- memory is updated
- next action points to Prompt 08