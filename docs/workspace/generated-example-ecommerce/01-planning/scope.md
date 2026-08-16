---
id: ART-0008
title: Scope
type: plan
status: generated
project: PRJ-0004
updated: "2026-08-16"
---

# Scope

## In Scope

- REQ-0101 — Customers can browse, search, and filter the product catalog (`must`)
- REQ-0102 — Customers can manage their shopping cart (`must`)
- REQ-0103 — Customers can complete checkout with card payment (`must`)
- REQ-0104 — Customers can view order history and status (`must`)
- REQ-0105 — Payments can be refunded for cancelled orders (`should`)
- REQ-0106 — Stock levels are tracked and restocked (`must`)
- REQ-0107 — Customers can register and manage an account (`should`)
- REQ-0108 — Admins can view sales and stock analytics (`should`)
- REQ-0109 — Order totals are computed server-side only (`must`)
- REQ-0110 — Card data never touches the application database (`must`)
- REQ-0111 — Product records carry price, stock, category, and SKU (`must`)
- REQ-0112 — Order API responds within 300ms p95 (`should`)
- REQ-0113 — Stock is reserved at checkout to prevent oversell (`must`)
- REQ-0114 — Purchased products can be reviewed by customers (`should`)
## Out of Scope

- External SaaS integrations unless explicitly approved.
- Manual Mermaid authoring by end users.
- Non-English generated documentation.
## Non-Functional Constraints

- Frontend: React with Feature-Sliced Design.
- Backend: Node.js with SQLite.
- Output: English Markdown with stable IDs and YAML frontmatter.
