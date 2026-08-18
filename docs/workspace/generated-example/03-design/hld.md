---
id: ART-0014
title: High-Level Design
type: plan
status: generated
project: PRJ-0001
updated: "2026-08-18"
---

# High-Level Design (HLD)

## Architecture Overview

```mermaid
flowchart LR
  subgraph layer_presentation["presentation"]
    CMP_0001["Web client (React, TypeScript, Vite)"]
  end
  subgraph layer_application["application"]
    CMP_0002["Order API (Fastify, Zod)"]
  end
  subgraph layer_integration["integration"]
    CMP_0004["Payments gateway (REST)"]
  end
```

## Components

| ID | Component | Layer | Responsibility | Status |
| --- | --- | --- | --- | --- |
| CMP-0001 | Web client | presentation | React storefront and admin UI. | `approved` |
| CMP-0002 | Order API | application | Checkout, order, and payment orchestration. | `approved` |
| CMP-0003 | Orders DB | infrastructure | Orders and customer accounts. | `approved` |
| CMP-0004 | Payments gateway | integration | Card processing provider integration. | `approved` |
## Design Principles

- Database is the source of truth.
- Generated output is always English Markdown.
- Traceability and stable IDs everywhere.
