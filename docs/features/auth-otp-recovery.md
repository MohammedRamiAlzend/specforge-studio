# FEAT-017: Auth Hardening — Email Verification (OTP) & Password Recovery

Status: implemented
Phase: auth-hardening-otp-recovery
Decision: DEC-028

## Summary

Accounts are no longer usable immediately after registration. Every new user must
confirm ownership of their email address with a 6-digit one-time code before they
can sign in, and password recovery is handled entirely through the same emailed-code
mechanism. Transactional email is delivered through the operator's own SMTP server
(typically Gmail with an App Password) by a hand-written SMTP client — zero new
runtime dependencies.

## Backend

### Data model (`backend/db/migrations/012_auth_otp.sql`)

* `users.email_verified INTEGER NOT NULL DEFAULT 0` — grandfathers every
  pre-existing account as verified so current sessions keep working.
* `otp_codes` table: `id` (OTP- prefix), `user_id`, `purpose`
  (`verify_email` | `password_reset`), `code_hash` (SHA-256 — the plaintext code is
  never stored), `attempts`, `expires_at`, `consumed_at`, timestamps.
* Fresh databases get both from `schema.sql`; existing dev databases are patched
  once by `migrate0012EmailVerified()` inside `openDatabase()`.

### Endpoints

| Method & path            | Auth | Behaviour |
|--------------------------|------|-----------|
| `POST /auth/register`    | –    | Creates the user (unverified), emails a 6-digit code. **No session cookie**. Returns `{ user, otp_sent }`. |
| `POST /auth/verify-email`| –    | Checks email + code. On success marks the account verified and **sets the session cookie** (this is now the sign-in moment for new accounts). |
| `POST /auth/resend-otp`  | –    | Re-sends a verification code after a 60-second cooldown (429 `RATE_LIMITED` while cooling). Unknown/verified addresses get the same generic `{ ok }` (anti-enumeration). |
| `POST /auth/login`       | –    | Unverified accounts receive **403 `EMAIL_NOT_VERIFIED`** instead of a session. |
| `POST /auth/forgot-password` | – | Emails a reset code if the account exists; always responds 200. |
| `POST /auth/reset-password`  | – | Verifies the reset code, stores the new argon2id hash and **revokes all of the user's sessions**. |

### Code policy

* 6 digits, generated with `crypto.getRandomValues`.
* Stored only as a SHA-256 hash; compared in constant-shape string equality.
* Expires after **10 minutes**; max **5 wrong attempts** → 429 `CODE_LOCKED`;
  issuing a new code supersedes the previous one.
* 60-second resend cooldown enforced server-side.

### Mailer (`backend/src/utils/mailer.ts`)

Hand-rolled RFC 5321 client over `node:net` + `node:tls`:

* Port **465** = implicit TLS; any other port = STARTTLS upgrade after EHLO.
* `AUTH LOGIN` with base64 credentials (Gmail App Password).
* Multipart/alternative message (plain text + branded HTML), dot-stuffing,
  per-step reply validation with descriptive errors.
* The `Mailer` interface is injectable via `buildApp({ mailer })`; tests and the
  smoke script capture messages with an in-memory fake.

## Configuration (hard-required at startup)

The API refuses to start without SMTP config. Put this in `backend/.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your.address@gmail.com
SMTP_PASS=xxxxxxxxxxxxxxxx   # 16-character Gmail App Password (not your login password)
SMTP_FROM=your.address@gmail.com
```

Gmail requires 2FA enabled on the Google account; create the App Password under
Google Account → Security → 2-Step Verification → App passwords.

## Frontend

* `AuthPage` is now a small state machine:
  * register form → **"Check your inbox"** step (6-digit input, 60s resend
    countdown);
  * sign-in hitting `403 EMAIL_NOT_VERIFIED` routes to the same verify step;
  * "Forgot password?" → request-reset → enter code + new password → back to
    sign-in;
  * the `?return=` target (e.g. checkout) is preserved across every step.
* Sign-out bug fixed: `useLogout` now runs `queryClient.clear()` plus
  `window.location.replace("/")` in `onSettled`, so no cached project data or
  stale dashboard route survives signing out.

## Tests

* `backend/tests/auth-otp.test.ts` (10 cases): OTP delivery, login gate,
  wrong-code attempts, lockout, expiry (DB-manipulated), cooldown,
  anti-enumeration, reset revoking sessions.
* `backend/tests/auth-billing.test.ts`: register flow updated to two-step;
  billing suites use `registerVerifiedUser()`.
* Smoke block 23 exercises the full journey against the captured mailer.
* Suite totals: 254 tests passing, smoke OK, typecheck clean, build OK.
