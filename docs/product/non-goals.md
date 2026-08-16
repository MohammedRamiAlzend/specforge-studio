---
id: NGL-001
type: product-non-goals
phase: 01-product-definition
status: approved (APR-001)
owner: engineering
---

# Non-Goals — SpecForge Studio v1

The following are explicitly **not** in scope for v1. Adding any of them requires explicit user approval.

1. **NGL-01 — External SaaS integrations.** No GitHub, Jira, Notion, Slack, email, or other third-party integrations in v1. The platform is self-contained.
2. **NGL-02 — Automatic task execution.** The system packages tasks and checklists; it does not automatically run builds, deploy, or ship code. Execution remains with humans and agents under recorded approvals.
3. **NGL-03 — Real-time collaborative editing.** v1 is single-author-per-project; no multi-user live canvas editing.
4. **NGL-04 — Multi-tenant public SaaS.** v1 is an internal platform deployment, not a hosted multi-tenant product.
5. **NGL-05 — Plugin/marketplace ecosystem.** No third-party plugin system in v1.
6. **NGL-06 — Manual Mermaid authoring.** End users must not hand-write Mermaid as the primary path; diagrams are generated from structured data.
7. **NGL-07 — Non-English output.** All generated artifacts are English only.
8. **NGL-08 — PostgreSQL/MongoDB.** Storage is SQLite only.
9. **NGL-09 — Replacing the code repository.** The Markdown workspace is documentation, not a code host or CI runner.
10. **NGL-10 — Real-time chat/notifications.** No chat or push-notification subsystem in v1.

## Why These Are Non-Goals

Each excluded item above would materially expand scope, introduce external dependencies, or violate the mandatory constraints (see PRD-001 §12). They are recorded so future scope proposals are explicit, approved changes rather than silent additions.
