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

## Forbidden Actions

- Do not skip memory updates.
- Do not ask the user where to continue if memory already contains the answer.
- Do not silently stop when all required work is complete.
- Do not invent mandatory work.
- Do not start optional work without approval.
- Do not violate approved decisions.