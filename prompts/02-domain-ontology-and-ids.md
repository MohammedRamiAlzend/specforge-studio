# Prompt 02 — Domain Ontology and IDs

Read all memory files before doing anything.

This is Prompt 02: Domain Ontology and IDs.

## Objective

Define the standard entity model for the entire system.

## Deliverables

Create or update:

- docs/ontology/entity-catalog.md
- docs/ontology/id-convention.md
- docs/ontology/relationships.md
- docs/ontology/traceability-rules.md
- docs/ontology/status-lifecycle.md

## Required Entities

Define at least these entities:

- Project
- Module
- Artifact
- Requirement
- UseCase
- Workflow
- WorkflowNode
- WorkflowEdge
- Screen
- Entity
- EntityField
- EntityRelation
- Component
- ApiEndpoint
- SequenceDiagram
- ArchitectureDiagram
- TestCase
- Risk
- Decision
- Milestone
- Task
- ChecklistItem
- Approval
- AgentRun

## Requirements

For each entity define:
- purpose
- required fields
- optional fields
- relationships
- ID format
- status values
- validation rules

## ID Convention

Define stable ID prefixes such as:
- PRJ
- MOD
- REQ
- UC
- WF
- SCR
- DB
- API
- ARCH
- SEQ
- TC
- RISK
- ADR
- MS
- TASK
- CHK
- APR

## Traceability Rules

Define rules such as:
- every requirement must link to at least one use case or workflow
- every workflow must have start and end
- every decision node must have success and failure branches
- every entity must have a primary key
- every API endpoint must have input, output, and errors
- every critical requirement must have at least one test case
- every task must have objective, checklist, and definition of done

## Memory Update

After finishing:
- update memory files
- record decisions
- set next prompt to Prompt 03

## Definition of Done

Prompt 02 is complete only when:
- the ontology is complete
- ID conventions are clear
- traceability rules are explicit
- memory is updated
- next action points to Prompt 03