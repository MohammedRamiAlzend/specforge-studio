# FEAT-014 — Landing Page, Pricing & Subscribe Flow

- Feature ID: FEAT-014
- Prompt: 21
- Date: 2026-08-24
- Status: implemented
- Decision: DEC-026

## Summary

SpecForge Studio gained a public marketing surface: an animated landing page at
`/` for guests, DB-backed pricing plans (Free / Plus / Premium), and the full
subscribe flow — choose a plan, register or sign in (real cookie-session
auth), pay through a simulated checkout, and land in the workspace. Zero new
runtime dependencies; no changes to existing engine/core modules.

## Routing model

| Route | Component | Access |
|---|---|---|
| `/` | `HomeGate` → LandingPage (guests) / DashboardPage (users) | public |
| `/signin` | AuthPage (sign-in mode) inside PublicShell | guests only |
| `/register` | AuthPage (register mode) inside PublicShell | guests only |
| `/checkout/:planKey` | CheckoutPage inside PublicShell (`?cycle=yearly` honored) | requires session |

Internal paths are unchanged: every `/projects/...` and `/settings` route keeps
its URL, so all existing links and tests keep working (DEC-026).

## Backend (additive)

- Migration `011_auth_and_billing.sql` (+ mirrored in schema.sql):
  - `users` (USR) — email UNIQUE, argon2id password hash;
  - `sessions` (SES) — SHA-256 token hash UNIQUE, 30-day expiry, FK cascade on user;
  - `plans` (PLAN) — key free/plus/premium, prices in cents, JSON features, popular flag;
  - `subscriptions` (SUB) — user + plan + cycle, active/canceled lifecycle.
- `modules/auth.ts`: POST /auth/register, POST /auth/login, POST /auth/logout,
  GET /auth/me. Password hashing via Bun.password (built-in argon2id); session
  cookie `sf_session` is httpOnly + SameSite=Lax; only token hashes are stored.
- `modules/billing.ts`: GET /plans (public), POST /billing/checkout,
  GET+DELETE /billing/subscription/me. Boot seed inserts PLAN-0001..0003
  idempotently ($0/$19/$49 monthly; $190/$490 yearly = 2 months free).
- Simulated checkout validates the mock card (Luhn + future expiry + CVC),
  cancels any previous active subscription and activates the new one. Paid
  plans require a card; Free activates without one. All mutations audit-logged.

## Frontend (new FSD slices)

- `entities/user`, `entities/plan`, `entities/subscription` — types + TanStack Query hooks.
- `widgets/background/WaveCanvas` — rAF canvas: sine-field grid blocks + three
  forge-palette wave ribbons; DPR-aware, pauses when hidden, static frame under
  reduced motion.
- `widgets/layout/PublicShell` — marketing navbar/footer around public pages.
- `pages/landing/LandingPage` — hero (canvas bg, staggered word-reveal headline,
  floating product mockup), proof strip, bento features, how-it-works,
  PricingSection (live plans from GET /plans, monthly↔yearly toggle, glowing
  Plus card), FAQ accordion, final CTA band.
- `pages/auth/AuthPage` — split-screen sign-in/register with error states and
  `?return=` continuation.
- `pages/billing/CheckoutPage` — order summary, cycle selector, formatted mock
  card form, processing state, success screen ("Enter your workspace").
- `widgets/layout/AccountChip` — AppShell sidebar footer now shows the session
  email, current plan badge and sign-out action.
- Motion utilities in index.css: `sf-float`, `sf-glow-pulse`, `sf-word`,
  `.sf-reveal` scroll reveals — all disabled under `prefers-reduced-motion`.

## Verification

- Root typecheck clean; full bun test suite green (existing suites untouched).
- backend/tests/auth-billing.test.ts (14 tests): plan seeds/prices, register
  duplicate/short-password rejections, login/logout/me round-trips with cookie
  headers, 401 guards, Luhn/expired card rejections, plan switching, cancel.
- frontend/tests/landing.test.tsx (10 tests): landing sections/anchors, plan
  cards per cycle, auth forms per mode, checkout shells, PublicShell chrome.
- Backend smoke extended to 292 checks including the auth+billing block.

## Limitations

- Payments are simulated (no external SaaS per project constraint); swapping in
  Stripe later means replacing `validateMockCard` + checkout service internals.
- Existing internal APIs remain unauthenticated by design (internal tool);
  only the new auth/billing endpoints enforce sessions.
