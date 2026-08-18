---
id: ART-0016
title: Workflows
type: index
status: generated
project: PRJ-0004
related:
  - WF-0101
  - WF-0102
  - WF-0103
  - WF-0104
updated: "2026-08-18"
---

# Workflows

## Workflow Models

### GRPH-0004 — Checkout flow

Status: `reviewed` · Order placement from cart review to payment capture and confirmation.

```mermaid
flowchart TD
  GRPH_0004_N01(["Start"])
  GRPH_0004_N02["Cart review"]
  GRPH_0004_N03["Create order"]
  GRPH_0004_N04["Capture payment"]
  GRPH_0004_N05{"Payment approved?"}
  GRPH_0004_N06["Payment retry"]
  GRPH_0004_N07(["Order confirmed"])
  GRPH_0004_N01 -->|"next"| GRPH_0004_N02
  GRPH_0004_N02 -->|"next"| GRPH_0004_N03
  GRPH_0004_N03 -->|"success success"| GRPH_0004_N04
  GRPH_0004_N04 -->|"success success"| GRPH_0004_N05
  GRPH_0004_N05 -->|"retry (declined) retry"| GRPH_0004_N06
  GRPH_0004_N05 -->|"success (approved) success"| GRPH_0004_N07
  GRPH_0004_N06 -->|"retry (retry capture) retry"| GRPH_0004_N04
```


### GRPH-0005 — Order fulfillment

Status: `reviewed` · Reserve inventory, pick and pack, ship, and track delivery.

```mermaid
flowchart TD
  GRPH_0005_N01(["Start"])
  GRPH_0005_N02["Reserve inventory"]
  GRPH_0005_N03["Pick and pack"]
  GRPH_0005_N04["Create shipment"]
  GRPH_0005_N05{"In stock?"}
  GRPH_0005_N06["Backorder"]
  GRPH_0005_N07(["Shipped"])
  GRPH_0005_N01 -->|"next"| GRPH_0005_N02
  GRPH_0005_N02 -->|"next"| GRPH_0005_N03
  GRPH_0005_N03 -->|"next"| GRPH_0005_N04
  GRPH_0005_N04 -->|"success success"| GRPH_0005_N05
  GRPH_0005_N05 --x|"failure (out of stock) failure"| GRPH_0005_N06
  GRPH_0005_N05 -->|"success (in stock) success"| GRPH_0005_N07
  GRPH_0005_N06 -->|"next (backorder)"| GRPH_0005_N07
```


### GRPH-0006 — Refund & returns

Status: `reviewed` · Validate a return request and issue a refund through the gateway.

```mermaid
flowchart TD
  GRPH_0006_N01(["Start"])
  GRPH_0006_N02["Return request"]
  GRPH_0006_N03["Validate eligibility"]
  GRPH_0006_N04{"Approved?"}
  GRPH_0006_N05["Issue refund"]
  GRPH_0006_N06(["Refunded"])
  GRPH_0006_N01 -->|"next"| GRPH_0006_N02
  GRPH_0006_N02 -->|"next"| GRPH_0006_N03
  GRPH_0006_N03 -->|"next"| GRPH_0006_N04
  GRPH_0006_N04 -->|"success (approved) success"| GRPH_0006_N05
  GRPH_0006_N04 --x|"failure (rejected) failure"| GRPH_0006_N06
  GRPH_0006_N05 -->|"next"| GRPH_0006_N06
```


### GRPH-0007 — Inventory restock

Status: `reviewed` · Detect low stock, create a restock order, and update on receipt.

```mermaid
flowchart TD
  GRPH_0007_N01(["Start"])
  GRPH_0007_N02["Low stock alert"]
  GRPH_0007_N03["Create restock order"]
  GRPH_0007_N04["Supplier order"]
  GRPH_0007_N05(["Restocked"])
  GRPH_0007_N01 -->|"next"| GRPH_0007_N02
  GRPH_0007_N02 -->|"next"| GRPH_0007_N03
  GRPH_0007_N03 -->|"next"| GRPH_0007_N04
  GRPH_0007_N04 -->|"next"| GRPH_0007_N05
```

## Rules

- Every workflow has a start and an end.
- Decision nodes require conditions on outgoing edges (TR-04).
- Cross-project workflow calls point at a workflow-kind graph of another project (TR-21).
- Diagrams are generated from structured data — never hand-written Mermaid.
