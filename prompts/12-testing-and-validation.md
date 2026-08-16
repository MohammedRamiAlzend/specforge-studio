# Prompt 12 — Testing and Validation

Read all memory files before doing anything.

This is Prompt 12: Testing and Validation.

## Objective

Add testing, validation, and quality gates to the system.

## Deliverables

Create or update:

- backend/tests/
- frontend/tests/
- docs/testing/test-plan.md
- docs/testing/validation-rules.md

## Required Tests

Add tests for:

1. backend API
2. database operations
3. diagram generation
4. document generation
5. roadmap generation
6. task generation
7. approval flow
8. validation rules

## Required Validation Rules

Implement automatic checks for:

- workflow has start and end
- decision nodes have branches
- requirements have test coverage
- APIs have input/output/error definitions
- entities have primary keys
- tasks have checklists and definition of done
- no orphan artifacts
- no broken traceability links

## Frontend Checks

Add basic tests or checks for:
- page rendering
- modeler interactions
- loading and error states
- export actions

## Quality Rules

- tests must be deterministic
- validation errors must be clear
- traceability issues must be visible to the user
- no phase may be marked complete if critical validation fails

## Memory Update

After finishing:
- update memory files
- set next prompt to Prompt 13

## Definition of Done

Prompt 12 is complete only when:
- core tests exist
- validation rules are enforced
- quality gates are defined
- memory is updated
- next action points to Prompt 13