# Prompt 11 — Governance and Approvals

Read all memory files before doing anything.

This is Prompt 11: Governance and Approvals.

## Objective

Implement governance, approval gates, artifact statuses, and audit behavior.

## Deliverables

Create or update:

- backend/src/modules/governance/
- docs/features/governance.md
- docs/features/approvals.md

## Required Capabilities

Implement:

1. artifact status lifecycle
2. approval requests
3. approval records
4. rejection reasons
5. audit log
6. validation warnings
7. traceability coverage checks

## Required Status Values

Use at least these statuses:

- draft
- auto_generated
- needs_review
- approved
- ready_for_agent
- in_progress
- needs_verification
- done
- rejected

## Approval Rules

Require approval for:
- final requirements
- final architecture
- final data model
- final API contracts
- security-sensitive workflows
- production-related decisions
- destructive database migrations

Allow automatic generation for:
- draft docs
- diagram previews
- roadmap suggestions
- task drafts
- traceability reports

## Audit Requirements

Store an event log for:
- creation
- update
- approval
- rejection
- generation
- export
- task state changes

## Memory Update

After finishing:
- update memory files
- set next prompt to Prompt 12

## Definition of Done

Prompt 11 is complete only when:
- statuses work
- approvals are recorded
- validation warnings are visible
- audit log exists
- memory is updated
- next action points to Prompt 12