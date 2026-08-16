# PROJECT_MEMORY

## Project Summary

Project name: SpecForge Studio

Project type: Internal engineering platform

Purpose:
Build a full software engineering lifecycle platform that converts visual planning into structured documentation, diagrams, roadmaps, and agent-executable task packs.

Core product capabilities:
- Visual modeling without manual Mermaid writing
- Automatic generation of Markdown engineering documents
- Automatic generation of workflows, sequence diagrams, ERD, and architecture diagrams
- Full traceability through stable IDs
- Automatic roadmap generation
- Agent-neutral executable checklists
- Human approval gates combined with automation
- Hybrid storage behavior with database as source of truth and Markdown as generated output

## Technology Constraints

Frontend:
- React
- TypeScript
- Vite
- Feature-Sliced Design

Backend:
- Node.js
- TypeScript
- SQLite

Documentation output:
- Markdown only
- English only

Diagram output:
- Mermaid generated automatically from structured data

Storage:
- Database is the source of truth
- Markdown workspace is generated/exported output

Integrations:
- No external SaaS integrations unless explicitly approved

Agent behavior:
- Agent-neutral
- Supports Claude, ChatGPT, Qwen, or compatible agents
- Produces executable checklists

## Current State

Current phase:
- bootstrap

Current prompt:
- 00-bootstrap-memory-and-rules

Status:
- not_started

## Completed Work

No required work has been completed yet.

## Pending Work

Required phases pending:
- 00-bootstrap-memory-and-rules
- 01-product-definition
- 02-domain-ontology-and-ids
- 03-markdown-workspace-spec
- 04-database-schema
- 05-backend-core
- 06-frontend-foundation-fsd
- 07-visual-modeler
- 08-diagram-generation
- 09-document-generation
- 10-roadmap-and-agent-tasks
- 11-governance-and-approvals
- 12-testing-and-validation
- 13-deployment-and-final-audit

## Blockers

No blockers currently recorded.

## User Requests

No user requests recorded yet in this memory file.

All future user requests must be recorded in:
- memory/USER_REQUESTS.md

## Constraints

Mandatory constraints:
- Frontend must use React with Feature-Sliced Design.
- Backend must use Node.js with SQLite.
- Generated documents must be English only.
- No manual Mermaid writing by end users.
- Database is source of truth.
- Markdown is generated output.
- No external integrations unless approved.
- Agent task packs must be executable and agent-neutral.

## Decisions

No approved decisions recorded yet.

All future decisions must be recorded in:
- memory/DECISIONS.md

## Next Action

Execute Prompt 00 and initialize the full memory system.

## Completion Policy

When all required tasks are complete, the agent must not stop silently.

The agent must:

1. Verify that all required phases are complete.
2. Verify that all deliverables exist.
3. Verify that all definition-of-done conditions are satisfied.
4. Update memory files.
5. Explicitly tell the user that all required tasks are complete.
6. State clearly that there is nothing left to do under the approved required scope.
7. Propose optional additional tasks.
8. Wait for explicit user approval before starting any optional task.

The agent must never start optional work without approval.