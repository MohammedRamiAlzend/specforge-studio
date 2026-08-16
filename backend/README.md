# SpecForge Studio — Backend

Node.js + TypeScript + Fastify + SQLite backend for SpecForge Studio. The database is the source of truth; the Markdown workspace is generated output.

## Stack

- **Runtime**: Bun (Node.js-compatible) — scripts use `bun`.
- **Framework**: Fastify 5
- **Validation**: Zod 3
- **Database**: SQLite via `bun:sqlite` (equivalent driver; see DEC-006 — `better-sqlite3`'s native binary does not load under the Bun runtime used in this environment)

## Commands

```bash
bun install        # from repo root (workspaces)
bun run dev        # from repo root: starts the API with watch mode (cwd = backend)
bun run smoke      # in backend/: in-process endpoint smoke test (Fastify inject)
bun run typecheck  # in backend/: tsc --noEmit
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | HTTP listen port (Freebuff injects its own PORT in preview) |
| `HOST` | `0.0.0.0` | Bind host (0.0.0.0 required for Freebuff preview) |
| `DATABASE_PATH` | `data/specforge.db` | SQLite file path (relative to cwd; `:memory:` supported) |
| `LOG_LEVEL` | `info` | Pino log level |
| `NODE_ENV` | `development` | Environment name |

No secrets are required. SQLite is a local file — no external database.

## Structure

```
backend/
├── db/
│   ├── schema.sql          # Canonical schema (source of truth for layout)
│   └── migrations/         # Additive migrations (see migrations/README.md)
├── scripts/smoke.ts        # In-process endpoint smoke test
└── src/
    ├── server.ts           # Entrypoint (listen + graceful shutdown)
    ├── app.ts              # App assembly (plugins + routes)
    ├── config/             # Env config (Zod)
    ├── db/                 # SQLite connection + schema init
    ├── plugins/            # Fastify plugins (error handler)
    ├── modules/            # One module per domain (projects, requirements, ...)
    │                       #   routes = HTTP, service = domain, repository = SQL
    └── utils/              # IDs, errors, events, existence checks
```

## API

All responses use the envelope `{ "data": ... }`; errors use `{ "error": { "code", "message", "details" } }`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/healthz` | Health check |
| GET | `/projects` | List projects |
| POST | `/projects` | Create project |
| GET | `/projects/:id` | Get project |
| PATCH | `/projects/:id` | Update project |
| GET | `/artifacts?project=PRJ-xxxx` | Artifact index across model tables |
| POST | `/requirements` | Create requirement |
| POST | `/use-cases` | Create use case |
| POST | `/workflows` | Create workflow |
| POST | `/entities` | Create data entity |
| POST | `/api-endpoints` | Create API endpoint |
| POST | `/tasks` | Create task (+ checklist items) |

Stable error codes: `VALIDATION_ERROR` (400), `BAD_REQUEST` (400), `NOT_FOUND` (404), `CONFLICT` (409), `INTERNAL_ERROR` (500).

## Conventions

- IDs are allocated from the `id_sequences` registry (DEC-002/DEC-005).
- Every create writes an audit record to `event_log`.
- Status transitions follow `docs/ontology/status-lifecycle.md` (enforced incrementally).
- Traceability links use the `artifact_links` table (added when the traceability endpoints land in later phases).
