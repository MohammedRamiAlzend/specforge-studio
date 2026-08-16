---
id: FEAT-012
title: UI Polish and Motion
type: guide
phase: 17-ui-polish-and-motion
status: implemented
owner: engineering
related:
  - FEAT-001
updated: 2026-08-16
---

# UI Polish and Motion — SpecForge Studio

## 1. Goal

Make the frontend feel smoother — route transitions, navigation
micro-interactions, hover/press feedback, and staggered entrances — **without
adding a runtime animation library**. Everything is delivered with Tailwind
utility classes and a small set of plain CSS keyframes, so the dependency
footprint stays zero (matching the project's zero-new-deps test approach) and
the app remains fully server-renderable.

## 2. Motion Utilities (`frontend/src/app/index.css`)

Three keyframe animations are defined with CSS-only utility classes:

- **`sf-page-enter`** — fade-in + 8px rise (~250ms) applied to the routed page
  container so every navigation cross-fades/slides the new page in.
- **`sf-rise`** — opacity + 12px upward rise (320ms, ease-out-expo feel) for
  staggered entrances of lists/grid tiles and the empty/error states.
- **`sf-scale-in`** — subtle scale-up (180ms) reserved for transient panels.

Two base polish rules:

- `html { scroll-behavior: smooth }` for in-page anchor scrolling.
- A `@media (prefers-reduced-motion: reduce)` block that disables all of the
  above animations and restores `scroll-behavior: auto`, respecting user
  motion preferences.

## 3. Applied Micro-interactions

| Surface | Change |
|---|---|
| Page container (AppShell) | Wrapped `<Outlet/>` in a div keyed by `location.pathname` with `sf-page-enter`; the key is stable within a page so canvas/modeler state is preserved while navigating between pages animates. |
| Sidebar nav links | `transition-all duration-200`; active item scales to `scale-[1.03]`; idle items `hover:translate-x-0.5` with the existing background/color glow. |
| Buttons (`shared/ui/Button`) | `transition-all duration-150` + `active:scale-[0.98]` press feedback; disabled state stays non-scaled. |
| Cards (`shared/ui/Card`) | `transition-all duration-200` base so interactive cards can lift smoothly. |
| Empty/error states | `sf-rise` entrance animation. |
| Dashboard project grid | Staggered `sf-rise` entrance, `animationDelay = index * 40ms`, plus `group-hover:-translate-y-0.5 group-hover:shadow-md` card lift. |
| Project details section tiles | Same stagger + lift + `group-hover:border-slate-300`; the title also brightens toward the forge accent on hover. |

## 4. Testing

`frontend/tests/ui-polish.test.tsx` renders the shared primitives with
react-dom/server and asserts the motion classes (`transition-all`,
`active:scale-[0.98]`, `sf-rise`) appear in the static markup — the new work
is verifiable without a browser because animations are pure CSS class names
that leave the DOM structure unchanged.

## 5. Constraints Honored

- No new runtime dependency (no framer-motion, no animation lib).
- React + Feature-Sliced Design structure unchanged.
- `prefers-reduced-motion` fully respected.
- No backend/schema/docs-generator changes — database stays the source of
  truth; generated Markdown output is untouched.
- Typecheck, all backend + frontend tests, and the production build pass.

## 6. Definition of Done

- Page transitions animate on route change (keyed wrapper present). ✔
- Nav links, buttons, cards, states, and dashboard cards have their
  micro-interactions. ✔
- `prefers-reduced-motion` disables the new animations. ✔
- No new runtime dependency added. ✔
- Typecheck + all tests + build pass; `ui-polish.test.tsx` covers the new
  classes. ✔
- Memory files and this feature doc updated; completion reported per
  AGENTS.md. ✔