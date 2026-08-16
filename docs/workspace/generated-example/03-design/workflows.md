---
id: ART-0016
title: Workflows
type: index
status: generated
project: PRJ-0001
related:
  - WF-0001
updated: "2026-08-16"
---

# Workflows

## Workflow Models

### GRPH-0001 — Checkout flow

Status: `reviewed` · Order placement from cart review to confirmation.

```mermaid
flowchart TD
  GRPH_0001_N01(["Start"])
  GRPH_0001_N02["Cart review"]
  GRPH_0001_N03["Create order"]
  GRPH_0001_N04{"Payment success?"}
  GRPH_0001_N05(["End"])
  GRPH_0001_N01 -->|"next"| GRPH_0001_N02
  GRPH_0001_N02 -->|"next"| GRPH_0001_N03
  GRPH_0001_N03 -->|"success (200 OK) success"| GRPH_0001_N04
  GRPH_0001_N04 -->|"success (approved) success"| GRPH_0001_N05
```

## Rules

- Every workflow has a start and an end.
- Decision nodes require conditions on outgoing edges (TR-04).
- Diagrams are generated from structured data — never hand-written Mermaid.
