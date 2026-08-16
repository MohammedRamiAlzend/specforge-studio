---
id: FEAT-006
title: Governance Lifecycle
type: guide
phase: 11-governance-and-approvals
status: implemented
owner: engineering
related:
  - FEAT-007
  - DEC-003
  - TR-01
  - TR-02
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

# Governance Lifecycle — SpecForge Studio

## 1. Goal

Give every generated artifact a **governed status lifecycle** with approval
gates, a complete audit trail, and continuous validation so that nothing
reaches `approved` (or `done`) without human oversight where the master
protocol requires it (DEC-003).

## 2. Canonical Statuses

Nine governance statuses (stored in the `artifact_governance` overlay table,
migration 005):

`draft` → `auto_generated` → `needs_review` → `approved` → `ready_for_agent`
→ `in_progress` → `needs_verification` → `done`, plus `rejected` (recoverable
to `draft` / `needs_review` / `in_progress`).

Allowed transitions are enforced by a transition map
(`backend/src/modules/governance/lifecycle.ts`); illegal transitions are
rejected with the full allowed set in the error message.

## 3. Approval Gates

The following artifact kinds **cannot** become `approved` without an approved
Approval record (APR) — the API returns `GOV_APPROVAL_REQUIRED` otherwise:

- final requirements (`requirement`)
- security-sensitive workflows (`workflow`)
- final data model (`entity`)
- final architecture (`component`)
- final API contracts (`api_endpoint`)
- production-related decisions (`decision`)
- plan approval (`roadmap`)

Automatic generation (`draft` → `auto_generated`) never requires approval: it
covers draft docs, diagram previews, roadmap suggestions, task drafts, and
traceability reports.

## 4. Artifact Registry + Domain Sync

17 artifact types are registered (`module`, `requirement`, `use_case`,
`workflow`, `screen`, `entity`, `component`, `api_endpoint`, `test_case`,
`risk`, `decision`, `milestone`, `task`, `model_graph`, `generated_diagram`,
`docs_export`, `roadmap`). Each maps to its table and a governance-status →
domain-status translation so `POST /governance/status` best-effort syncs the
artifact's own `status` column.

## 5. Validation Warnings (TR rules)

`GET /governance/validation?project=` checks project data against
traceability rules and buckets results into `errors` / `warnings` / `infos`:

| Rule | Check | Level when violated |
|------|-------|---------------------|
| TR-01 | Requirements linked to a use case or workflow | warning |
| TR-02 | Workflow graphs have a start node | error |
| TR-05 | Entities have exactly one primary key | error |
| TR-06 | APIs define input/output/errors | warning |
| TR-07 | Critical requirements have test coverage | error |
| TR-08 | Milestones link to tasks | warning |
| TR-09 | Tasks have checklist items | warning |
| TR-15 | Tasks trace to a source artifact | warning |
| TR-19 | Open risks have a mitigation | warning |
| TR-20 | Approved requirements have a referencing task | warning |

## 6. Traceability Coverage

`GET /governance/traceability?project=` reports per-requirement coverage
(use cases / workflows / test cases / tasks), a summary of covered vs
uncovered requirements, and **orphan references** — `artifact_links` rows
pointing at IDs that do not exist.

## 7. Audit Trail

Every status change, approval request, approval, and rejection is appended to
`event_log` (`logEvent`): `GET /audit?project=&entity_type=&entity_id=&limit=`
returns the filterable, ordered history with parsed payloads.

## 8. Frontend (FSD)

- `entities/governance/` — types + TanStack hooks (status, transitions,
  approvals, decide, audit, validation, traceability).
- `pages/governance/GovernancePage.tsx` — four tabs:
  **Status** (load an artifact, view allowed next transitions, run a
  transition), **Approvals** (request + decide with rejection reason),
  **Validation** (TR-rule errors/warnings/infos), **Traceability** (coverage
  table + orphan references).
- Route `/projects/:projectId/governance` + "Governance" nav link.

## 9. Definition of Done

- Approval gates enforced structurally (no APR → no `approved`). ✔
- Rejections require a reason. ✔
- Full audit trail in `event_log`, exposed via `/audit`. ✔
- Validation + traceability visible to the user. ✔
- Domain status columns stay in sync after transitions. ✔
- Seed example demonstrates a full approval flow + audit trail. ✔
