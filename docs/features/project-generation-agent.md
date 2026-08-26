# Project Generation Agent — Provider and Operations Design

**Status:** Proposal for approval  
**Date:** 2026-08-26  
**Author:** Manus AI

## Product assessment

The proposed agent is a strong fit for SpecForge because it can read the project’s Business Model Canvas, live Presentation outline, and generated Markdown workspace together. This gives the agent strategic, product, technical, delivery, and governance context instead of treating project generation as a single unstructured prompt.

The agent should not immediately execute arbitrary code. The safe product flow is:

> **Context snapshot → structured generation draft → validation and traceability preview → user approval → materialization into project artifacts → Markdown/export.**

The first generation result should be a reviewable plan containing project metadata, Business Model blocks, requirements, use cases, workflows, entities, API endpoints, architecture components, roadmap phases, tasks, skills, and generated Markdown. The user should be able to accept, reject, or regenerate the draft before any existing project data is changed.

## Recommended commercial model

A hybrid model is better than choosing only customer-owned keys or only a SpecForge-managed provider.

| Capability | Free | Plus | Premium / Team |
|---|---|---|---|
| Customer-owned provider key | Limited BYOK generations | Higher BYOK limits | Unlimited or policy-based BYOK |
| SpecForge-managed provider | Not included, or one tightly capped trial | Included monthly quota | Larger quota, stronger models, priority queue |
| Model choice | Customer provider decides | Admin-approved managed models | Admin-approved premium models plus team policy |
| Usage visibility | Personal usage | Personal usage and quota | Personal, project, and organization usage |
| Over-quota behavior | Stop with upgrade message | Stop or buy an approved top-up | Configurable hard cap and overage policy |

A managed provider should be a paid-plan capability because SpecForge pays the model bill, absorbs provider failures, and assumes responsibility for quota abuse, data handling, and cost control. BYOK should remain available because it lowers SpecForge’s variable cost and gives privacy-sensitive or enterprise customers control over provider accounts.

The plan catalog should not promise unlimited managed generations. It should expose a monthly allowance, maximum context size, maximum output size, allowed model tier, and whether background generation is enabled.

## Provider study

The initial managed-provider candidates are OpenAI, Anthropic, and Google Gemini. Pricing changes frequently, so the admin console should store provider/model pricing as configuration rather than hard-coding prices in the frontend.

| Provider | Relevant current model examples | Published standard token pricing | Strengths for SpecForge | Main concerns |
|---|---|---:|---|---|
| **OpenAI** | `gpt-5-mini`, `gpt-5` | `gpt-5-mini`: $0.25 input / $2 output per million tokens; `gpt-5`: $1.25 / $10 | Strong structured-output ecosystem, broad tooling, predictable OpenAI-compatible integration, good default for a first managed provider | Provider pricing and model names change; managed data processing and retention terms must be documented |
| **Anthropic** | Claude Haiku 4.5, Claude Sonnet 4.6 | Haiku 4.5: $1 input / $5 output; Sonnet 4.6: $3 / $15 per million tokens | Strong long-form reasoning and product/technical synthesis; good candidate for a premium reasoning tier | Higher cost for a full project context; provider-specific request and token behavior needs an adapter |
| **Google Gemini** | Gemini Flash family | Gemini 3.7 Flash paid tier: $0.75 input / $3.75 output per million tokens through December 31, 2026, according to the published page | Long-context and multimodal options, attractive batch pricing, useful future path for diagrams and images | Paid/free data-improvement terms differ; provider-specific API and model lifecycle require an adapter |

For the first managed release, **OpenAI is the most practical default provider**, using a low-cost model for context extraction and a stronger model only for the final structured project draft. Anthropic is a strong premium fallback after the provider adapter and cost controls are proven. Gemini should remain a planned adapter, especially if multimodal project inputs become a priority. This is a recommendation, not an implementation approval.

All provider prices above are from official pricing pages retrieved on 2026-08-26 and must be revalidated before production pricing is published. OpenAI states that API business data is not used to train models by default and describes encryption and compliance controls; Gemini’s paid tier states that content is not used to improve products, while its free tier has different terms. Customers must see the applicable provider and data-processing disclosure before sending project context.

## Provider modes

### Customer-owned key

A user or organization administrator enters a provider type, API base URL when applicable, model, and API key in an authenticated settings flow. The browser sends the key only over TLS to the backend. The backend validates the key with a minimal model-list or low-cost test request, stores only an encrypted secret or a reference to a production secret manager, and never returns the raw key.

The UI should show only the provider, model, masked suffix, created date, last successful use, and current health. The key must not be stored in localStorage, browser state persisted to disk, Markdown exports, logs, event payloads, error messages, or generated prompts. Users should be able to revoke and replace a key.

### SpecForge-managed provider

SpecForge stores its provider credential only in the production secret manager or deployment secret environment. Users never see the managed key. The backend selects a provider/model according to plan policy, records usage metadata, enforces per-user/project/organization quotas, and sends the selected project context through a provider adapter.

The admin can change the active provider and model without exposing the credential. A provider change should be versioned, audited, and tested with a health check before activation. Existing in-flight runs keep their provider snapshot so an admin change cannot silently change a running generation.

## Admin control plane

The admin dashboard should have a dedicated **AI Providers** area with these controls:

| Admin control | Purpose |
|---|---|
| Provider registry | Enable/disable OpenAI, Anthropic, Gemini, and future OpenAI-compatible providers |
| Model catalog | Store model ID, input/output prices, context limit, capability flags, and active status |
| Managed-provider routing | Choose the default model by plan and generation stage |
| Quotas | Set monthly generations, token ceilings, concurrency, and project-size limits |
| Cost controls | Configure internal cost estimates, margin target, hard stop, and alert thresholds |
| Usage dashboard | Inspect aggregate tokens, generations, estimated cost, failures, and top projects; never raw prompts or keys by default |
| Key health | Show provider health, last validation, last failure, and masked key metadata |
| Kill switch | Disable managed generations globally or by provider/model |
| Audit | Record provider changes, quota changes, key rotations, failed validations, and kill-switch events |
| Privacy policy | Configure the disclosure shown before a project context is sent to a provider |

The admin should not be able to view customer-owned raw keys. A support workflow may revoke a key or mark it invalid, but the customer must re-enter the secret.

## Generation lifecycle

1. The user chooses **Generate project with Agent** from a project or an empty workspace.
2. SpecForge creates a context snapshot from the database: project metadata, BMC notes, live Presentation data, latest generated Markdown files, requirements, model graphs, roadmap state, and governance constraints.
3. Sensitive values are filtered from the snapshot. Provider credentials, session tokens, passwords, SMTP values, full payment data, and internal secret configuration never enter the prompt.
4. The selected provider adapter receives a strict structured-output request. The response must include stable proposed artifact keys, source references, confidence/warnings, and no executable shell commands.
5. SpecForge validates the response against Zod schemas and project rules. Invalid output is rejected with a recoverable error; it is not partially written.
6. The user reviews a diff-like draft. Existing artifacts are protected by default. New artifacts are staged, and replacements require explicit confirmation.
7. On approval, SpecForge materializes the draft through existing CRUD services, records traceability links, generates Markdown, and exposes JSON/Markdown/ZIP exports.
8. The run stores lifecycle status, provider/model metadata, token usage, estimated cost, errors, and output artifact IDs. It does not store raw API keys or unredacted prompts by default.

## Approval boundary

This document recommends the hybrid product model and OpenAI-first managed provider, but implementation of provider credentials, billing, plan entitlements, or external API calls requires explicit approval of the selected provider and secret-storage approach. The dashboard collapse control is independent and can ship without that approval.

## References

[1]: https://developers.openai.com/api/docs/pricing "OpenAI API Pricing"
[2]: https://openai.com/enterprise-privacy/ "OpenAI Enterprise Privacy"
[3]: https://platform.claude.com/docs/en/about-claude/pricing "Anthropic Claude Platform Pricing"
[4]: https://ai.google.dev/gemini-api/docs/pricing "Google Gemini API Pricing"
