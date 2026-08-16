# Prompt 09 — Document Generation

Read all memory files before doing anything.

This is Prompt 09: Document Generation.

## Objective

Build the documentation engine that converts database artifacts into a complete English Markdown workspace.

## Deliverables

Create or update:

- backend/src/modules/docs-generator/
- docs/features/document-generation.md
- docs/workspace/generated-example/

## Required Output

The generator must create a full project workspace including:

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

## Mandatory Rules

- all generated files must be English-only
- every generated file must include YAML frontmatter
- generated docs must include traceability IDs
- generated docs must include Mermaid blocks where relevant
- generated docs must be readable by humans and AI agents
- docs must not duplicate contradictory information without a clear source

## Required Generators

Implement generators for:

- project charter
- vision
- scope
- risk register
- SRS
- use cases
- workflows
- HLD
- LLD
- ERD docs
- API docs
- screen docs
- test plan
- test cases
- developer guide
- deployment guide
- user guide
- ADRs
- bug report templates

## Export Behavior

The system must support:
- generate workspace from database
- regenerate workspace safely
- preserve manually edited sections if marked as protected
- export workspace as folder output

## Memory Update

After finishing:
- update memory files
- set next prompt to Prompt 10

## Definition of Done

Prompt 09 is complete only when:
- workspace can be generated from database
- Markdown output is complete and stable
- generated docs include diagrams and traceability
- memory is updated
- next action points to Prompt 10