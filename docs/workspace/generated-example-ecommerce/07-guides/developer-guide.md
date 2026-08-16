---
id: ART-0025
title: Developer Guide
type: guide
status: generated
project: PRJ-0004
updated: "2026-08-16"
---

# Developer Guide

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS · Feature-Sliced Design |
| Backend | Node.js · TypeScript · Fastify · Zod |
| Database | SQLite (bun:sqlite) |
| Diagrams | Mermaid (generated) |
## Repository Layout

```text
backend/          Fastify API, SQLite, smoke tests
  src/modules/    feature modules (routes/service/repository)
  db/             schema.sql + additive migrations
frontend/         React FSD app
  src/app         providers, router, global styles
  src/pages       route pages
  src/features    interactive features (visual modeler, diagrams)
  src/entities    domain models + query hooks
  src/shared      ui primitives, api client, config
```

## Commands

```bash
bun install                # install workspaces
bun run dev                # backend + frontend concurrently
bun run --cwd backend smoke  # API smoke tests
bun tsc -b --noEmit        # full typecheck
```

## Conventions

- Stable public IDs everywhere (docs/ontology/id-convention.md).
- Additive-only database migrations; destructive changes need approval.
- The database is the source of truth; Markdown is generated output.
- Generated docs are English-only with YAML frontmatter.
