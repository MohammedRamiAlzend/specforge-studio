# NEXT_ACTION

STATUS NOTE (2026-08-17): Prompt 19 (Download generated docs as ZIP) PLAN CREATED — awaiting user approval to implement. All previously completed scope (Prompts 00–16 required + user-requested Prompt 17 polish + Prompt 18 e-commerce seeder) is complete and verified.

- prompts/19-docs-zip-download.md created; prompts/README.md sequence updated to 19 with a Prompt 19 note.
- Plan scope (create-plans-only, recorded as DEC-023 in memory/DECISIONS.md):
  - backend/src/utils/zip.ts — minimal zero-dependency ZIP writer: node:zlib deflateRawSync (method 8) + table-based CRC-32, local file headers + central directory + EOCD, UTF-8 names, deterministic entry order; returns Buffer/Uint8Array from `{ path, content }[]`.
  - backend/src/modules/docs-generator/routes.ts — new GET /docs/exports/:id/download returning application/zip + Content-Disposition attachment; reuses readExportFiles so paths/content exactly match GET /docs/exports/:id; 404 for unknown ids; optional downloaded event via logEvent.
  - frontend/src/entities/docs/api.ts — downloadDocsExport (raw fetch → Blob → object URL → anchor click, bypassing the JSON api() client) + useDownloadDocsExport hook with loading/error state.
  - frontend/src/pages/DocsExportPage.tsx — per-export "Download ZIP" button (next to Delete) with loading spinner + error surface.
  - backend/tests/docs.test.ts (extend) or new docs-zip.test.ts — asserts PK\x03\x04 signature, Content-Type + Content-Disposition, entry names match files[].path in order, decompressed content matches stored content, and 404 for a missing export id.
  - No schema changes; archive generated on demand from files on disk (DB stays source of truth for metadata).
  - Alternative allowed: jszip/archiver as a plain npm dependency, but zero-dep ZIP writer is preferred.

Current next action:
- Wait for the user to approve implementation of Prompt 19. On approval, execute prompts/19-docs-zip-download.md: create the zip util, download endpoint, frontend hook + button, and backend tests; then verify (root typecheck clean, backend tests pass, backend build passes); update memory (PROJECT_MEMORY, STATE.json, NEXT_ACTION, SESSION_LOG, DECISIONS DEC-023 → implemented); deliver the completion report per AGENTS.md.

Reason:
- Per AGENTS.md execution rule 1, do not start implementation before the relevant plan is clear and approved. The Prompt 19 plan is created and awaiting approval.

Required files to update after executing the next action:
- memory/PROJECT_MEMORY.md
- memory/STATE.json
- memory/SESSION_LOG.md
- memory/NEXT_ACTION.md
- memory/DECISIONS.md (DEC-023 status → implemented)
- memory/USER_REQUESTS.md (already recorded)

If the user says:
continue

Then the agent must:
1. Read all memory files (and MASTER_PROMPT.md).
2. Check memory/STATE.json awaiting_approval — Prompt 19 implementation is pending user go-ahead.
3. Do NOT restart completed work; do NOT start Prompt 19 implementation without explicit approval.