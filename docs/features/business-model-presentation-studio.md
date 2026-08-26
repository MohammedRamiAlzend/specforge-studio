# Business Model Canvas and Presentation Studio

## Business Model Canvas

The project Business Model Canvas now behaves like a lightweight collaborative board rather than a static form grid. Nine canonical business-model blocks remain visible as spatial frames, while each insight is rendered as a color-coded sticky note. Users can add notes with a chosen block and color, drag notes around the board, move a selected note to another block, edit content in an inspector dialog, delete notes, filter by block, zoom, fit the board, and use the mini-map as a spatial orientation aid.

Sticky-note placement and color are persisted in the `bmc_notes` table through additive migration 017. Existing notes without metadata receive deterministic fallback positions, so the migration is backward-compatible and existing generated documentation continues to read the same note content.

## Presentation Studio

The former single-slide viewer is now a presentation workspace. The left rail provides slide thumbnails and supports opening, adding, duplicating, reordering, and deleting slides. The central stage supports draft title and talking-point edits, zoom, grid visibility, and speaker notes. The right design panel provides Paper, Graphite, and Violet themes, a current-slide summary, presenter-mode access, reset-to-live-data, and shortcut guidance.

Presenter mode opens a distraction-free full-screen experience with slide navigation, progress, keyboard shortcuts, and an explicit exit path. Existing live project data remains the source of truth for the generated deck and PPTX endpoint; the editor intentionally labels unsaved changes as local edits and provides a reset action. Existing print rendering and `.pptx` download behavior remain available.

## Business Model export recommendation

The Business Model Canvas now provides two direct downloads from the board toolbar: `PRJ-xxxx-business-model.md` and `PRJ-xxxx-business-model.json`. Markdown is the best default for people because it is readable, portable, diffable, and already matches the project’s generated documentation workflow. JSON is provided alongside it for integrations, backups, migrations, and round-trip machine processing. The Markdown workspace ZIP remains the best complete-project export because it includes the BMC snapshot, presentation snapshot, requirements, plans, guides, and operational files together.

## Verification

The focused backend Business Model suite passes 6 tests, the focused frontend Business Model and Presentation suites pass 8 tests with 60 assertions, the backend Presentation suite passes 4 tests, root TypeScript checking passes, and the production build passes. The preview routes for the landing page, Business Model Canvas, Presentation Studio, and backend health endpoint return HTTP 200 on the attached Windows preview.


## Presentation Studio editing pass — 2026-08-26

The workspace now uses a PowerPoint-inspired local draft editor. Users can add text boxes, images, and shapes; select an element on the slide; edit text, font family, size, weight, alignment, image URL, uploaded image data, shape type, color, position, and layer order; and remove selected elements. The available font list includes Aptos, Calibri, Arial, Times New Roman, Georgia, Verdana, Trebuchet MS, Courier New, and Impact. Arrow controls move selected elements and Bring forward/Send backward manage stacking order.

Presenter View was rebuilt as a presentation-first full-screen surface with a large centered slide, project and slide context, progress percentage, clear Previous/Next controls, keyboard navigation, and an explicit Exit Presenter View action. The editor remains intentionally local-draft based because the backend presentation contract still exposes generated live data and PPTX rendering rather than persisted arbitrary slide elements.

The dashboard shell now uses a full-height overflow boundary: the desktop sidebar is fixed to the viewport, its own navigation list can scroll independently, and only the main workspace content scrolls. Mobile navigation remains a drawer with backdrop and close behavior.


## In-canvas resize and color editing — 2026-08-26

Selected text, image, and shape elements now show four corner resize handles directly on the slide canvas. Dragging a handle updates the element’s width and height in bounded canvas percentages, keeps the object inside the slide, and enforces a usable minimum size. The resize interaction is local to the working draft and does not affect Presenter View until the current draft is presented.

Text elements now expose a `Text color` picker in the inspector. Shape elements expose a `Color` picker that updates rectangle, circle, and line rendering immediately. The selected element remains highlighted while the user changes its color or size, and the inspector continues to expose layer ordering and removal controls.
