---
id: ART-0027
title: Architecture Decision Records
type: index
status: generated
project: PRJ-0004
updated: "2026-08-25"
---

# Architecture Decision Records (ADRs)

## Decisions

### ADR-0101 — .NET + React for the store

Status: `approved`

Context: The most common e-commerce stack: a typed backend and a component-based frontend.

Decision: ASP.NET Core API with a React SPA.

Alternatives:

- Node/Express
- Next.js
Consequences: Recorded in ADRs; documented in 08-governance/adrs.md.


### ADR-0102 — Tokenized payments

Status: `approved`

Context: PCI scope must be minimized for a small store team.

Decision: Card data is captured by the gateway and never stored.

Alternatives:

- Storing card data
Consequences: Recorded in ADRs; documented in 08-governance/adrs.md.


### ADR-0103 — Server-side totals

Status: `approved`

Context: Client-side totals are not trustworthy (REQ-0109).

Decision: All order totals are computed by the API.

Alternatives:

- Client-computed totals
Consequences: Recorded in ADRs; documented in 08-governance/adrs.md.

