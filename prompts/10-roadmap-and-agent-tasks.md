# Prompt 10 — Roadmap and Agent Tasks

Read all memory files before doing anything.

This is Prompt 10: Roadmap and Agent Tasks.

## Objective

Build the roadmap engine and agent task packager.

## Deliverables

Create or update:

- backend/src/modules/roadmap/
- backend/src/modules/agent-tasks/
- docs/features/roadmap-engine.md
- docs/features/agent-task-packager.md

## Roadmap Engine Requirements

The roadmap engine must generate:

- phases
- milestones
- epics
- tasks
- dependencies
- priorities
- approval gates

It must derive the roadmap from:
- requirements
- workflows
- entities
- API endpoints
- screens
- architecture components
- risks
- non-functional requirements

## Agent Task Pack Requirements

Every generated task must include:

- task ID
- title
- type
- module
- priority
- status
- objective
- context
- input artifacts
- constraints
- executable checklist
- verification steps
- definition of done
- related artifacts
- approval requirement

## Executable Checklist Rules

Checklists must be:
- concrete
- sequential
- verifiable
- agent-neutral
- easy to execute by Claude, ChatGPT, Qwen, or any compatible agent

## Mandatory Constraints

- tasks must not be vague
- tasks must reference source artifacts
- tasks must not invent requirements
- tasks must respect user constraints stored in memory/CONSTRAINTS.md

## Memory Update

After finishing:
- update memory files
- set next prompt to Prompt 11

## Definition of Done

Prompt 10 is complete only when:
- roadmap can be generated automatically
- task packs include executable checklists
- tasks are traceable to artifacts
- memory is updated
- next action points to Prompt 11