---
id: FEAT-007
title: Approvals (APR)
type: guide
phase: 11-governance-and-approvals
status: implemented
owner: engineering
related:
  - FEAT-006
  - DEC-003
  - TR-20
updated: 2026-08-16
---

# Approvals (APR) — SpecForge Studio

## 1. Goal

Record **human approval decisions** as first-class, auditable artifacts
(`APR-xxxx`) and make them the gatekeeper for gated lifecycle transitions
(see FEAT-006 §3): an artifact cannot become `approved` unless an approved
APR references it.

## 2. Approval Flow

1. **Request** — `POST /api/approvals` with `project_id`, `artifact_id`,
   `artifact_type`, `approver_role`, optional `comments`. Creates an APR row
   with status `pending`; for gated artifact kinds it also moves the
   artifact's governance overlay to `needs_review` and flags
   `needs_approval = 1`.
2. **Decide** — `POST /api/approvals/:id/decide` with
   `decision: approved | rejected`, `approver_role`, optional `approver_name`
   and `comments`.
   - **Rejection requires a reason** (comments non-empty) — enforced.
   - Approval records the APR on the artifact's governance overlay and, for
     tasks, sets `tasks.approval_id`.
3. **Gate** — `POST /api/governance/status` with `to_status: approved` on a
   gated kind fails with `GOV_APPROVAL_REQUIRED` unless an approved APR
   exists for that artifact.
4. **Audit** — every request and decision is appended to `event_log`.

## 3. APIs

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/approvals` | Request an approval (APR, status `pending`) |
| POST | `/api/approvals/:id/decide` | Approve or reject (rejection needs a reason) |
| GET | `/api/approvals?project=&artifact_id=` | List approvals |
| GET | `/api/approvals/:id` | Fetch one approval |

## 4. Schema

`approvals` (canonical schema): `APR-xxxx` IDs, polymorphic
`artifact_id` + `artifact_type` (app-validated), `approver_role`,
`approver_name`, `decision`, `status`, `comments`, optional
`related_decision_id` / `supersedes` for decision-linked or superseding
approvals, timestamps. The `artifact_governance` overlay records
`needs_approval` + `approval_id` per artifact.

## 5. Frontend (FSD)

- `entities/governance/api.ts` — `useApprovals`, `requestApproval`,
  `decideApproval` hooks.
- `pages/governance/GovernancePage.tsx` — **Approvals** tab: request form
  (artifact type/id, approver role, comments), pending list with
  Approve / Reject actions, rejection-reason input, and history of decisions.

## 6. Definition of Done

- APR records created and decided through the API. ✔
- Rejection without a reason is blocked. ✔
- Approved APR unlocks gated `approved` transitions. ✔
- Approvals appear in the generated workspace (`08-governance/approvals.md`).
  ✔
- Seed example shows a completed flow (APR-0002 → WF-0001 approved). ✔
