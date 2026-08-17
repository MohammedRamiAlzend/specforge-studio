# Prompt 19 — Download Generated Docs as ZIP

Read all memory files before doing anything.

This is Prompt 19: Download Generated Docs as ZIP.

## Objective

Add a **"Download ZIP"** button to the Docs Export page so a user can download
the generated Markdown workspace for a project as a single `.zip` archive.
The archive must contain every generated file (the exact same `files[].path`
and content that `GET /docs/exports/:id` returns) so the downloaded workspace
matches what the app displays and what lives on the server.

## Context

- Backend serves docs through `backend/src/modules/docs-generator/routes.ts`:
  `GET /docs/exports` (list), `GET /docs/exports/:id` (returns row + full file
  contents), `POST /docs/generate` (regenerates), `DELETE /docs/exports/:id`.
  Exports are written to disk under `EXPORT_DIR/<DOCS-0001>/`; the
  `docs_exports.files` JSON column stores `[{ path, bytes }, ...]`.
- The canonical file set is `WORKSPACE_FILES` in
  `backend/src/modules/docs-generator/workspace.ts` (33 generated files:
  README, AGENTS.md, 00-meta, 01-planning, 02-requirements, 03-design,
  04-ui, 05-testing, 06-ops, 07-guides, 08-governance, 09-agent-plans).
- Frontend renders exports on `frontend/src/pages/DocsExportPage.tsx` using
  hooks from `frontend/src/entities/docs/api.ts` (`useDocsExports`,
  `useDocsExport`, `useGenerateDocs`, `useDeleteDocsExport`) and types from
  `frontend/src/entities/docs/types.ts`.
- Backend deps today are only `fastify` + `zod`. Prefer a **zero-dependency
  ZIP writer** (deterministic, testable) built on `node:zlib`
  (`deflateRawSync`) plus a small table-based CRC-32; if the implementer
  prefers a proven library (`jszip`/`archiver`), that is acceptable as long as
  it is a plain npm dependency — no external SaaS integration.
- The API client (`frontend/src/shared/api/client.ts`) parses JSON; the ZIP
  download must use a raw `fetch` (or `window.open`) that does **not** go
  through the JSON parser.

## Constraints (must hold)

- Backend stays Node.js (Bun runtime) with SQLite; no schema changes needed.
- English-only filenames/content; no external SaaS integrations.
- No destructive changes to the docs-generator module, existing endpoints, or
  frontend pages outside the Docs Export page.
- The ZIP must be generated **on demand** from the files already on disk —
  do not store a zip blob in the database; the database stays the source of
  truth for metadata, and `docs_exports` keeps its current shape.
- Preserve the "download matches displayed content" invariant: the archive
  must use the same file paths and content as `GET /docs/exports/:id`.
- Deterministic archive: entries in the same order as the `files` metadata,
  stable entry names (no absolute paths, no `../`), UTF-8 names.

## Deliverables

Create or update:

- prompts/19-docs-zip-download.md (this file)
- prompts/README.md (prompt sequence 19 + note)
- backend/src/utils/zip.ts — minimal ZIP writer:
  `createZip(files: { path: string; content: string }[]): Buffer` (or
  `Uint8Array`), using deflate (method 8) + CRC-32, with local file headers,
  central directory, and end-of-central-directory record.
- backend/src/modules/docs-generator/routes.ts — add
  `GET /docs/exports/:id/download` returning
  `Content-Type: application/zip`,
  `Content-Disposition: attachment; filename="<workspace>-<DOCS-id>.zip"`,
  body = zip bytes of all stored files (read from disk, same paths/content as
  the GET detail endpoint). Return `404` for unknown ids. Optionally log an
  `action: "downloaded"` event.
- frontend/src/entities/docs/api.ts — add a `downloadDocsExport(id, projectId)`
  helper (raw fetch → Blob → object URL → anchor click) + a
  `useDownloadDocsExport` mutation hook with loading/error state. Add a query
  key if useful.
- frontend/src/pages/DocsExportPage.tsx — add a "Download ZIP" button per
  export row (next to Delete), with `loading` state while downloading and
  error surface on failure.
- backend/tests/docs.test.ts (extend) or a new
  backend/tests/docs-zip.test.ts — asserts:
  - valid ZIP bytes (signature `PK\x03\x04`), correct `Content-Type` and
    `Content-Disposition`,
  - entry names match `files[].path` (same set, same order),
  - entry content matches stored file content (decompressed), and
  - 404 for a missing export id.
- memory files (STATE, PROJECT_MEMORY, NEXT_ACTION, SESSION_LOG, DECISIONS,
  USER_REQUESTS).

## Requirements

1. **ZIP writer** (`backend/src/utils/zip.ts`):
   - Zero-dependency implementation using `node:zlib`'s `deflateRawSync`.
   - CRC-32 table-based implementation over the UTF-8 content bytes.
   - Emits local file header + deflated data per entry, then central directory
     + EOCD; returns a single `Buffer`/`Uint8Array`.
   - Handles filenames with subdirectories (`00-meta/project.md`); UTF-8
     filename flag (bit 11) set; no leading slashes.
2. **Download endpoint**:
   - `GET /docs/exports/:id/download` → `200` `application/zip` with
     `Content-Disposition: attachment; filename=...`.
   - Reads the file list from the `docs_exports.files` JSON (authoritative
     order) and the content from disk under `EXPORT_DIR/<id>` — reuse
     `readExportFiles` so paths/content exactly match the detail endpoint.
   - `404` with the standard error shape for an unknown `DOCS-…` id.
3. **Frontend button**:
   - Per-export "Download ZIP" button on the Docs Export page (both collapsed
     and expanded rows), triggering the raw download.
   - Filename on disk = the `Content-Disposition` filename.
   - Loading spinner on the button while the request is in flight; a visible
     error message if the download fails.
4. **Verification**:
   - `bun run typecheck` clean (root).
   - Backend tests pass (docs-zip tests + full suite).
   - `bun run --cwd backend build` passes.
   - Optional: smoke script still 275/275.
   - Manual check: generate a workspace for the e-commerce example project
     (PRJ-0004) or Acme, expand it, download the ZIP, and confirm the extracted
     tree matches the file list.

## ID strategy

- No new DB rows are required (ZIP is generated on demand). If an event log
  entry is added, reuse the existing `logEvent` helper with
  `entityType: "docs_export"`, `entityId: <DOCS-id>`,
  `action: "downloaded"`, `payload: { fileCount, bytes }`.

## Definition of Done

Prompt 19 is complete only when:

- `GET /docs/exports/:id/download` returns a valid ZIP of exactly the stored
  workspace files (same paths and content as `GET /docs/exports/:id`) with
  correct MIME type and attachment filename; unknown ids → 404.
- The Docs Export page shows a working "Download ZIP" button per export with
  loading + error states.
- Backend tests cover ZIP validity, entry set/order/content, headers, and 404;
  typecheck + backend tests + backend build pass.
- memory updated; completion reported per AGENTS.md.