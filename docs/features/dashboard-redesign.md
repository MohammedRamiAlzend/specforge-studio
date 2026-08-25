# FEAT-019: Dashboard Redesign

**Status:** Implemented (DEC-030, 2026-08-25)
**Scope:** Cross-project dashboard backed by a single aggregate endpoint.

## Problem

The original dashboard was a project list, not a dashboard: no KPIs, no
personalization, no plan awareness (Free users discovered their quota via an
error toast), pending approvals silently dropped from the global activity
feed, and a hard-coded "tips" card.

## Backend

- `GET /dashboard/summary` (`modules/dashboard.ts`, auth-required) returns one
  payload: project totals by status, plan/quota state (reusing billing
  helpers), task counts by status, top blocked tasks, open/critical issue
  counts and top critical issues, top pending approvals, and the next six
  milestone due dates (unioned from `milestones` and `roadmap_milestones`
  joined through roadmaps).
- `modules/billing.ts` exports `getSubscriptionSummary`: compact subscription
  state using enforcement semantics (lapsed period reads as `"expired"` with
  effective plan reverted to free).
- `modules/activity.ts` fix: the global feed now merges capped cross-project
  pending approvals (previously required `projectId`), and pending approvals
  sort above newer events so they cannot fall out of the feed window.
- **Creator stamping fix:** `POST /projects` now overrides any client-supplied
  `created_by` with the authenticated user's id. Without this, the UI's legacy
  default (`"owner@internal"`) silently bypassed both quota accounting and the
  Free-plan limit itself.

## Frontend

- `entities/dashboard` (types + `useDashboardSummary`).
- `features/dashboard/PlanStrip` (quota bar + upgrade/reactivate CTAs),
  `KpiRow` (5 counters: active projects, open tasks, blocked tasks, critical
  issues, pending approvals), `AttentionPanel` (blocked/critical/approvals
  with deep links) + `UpcomingMilestones`.
- `DashboardPage` rewritten: greeting via `useMe()`, plan strip, KPI row,
  projects grid with status filter chips + sort (updated/created/name),
  freshness line on cards, attention/milestone panels, full-width activity
  feed; hard-coded tips card removed.
- `shared/lib/format.ts` adds `formatRelative`.

## Tests

- `backend/tests/dashboard.test.ts` (4): auth gate, zeroed fresh workspace,
  cross-project attention aggregation, paid-plan unlimited quota; global-feed
  approval merge asserted.
- `frontend/tests/dashboard.test.tsx` (6): greeting, KPIs/attention, quota
  strip CTA, milestones, freshness rendering, loading shell.
- Smoke block 25: anonymous 401, session flow, creator stamping, free quota.
