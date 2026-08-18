---
id: ART-0009
title: Risk Register
type: index
status: generated
project: PRJ-0004
updated: "2026-08-18"
---

# Risk Register

## Risks

| ID | Risk | Likelihood | Impact | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| RISK-0101 | Payment provider downtime | medium | critical | Retry with exponential backoff; provider failover flag. | backend | `open` |
| RISK-0102 | Inventory oversell | high | high | Atomic reservation at checkout (REQ-0113); low-stock alerts. | backend | `open` |
| RISK-0103 | Cart abandonment | high | medium | Persist carts server-side; recovery email for saved carts. | product | `open` |
| RISK-0104 | PCI scope creep | medium | critical | Never store card data (REQ-0110); gateway tokenization only. | backend | `open` |
## Scoring

Likelihood: low/medium/high. Impact: low/medium/high/critical. Status: open/mitigated/accepted/closed.

