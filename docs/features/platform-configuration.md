---
id: FEAT-008
title: Dynamic Platform Configuration
type: guide
phase: 13-platform-configuration
status: implemented
owner: engineering
related:
  - FEAT-001
  - ONT-003
  - DB-DES-006
  - PTYPE-0001
updated: 2026-08-16
---

# Dynamic Platform Configuration — SpecForge Studio

## 1. Goal

Project types, technology stacks, and libraries are no longer hard-coded in
the frontend. They are **database-backed, workspace-global configuration**
managed from a dedicated **Settings → Platform configuration** tab, and
consumed by the project creation form and the docs generator. Every project
can select **multiple platform types**, each with its own stack and set of
libraries.

Users never edit source files to add a framework or library: they do it in the
UI, the change persists in the database, and every generated document and
project reflects it immediately.

## 2. Domain Model

```
project_types
  ├── stacks
  │     └── libraries
  └── project_type_assignments        (project ↔ type)
project_type_config                   (project ↔ type ↔ chosen stack)
project_libraries                     (project ↔ type ↔ chosen library)
```

- **`project_types`** — a platform dimension (Web, Mobile, API, AI, …).
  Carries `key`, `label`, `description`, `color`, `icon`, `sort_order`,
  `enabled`, `built_in`.
- **`stacks`** — a concrete technology for a type (React, Next.js, Flutter, …).
  Belongs to exactly one type.
- **`libraries`** — a package for a stack (React Router, Zustand, …).
  Belongs to exactly one stack.
- **`project_type_assignments`** — which types a project uses (many-to-many).
- **`project_type_config`** — the stack chosen for a project/type pair.
- **`project_libraries`** — the libraries chosen for a project/type pair.

The legacy `projects.type` column is **deprecated** but kept for
back-compatibility: it is derived from the first assignment and used for the
legacy badge. The assignment/config/library tables are the source of truth.

## 3. Built-in Seeds

Four types, twelve stacks, and thirty-two libraries are seeded on first boot
(`backend/src/modules/platform-config/seed.ts`) with stable fixed IDs:

| Prefix | Count | Rows |
|--------|-------|------|
| `PTYPE` | 4 | web, mobile, api, ai |
| `STK`   | 12 | .NET, Laravel, Node / Express, React, Next.js, Vue, Flutter, React Native, Swift, Kotlin, Python / FastAPI, Node / TypeScript |
| `LIB`   | 32 | MailKit, Scalar, EF Core, Serilog, React Router, Zustand, Tailwind CSS, … |

Built-in rows may be **edited or disabled but never hard-deleted**; any row
(including custom ones) that is **referenced by a project cannot be deleted**
(backend rejects with `409 CONFLICT`).

## 4. Backend APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/platform-config` | Full tree: all types with nested stacks + libraries |
| POST | `/api/platform-config/types` | Create a project type |
| PATCH | `/api/platform-config/types/:id` | Edit/disable a project type |
| DELETE | `/api/platform-config/types/:id` | Delete an unused, non-built-in type |
| POST | `/api/platform-config/stacks` | Create a stack under a type |
| PATCH | `/api/platform-config/stacks/:id` | Edit/disable a stack |
| DELETE | `/api/platform-config/stacks/:id` | Delete an unused, non-built-in stack |
| POST | `/api/platform-config/libraries` | Create a library under a stack |
| PATCH | `/api/platform-config/libraries/:id` | Edit/disable a library |
| DELETE | `/api/platform-config/libraries/:id` | Delete an unused, non-built-in library |

Project APIs now accept an optional `types` array on create and patch:

```json
{
  "name": "Atlas ordering platform",
  "type": "web",
  "types": [
    { "type_id": "PTYPE-0001", "stack_id": "STK-0004", "library_ids": ["LIB-0011", "LIB-0012"] },
    { "type_id": "PTYPE-0003", "stack_id": "STK-0003", "library_ids": ["LIB-0008"] }
  ]
}
```

Validation (all `400 VALIDATION_ERROR` or `BAD_REQUEST`):
- unknown `type_id` / `stack_id` / `library_id`;
- a **disabled** type cannot be selected;
- a stack that does not **belong** to the type;
- a library that does not belong to the chosen stack;
- libraries without a chosen stack.

When `types` is omitted, the legacy `type` key is mapped to the matching
seeded type so existing single-type callers keep working unchanged. Project
GET/list responses include the enriched `types[]` payload (key, label, color,
stack id/name/language, and libraries) via `loadProjectTypes`.

Audit events are written for every settings change
(`project_type`/`stack`/`library` → `created`/`updated`).

## 5. Frontend (FSD)

- `entities/platform-config/` — types + TanStack Query hooks
  (`usePlatformConfig`, `useCreate/Update/DeleteProjectType`,
  `useCreate/Update/DeleteStack`, `useCreate/Update/DeleteLibrary`).
- `features/platform-settings/` — `PlatformSettingsPanel`: type cards with
  per-type stack blocks and library lists; inline add/edit/disable/delete;
  built-in and in-use rows show a clear lock (`slate`/`amber`/`emerald` pills).
- `features/create-project/CreateProjectForm` — multi-type toggle grid, a
  stack select + library checkboxes per selected type, and a legacy primary
  badge select. Requires at least one selected type.
- `widgets/platform-badges/` — `PlatformBadges` renders the project's types
  with their chosen stack names on the dashboard and project details page.
- `pages/SettingsPage` — now tabbed: **Platform configuration** /
  Environment / Reference. Route `/settings`.

## 6. Docs Generator

`genProjectMeta` (docs generator) includes a **Platform Configuration**
section in project metadata listing each type, its stack, and its libraries —
derived from the structured tables (`projectTypeSelection` helper), never
hand-written.

## 7. Definition of Done

- Types/stacks/libraries are DB-backed and seeded automatically. ✔
- Settings page edits them; project creation consumes them. ✔
- Projects support multiple types with per-type stack + library selection. ✔
- Back-compat: legacy single-type creation still works and maps to a type. ✔
- In-use and built-in rows are protected from deletion. ✔
- Docs metadata reflects the chosen platform configuration. ✔
- Backend + frontend typechecks and tests pass; smoke covers the new APIs. ✔
