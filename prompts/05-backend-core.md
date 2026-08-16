# Prompt 05 — Backend Core

Read all memory files before doing anything.

This is Prompt 05: Backend Core.

## Objective

Implement the backend foundation using Node.js, TypeScript, Fastify, SQLite, and Zod.

## Technology Constraints

- Node.js
- TypeScript strict mode
- Fastify
- better-sqlite3
- Zod validation
- SQLite only

## Deliverables

Create or update:

- backend/package.json
- backend/tsconfig.json
- backend/src/server.ts
- backend/src/app.ts
- backend/src/config/
- backend/src/db/
- backend/src/modules/
- backend/src/plugins/
- backend/src/utils/
- backend/README.md

## Required Backend Capabilities

Implement core infrastructure for:

1. configuration loading
2. SQLite connection
3. schema initialization
4. request validation
5. structured error handling
6. logging
7. health endpoint
8. CRUD foundation for core entities

## Initial API Endpoints

Create endpoints for at least:

- GET /healthz
- GET /projects
- POST /projects
- GET /projects/:id
- PATCH /projects/:id
- GET /artifacts
- POST /requirements
- POST /use-cases
- POST /workflows
- POST /entities
- POST /api-endpoints
- POST /tasks

## Architecture Rules

- use modular backend structure
- separate domain logic from HTTP layer
- use repository pattern for SQLite access
- validate all input with Zod
- return stable error codes
- do not put business logic in route handlers directly

## Memory Update

After finishing:
- update memory files
- record implementation decisions
- set next prompt to Prompt 06

## Definition of Done

Prompt 05 is complete only when:
- backend starts successfully
- SQLite connection works
- core endpoints exist
- validation and error handling are implemented
- memory is updated
- next action points to Prompt 06