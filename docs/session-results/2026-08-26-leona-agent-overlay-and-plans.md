# Session Result — Leona Agent Overlay and Plan Messaging

**Date:** 2026-08-26  
**Project:** SpecForge Studio  
**Status:** UI and commercial messaging implemented; external provider activation pending approval/configuration

## Completed

The dashboard now exposes a global Leona Agent launcher. It opens a project-aware overlay showing the active project, the four-stage lifecycle, provider mode choices, provider-settings entry point, safety messaging, and the draft-first approval boundary. The launcher is available as a floating icon-and-label control and uses the current project name when one is selected.

The landing pricing catalog now explains the two provider modes. Free and Plus describe customer-owned provider-key usage, while Premium describes managed-provider access subject to the usage policy. Existing plan rows merge the new capability copy without replacing administrator-customized feature text on boot.

The landing pricing section now includes a Leona Agent explainer covering project context, BYOK billing, Premium managed access, and review-before-writing behavior.

## How users will use Leona

A user opens the Leona Agent control inside the dashboard, confirms the active project, and chooses either **Use my provider** or **Use SpecForge AI**. In the completed activation flow, the user then connects or selects the provider, reviews which project sources will be included, requests a draft, reviews a structured diff, and approves materialization. Leona then writes validated artifacts and regenerates Markdown, JSON, ZIP, and Presentation outputs.

The current overlay intentionally shows an honest inactive state because external provider credentials, managed-provider billing, quota enforcement, and generation routes require an approved first provider and production secret-storage configuration. It does not collect or persist a raw API key yet.

## Verification

Root typecheck passed. Focused landing, dashboard, and UI-polish tests passed: 24 tests and 80 assertions.

## Next approval

Approve OpenAI as the first managed-provider adapter and approve production secret-manager/reference-based storage. After that approval, implement the provider adapter, BYOK connection route, Premium plan entitlement, quotas/cost controls, context snapshot, structured draft validation, review/approval API, and artifact materialization.

## Provider Settings follow-up

The dashboard now has a real navigation path for provider configuration: **Settings → Providers**, available directly from the Leona Agent overlay through **Provider settings**.

The new Provider Settings panel includes a provider selector, masked API-key input, validation action, connection status, BYOK billing explanation, Premium managed-provider explanation, and a visible security boundary. The preview intentionally discards the entered key because the secure backend vault endpoint has not yet been approved or implemented; it does not write credentials to local storage, exports, logs, or the database.

Root typecheck and the focused landing/dashboard/UI test suite still pass: 24 tests and 80 assertions. The remaining work is to replace the safe preview validation with an authenticated backend endpoint that encrypts a vault reference, performs provider validation server-side, returns only masked metadata, and connects the result to Leona generation.
