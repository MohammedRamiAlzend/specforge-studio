---
id: ART-0009
title: Risk Register
type: index
status: generated
project: PRJ-0001
updated: "2026-08-25"
---

# Risk Register

## Risks

| ID | Risk | Likelihood | Impact | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| RISK-0001 | Payment provider downtime | medium | high | Retry with exponential backoff; provider failover flag. | backend | `open` |
| RISK-0002 | Scope creep on admin analytics | high | medium | Track against milestones; require approval for new must-have scope. | product | `open` |
## Scoring

Likelihood: low/medium/high. Impact: low/medium/high/critical. Status: open/mitigated/accepted/closed.

