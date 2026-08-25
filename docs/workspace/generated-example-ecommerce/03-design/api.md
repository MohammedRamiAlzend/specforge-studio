---
id: ART-0018
title: API Documentation
type: index
status: generated
project: PRJ-0004
updated: "2026-08-25"
---

# API Documentation

## Endpoints

### GET /api/v1/products

- ID: `API-0101` · Status: `approved`

Purpose: List products with pagination, search, and category filters.

Auth: Public

Request:

```json
{}
```

Response:

```json
{
  "items": [
    {
      "id": "string",
      "sku": "string",
      "name": "string",
      "price_cents": "number"
    }
  ],
  "page": "number",
  "total": "number"
}
```

Errors:

- 400 — Invalid filter

### GET /api/v1/products/{id}

- ID: `API-0102` · Status: `approved`

Purpose: Get a single product by id.

Auth: Public

Request:

```json
{}
```

Response:

```json
{
  "id": "string",
  "sku": "string",
  "name": "string",
  "price_cents": "number",
  "category_ids": [
    "string"
  ]
}
```

Errors:

- 404 — Product not found

### GET /api/v1/categories

- ID: `API-0103` · Status: `approved`

Purpose: List product categories.

Auth: Public

Request:

```json
{}
```

Response:

```json
{
  "items": [
    {
      "id": "string",
      "name": "string",
      "slug": "string"
    }
  ]
}
```

Errors:

- 400 — Invalid query

### POST /api/v1/cart/items

- ID: `API-0104` · Status: `approved`

Purpose: Add a line item to the cart.

Auth: Bearer token

Request:

```json
{
  "product_id": "string",
  "quantity": "number"
}
```

Response:

```json
{
  "cart_id": "string",
  "item_id": "string",
  "total_cents": "number"
}
```

Errors:

- 400 — Quantity invalid
- 401 — Unauthenticated

### PUT /api/v1/cart/items/{id}

- ID: `API-0105` · Status: `approved`

Purpose: Update a cart line quantity.

Auth: Bearer token

Request:

```json
{
  "quantity": "number"
}
```

Response:

```json
{
  "item_id": "string",
  "total_cents": "number"
}
```

Errors:

- 400 — Quantity invalid

### POST /api/v1/orders

- ID: `API-0106` · Status: `approved`

Purpose: Place an order (checkout) with server-side totals.

Auth: Bearer token

Request:

```json
{
  "shipping_address": {
    "line1": "string",
    "zip": "string"
  },
  "payment_token": "string"
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

- 400 — Cart empty or stock shortfall
- 401 — Unauthenticated

### GET /api/v1/orders

- ID: `API-0107` · Status: `approved`

Purpose: List the signed-in customer's orders.

Auth: Bearer token

Request:

```json
{}
```

Response:

```json
{
  "items": [
    {
      "order_id": "string",
      "status": "string",
      "total_cents": "number",
      "placed_at": "string"
    }
  ]
}
```

Errors:

- 401 — Unauthenticated

### GET /api/v1/orders/{id}

- ID: `API-0108` · Status: `approved`

Purpose: Get an order detail with line items.

Auth: Bearer token

Request:

```json
{}
```

Response:

```json
{
  "order_id": "string",
  "status": "string",
  "items": [
    {
      "product_id": "string",
      "quantity": "number"
    }
  ],
  "total_cents": "number"
}
```

Errors:

- 404 — Order not found

### POST /api/v1/payments/capture

- ID: `API-0109` · Status: `approved`

Purpose: Capture a payment via the gateway (tokenized).

Auth: Bearer token

Request:

```json
{
  "payment_token": "string",
  "amount_cents": "number",
  "currency": "string"
}
```

Response:

```json
{
  "payment_id": "string",
  "status": "string"
}
```

Errors:

- 402 — Payment declined

### POST /api/v1/refunds

- ID: `API-0110` · Status: `approved`

Purpose: Issue a refund against a captured payment.

Auth: Bearer token

Request:

```json
{
  "payment_id": "string",
  "amount_cents": "number"
}
```

Response:

```json
{
  "refund_id": "string",
  "status": "string"
}
```

Errors:

- 400 — Refund exceeds capture
- 409 — Return window closed

### GET /api/v1/inventory

- ID: `API-0111` · Status: `approved`

Purpose: List inventory levels and low-stock alerts.

Auth: Bearer token

Request:

```json
{}
```

Response:

```json
{
  "items": [
    {
      "product_id": "string",
      "quantity": "number",
      "low": "boolean"
    }
  ]
}
```

Errors:

- 401 — Unauthenticated

### GET /api/v1/admin/analytics

- ID: `API-0112` · Status: `approved`

Purpose: Sales and stock analytics for admins.

Auth: Admin token

Request:

```json
{
  "period": "string"
}
```

Response:

```json
{
  "revenue_cents": "number",
  "order_count": "number",
  "low_stock": [
    {
      "product_id": "string",
      "quantity": "number"
    }
  ]
}
```

Errors:

- 403 — Forbidden

### POST /api/v1/shipments

- ID: `API-0113` · Status: `approved`

Purpose: Create a shipment for a fulfilled order.

Auth: Bearer token

Request:

```json
{
  "order_id": "string",
  "carrier": "string"
}
```

Response:

```json
{
  "shipment_id": "string",
  "tracking_number": "string"
}
```

Errors:

- 400 — Order not shippable
