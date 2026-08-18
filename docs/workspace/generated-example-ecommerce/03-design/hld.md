---
id: ART-0014
title: High-Level Design
type: plan
status: generated
project: PRJ-0004
updated: "2026-08-18"
---

# High-Level Design (HLD)

## Architecture Overview

```mermaid
flowchart LR
  subgraph layer_presentation["presentation"]
    CMP_0101["Storefront SPA (React, TypeScript, Tailwind CSS, React Router)"]
    CMP_0103["Admin console (React, TypeScript)"]
  end
  subgraph layer_application["application"]
    CMP_0102["Commerce API (.NET, ASP.NET Core, EF Core, Serilog)"]
  end
  subgraph layer_integration["integration"]
    CMP_0105["Payment gateway (REST, PCI-DSS)"]
    CMP_0106["Email service (SMTP, MailKit)"]
  end
```

## Components

| ID | Component | Layer | Responsibility | Status |
| --- | --- | --- | --- | --- |
| CMP-0101 | Storefront SPA | presentation | React storefront: catalog, cart, checkout, account. | `approved` |
| CMP-0102 | Commerce API | application | ASP.NET Core REST API with EF Core and Serilog. | `approved` |
| CMP-0103 | Admin console | presentation | React admin UI for catalog, inventory, and analytics. | `approved` |
| CMP-0104 | Commerce database | infrastructure | Relational store for customers, orders, and inventory. | `approved` |
| CMP-0105 | Payment gateway | integration | Tokenized card processing and refunds. | `approved` |
| CMP-0106 | Email service | integration | Order confirmation and restock notifications. | `approved` |
| CMP-0107 | Cache | infrastructure | Read-path caching for catalog and product detail. | `approved` |
## Design Principles

- Database is the source of truth.
- Generated output is always English Markdown.
- Traceability and stable IDs everywhere.
