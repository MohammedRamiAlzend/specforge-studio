---
id: ROL-001
type: user-roles
phase: 01-product-definition
status: approved (APR-001)
owner: engineering
---

# User Roles — SpecForge Studio

## 1. Role Summary

| ID | Role | Primary Job | Approves |
|----|------|-------------|----------|
| ROLE-01 | Product Owner / Spec Author | Define requirements, use cases, and scope | Final requirements (REQ/UC) |
| ROLE-02 | Engineering Lead | Own architecture, data model, API contracts | Final architecture, schema, API contracts |
| ROLE-03 | Developer / Implementer | Execute generated tasks, report against checklists | — |
| ROLE-04 | Agent (AI executor) | Execute agent-neutral task packs | — |
| ROLE-05 | Governor / Approver | Approve security-sensitive and production decisions | Security workflows, production, migrations |
| ROLE-06 | Viewer / Stakeholder | Read docs, diagrams, roadmaps, reports | — |

## 2. ROLE-01 — Product Owner / Spec Author

- Creates projects and defines scope.
- Authors requirements (REQ) and use cases (UC) in structured form.
- Approves final requirements before implementation proceeds.
- Reviews generated documentation and roadmap drafts.

## 3. ROLE-02 — Engineering Lead

- Owns the visual model: workflows, entities, sequence flows, architecture.
- Reviews generated diagrams for correctness.
- Approves final architecture (ARCH), database schema (DB), and API contracts (API).
- Assigns milestones and reviews task packs before execution.

## 4. ROLE-03 — Developer / Implementer

- Executes tasks (TASK) from generated task packs.
- Works through executable checklists (CHK) and records progress.
- Reports verification results against definitions of done.
- Does not override approvals.

## 5. ROLE-04 — Agent (AI Executor)

- Consumes agent-neutral task packs.
- Executes concrete sequential checklists.
- Reports completion per task ID with verification evidence.
- Must not invent requirements, skip checklists, or modify approved scope.

## 6. ROLE-05 — Governor / Approver

- Approves security-sensitive workflows.
- Approves production-related decisions.
- Approves destructive database migrations.
- Records decisions as ADR/APR entries.

## 7. ROLE-06 — Viewer / Stakeholder

- Read-only access to the Markdown workspace, diagrams, roadmaps, and traceability reports.
- Can raise open questions (OQ) but cannot approve or modify artifacts.

## 8. Role Rules

- No artifact exists without an owner role (see traceability rules).
- Approval rights are explicit per role; automatic generation never substitutes for required human approval.
