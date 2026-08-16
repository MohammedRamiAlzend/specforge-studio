---
id: ART-0017
title: Entity-Relationship Model
type: index
status: generated
project: PRJ-0004
updated: "2026-08-16"
---

# Entity-Relationship Model (ERD)

## Diagram

```mermaid
erDiagram
  DB_0101 {
    string id PK
    string email UK
    string first_name
    string last_name
    datetime created_at
  }
  DB_0102 {
    string id PK
    string sku UK
    string name
    int price_cents
    string currency
    bool active
  }
  DB_0103 {
    string id PK
    string name UK
    string slug UK
  }
  DB_0104 {
    string id PK
    string product_id
    string category_id
  }
  DB_0105 {
    string id PK
    string customer_id
    string status
    datetime created_at
  }
  DB_0106 {
    string id PK
    string cart_id
    string product_id
    int quantity
    int unit_price_cents
  }
  DB_0107 {
    string id PK
    string customer_id
    string status
    int total_cents
    string currency
    datetime placed_at
  }
  DB_0108 {
    string id PK
    string order_id
    string product_id
    int quantity
    int unit_price_cents
  }
  DB_0109 {
    string id PK
    string order_id
    string provider
    string status
    int amount_cents
  }
  DB_0110 {
    string id PK
    string order_id
    string carrier
    string tracking_number
    string status
  }
  DB_0111 {
    string id PK
    string product_id UK
    int quantity
    int low_stock_threshold
  }
  DB_0101 ||--o{ DB_0105 : A customer owns many carts.
  DB_0101 ||--o{ DB_0107 : A customer places many orders.
  DB_0102 }o--o{ DB_0103 : Products belong to many categories (via product_category).
  DB_0105 ||--o{ DB_0106 : A cart has many line items.
  DB_0102 ||--o{ DB_0106 : A product appears in many cart items.
  DB_0107 ||--o{ DB_0108 : An order has many line items.
  DB_0102 ||--o{ DB_0108 : A product appears in many order items.
  DB_0107 ||--|| DB_0109 : An order has one payment.
  DB_0107 ||--o{ DB_0110 : An order can have several shipments.
  DB_0102 ||--|| DB_0111 : A product has one inventory record.
```

## Warnings

No warnings.

## Entities

| ID | Entity | Fields |
| --- | --- | --- |
| DB-0101 | customer | 5 |
| DB-0102 | product | 6 |
| DB-0103 | category | 3 |
| DB-0104 | product_category | 3 |
| DB-0105 | cart | 4 |
| DB-0106 | cart_item | 5 |
| DB-0107 | order | 6 |
| DB-0108 | order_item | 5 |
| DB-0109 | payment | 5 |
| DB-0110 | shipment | 5 |
| DB-0111 | inventory | 4 |
## Relations

| ID | From | To | Cardinality | Description |
| --- | --- | --- | --- | --- |
| REL-0101 | DB-0101 | DB-0105 | 1:N | A customer owns many carts. |
| REL-0102 | DB-0101 | DB-0107 | 1:N | A customer places many orders. |
| REL-0103 | DB-0102 | DB-0103 | N:M | Products belong to many categories (via product_category). |
| REL-0104 | DB-0105 | DB-0106 | 1:N | A cart has many line items. |
| REL-0105 | DB-0102 | DB-0106 | 1:N | A product appears in many cart items. |
| REL-0106 | DB-0107 | DB-0108 | 1:N | An order has many line items. |
| REL-0107 | DB-0102 | DB-0108 | 1:N | A product appears in many order items. |
| REL-0108 | DB-0107 | DB-0109 | 1:1 | An order has one payment. |
| REL-0109 | DB-0107 | DB-0110 | 1:N | An order can have several shipments. |
| REL-0110 | DB-0102 | DB-0111 | 1:1 | A product has one inventory record. |
