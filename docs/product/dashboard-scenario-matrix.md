# Dashboard Scenario Matrix and Product Design Direction

**Status:** Proposed implementation contract  
**Date:** 2026-08-25  
**Scope:** Dashboard, authentication, project creation, Business Model, Presentation, billing, and operational administration

## Product principle

Every system state must answer three questions immediately: **What happened? What does it mean? What can I do next?** A raw backend code such as `PLAN_LIMIT_REACHED` must never be the primary user experience. It should become a calm explanation, a visible limit indicator, and one relevant action.

## Core user journey

The dashboard should guide a user through one simple sequence:

> **Create or select a project → define the Business Model → add product evidence → open the generated Presentation.**

Business Model and Presentation are not separate top-level objects in the current domain model. The Business Model stores editable notes per project. The Presentation is generated live from the project, Business Model notes, requirements, architecture artifacts, roadmap milestones, team members, and delivery metrics. The interface must therefore use “Create Business Model” to mean “open the empty canvas for this project” and “Generate Presentation” to mean “open the live deck generated from this project.”

## Scenario matrix

| Scenario | User-visible state | Primary action | Secondary action |
|---|---|---|---|
| Guest opens `/` | Public landing page with product value and clear Start for free CTA | Register | Sign in |
| Guest opens protected dashboard | Redirect to sign in with return path preserved | Sign in | Register |
| Valid sign-in | Dashboard opens with a personalized welcome and selected/most recent project | Continue project | Create project |
| Invalid credentials | Inline error: “Email or password is incorrect.” Do not reveal which field failed | Try again | Forgot password |
| Unverified email | Clear verification step with resend cooldown and destination email | Enter code | Change email |
| OTP expired or incorrect | Explain expiry/attempts without losing form data | Request new code | Back to sign in |
| Too many OTP or auth attempts | Rate-limit notice with countdown/cooldown | Wait and retry | Contact support/help |
| No projects | Guided empty state explaining the project-first sequence | Create project | View product tour/help |
| Project creation succeeds | Success toast or inline confirmation and redirect to project overview | Create Business Model | View project |
| `PLAN_LIMIT_REACHED` | Amber limit card: “You are using 1 of 1 Free project.” | Upgrade to Plus | Open existing project |
| Project creation validation error | Field-level errors near the relevant input, not a generic page error | Fix fields | Cancel |
| Project list request fails | Non-destructive error state that keeps navigation available | Retry | View help/status |
| Business Model is empty | Canvas introduction with examples and “Add your first note” per block | Add note | Use starter template |
| Business Model contains notes | Counts per block, last-updated information, and clear editing controls | Continue editing | Generate Presentation |
| Business Model mutation fails | Preserve typed content and show an actionable inline error | Retry save | Cancel |
| Presentation has sparse source data | Explain which sources are missing and show a useful partial deck | Add Business Model data | Add requirements |
| Presentation is populated | Show slide count, source freshness, and download/print actions | Present or download | Edit source data |
| Presentation generation fails | Preserve the page and show retry with a diagnostic reference | Retry | Return to project |
| Free plan at limit | Dashboard shows usage before the user clicks New project | Upgrade | Use existing project |
| Paid plan active | Show plan, renewal date, masked card, and manage billing link | Manage billing | Continue work |
| Subscription expired | Persistent but non-blocking renewal banner | Reactivate | Continue within Free limits |
| Checkout validation failure | Tell the user whether card/expiry/plan input is invalid without clearing safe fields | Correct payment data | Choose another plan |
| Checkout success | Confirm activated plan, period, and masked card | Return to dashboard | View billing |
| API/session expires | Return to sign-in with a clear “Your session expired” message and return path | Sign in again | Return home |
| Workspace permission denied | Treat as “This project is unavailable” rather than leaking existence | Return dashboard | Request access |
| SMTP unavailable | Do not crash unrelated dashboard functionality; show email delivery readiness only where relevant | Retry email | Use support/help |
| Backend unavailable | Global recoverable error shell with retry and last-known navigation | Retry | Return landing |

## Dashboard information architecture

The dashboard should contain five stable zones in this order:

| Zone | Purpose | Content |
|---|---|---|
| Welcome header | Establish context and one primary action | Greeting, concise value statement, New project |
| Continue working | Reduce decision fatigue | One selected project with Create Business Model and Generate Presentation actions |
| Progress snapshot | Explain project health without overwhelming | Four or five meaningful KPIs, not every metric |
| Your projects | Support switching and management | Search/filter/sort, compact project cards, status and freshness |
| Attention and activity | Surface exceptions after the main work path | Blocked tasks, critical issues, approvals, milestones, activity |

The dashboard should not make users decode internal labels such as “quota,” “artifact,” or “governance” before they know what to do. Technical terms can remain inside the relevant workspace, but dashboard copy should use plain actions: **Create, Continue, Review, Fix, Share, Upgrade**.

## Visual direction

The new design should be **quiet, structured, and product-led** rather than a collection of unrelated cards. Use one light workspace canvas, one contextual hero with strong contrast, one accent color for the primary action, and one warning color for limits/errors. The current implementation uses a light hero with restrained forge/indigo glow so the dashboard feels spacious rather than solid or heavy. Labels should have strong contrast, inputs should use white backgrounds with slate borders, focus states should use a visible forge ring, and secondary actions should not compete with the primary action.

Cards should be reserved for decisions and summaries. Avoid putting every metric in a separate bordered box. Use section headings, whitespace, restrained borders, and clear hierarchy. Empty states should teach the next action. Success states should confirm the result and offer the next logical step. Error states should be local, specific, recoverable, and never erase user input.

## Billing and administration requirements

The current product uses a simulated checkout and local plan/subscription/invoice data. The user experience can be made coherent without a real payment provider, but operational surfaces are still required if it will be managed as a product. The current implementation deliberately keeps checkout non-charging and labels it as a demo.

| Surface | Required capability |
|---|---|
| User billing | View current plan, usage, renewal/expiry, masked payment details, invoices, upgrade/reactivate/cancel |
| Admin plan catalog | View and edit plan name, price, features, active state, popular flag, and limits |
| Admin subscriptions | Search users, inspect status/period, cancel/reactivate with audit trail |
| Admin payments | Inspect simulated invoices/checkout outcomes; real charging requires a separately approved provider and security review |
| Admin operations | Readiness, SMTP status, database status, migration version, backup timestamp, and audit events |
| Admin access control | Admin role, route protection, audit logging, and no exposure of password/card secrets |

No real charging should be enabled without explicit provider approval, secret management, webhook verification, refund policy, payment-security review, and a global admin role. Until those prerequisites exist, the product should expose simulated checkout outcomes only and should not imply that a card was charged.
