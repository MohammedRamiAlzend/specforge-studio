# Session Result — Navigation Collapse and Project Generation Agent Design

**Date:** 2026-08-26  
**Project:** SpecForge Studio  
**Status:** Navigation implemented; agent architecture proposed for approval

## Dashboard navigation

The dashboard sidebar now has a desktop **Collapse navigation / Expand navigation** control with a double-chevron icon. Collapsed mode becomes an icon rail, retains active-route indicators, exposes item tooltips, changes the main-content margin, and persists the preference in browser local storage. Mobile navigation continues to open as a full-width drawer.

Focused dashboard and UI-polish tests passed: 10 tests and 25 assertions. Root typecheck passed.

## Project generation agent

The proposed agent reads the project’s Business Model Canvas, live Presentation outline, generated Markdown workspace, requirements, model graphs, roadmap, tasks, skills, and governance context. It should produce a structured draft rather than execute arbitrary code immediately:

1. Context snapshot from database-backed project artifacts.
2. Sensitive-value filtering and provider disclosure.
3. Structured AI draft with stable artifact keys and source references.
4. Zod validation and traceability checks.
5. User review and diff-like approval.
6. Materialization through existing artifact services.
7. Markdown, JSON, ZIP, and presentation outputs.

## Commercial recommendation

The recommended commercial model is hybrid. Customer-owned provider keys remain available with plan-based limits, while SpecForge-managed provider access becomes a paid-plan capability with quotas, model tiers, usage visibility, cost ceilings, and a kill switch. Managed generations must not be described as unlimited until unit economics are validated.

The first managed-provider candidate is OpenAI because it offers a practical structured-output and tooling path with a low-cost model tier and a stronger reasoning tier. Anthropic is a strong premium adapter candidate, and Google Gemini is attractive for long-context and future multimodal support. Pricing and data terms must be revalidated before launch.

## Admin responsibilities

The admin control plane should manage provider registry, model catalog, plan entitlements, token and generation quotas, cost alerts, managed-provider routing, key health, kill switches, privacy disclosures, and audit events. Admins must never see customer-owned raw API keys; they may revoke or mark a key unhealthy, after which the customer must replace it.

## Approval boundary

Navigation work is implemented. Provider credentials, secret storage, managed-provider billing, and external API routes require explicit approval of the first provider and storage method before implementation. The detailed proposal is in `docs/features/project-generation-agent.md`.

