---
id: ART-0027
title: Architecture Decision Records
type: index
status: generated
project: PRJ-0001
updated: "2026-08-18"
---

# Architecture Decision Records (ADRs)

## Decisions

### ADR-0001 — Use SQLite as the source of truth

Status: `approved`

Context: The platform needs a simple, portable database with full traceability.

Decision: SQLite is the canonical store; Markdown is generated output.

Alternatives:

- PostgreSQL
- MongoDB
Consequences: Keeps ops simple; the repository layer isolates the driver for later swaps.

