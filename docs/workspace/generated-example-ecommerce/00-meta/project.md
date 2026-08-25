---
id: ART-0003
title: Project Profile
type: project
status: generated
project: PRJ-0004
updated: "2026-08-25"
---

# Project Profile

## Identity

| Field | Value |
| --- | --- |
| ID | PRJ-0004 |
| Name | StoreSphere E-Commerce Platform |
| Type | api |
| Status | active |
| Repository | https://github.com/storesphere/commerce-platform |
| Created by | platform@storesphere.internal |
| Created | 2026-08-25 |
| Updated | 2026-08-25 |


## Description

A full-detail e-commerce storefront: product catalog, shopping cart, checkout with payments, order management, inventory tracking, customer accounts, and admin analytics. Backend is an ASP.NET Core (.NET) REST API with EF Core; frontend is a React (TypeScript) single-page application.

## Platform Configuration

| Type ID | Type | Key | Stack | Libraries |
| --- | --- | --- | --- | --- |
| PTYPE-0001 | Web | `web` | React | React Router, Tailwind CSS, Zustand |
| PTYPE-0003 | API | `api` | .NET | EF Core, MailKit, Scalar, Serilog |
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
