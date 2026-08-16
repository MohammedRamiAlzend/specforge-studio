---
id: VSN-001
type: product-vision
phase: 01-product-definition
status: approved (APR-001)
owner: engineering
---

# Vision — SpecForge Studio

## 1. Vision Statement

Make engineering planning **visual, structured, and self-documenting** so that a project's specification, diagrams, roadmap, and executable tasks are all generated from one source of truth — and never drift apart.

## 2. Mission

Convert visual planning and structured specifications into engineering documentation, diagrams, roadmaps, and executable task packs automatically, with full traceability and governed approvals — for web, mobile, API, and AI projects.

## 3. What Success Looks Like

- A spec author models a project visually and the system produces the entire engineering workspace.
- Developers and AI agents execute generated task packs with concrete checklists instead of vague prompts.
- Any artifact can be traced to the requirement that produced it.
- Approvals and decisions are recorded, not remembered.

## 4. Guiding Principles

1. **Database is the source of truth.** Markdown and diagrams are generated output.
2. **No manual Mermaid.** Diagrams are produced from structured data.
3. **Agent-neutral execution.** Task packs work with any capable agent.
4. **Governed automation.** Automation drafts; humans approve.
5. **English-only output.** All generated artifacts are English.
6. **Stable IDs.** Every artifact is traceable across its whole life.
7. **No external SaaS in v1.** The platform is self-contained.

## 5. Non-Vision

SpecForge Studio is not:

- a code editor or CI/CD runner
- a replacement for the user's actual code repository
- a chat assistant
- a multi-tenant public SaaS in v1

It plans and governs engineering work; it does not execute builds or ship code.
