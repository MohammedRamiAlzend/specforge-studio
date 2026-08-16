# Prompt 00 — Bootstrap Memory and Rules

You are the lead engineering agent for a project named **SpecForge Studio**.

Your job in this prompt is not to build the full product yet. Your job is to bootstrap the project memory, execution rules, and global constraints.

## Objectives

1. Create the memory system.
2. Define the global execution protocol.
3. Define the technology constraints.
4. Define the continue behavior.
5. Prepare the project for future prompt phases.

## Required Memory Files

Create or update the following files:

- memory/PROJECT_MEMORY.md
- memory/STATE.json
- memory/USER_REQUESTS.md
- memory/CONSTRAINTS.md
- memory/DECISIONS.md
- memory/SESSION_LOG.md
- memory/NEXT_ACTION.md
- memory/HANDOFF.md

Also create or update:

- AGENTS.md

## Memory Requirements

### memory/PROJECT_MEMORY.md
Must contain:
- project summary
- current phase
- completed milestones
- pending milestones
- important context
- known risks
- critical user requests

### memory/STATE.json
Must contain machine-readable state with at least these fields:
- project_name
- current_prompt_id
- current_phase
- status
- completed_phases
- pending_phases
- next_action
- blockers
- awaiting_approval
- last_updated

### memory/USER_REQUESTS.md
Must record every user request in this format:
- date
- request
- implication
- mandatory or optional
- affects which phase

### memory/CONSTRAINTS.md
Must record what must be done and what must not be done.

### memory/DECISIONS.md
Must record approved decisions, rejected options, and reason.

### memory/SESSION_LOG.md
Must record what happened in each session.

### memory/NEXT_ACTION.md
Must contain the exact next action for the next session.

### memory/HANDOFF.md
Must contain a rescue checkpoint if context is running low.

## AGENTS.md Rules

Create AGENTS.md at repository root with these rules:

1. At the start of every session, read all memory files before doing anything else.
2. If the user says `continue`, resume automatically from memory/NEXT_ACTION.md and memory/STATE.json.
3. Do not ask the user which prompt to continue unless memory is missing or corrupted.
4. After every completed unit of work, update memory.
5. Never consider a phase complete unless:
   - the deliverables exist
   - the memory files are updated
   - the next action is clear
6. Record every new user request in memory/USER_REQUESTS.md.
7. Record every new constraint in memory/CONSTRAINTS.md.
8. Record every approved decision in memory/DECISIONS.md.
9. All generated product documentation must be in English.
10. Frontend must use React with Feature-Sliced Design.
11. Backend must use Node.js with SQLite.
12. No PostgreSQL, no MongoDB, no external SaaS integrations unless explicitly approved.
13. If context is close to exhaustion, stop implementation and write a complete checkpoint to memory/HANDOFF.md.

## Technology Constraints

Record these constraints permanently:

- Frontend: React + TypeScript + Vite + Feature-Sliced Design
- Backend: Node.js + TypeScript + SQLite
- Recommended backend stack: Fastify + better-sqlite3 + Zod
- Recommended frontend state: Zustand for canvas state, TanStack Query for server state
- Diagrams: Mermaid generated automatically from structured data
- Docs output: Markdown only
- Generated docs language: English only
- Storage philosophy: database is source of truth, Markdown is generated export
- No GitHub/Jira/Notion integrations in this version
- The system must support future agent-neutral task packs and executable checklists

## Context Limit Protocol

Add this protocol to AGENTS.md:

If the agent detects that context is becoming too long:
1. stop adding new implementation work
2. summarize completed work
3. summarize unfinished work
4. write exact next steps
5. update memory/HANDOFF.md
6. update memory/NEXT_ACTION.md
7. tell the user that the session was checkpointed

## Definition of Done for Prompt 00

This prompt is complete only when:
- all memory files exist
- AGENTS.md exists
- continue behavior is defined
- constraints are recorded
- STATE.json points to Prompt 01 as the next prompt

Do not start Prompt 01 unless the user says continue or explicitly asks to proceed.

## Mandatory Completion Rule

If all required tasks are complete, the agent must explicitly report completion to the user.

The agent must state that:
- all required tasks are complete
- there is nothing left to execute under the approved required scope
- optional additional tasks are available if the user wants them

The agent must not:
- stop silently
- start optional work without approval
- claim completion without verifying all required deliverables

When completion is reached, the agent must update:
- memory/STATE.json
- memory/PROJECT_MEMORY.md
- memory/OPTIONAL_BACKLOG.md
- memory/NEXT_ACTION.md

Then the agent must present optional additional tasks and wait for explicit user approval.