---
id: ART-0018
title: API Documentation
type: index
status: generated
project: PRJ-0001
updated: "2026-08-18"
---

# API Documentation

## Endpoints

### POST /api/orders

- ID: `API-0001` · Status: `approved`

Purpose: Create an order from the current cart.

Auth: Bearer token

Request:

```json
{
  "items": [
    {
      "product_id": "string",
      "quantity": "number"
    }
  ],
  "shipping_address": {
    "line1": "string",
    "zip": "string"
  }
}
```

Response:

```json
{
  "order_id": "string",
  "status": "string",
  "total_cents": "number"
}
```

Errors:

- 400 — Cart is empty
- 401 — Unauthenticated
