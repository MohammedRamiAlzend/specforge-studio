---
id: SCP-001
type: product-scope
phase: 01-product-definition
status: approved (APR-001)
owner: engineering
---

# Scope — SpecForge Studio v1

## 1. In Scope (v1)

1. **Project lifecycle**: create and manage projects; projects may target web, mobile, API, or AI products and may start from scratch (greenfield).
2. **Requirements and use cases**: structured REQ and UC entities with stable IDs.
3. **Visual modeler**: canvas-based modeling of workflows (WF), data entities (DB), sequence flows (SEQ), and architecture (ARCH).
4. **Diagram generation**: automatic Mermaid output for workflow, sequence, ERD, and architecture diagrams; no manual Mermaid authoring path for end users.
5. **Document generation**: Markdown engineering documentation, English only, with YAML frontmatter and stable IDs.
6. **Markdown workspace export**: portable generated workspace (00-meta … 09-agent-plans, templates/).
7. **Roadmap planning**: milestones (MS) derived from requirements and dependencies.
8. **Agent task packaging**: agent-neutral task packs (TASK) with executable checklists (CHK), verification steps, and definitions of done.
9. **Governance and approvals**: approval gates (APR) for final requirements, architecture, schema, and API contracts; decision records (ADR).
10. **Traceability**: ID registry and coverage reports linking requirements → use cases → tasks → tests.
11. **Hybrid storage**: SQLite as source of truth; Markdown as regenerable output.
12. **Frontend**: React + TypeScript + Vite with Feature-Sliced Design.
13. **Backend**: Node.js + TypeScript + Fastify + better-sqlite3 + Zod.

## 2. Explicitly Deferred (see non-goals.md)

Real-time collaboration, external integrations, automatic task execution, multi-tenant SaaS hosting, plugin marketplace, and non-English output are **out** of v1.

## 3. Scope Rules

- Every in-scope capability must be traceable to a module (MOD-01 … MOD-08) and a phase in the prompt sequence.
- Scope changes that materially affect the product require explicit user approval before implementation.
- Drafts may be generated automatically; final artifacts require recorded approval (APR).
