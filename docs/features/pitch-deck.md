# FEAT-021: Pitch Deck Presentation

**Status:** Implemented (DEC-030 Phase B, 2026-08-25)
**Scope:** Live-computed pitch deck with in-app viewer, real `.pptx` download, and Markdown workspace snapshot.

## Design

The deck is **not persisted** — it is computed live from project data on every
request, ensuring it always reflects the latest requirements, BMC notes,
architecture, milestones, team, and delivery metrics. This eliminates stale
snapshot bugs entirely.

The same `buildPresentation()` function feeds all three output surfaces:
- `GET /presentation/:projectId/data` — JSON for the in-app slide viewer
- `GET /presentation/:projectId/pptx` — real `.pptx` download via `pptxgenjs`
- `08-presentations/pitch-deck.md` — Markdown workspace snapshot

## Slide outline

| # | Kind | Title |
|---|------|-------|
| 1 | title | Project name + description + tech stack |
| 2 | bmc_block | Why We Win (value propositions) |
| 3 | market | Who We Serve (segments + channels) |
| 4 | business_overview | Business Model Canvas (all 9 blocks condensed) |
| 5 | features | Key Features (top must/should requirements) |
| 6 | architecture | Architecture Snapshot (counts + stacks) |
| 7 | roadmap | Roadmap & Milestones (dated gates) |
| 8 | team | Team |
| 9 | metrics | Delivery Metrics (health percentages) |

## Frontend viewer

`PresentationPage`: screen-only single-slide viewer with keyboard navigation
(← →), dot indicators, slide counter, and a `.pptx` download button.
`print:block` renders all slides sequentially for native print-to-PDF via the
browser.

## pptxgenjs

The one new runtime dependency approved by the user in DEC-030. Pure JS library
using JSZip internally — compatible with Bun. Layout: 16:9 widescreen, dark
title slide, white content slides with bullet lists and project footer.

## Workspace export

`genPitchDeckDoc` renders all slides as Markdown sections into
`08-presentations/pitch-deck.md`, appended at the END of `WORKSPACE_FILES`
(ART-0038). Both committed examples regenerated to 38 files.

## Tests

Backend `presentation.test.ts` (4): data endpoint slide shape, pptx content
type + ZIP header, 404 on unknown project, BMC note appearing in business
overview slide. Frontend `presentation.test.tsx` (4): title + bullets render,
slide counter, arrow navigation controls, loading shell. Smoke block 27:
data/pptx/unknown-project checks (3 checks).
