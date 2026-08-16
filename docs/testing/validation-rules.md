---
id: TEST-002
title: Validation Rules
type: validation-rules
phase: 12-testing-and-validation
status: implemented
owner: engineering
related:
  - TEST-001
  - TR-01
  - TR-02
  - TR-04
  - TR-05
  - TR-06
  - TR-07
  - TR-08
  - TR-09
  - TR-15
  - TR-19
  - TR-20
updated: 2026-08-16
---

# Validation Rules — SpecForge Studio

## 1. Purpose

Automatic, machine-checkable rules that keep the model coherent. Every rule
is **enforced by code** (not convention), reports **clear messages**, and its
results are **visible to the user** in the Governance page (Validation /
Traceability tabs).

## 2. Modeler Rules (visual canvas)

Enforced in `backend/src/modules/modeler.ts` (on load, save, and
`POST /modeler/validate`):

| Code | Rule | Severity |
|------|------|----------|
| `NO_START` | Workflow graph has no start node | error |
| `NO_END` | Workflow graph has no end node | warning |
| `MULTIPLE_START` / `MULTIPLE_END` | More than one start/end | error |
| `DECISION_EDGE_NO_CONDITION` | A decision's outgoing edge lacks a condition (TR-04) | warning |
| `UNKNOWN_NODE_TYPE` / `UNKNOWN_EDGE_TYPE` | Unknown node/edge type | error; **save rejected with 400** |
| `DANGLING_EDGE` | Edge references a missing node | error |
| `ISOLATED_NODE` | Node has no edges | warning |
| `PARALLEL_EDGES` / `SELF_LOOP` | Duplicate or self-referencing edges | warning |

## 3. Governance Rules (project data, TR rules)

Enforced by `GET /governance/validation?project=` in
`backend/src/modules/governance/routes.ts`:

| Rule | Check | Level when violated |
|------|-------|---------------------|
| TR-01 | Every requirement links to a use case or workflow | warning |
| TR-02 | Every workflow model graph has a start node | error |
| TR-05 | Every entity has exactly one primary-key field | error |
| TR-06 | Every API endpoint defines input/output/errors | warning |
| TR-07 | Every critical requirement has test coverage | error |
| TR-08 | Every milestone links to at least one task | warning |
| TR-09 | Every task has at least one checklist item | warning |
| TR-15 | Every task traces to a source artifact (no invented work) | warning |
| TR-19 | Every open risk has a mitigation | warning |
| TR-20 | Every approved requirement has a referencing task | warning |

## 4. Traceability Rules (link integrity)

`GET /governance/traceability?project=` reports per-requirement coverage
(use cases / workflows / test cases / tasks), covered vs uncovered
requirements, and **orphan references** — `artifact_links` rows pointing at
IDs that no longer exist. Broken links are visible in the Traceability tab.

## 5. Lifecycle Rules (governance)

- Illegal status transitions are rejected with the allowed set in the
  message (`POST /governance/status`).
- Approval-gated kinds (requirement, workflow, entity, component,
  api_endpoint, decision, roadmap) cannot reach `approved` without an
  approved APR (`GOV_APPROVAL_REQUIRED`).
- Rejections require a reason.
- Every transition/decision is appended to the audit trail (`event_log`).

## 6. Quality Gates

1. **No gate bypass**: `approved` is structurally unreachable without an APR.
2. **No orphan artifacts**: deleting a project cascades to all dependent
   rows, including `artifact_links` (DEC-014, enforced in `schema.sql`).
3. **Clear errors**: every validation failure carries a rule code and a
   human-readable message; illegal API payloads return `VALIDATION_ERROR`.
4. **Visible traceability**: uncovered requirements and broken links appear
   in the Governance page — never only in logs.
5. **No phase completion on critical failure**: the test suite asserts
   error-level rules (TR-02/05/07, modeler errors) are actually reported;
   a phase may not be marked complete while these fail.

## 7. Coverage in Tests

Each rule above has a regression test in `backend/tests/validation.test.ts`,
`backend/tests/modeler`-related assertions in `api.test.ts` /
`validation.test.ts`, and approval gates in `approvals.test.ts` — see
`test-plan.md` (TEST-001).
