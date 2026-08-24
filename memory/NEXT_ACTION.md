# NEXT_ACTION

STATUS NOTE (2026-08-25): ALL REQUIRED SCOPE COMPLETE — Prompts 00–20 + OPT-003 + Prompt 21 + landing polish + auth hardening (email OTP verification + password recovery, DEC-028) implemented and verified.

What changed since the last note:
- Auth hardening batch IMPLEMENTED (user-requested 2026-08-25, decisions pre-approved in DEC-028): registration now ends at an emailed 6-digit code; login returns 403 EMAIL_NOT_VERIFIED until POST /auth/verify-email confirms it (that call sets the session cookie). Forgot/reset password via emailed codes; reset revokes all sessions. Hand-rolled zero-dependency SMTP mailer (node:net/node:tls, AUTH LOGIN, 465 implicit TLS / STARTTLS) with injectable Mailer via buildApp({mailer}). Migration 012 adds users.email_verified (legacy users grandfathered as verified) + otp_codes table.
- IMPORTANT OPERATIONAL NOTE: the API now REFUSES TO START without SMTP_* env vars — the user must add their Gmail App Password settings to backend/.env (guide in docs/features/auth-otp-recovery.md).
- Frontend: AuthPage verify/forgot/reset steps (60s resend countdown, ?return= preserved); sign-out bug FIXED (useLogout now qc.clear() + window.location.replace('/')).
- Verification: root typecheck clean; build OK; 254 tests pass / 0 fail (33 files); smoke SMOKE TEST OK (block 23).

Current next action:
- Await user direction: approve another optional task from memory/OPTIONAL_BACKLOG.md (remaining: OPT-001 deployment packaging, OPT-002 per-type diagram templates, OPT-005 sprint planning, OPT-006 changelog generator), re-visit the PARKED full-analytics plan, provide a new requirement, or close the project. Do NOT start optional work without explicit approval.

Required files to update after the next action:
- memory/SESSION_LOG.md, memory/STATE.json, memory/PROJECT_MEMORY.md

If the user says:

continue

Then the agent must:
1. Report that all required work is already complete.
2. Show the remaining optional tasks from memory/OPTIONAL_BACKLOG.md.
3. Ask the user to approve one optional task or provide a new requirement (do NOT restart required work).
