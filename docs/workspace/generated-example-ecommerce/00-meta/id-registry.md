---
id: ART-0004
title: ID Registry
type: index
status: generated
project: PRJ-0004
updated: "2026-08-16"
---

# ID Registry

## Purpose

Stable, immutable public IDs are the traceability backbone (docs/ontology/id-convention.md). This registry lists allocation counters per prefix.

## Counters

| Prefix | Next value |
| --- | --- |
| LIB | 33 |
| NCAT | 5 |
| NTYP | 15 |
| PTYPE | 5 |
| RMP | 2 |
| STK | 13 |
| TASK | 61 |
## Rules

- IDs are never reused.
- Cross-references always use canonical IDs.
- Child IDs follow `<PARENT>-<CODE><NN>` (e.g. GRPH-0001-N01).
