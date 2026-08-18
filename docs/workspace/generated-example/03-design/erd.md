---
id: ART-0017
title: Entity-Relationship Model
type: index
status: generated
project: PRJ-0001
updated: "2026-08-18"
---

# Entity-Relationship Model (ERD)

## Diagram

```mermaid
erDiagram
  DB_0001 {
    string id PK
    string email UK
    datetime created_at
  }
  DB_0002 {
    string id PK
    string user_account_id
    int total_cents
  }
  DB_0001 ||--o{ DB_0002 : A customer places many orders.
```

## Warnings

No warnings.

## Entities

| ID | Entity | Fields |
| --- | --- | --- |
| DB-0001 | user_account | 3 |
| DB-0002 | order | 3 |
## Relations

| ID | From | To | Cardinality | Description |
| --- | --- | --- | --- | --- |
| REL-0001 | DB-0001 | DB-0002 | 1:N | A customer places many orders. |
