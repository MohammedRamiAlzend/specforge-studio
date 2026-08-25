# NEXT_ACTION

STATUS NOTE (2026-08-25, cont. 3): ALL REQUIRED SCOPE COMPLETE + live SMTP delivery VERIFIED WORKING. Register-hang root cause found and fixed (see SESSION_LOG cont. 3): dotStuffed() escaped the DATA terminator ("." -> "..") so Gmail never saw end-of-data. Five SmtpMailer bugs fixed total; real email SENT OK via backend/scripts/smtp-test-send.ts.

What changed since the last note:
- User bug round fixed: password show/hide toggle (PasswordInput/EyeIcon in AuthPage), backend/.env created from user's Gmail App Password (+ committed .env.example template), sign-out re-hardened with imperative performSignOut() in entities/user/api.ts.
- SMTP ops tools kept: backend/scripts/smtp-diagnose.ts (credential/protocol validator) and smtp-test-send.ts (send smoke; run from workdir=backend).
- Committed ed586eb and pushed to origin/feat/landing-pricing-auth-hardening (after 84d369b). PR URL: https://github.com/MohammedRamiAlzend/specforge-studio/pull/new/feat/landing-pricing-auth-hardening
- Verification: backend typecheck clean; 254 tests pass / 0 fail (33 files); real Gmail delivery confirmed (user should see "SpecForge SMTP test" and "raw probe" emails in mouazalkhatib2013@gmail.com).

Current next action:
- User must FULLY RESTART the dev server (bun --watch does not reload .env) and retry account creation end-to-end in the browser.
- After that: await user direction — approve an optional task from memory/OPTIONAL_BACKLOG.md (remaining: OPT-001 deployment packaging, OPT-002 per-type diagram templates, OPT-005 sprint planning, OPT-006 changelog generator), re-visit the PARKED full-analytics plan, merge the PR, provide a new requirement, or close the project. Do NOT start optional work without explicit approval.

Required files to update after the next action:
- memory/SESSION_LOG.md, memory/STATE.json, memory/PROJECT_MEMORY.md

If the user says:

continue

Then the agent must:
1. Report that all required work is already complete.
2. Show the remaining optional tasks from memory/OPTIONAL_BACKLOG.md.
3. Ask the user to approve one optional task or provide a new requirement (do NOT restart required work).
