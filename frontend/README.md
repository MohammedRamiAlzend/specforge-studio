# SpecForge Studio — Frontend

React + TypeScript + Vite + Feature-Sliced Design frontend for SpecForge Studio.

## Stack

- React 18, TypeScript (strict), Vite 6
- Feature-Sliced Design (`app`, `pages`, `widgets`, `features`, `entities`, `shared`)
- TanStack Query for server state · Zustand for local UI state
- Tailwind CSS (decision DEC-008; "forge" accent palette)
- react-router-dom v6

## Commands

```bash
bun install                  # from repo root (workspaces)
bun run dev                  # from repo root: runs backend + frontend (concurrently)
bun run --cwd frontend typecheck
bun run --cwd frontend build # vite build -> dist/
```

## Structure (FSD)

```
frontend/src/
├── app/        # bootstrap, providers, router, global styles, UI store
├── pages/      # Dashboard, Project Details, Workflows, Data Model, Architecture, Docs Export, Tasks, Settings
├── widgets/    # AppShell (layout), DataTable, ProjectSummaryCard
├── features/   # create-project, project-status
├── entities/   # project, task, requirement, workflow, data-entity, api-endpoint (types + query hooks)
└── shared/     # api client, config, lib (format/status), ui primitives
```

Import rules: `shared` ← everything; `entities` ← features/widgets/pages; `features` ← widgets/pages; `widgets` ← pages; `app` composes all. No business logic in `shared`.

## API

The `shared/api/client.ts` wrapper calls the backend (`/api` proxied to the backend workspace in dev, or `VITE_API_BASE_URL`), unwraps the `{ data }` / `{ error }` envelope, and throws `ApiError` with stable codes.
