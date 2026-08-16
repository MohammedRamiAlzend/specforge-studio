# Prompt 17 — UI Polish & Motion (smooth navigation)

Read all memory files before doing anything.

This is Prompt 17: UI Polish & Motion.

## Objective

Make the SpecForge Studio frontend feel smoother without adding a runtime
animation library or violating existing constraints. Deliver tasteful,
dependency-free motion: route transitions, navigation micro-interactions,
hover/press feedback, and staggered entrances — all respecting
`prefers-reduced-motion`.

This is the first prompt executed after the completion report (Prompts 00–16
delivered). It is user-requested scope (recorded in USER_REQUESTS).

## Constraints (must hold)

- No new dependencies. Use Tailwind utility classes + plain CSS keyframes in
  `frontend/src/app/index.css`. Do NOT add framer-motion or similar.
- React + Feature-Sliced Design structure stays unchanged.
- Static-render tests must keep passing (react-dom/server ignores CSS
  animations — the wrapper/classes must not change page markup meaningfully).
- Honor `prefers-reduced-motion` (disable animations for those users).
- English-only, database-as-source-of-truth, markdown-as-output rules are
  untouched (no backend changes in this prompt).

## Deliverables

Create or update:

- prompts/17-ui-polish-and-motion.md (this file)
- prompts/README.md (prompt sequence 17 + note)
- frontend/src/app/index.css (keyframes + motion utilities + reduced-motion)
- frontend/src/widgets/layout/AppShell.tsx (page-transition wrapper keyed by
  route; polished nav links)
- frontend/src/shared/ui/Button.tsx (press feedback, transition-all)
- frontend/src/shared/ui/Card.tsx (hover lift)
- frontend/src/shared/ui/States.tsx (entrance animations for empty/error)
- frontend/src/pages/DashboardPage.tsx (staggered project-card entrance)
- frontend/src/pages/ProjectDetailsPage.tsx (section-card hover lift)
- frontend/tests/ui-polish.test.tsx (light assertions on the new classes)
- docs/features/ui-polish.md (FEAT-012)
- memory files (STATE, PROJECT_MEMORY, NEXT_ACTION, SESSION_LOG, DECISIONS)

## Requirements

1. **Motion utilities in index.css**: define keyframes for
   `sf-page-enter` (fade + 8px rise, ~250ms), `sf-rise` (opacity + translateY,
   for staggered entrances), `sf-scale` (for buttons/cards), and a
   `@media (prefers-reduced-motion: reduce)` block disabling them. Set
   `html { scroll-behavior: smooth }` (also disabled under reduced motion).
2. **Page transitions**: AppShell wraps the `<Outlet/>` container in a div
   keyed by `location.pathname` with `sf-page-enter`, so every navigation
   cross-fades/slides the new page in (key stays stable within a page, so
   canvas state is preserved).
3. **Navigation micro-interactions (AppShell)**: nav links get
   `transition-all` with a subtle `hover:translate-x-0.5`; the active link
   keeps its slate pill but adds a tiny `scale-[1.03]`; section headers get a
   gentler style. Nothing measurable-API changing.
4. **Buttons**: `transition-all` + `active:scale-[0.98]` press feedback on all
   variants; disabled stays untouched.
5. **Cards**: optional `hover:-translate-y-0.5 hover:shadow-md` lift applied
   to interactive-looking cards (dashboard project cards, ProjectDetails
   section cards). Non-interactive cards keep the base shadow.
6. **States**: EmptyState/ErrorState get `sf-rise` entrance.
7. **Dashboard grid**: project cards stagger in with inline
   `animationDelay = index * 40ms` + `sf-rise`.
8. **ProjectDetails SECTIONS**: card tiles get hover lift + `transition-all`.
9. **Verification**: root `bun tsc -b --noEmit` clean; `bun test
   backend/tests frontend/tests` passes (no backend changes expected);
   `bun run build` passes; smoke untouched (backend-only). Add
   frontend/tests/ui-polish.test.tsx asserting the motion classes appear in
   static markup (page-enter keyed wrapper, stagger delay, reduced-motion
   classes present in CSS as a string check is not feasible via bun test; so
   assert rendered classNames only).

## Definition of Done

Prompt 17 is complete only when:

- page transitions animate on route change (keyed wrapper present)
- nav links, buttons, cards, states, and dashboard cards have the described
  micro-interactions
- `prefers-reduced-motion` disables the new animations
- no new runtime dependency was added
- typecheck + all tests + build pass
- frontend/tests/ui-polish.test.tsx covers the new classes
- docs/features/ui-polish.md (FEAT-012) written; memory updated; completion
  reported per AGENTS.md