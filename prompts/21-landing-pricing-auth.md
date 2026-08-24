# Prompt 21 — Landing Page, Pricing & Subscribe Flow

- date created: 2026-08-24
- requested by: user ("now what i want is to make a landing page modern one for our project design it and make modern with animated background waves blocks like a real ai and add plans free plus premuam and with subscribe and the user takes to auth session register then pay or sign in then pay")
- status: approved for implementation (user: "ok start but dont edit the engine")

## Goal

Give SpecForge Studio a public, marketing-grade entry point:

1. A modern landing page at `/` with an animated "AI-style" background (waves + grid blocks) shown to guests.
2. Pricing plans Free / Plus / Premium ($0 / $19/mo / $49/mo; yearly = 2 months free).
3. The subscribe flow: choose plan → register or sign in → simulated checkout → active subscription → workspace.
4. Powerful animated transitions using React only — zero new runtime dependencies.

## Hard constraints

- DO NOT modify existing engine/core module logic (roadmap engine, modeler, diagrams,
  docs-generator generators, governance lifecycle, seeds). All backend changes are additive:
  one new migration + new `auth`/`billing` modules + registration lines in app.ts only.
- No external SaaS integrations (payments are simulated in-app; Stripe swap is future work).
- Database is the source of truth; generated docs untouched.

## Backend scope (additive)

- Migration 011 (`011_auth_and_billing.sql`) mirrored into schema.sql:
  - `users`      (USR ids): id, email UNIQUE, name, password_hash, created_at, updated_at
  - `sessions`   (SES ids): id (random token), token_hash UNIQUE, user_id FK CASCADE, expires_at, created_at
  - `plans`      (PLAN ids): key UNIQUE (free|plus|premium), name, tagline, monthly_price_cents,
                  yearly_price_cents, features JSON, popular flag, sort_order, active flag
  - `subscriptions` (SUB ids): user_id FK CASCADE, plan_id FK, cycle (monthly|yearly), status
                  (active|canceled), card_last4, started_at, current_period_end, canceled_at
- Boot seed (idempotent, bumps id_sequences): PLAN-0001 free / PLAN-0002 plus (popular) / PLAN-0003 premium.
- New module `backend/src/modules/auth.ts`:
  - POST /auth/register {name,email,password} → 201 {user} + Set-Cookie sf_session (httpOnly, SameSite=Lax, 30d)
  - POST /auth/login {email,password} → {user} + cookie; wrong credentials → 401 INVALID_CREDENTIALS
  - POST /auth/logout → clears cookie, deletes session
  - GET /auth/me → {user, subscription} or 401 when no valid session
  - Password hashing via Bun.password (argon2id); session tokens stored as SHA-256 hashes.
- New module `backend/src/modules/billing.ts`:
  - GET /plans (public, active plans ordered by sort_order)
  - POST /billing/checkout {plan_key, cycle, card{name,number,exp_month,exp_year,cvc}} (requires session;
    validates mock card digits/Luhn + future expiry; activates subscription, cancels previous)
  - GET /billing/subscription/me (requires session)
  - DELETE /billing/subscription/me (cancel; requires session)
- Register both modules in app.ts after palette routes. Existing internal APIs stay open (internal tool).

## Frontend scope (new FSD slices)

- entities/user (types + useMe/useLogin/useRegister/useLogout), entities/plan, entities/subscription
- widgets/background/WaveCanvas.tsx — requestAnimationFrame canvas: layered sine-wave ribbons +
  drifting grid blocks, forge palette on slate-950, DPR-aware, static gradient under reduced motion
- widgets/layout/PublicShell.tsx — marketing navbar (logo, Features/Pricing anchors, Sign in / Get started) + footer
- pages/landing/LandingPage.tsx — Hero (canvas bg, staggered word reveal, dual CTA, floating product mockup),
  proof strip, bento feature grid, how-it-works, PricingSection (3 cards, monthly↔yearly toggle,
  glowing Plus badge), FAQ accordion, final CTA
- pages/auth/AuthPage.tsx — sign-in/register modes, split layout, ?return= redirect support
- pages/billing/CheckoutPage.tsx — plan summary, cycle selector, formatted mock card form,
  processing state, success screen → enter workspace
- Motion utilities in index.css: sf-float, sf-glow-pulse, reveal classes + useScrollReveal hook

## Routing

- `/` renders an AuthGate: guests → LandingPage, signed-in users → DashboardPage (zero churn to internal paths).
- Guest-only routes: /signin, /register, /checkout/:planKey (signed-in users bounce per flow needs).
- AppShell sidebar footer gains an account chip (email + plan badge + sign out).

## Tests & docs

- backend/tests/auth-billing.test.ts (~14 tests); smoke extended with an auth+billing block.
- frontend/tests/landing.test.tsx (~10 tests): sections render, pricing cards/toggle, auth forms, checkout states.
- docs/features/landing-billing.md (FEAT-014); PLAN/USR/SES/SUB prefixes in id-convention.md.

## Definition of done

1. Root typecheck clean. 2. Full bun test suite green (existing 209 + new). 3. Smoke OK incl.
register→login→me→logout→checkout→cancel→401 checks. 4. Manual flow works end-to-end:
landing → Subscribe Plus → register → checkout?cycle=yearly → pay → success → dashboard shows Plus badge.
