# SpecForge Studio Security Assessment

**Date:** 2026-08-26  
**Scope:** Backend, frontend, authentication, authorization, user/project isolation, administration, exports, provider configuration, deployment configuration, and automated verification.  
**Assessment type:** Repository-level security review, static inspection, targeted test execution, and build verification. This is not a substitute for an external penetration test.

## Executive conclusion

SpecForge has several important security foundations in place, but it cannot honestly be described as threat-free or production-secure without additional deployment hardening and a completed provider-credential backend. The most important positive result is that product APIs now default to authenticated access and project-scoped authorization; the earlier risk of anonymous cross-project access is addressed in the current authorization layer and regression tests.

The most important unresolved risks are **production-secret hygiene**, **missing CSRF defense-in-depth**, **missing deployment-level CSP/HSTS**, **in-memory rate limiting**, **long-lived sessions without user session management**, **admin account hardening**, and **incomplete provider credential storage**. The current Provider Settings preview deliberately discards API keys, which prevents accidental persistence but means Leona BYOK is not yet operational.

> No static review can prove that there are no bugs or threats. The correct conclusion is that the controls below were verified, while the unresolved items require remediation and live penetration testing.

## Verified protections

| Area | Evidence observed | Assessment |
|---|---|---|
| Password storage | Authentication uses `Bun.password.hash`, documented as Argon2id-backed in the auth module. | Strong foundation; verify production runtime policy and password-strength UX. |
| Session token storage | The browser receives an opaque random token; only its SHA-256 hash is stored in SQLite. | Good secret-at-rest design. |
| Cookie flags | `sf_session` is `HttpOnly`, `SameSite=Lax`, `Path=/`, and can be `Secure` through `COOKIE_SECURE`. | Good baseline; production must force HTTPS and `Secure`. |
| Email verification | Registration uses a six-digit OTP with hashing, expiry, attempt limits, and resend cooldown. | Good anti-abuse foundation. |
| Password reset | Forgot-password response is anti-enumeration; reset requires an OTP and revokes all sessions. | Good control. |
| Authentication default | `AUTH_REQUIRED` defaults to true and the authorization hook protects product APIs. | Strong default; ensure no production deployment overrides it. |
| Tenant/project scope | Central authorization resolves project scope and calls `assertProjectAccess`; editor access is required for mutations. | Strong direction; maintain endpoint coverage as routes are added. |
| Admin access | Admin routes call `requireAdmin`; bootstrap uses exact configured email addresses rather than a public role selector. | Good baseline; admin MFA and emergency recovery are still needed. |
| Input validation | Route bodies and parameters commonly use Zod schemas with length, enum, and identifier constraints. | Good baseline; continue endpoint-by-endpoint coverage. |
| CORS | CORS allows credentials only for an exact configured origin. | Safer than wildcard credentialed CORS. |
| Provider secrets | Current Provider Settings input is password-style and intentionally discarded; no local-storage or export persistence was added. | Safe preview behavior, but the actual secure vault/provider route is missing. |
| Browser headers | Added `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, and restrictive `Permissions-Policy` on backend responses. | Useful defense in depth; CSP/HSTS remain deployment responsibilities. |

## Findings

| ID | Severity | Finding | Impact | Recommended action |
|---|---|---|---|---|
| SEC-01 | High before public launch | The repository includes a seeded local administrator default of `admin@specforge.com` / `password123`. | If the seed command or credential reaches a deployed environment unchanged, an attacker can obtain global administration. | Make production startup fail when the seed password is unchanged; require a one-time bootstrap secret or invite flow; rotate the local credential immediately; enforce admin MFA. |
| SEC-02 | High before Leona activation | Provider Settings has no authenticated backend vault or provider adapter. | Enabling generation without this would risk API-key exposure, uncontrolled provider spend, and audit gaps. | Store encrypted provider credentials or a reference to an approved secret manager; return only masked metadata; validate server-side; never log request bodies; add revoke/rotate actions. |
| SEC-03 | Medium | No application-level CSRF token or explicit Origin/Referer validation is visible for state-changing cookie-authenticated routes. `SameSite=Lax` reduces common cross-site POST exposure but is defense in depth rather than a complete application policy. | Same-site subdomains, browser edge cases, or future cookie-policy changes could permit unwanted state changes. | Add an Origin allowlist check for unsafe methods and a CSRF token strategy for browser mutations; add regression tests for cross-origin and same-site cases. |
| SEC-04 | Medium | No Content-Security-Policy or HSTS is emitted by the application layer. | XSS impact is larger without CSP; HTTP downgrade or first-visit interception remains possible if the reverse proxy is misconfigured. | Add a deployment-specific CSP compatible with the Vite app and enforce HSTS only on HTTPS production responses at the edge or application. |
| SEC-05 | Medium | Authentication throttling appears process-local/in-memory. | A restart or multi-instance deployment can reset limits; distributed attackers can rotate IPs. | Use a shared rate-limit store or edge/WAF control, add per-account and per-IP buckets, and monitor lockout/OTP abuse. |
| SEC-06 | Medium | Sessions last 30 days and there is no visible user-facing session list/revoke-all control. | A stolen session remains useful for a long period; users cannot easily contain an active-session compromise. | Add idle/absolute expiry policy, session rotation after sensitive changes, device/session listing, revoke-one, and revoke-all actions. |
| SEC-07 | Medium | Admin authorization is role-based but admin MFA, step-up authentication, and separate operator audit review are not present in the reviewed code. | A compromised ordinary password can become a full control-plane compromise if the admin account is targeted. | Require phishing-resistant MFA or at minimum TOTP/WebAuthn for admins, step-up auth for plan/subscription changes, and alert on admin actions. |
| SEC-08 | Medium | The server defaults to `HOST=0.0.0.0`, while `COOKIE_SECURE=false` is documented for local development. | A careless deployment can expose the API beyond the intended network or transmit cookies over HTTP. | Make production configuration reject `COOKIE_SECURE=false`, require an explicit trusted proxy/HTTPS setting, and bind privately unless public exposure is intentional. |
| SEC-09 | Low/Medium | The trusted signup-domain policy reduces spam but is not identity proof. Subdomains and disposable organizational domains may still be accepted if configured. | Attackers controlling an allowed domain can create accounts; domain trust alone does not equal organizational authorization. | Use invitations or domain ownership verification for sensitive workspaces; add per-domain quotas and abuse monitoring. |
| SEC-10 | Low/Medium | Full automated verification is currently not green in this checkout. The backend suite reported four failures and the frontend suite one failure. The authorization failure is caused by the test fixture using `qa@test.local` while the current trusted-domain default is `specforge.com`; the frontend failure is an existing BillingPanel lapsed-period expectation. | A non-green suite reduces confidence in future security changes and can hide regressions. | Repair test fixtures/expectations, add explicit security-header and cross-tenant tests, then require the full suite and build in CI. |
| SEC-11 | Low | Production build succeeds but Vite reports a JavaScript chunk larger than 500 kB. | This is primarily performance, but larger client bundles increase exposure and can complicate CSP review. | Code-split administrative/editor workspaces and review third-party bundle contents. |

## User and data-threat scenarios

A user from Project A must not be able to list, read, mutate, or export Project B by changing a path or query identifier. The centralized scope hook and existing authorization tests are designed for this requirement, but every newly added route must remain covered. Exports are especially sensitive because Markdown, JSON, ZIP, and PPTX may contain business plans, architecture, credentials accidentally entered by users, or personal data.

A malicious user may attempt account enumeration, signup abuse, OTP brute force, password spraying, credential stuffing, cross-site requests, oversized request bodies, SQL injection, path traversal, stored XSS through project text, and cost abuse through future Leona generation. Zod validation, parameterized queries, OTP attempt limits, trusted signup domains, and the current no-save provider preview reduce several of these risks. They do not replace request-size limits, distributed abuse controls, output encoding review, secret scanning, and provider quotas.

An administrator is a high-value target. The current exact-email bootstrap and `requireAdmin` check reduce accidental exposure, but the seeded password, lack of visible admin MFA, and sensitive subscription/plan operations require stronger controls before public deployment.

## Verification performed

Root TypeScript typecheck passed after the security-header change. The production frontend build passed with a large-chunk warning. Focused authentication, OTP, billing, authorization, and admin tests passed except for one authorization fixture failure caused by the trusted-domain policy. The full backend suite reported 201 passing and 4 failing tests; the full frontend suite reported 105 passing and 1 failing test. The failures must be repaired before treating CI as a security gate.

The security-header change is limited to response headers and does not alter session, authorization, or business logic. The repository contains no newly introduced provider-key persistence; the Provider Settings preview intentionally discards entered keys.

## Release gate

SpecForge should be considered **conditionally ready for private/internal testing**, not “no threats” or fully public-production-ready. Before public launch, complete SEC-01 through SEC-08, repair the red test suite, run dependency scanning in CI, test with a disposable external account, exercise cross-tenant export attempts, and conduct an external authenticated penetration test.

## References

[1]: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html "OWASP Authentication Cheat Sheet"
[2]: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html "OWASP Session Management Cheat Sheet"
[3]: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html "OWASP Cross-Site Request Forgery Prevention Cheat Sheet"
[4]: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html "OWASP HTTP Headers Cheat Sheet"
[5]: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html "OWASP Secrets Management Cheat Sheet"
