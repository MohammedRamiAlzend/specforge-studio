# HANDOFF

This file is used when context is close to exhaustion or when a session must be interrupted.

If this file is not empty, the agent must read it carefully before continuing.

## Latest Checkpoint

Checkpoint 2026-08-25 (auth hardening batch completed):

- completed: ALL required scope (Prompts 00–20) + OPT-003 + Prompt 21 (landing/pricing/auth) + OPT-004 (skill matching) + landing polish batch + auth hardening (DEC-028): email OTP verification gating login (403 EMAIL_NOT_VERIFIED), forgot/reset password via emailed codes, reset revokes all sessions, hand-rolled zero-dep SMTP mailer injectable via buildApp({mailer}), migration 012 (users.email_verified grandfathered for legacy users + otp_codes), AuthPage verify/forgot/reset steps with 60s resend countdown, sign-out bug fixed via qc.clear()+window.location.replace('/'). Verified: typecheck clean, build OK, 254 tests / 0 fail (33 files), SMOKE TEST OK.
- partially completed: none.
- not started: PARKED full-analytics plan (workspace /analytics + per-project analytics + dashboard strip, hand-built SVG charts — awaiting explicit user approval); optional backlog items OPT-001/002/005/006.
- exact next action: await user direction. Git state: ALL recent work committed as 84d369b on branch feat/landing-pricing-auth-hardening and PUSHED to origin (2026-08-25); main does NOT have it yet — merge via PR or ask the user.
- files currently being modified: none (batch finished).
- known blockers: none. Operational: server startup now REQUIRES SMTP_* env vars in backend/.env.
- constraints that must not be violated: React + FSD frontend, Node.js + SQLite backend, English-only docs, no manual Mermaid, DB is source of truth, no external SaaS without approval, additive-first changes, memory updates after every unit of work, no optional work without approval.
- pending approvals: none mandatory; parked analytics plan needs explicit approval before starting.

Previous checkpoint preserved below.

Checkpoint 2026-08-16 (scope-change session, plans only):

- completed: Prompts 00–12 fully implemented and verified (75/75 tests, backend smoke 185/185, preview running). Old Prompt 13 (deployment-and-final-audit) removed from required scope; four new required plans created in prompts/13-platform-configuration.md, prompts/14-multi-project-workspace.md, prompts/15-custom-node-palette.md, prompts/16-skills-and-final-audit.md; prompts/README.md updated; memory updated (DEC-015/DEC-016, STATE.json, PROJECT_MEMORY, NEXT_ACTION, USER_REQUESTS, SESSION_LOG).
- partially completed: none — user chose "create plans only"; no implementation has started.
- not started: execution of Prompts 13–16 (dynamic platform config → multi-project workspace → custom node palette → skills + final audit).
- exact next action: when the user approves/continues, read memory, then execute prompts/13-platform-configuration.md first (types/stacks/libraries tables + migration 006, multi-type project creation, global Settings UI, FEAT-008).
- files currently being modified: none (plans + memory only).
- known blockers: none.
- constraints that must not be violated: React + FSD frontend, Node.js + SQLite backend, English-only docs, no manual Mermaid, DB is source of truth, no external SaaS, additive-only migrations (destructive changes need APR), memory updates after every unit of work, no optional work without approval.
- user requests that must be preserved: remove plan 13; add new plans for complex multi-project functionality (configurable project types/stacks/libs, multi-type projects, connected workspaces, cross-project workflow calls, customizable node palette/categories, Skills section, per-project docs); clarifying answers in DEC-016; create plans only (no implementation yet).
- pending approvals: approval to begin executing the new required scope (Prompts 13–16).

## Required Checkpoint Fields

When writing a checkpoint, include:

- completed work
- partially completed work
- not started work
- exact next action
- files currently being modified
- known blockers
- constraints that must not be violated
- user requests that must be preserved
- pending approvals