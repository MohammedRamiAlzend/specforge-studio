# CONSTRAINTS

This file records all permanent constraints and restrictions.

The agent must read this file before every session and must not violate it.

## Mandatory Constraints

- Frontend must use React with Feature-Sliced Design.
- Backend must use Node.js with SQLite.
- Generated documentation must be English only.
- Users must not write Mermaid manually.
- Database is the source of truth.
- Markdown is generated output.
- No external SaaS integrations unless explicitly approved.
- Agent task packs must be agent-neutral.
- Agent task packs must include executable checklists.
- The agent must update memory after every meaningful unit of work.
- The agent must not start optional tasks without explicit approval.

## Governance Constraints (adopted 2026-08-16)

- MASTER_PROMPT.md at repository root is the governing execution protocol (DEC-001). It must be read at session start along with AGENTS.md and the memory files.
- Human approval is required before finalizing: requirements, architecture, database schema, API contracts, security-sensitive workflows, production-related decisions, destructive database migrations, optional tasks, and material scope changes.
- Task packs must include concrete, sequential executable checklists and must be agent-neutral (Claude, ChatGPT, Qwen, or compatible agents).

## Forbidden Actions

- Do not skip memory updates.
- Do not ask the user where to continue if memory already contains the answer.
- Do not silently stop when all required work is complete.
- Do not invent mandatory work.
- Do not start optional work without approval.
- Do not violate approved decisions.