# FEAT-018 — Billing lifecycle (simulated payments, invoices, plan limits)

Status: implemented · 2026-08-25 · DEC-029

## What it is

Completes the simulated billing system started in Prompt 21 (FEAT-014). Payments
remain fully internal — no external payment provider, per the project's no-SaaS
constraint — but now behave like a complete subscription product:

1. **Invoices & billing history** — every checkout records an invoice
   (`INV-*`), including $0 Free activations. Users see their full history.
2. **Plan-limit enforcement** — the Free plan allows **1 project**; creating a
   second returns `402 PLAN_LIMIT_REACHED` with upgrade details. Plus/Premium
   are unlimited.
3. **Period expiry** — when `current_period_end` passes, the subscription
   reads as **expired**, Free limits re-apply, and the UI offers renewal.
4. **Email receipts** — paid checkouts send a branded receipt via the SMTP
   mailer from FEAT-017 (delivery failures never roll back an activation).

## Backend

- Migration 013 / schema: new `invoices` table (id, user_id, subscription_id,
  plan_key, cycle, amount_cents, card_last4, status, description, created_at).
  Expiry is **computed at read time** from `subscriptions.current_period_end`;
  the physical status stays `active|canceled`, avoiding a CHECK rebuild.
- `modules/billing.ts`:
  - checkout creates an invoice row and sends the receipt for paid plans;
  - `GET /billing/invoices/me` (session) → newest-first history with plan names;
  - `getActiveSubscription` excludes lapsed periods; the subscription *view*
    maps them to status `"expired"` so the UI can prompt renewal;
  - `assertProjectAllowance` + `FREE_PROJECT_LIMIT = 1`.
- `modules/projects.ts`: `POST /projects` enforces the allowance **only for
  authenticated callers** — anonymous requests (legacy tests/seeds/scripts)
  keep their historical unrestricted behavior.
- `utils/errors.ts`: new code `PLAN_LIMIT_REACHED` (HTTP 402).

## Frontend

- Settings gains a **Billing** tab (`?tab=Billing` deep-linkable):
  - current plan card: name, effective-status chip, cycle/price, renewal or
    canceled date, card last-4;
  - switch buttons to the other paid plan (`/checkout/:planKey`) and a
    confirm-guarded cancel action (reuses the shared ConfirmDialog);
  - invoice history table (date, description + id, card, amount, status);
  - expired banner prompting renewal; free-state upsell CTAs.
- `CreateProjectForm`: on `PLAN_LIMIT_REACHED` renders an amber upgrade box
  linking to Plus checkout instead of a generic error.
- Subscription entity gains `"expired"` status, the `Invoice` type,
  `useInvoices()`, and invoice-cache invalidation after checkout.

## Tests

- `backend/tests/billing-lifecycle.test.ts` (8): receipt on paid checkout, $0
  invoice without receipt, history ordering + auth guard, Free 1-project limit
  (402 with details), anonymous creation unaffected, unlimited paid projects,
  computed expiry re-applying limits, cancel clears active subscription.
- `frontend/tests/billing.test.tsx` (5): loading shell; active-plan card with
  switch/cancel targets; invoice table; free upsell state; expired banner.
- Smoke script block 24 exercises register→limit→upgrade→invoice→expiry live.

## Configuration

No new environment variables. Receipts reuse the existing SMTP_* settings.
