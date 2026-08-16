# Prompt 04 — Database Schema

Read all memory files before doing anything.

This is Prompt 04: Database Schema.

## Objective

Design the SQLite database schema for SpecForge Studio.

## Technology Constraints

- Use SQLite only.
- Do not use PostgreSQL or MongoDB.
- Backend will use Node.js.
- Schema must be simple, portable, and easy to back up.

## Deliverables

Create or update:

- backend/db/schema.sql
- backend/db/migrations/README.md
- docs/data/database-design.md
- docs/data/entity-mapping.md

## Required Tables

Design tables for at least:

- projects
- modules
- requirements
- use_cases
- workflows
- workflow_nodes
- workflow_edges
- screens
- entities
- entity_fields
- entity_relations
- components
- component_links
- api_endpoints
- sequence_diagrams
- architecture_diagrams
- test_cases
- risks
- decisions
- milestones
- tasks
- task_checklists
- approvals
- agent_runs
- event_log

## Requirements

For each table define:
- primary key
- foreign keys
- unique constraints
- indexes
- timestamps
- status fields where needed
- JSON columns for flexible metadata where useful

## Data Rules

- database is the source of truth
- Markdown is generated output
- every artifact must have a stable public ID
- every artifact must store traceability links
- never store secrets in plain text
- use JSON columns only when relational modeling is excessive

## Migration Rules

- migrations must be additive unless explicitly approved
- destructive migrations require approval
- schema must be reproducible from scratch

## Memory Update

After finishing:
- update memory files
- set next prompt to Prompt 05

## Definition of Done

Prompt 04 is complete only when:
- SQLite schema is complete
- relationships are clear
- migration policy is defined
- memory is updated
- next action points to Prompt 05