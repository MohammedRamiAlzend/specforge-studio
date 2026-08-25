# FEAT-020: Business Model Canvas

**Status:** Implemented (DEC-030 Phase A, 2026-08-25)
**Scope:** Per-project nine-block business model stored as structured data.

## Data model

`bmc_notes` table (migration `014_business_model.sql`, mirrored in
`schema.sql`): one row = one sticky-note inside a canonical block
(`key_partners`, `key_activities`, `key_resources`, `value_propositions`,
`customer_relationships`, `channels`, `customer_segments`, `cost_structure`,
`revenue_streams`). Project-owned FK with `ON DELETE CASCADE`; `BMC-XXXX`
IDs auto-registered in `id_sequences`.

## Backend

`modules/business-model.ts`: Zod-validated CRUD — `GET /bmc?project=`,
`POST /bmc` (201), `PATCH /bmc/:id` (strict update schema), `DELETE /bmc/:id`
(204) — with project-existence checks and audit events (`entity_type: "bmc"`).

## Docs

`genBusinessModelDoc` renders all nine blocks as tables into
`07-guides/business-model.md`, appended at the END of `WORKSPACE_FILES`
(ART stability rule → ART-0037; committed examples regenerated to 37 files).

## Frontend

- `entities/bmc` (types, hooks `useBmcNotes`/`useCreateBmcNote`/
  `useUpdateBmcNote`/`useDeleteBmcNote`, lib with block order/labels/hints
  and band layout).
- `BusinessModelPage`: three-band canvas grid (4/3/2 columns responsive),
  per-block sticky notes with inline add/edit/delete.
- Route `projects/:projectId/business-model`, sidebar nav entry after
  Skills, ProjectDetailsPage section card.

## Tests

Backend `business-model.test.ts` (6): CRUD round-trip, block/content/project
validation + strict patch, isolation + cascade, docs integration (all blocks
render), audit trail. Frontend `business-model.test.tsx` (4): lib helpers,
nine titles render, note content visible, loading shell. Smoke block 26:
create/list/unknown-block checks.
