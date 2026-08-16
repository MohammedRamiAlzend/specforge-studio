---
id: ART-0015
title: Low-Level Design
type: plan
status: generated
project: PRJ-0001
updated: "2026-08-16"
---

# Low-Level Design (LLD)

## Modules

| ID | Module | Owner | Status |
| --- | --- | --- | --- |
| MOD-0001 | Catalog | product | `active` |
| MOD-0002 | Checkout | backend | `active` |
## Data Model

### DB-0001 — user_account

Table: `user_accounts` · Status: `approved`

Registered customer accounts.

## Fields

| Name | Type | PK | UK | Nullable |
| --- | --- | --- | --- | --- |
| id | uuid | ✓ |  | no |
| email | string |  | ✓ | no |
| created_at | datetime |  |  | no |

### DB-0002 — order

Table: `orders` · Status: `approved`

Customer orders.

## Fields

| Name | Type | PK | UK | Nullable |
| --- | --- | --- | --- | --- |
| id | uuid | ✓ |  | no |
| user_account_id | reference |  |  | no |
| total_cents | number |  |  | no |
## Relations

| ID | From | To | Type | Description |
| --- | --- | --- | --- | --- |
| REL-0001 | DB-0001 | DB-0002 | 1:N | A customer places many orders. |
