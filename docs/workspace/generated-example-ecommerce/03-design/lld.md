---
id: ART-0015
title: Low-Level Design
type: plan
status: generated
project: PRJ-0004
updated: "2026-08-25"
---

# Low-Level Design (LLD)

## Modules

| ID | Module | Owner | Status |
| --- | --- | --- | --- |
| MOD-0101 | Catalog | product | `active` |
| MOD-0102 | Cart | frontend | `active` |
| MOD-0103 | Checkout | backend | `active` |
| MOD-0104 | Orders | backend | `active` |
| MOD-0105 | Payments | backend | `active` |
| MOD-0106 | Inventory | backend | `active` |
| MOD-0107 | Customer Accounts | frontend | `active` |
| MOD-0108 | Admin & Analytics | product | `active` |
## Data Model

### DB-0101 — customer

Table: `customers` · Status: `approved`

Registered customer accounts.

## Fields

| Name | Type | PK | UK | Nullable |
| --- | --- | --- | --- | --- |
| id | uuid | ✓ |  | no |
| email | string |  | ✓ | no |
| first_name | string |  |  | no |
| last_name | string |  |  | no |
| created_at | datetime |  |  | no |

### DB-0102 — product

Table: `products` · Status: `approved`

Catalog products with price and SKU.

## Fields

| Name | Type | PK | UK | Nullable |
| --- | --- | --- | --- | --- |
| id | uuid | ✓ |  | no |
| sku | string |  | ✓ | no |
| name | string |  |  | no |
| price_cents | number |  |  | no |
| currency | string |  |  | no |
| active | boolean |  |  | no |

### DB-0103 — category

Table: `categories` · Status: `approved`

Product categories.

## Fields

| Name | Type | PK | UK | Nullable |
| --- | --- | --- | --- | --- |
| id | uuid | ✓ |  | no |
| name | string |  | ✓ | no |
| slug | string |  | ✓ | no |

### DB-0104 — product_category

Table: `product_categories` · Status: `approved`

N:M link between products and categories.

## Fields

| Name | Type | PK | UK | Nullable |
| --- | --- | --- | --- | --- |
| id | uuid | ✓ |  | no |
| product_id | reference |  |  | no |
| category_id | reference |  |  | no |

### DB-0105 — cart

Table: `carts` · Status: `approved`

Customer shopping carts.

## Fields

| Name | Type | PK | UK | Nullable |
| --- | --- | --- | --- | --- |
| id | uuid | ✓ |  | no |
| customer_id | reference |  |  | no |
| status | string |  |  | no |
| created_at | datetime |  |  | no |

### DB-0106 — cart_item

Table: `cart_items` · Status: `approved`

Line items in a cart.

## Fields

| Name | Type | PK | UK | Nullable |
| --- | --- | --- | --- | --- |
| id | uuid | ✓ |  | no |
| cart_id | reference |  |  | no |
| product_id | reference |  |  | no |
| quantity | number |  |  | no |
| unit_price_cents | number |  |  | no |

### DB-0107 — order

Table: `orders` · Status: `approved`

Customer orders with server-computed totals.

## Fields

| Name | Type | PK | UK | Nullable |
| --- | --- | --- | --- | --- |
| id | uuid | ✓ |  | no |
| customer_id | reference |  |  | no |
| status | string |  |  | no |
| total_cents | number |  |  | no |
| currency | string |  |  | no |
| placed_at | datetime |  |  | no |

### DB-0108 — order_item

Table: `order_items` · Status: `approved`

Line items in an order.

## Fields

| Name | Type | PK | UK | Nullable |
| --- | --- | --- | --- | --- |
| id | uuid | ✓ |  | no |
| order_id | reference |  |  | no |
| product_id | reference |  |  | no |
| quantity | number |  |  | no |
| unit_price_cents | number |  |  | no |

### DB-0109 — payment

Table: `payments` · Status: `approved`

Payment captures and refunds via the gateway.

## Fields

| Name | Type | PK | UK | Nullable |
| --- | --- | --- | --- | --- |
| id | uuid | ✓ |  | no |
| order_id | reference |  |  | no |
| provider | string |  |  | no |
| status | string |  |  | no |
| amount_cents | number |  |  | no |

### DB-0110 — shipment

Table: `shipments` · Status: `approved`

Order shipments and tracking.

## Fields

| Name | Type | PK | UK | Nullable |
| --- | --- | --- | --- | --- |
| id | uuid | ✓ |  | no |
| order_id | reference |  |  | no |
| carrier | string |  |  | no |
| tracking_number | string |  |  | no |
| status | string |  |  | no |

### DB-0111 — inventory

Table: `inventory` · Status: `approved`

Stock levels with reservation state.

## Fields

| Name | Type | PK | UK | Nullable |
| --- | --- | --- | --- | --- |
| id | uuid | ✓ |  | no |
| product_id | reference |  | ✓ | no |
| quantity | number |  |  | no |
| low_stock_threshold | number |  |  | no |
## Relations

| ID | From | To | Type | Description |
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
