---
id: OQ-001
type: open-questions
phase: 01-product-definition
status: open
owner: engineering
---

# Open Questions — SpecForge Studio

These questions must be resolved in the phases indicated. Each has a suggested default; none are decided until recorded as an approved decision (ADR/APR).

| ID | Question | Why It Matters | Suggested Default | Resolve In |
|----|----------|----------------|-------------------|------------|
| OQ-01 | Visual modeling paradigm: canvas (React Flow) vs form-driven vs hybrid? | Determines MOD-02 and the core UX | React Flow canvas with structured side panels | Prompt 07 |
| OQ-02 | Styling: Tailwind CSS or CSS Modules? | Master prompt requires one recorded choice | Tailwind CSS | Prompt 06 |
| OQ-03 | Single project per workspace, or multi-project in v1? | Affects data model and navigation | Single project per workspace; multi-project later | Prompt 02/04 |
| OQ-04 | Authentication model for the internal platform? | No external SaaS allowed; needs an internal decision | Local accounts with role-based permissions (ROLE-01…06) | Prompt 05/06 |
| OQ-05 | Markdown sync direction: one-way export only, or re-import? | Affects hybrid storage behavior (PRD-001 §10) | One-way export in v1; re-import later | Prompt 03 |
| OQ-06 | Diagram rendering: client-side Mermaid vs generated image files? | Affects workspace portability and MOD-03 | Client-side Mermaid rendering + Markdown Mermaid source | Prompt 08 |
| OQ-07 | v1 hosting model for the internal deployment? | Deployment phase deliverable | Single internal deployment (Docker/Node) | Prompt 13 |
| OQ-08 | Granularity of approval gates: which artifact types require approval? | Governance behavior (PRD-001 §9) | Approve: final REQ, ARCH, DB schema, API contracts, security/production | Prompt 11 |

## Rules for Open Questions

1. An open question is resolved only by an explicit user decision recorded in `memory/DECISIONS.md`.
2. While open, implementation must use the suggested default and flag the assumption.
3. Resolution of an open question may adjust scope only with explicit approval.
