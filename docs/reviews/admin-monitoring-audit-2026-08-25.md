---
id: AUDIT-002
title: Admin and operations monitoring audit
type: audit
status: in_progress
updated: 2026-08-26
---

# Admin and Operations Monitoring Audit

## Executive conclusion

SpecForge Studio now has the first protected global admin control plane, but the admin monitoring requirement is **not yet release-complete**. The implementation covers global-admin authorization, operations status, platform counts, plan catalog visibility and editing, subscription inspection and lifecycle actions, masked invoice inspection, and recent audit events. It intentionally does not expose secrets or enable real payment charging.

The remaining release gaps are deployment-level rather than a missing route: a signed Windows artifact must be published, the backup helper must be scheduled and produce its first status record, plan allowance limits still need a first-class schema field if operators must edit them, and the real operator account must be granted access through `ADMIN_EMAILS` or a controlled database change.

## Current implementation versus required surface

| Required surface | Current status | Evidence | Remaining gap |
|---|---|---|---|
| User billing | Implemented | User-scoped subscription, invoice, cancellation, checkout, and plan-limit flows in `backend/src/modules/billing.ts` and Billing settings. | Keep simulated-payment labeling explicit until a provider is approved. |
| Global admin role | Implemented | Additive `users.is_admin` field, migration `016_global_admin.sql`, exact-email `ADMIN_EMAILS` bootstrap, and `requireAdmin`. | Configure the production operator account and review access periodically. |
| Admin access control | Implemented | Centralized `/admin/*` authorization branch denies anonymous and normal users with 401/403 responses. | Add an operational role-grant/revocation procedure outside the normal user UI. |
| Admin operations | Implemented, limited | `GET /admin/overview` reports DB status, SMTP configuration status, migration metadata, safe counts, backup status/age, and recent audit events. `ops/backup.sh` writes `last-backup.json` after integrity-verified success. | Schedule the helper and verify a real status record in production. |
| Admin plan catalog | Implemented | Protected `GET /admin/plans` and `PATCH /admin/plans/:id` support safe catalog metadata, prices, features, active state, popularity, and ordering. | Add editable allowance limits only after the billing model moves limits into the database. |
| Admin subscriptions | Implemented | Protected filtered subscription search plus audited cancel/reactivate actions. | Real provider synchronization remains out of scope. |
| Admin payments | Implemented, masked | Protected `GET /admin/invoices` shows billing history with only card last-four values. | Real payment provider webhooks and reconciliation remain out of scope. |
| User workspace dashboard | Implemented | `GET /dashboard/summary` aggregates projects, quota, blocked tasks, issues, approvals, and milestones. | This is not an admin dashboard and must not be described as one. |
| Project health analytics | Implemented | `GET /projects/:id/health` reports project-level delivery health. | This is project telemetry, not platform operations monitoring. |

## Implemented safety boundary

Real payment charging remains out of scope. The product currently uses simulated checkout and local billing records, which is consistent with the no-unapproved-SaaS constraint. The admin control plane can inspect and change local subscription state, but it does not contact a payment provider.

The admin API never returns password hashes, session tokens, full card numbers, CVC values, SMTP passwords, or other secret material. The Windows shell also runs with context isolation, sandboxing, and disabled Node integration.

## Verification evidence

The focused admin regression suite covers administrator success, anonymous and normal-user denial, secret redaction, and audited subscription cancellation/reactivation. The frontend production build, typecheck, and focused dashboard/account/UI tests pass after the admin route and Windows download CTA integration.

## Remaining implementation sequence

1. Configure the production `ADMIN_EMAILS` value and verify that the operator account is email-verified.
2. Schedule `ops/backup.sh` and verify that `/admin/overview` reports a fresh backup timestamp and age.
3. Decide whether plan allowance limits should become database-backed; only then expose them as editable admin controls.
4. Approve a real payment provider, webhook verification, refund policy, and payment-security review before adding charging.
5. Produce and sign the Windows installer, publish its release URL, and set `VITE_WINDOWS_DOWNLOAD_URL` before enabling the landing download link.

## Completion decision

The protected admin monitoring surface is **implemented but not release-complete**. It is safe to continue staging and testing. It should not be described as fully operational until a scheduled backup has produced fresh telemetry, production admin configuration is verified, and the signed desktop release process is complete.
