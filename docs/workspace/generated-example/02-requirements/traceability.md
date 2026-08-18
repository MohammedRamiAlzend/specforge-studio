---
id: ART-0013
title: Traceability Report
type: index
status: generated
project: PRJ-0001
updated: "2026-08-18"
---

# Traceability

## Rules

- Every requirement should link to at least one use case, workflow, or task (TR rules).
- Links are stored in artifact_links with a link type (satisfies, verifies, realizes, ...).
- References always use canonical IDs.
## Requirements Coverage

| Requirement | Direct links |
| --- | --- |
| REQ-0001 | 1 |
| REQ-0002 | 2 |
| REQ-0003 | 1 |


## Links

| From | To | Type |
| --- | --- | --- |
| REQ-0001 (requirement) | UC-0001 (use-case) | traces |
| REQ-0002 (requirement) | TASK-0001 (task) | realizes |
| REQ-0002 (requirement) | UC-0001 (use-case) | satisfies |
| REQ-0003 (requirement) | TASK-0001 (task) | constrains |
| UC-0001 (use-case) | API-0001 (api-endpoint) | traces |
| UC-0001 (use-case) | SCR-0001 (screen) | traces |
