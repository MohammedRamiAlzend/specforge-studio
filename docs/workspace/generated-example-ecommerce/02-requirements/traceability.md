---
id: ART-0013
title: Traceability Report
type: index
status: generated
project: PRJ-0004
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
| REQ-0101 | 2 |
| REQ-0102 | 2 |
| REQ-0103 | 1 |
| REQ-0104 | 1 |
| REQ-0105 | 2 |
| REQ-0106 | 1 |
| REQ-0107 | 0 |
| REQ-0108 | 1 |
| REQ-0109 | 1 |
| REQ-0110 | 1 |
| REQ-0111 | 0 |
| REQ-0112 | 0 |
| REQ-0113 | 1 |
| REQ-0114 | 0 |


## Links

| From | To | Type |
| --- | --- | --- |
| REQ-0101 (requirement) | API-0101 (api-endpoint) | realizes |
| REQ-0101 (requirement) | UC-0101 (use-case) | satisfies |
| REQ-0102 (requirement) | API-0104 (api-endpoint) | realizes |
| REQ-0102 (requirement) | UC-0101 (use-case) | traces |
| REQ-0103 (requirement) | UC-0101 (use-case) | satisfies |
| REQ-0104 (requirement) | UC-0104 (use-case) | satisfies |
| REQ-0105 (requirement) | API-0110 (api-endpoint) | realizes |
| REQ-0105 (requirement) | UC-0102 (use-case) | satisfies |
| REQ-0106 (requirement) | UC-0103 (use-case) | satisfies |
| REQ-0108 (requirement) | UC-0105 (use-case) | satisfies |
| REQ-0109 (requirement) | API-0106 (api-endpoint) | constrains |
| REQ-0110 (requirement) | API-0109 (api-endpoint) | constrains |
| REQ-0113 (requirement) | API-0106 (api-endpoint) | realizes |
| UC-0101 (use-case) | API-0106 (api-endpoint) | traces |
| UC-0101 (use-case) | API-0109 (api-endpoint) | traces |
| UC-0101 (use-case) | SCR-0105 (screen) | traces |
| UC-0103 (use-case) | API-0111 (api-endpoint) | traces |
| UC-0104 (use-case) | API-0107 (api-endpoint) | traces |
| UC-0104 (use-case) | SCR-0107 (screen) | traces |
| UC-0105 (use-case) | API-0112 (api-endpoint) | traces |
| UC-0105 (use-case) | SCR-0108 (screen) | traces |
