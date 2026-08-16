# Prompt 18 — Full-Detail E-Commerce Seeder (.NET + React)

Read all memory files before doing anything.

This is Prompt 18: Full-Detail E-Commerce Seeder.

## Objective

Add a second, richer demo seeder — the canonical "most common e-commerce
project" — so the preview shows a complete end-to-end e-commerce store with a
**.NET (ASP.NET Core) backend and a React (TypeScript) frontend**. The seeder
must populate every surface: workflows, data model (ERD), architecture, API
contract, screens, skills, roadmap, task packs, governance, diagrams, and the
generated Markdown workspace. It is a demo example, seeded into the live
database alongside the existing Acme example (which stays untouched).

## Context

- The existing demo seeder (`backend/scripts/seed-data.ts`) seeds **Acme
  Commerce Platform** as PRJ-0002 (live) / PRJ-0001 (committed example) with a
  React-only stack and a small artifact set.
- Prompt 18 adds a **second, full-detail e-commerce project** seeded as
  PRJ-0003 (live) / PRJ-0004 (committed example) so the two demos never
  collide with each other or with user projects.
- Platform configuration (Prompt 13) already ships a `.NET` stack
  (`STK-0001`, type `api`, libraries MailKit/Scalar/EF Core/Serilog) and a
  `React` stack (`STK-0004`, type `web`, libraries React Router/Zustand/Tailwind
  CSS). The new project is a **multi-type project**: `api` (.NET) + `web`
  (React).
- Skills (Prompt 16) must be seeded for the new project too (capability + tech
  skills specific to .NET/React/e-commerce).
- Diagrams are always generated from structured data via the real
  `/diagrams/generate` route; docs via the real `/docs/generate` route.

## Constraints (must hold)

- Backend stays Node.js with SQLite; .NET is the *seeded demo project's* stack,
  not a runtime change.
- No external SaaS integrations; the payment provider is modeled as an external
  system component, not integrated.
- English-only output; database is the source of truth; Markdown is generated.
- Additive only: new seeder files + new scripts + tests. No destructive changes
  to existing modules or the Acme seed.
- Keep the Acme example intact (PRJ-0002 / generated-example untouched).
- The roadmap engine derives task packs deterministically; do not hand-author
  tasks that the engine already produces — seed artifacts, then call
  `storeRoadmap` + `materializeTaskPack` exactly like `seed-data.ts`.

## Deliverables

Create or update:

- prompts/18-ecommerce-full-seeder.md (this file)
- prompts/README.md (prompt sequence 18 + note)
- backend/scripts/seed-ecommerce.ts — the shared full-detail seeder:
  `seedEcommerceProject(db, opts)` (defaults PRJ-0003 / GRPH-0003), exporting
  `isEcommerceSeeded`, `SeedOptions`, `SeedResult`; calls
  `seedPlatformConfiguration` + `seedNodePalette`; returns
  `{ projectId, roadmapId, taskCount }`.
- backend/scripts/generate-ecommerce-example.ts — in-memory seed → committed
  workspace `docs/workspace/generated-example-ecommerce/` (like
  `generate-example.ts`, using PRJ-0004 / GRPH-0004).
- backend/scripts/seed-ecommerce-live.ts — live DB seed as PRJ-0003/GRPH-0003,
  then stores diagrams through the real routes and triggers a docs export.
- backend/package.json — scripts `seed-ecommerce-example`, `seed-ecommerce-live`.
- backend/tests/seed-ecommerce.test.ts — verifies the seeder output (project
  type assignments, workflows, entities, api endpoints, screens, skills, docs,
  diagrams, roadmap, tasks).
- memory files (STATE, PROJECT_MEMORY, NEXT_ACTION, SESSION_LOG, DECISIONS,
  USER_REQUESTS).

## Requirements (seed content — full detail)

1. **Project**: name e.g. "StoreSphere E-Commerce Platform" (most common
   e-commerce project shape), description, repository URL, status `active`.
   Multi-type: `api` (.NET, STK-0001) + `web` (React, STK-0004) with the seeded
   libraries for both stacks.
2. **Modules** (>=6, spread across the store): Catalog, Cart, Checkout, Orders,
   Payments, Inventory, Customer Accounts, Admin & Analytics.
3. **Requirements** (>=12, mixed types/priorities/criticality, several
   `critical`), each linked to a module and with acceptance criteria.
4. **Use cases** (>=4) with main flow, alternate flows, pre/postconditions.
5. **Workflows** (>=3) as `workflows` rows AND matching `model_graphs`
   (kind `workflow`) with nodes/edges — e.g. Checkout, Order Fulfillment,
   Refund & Returns, Inventory Restock. Edges carry labels/conditions;
   decision nodes have conditioned outgoing edges (TR-04).
6. **Data model**: >=8 entities (customers, products, categories, carts,
   cart_items, orders, order_items, payments, shipments, ...) with fields
   (PK/UK/nullable) and relations (1:1 / 1:N / N:M) so the ERD is rich.
7. **API endpoints** (>=8, .NET-style paths like `GET /api/v1/products`,
   `POST /api/v1/orders`, ...) with request/response schemas and error codes.
8. **Screens** (>=6, React routes) covering storefront + admin.
9. **Components** (>=6) across layers for the HLD/architecture diagram
   (.NET API, React SPA, SQL database, payment gateway, email service, admin).
10. **Skills** (>=6): capability (e.g. Payments engineering, E-commerce
    domain, .NET backend) + tech (e.g. ASP.NET Core, EF Core, React,
    TypeScript, SQL Server, Stripe-like gateway) with level/tag per kind rules.
11. **Risks** (>=3), **decisions/ADRs** (>=2), **milestones** (>=2),
    **test cases** (>=4), **approvals** (>=1 pending and/or approved).
12. **Traceability**: artifact_links between requirements, use cases, api
    endpoints, screens, tasks, workflows (link_type satisfies/realizes/traces/
    verifies).
13. **Roadmap + tasks**: `storeRoadmap` then `materializeTaskPack`; report
    taskCount. Seed governance state (roadmap needs_review, at least one task
    in_progress) like the Acme seed.
14. **Live script** stores >=3 diagrams via the real routes (workflow from a
    graph, ERD from entities, architecture from components) and triggers one
    docs export via `/docs/generate`.
15. **Committed example** regenerates `docs/workspace/generated-example-ecommerce/`
    (34 files) deterministically with PRJ-0004 / GRPH-0004 and the same fixed
    child IDs (MOD-0100+, REQ-0100+, DB-0100+, ...) so it never collides with
    the Acme example's IDs (MOD-0001+).
16. **Tests**: seed-ecommerce.test.ts asserts counts, type assignments, skills
    validation, workflow/ERD/architecture diagram generation, docs export
    file_count, roadmap + packaged tasks >0, and that Acme seed + e-commerce
    seed coexist in one DB.

## ID strategy (non-colliding)

- Live: PRJ-0003, GRPH-0003 (first graph), child IDs from the **0100+** ranges:
  MOD-0101.., REQ-0101.., UC-0101.., WF-0101.., DB-0101.., API-0101..,
  SCR-0101.., CMP-0101.., SKL-0101.., RISK-0101.., ADR-0101.., MS-0101..,
  TC-0101.., APR-0101.., TASK via roadmap packager (auto-allocated).
- Committed example: PRJ-0004, GRPH-0004, same child ID ranges (0100+).
- `isEcommerceSeeded(db, projectId = "PRJ-0003")` checks the project row.

## Definition of Done

Prompt 18 is complete only when:

- seed-ecommerce.ts seeds the full-detail e-commerce project (multi-type
  .NET + React, >=6 modules, >=12 requirements, >=4 use cases, >=3 workflows
  with graphs, >=8 entities + relations, >=8 api endpoints, >=6 screens,
  >=6 components, >=6 skills, risks/ADRs/milestones/test cases/approvals,
  artifact_links, roadmap + task pack)
- the live script stores diagrams + docs export through real routes
- the committed example regenerates docs/workspace/generated-example-ecommerce/
- Acme seed still works and both demos coexist
- backend tests + typecheck + build + smoke pass
- memory updated; completion reported per AGENTS.md