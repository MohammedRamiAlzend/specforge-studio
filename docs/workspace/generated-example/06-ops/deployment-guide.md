---
id: ART-0024
title: Deployment Guide
type: guide
status: generated
project: PRJ-0001
updated: "2026-08-25"
---

# Deployment Guide

## Prerequisites

- Bun runtime (v1.x) for local runs; Freebuff hosting for production.
- Environment: PORT, HOST, DATABASE_PATH, EXPORT_DIR, LOG_LEVEL.
## Build

```bash
bun install
bun run build   # frontend static output in frontend/dist
```

## Run

```bash
bun run dev     # local dev (backend :3000 + frontend :5173)
bun run --cwd backend start
```

## Database

- Database file: `DATABASE_PATH` (default data/specforge.db).
- Schema is applied idempotently at startup; migrations are additive.
- Back up the SQLite file before destructive operations.
## Export Output

Generated workspaces are written under `EXPORT_DIR` (default data/exports) as folder output.

## Post-Deploy Checks

- GET /healthz returns ok.
- Smoke tests pass against the deployed API.
- Project: PRJ-0001 · Acme Commerce Platform
