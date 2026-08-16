# Prompt 03 — Markdown Workspace Specification

Read all memory files before doing anything.

This is Prompt 03: Markdown Workspace Specification.

## Objective

Define the exact Markdown workspace that the system will generate for every project.

## Deliverables

Create or update:

- docs/workspace/folder-structure.md
- docs/workspace/file-naming.md
- docs/workspace/frontmatter-spec.md
- docs/workspace/templates/README.md
- docs/workspace/templates/AGENTS.md
- docs/workspace/templates/workflow.template.md
- docs/workspace/templates/use-case.template.md
- docs/workspace/templates/api.template.md
- docs/workspace/templates/entity.template.md
- docs/workspace/templates/test-case.template.md
- docs/workspace/templates/task.template.md

## Required Generated Workspace

Define a generated workspace structure similar to:

- README.md
- AGENTS.md
- 00-meta/
- 01-planning/
- 02-requirements/
- 03-design/
- 04-ui/
- 05-testing/
- 06-ops/
- 07-guides/
- 08-governance/
- 09-agent-plans/
- templates/

## Requirements

Every generated Markdown file must have YAML frontmatter with:
- id
- title
- type
- status
- related artifacts
- last updated timestamp if useful

## Mandatory Rules

- all generated docs must be English-only
- docs must be readable by humans and agents
- every workflow file must include:
  - goal
  - Mermaid diagram
  - steps
  - business rules
  - exceptions
  - related artifacts
- every task file must include:
  - objective
  - context
  - inputs
  - constraints
  - executable checklist
  - verification
  - definition of done

## Style Reference

Use the handoff knowledge base style:
- clear numbered sections
- practical reading order
- open points
- agent-friendly instructions

## Memory Update

After finishing:
- update memory files
- set next prompt to Prompt 04

## Definition of Done

Prompt 03 is complete only when:
- workspace structure is fully specified
- templates are defined
- frontmatter rules are explicit
- memory is updated
- next action points to Prompt 04