# AGENTS.md

## Purpose

This repository uses a memory-driven execution protocol.

Every agent working on this project must read the project memory before doing anything.

The goal is to preserve context across sessions, prevent missing work, prevent duplicated work, and ensure the agent always knows:
- what has been completed
- what is currently in progress
- what must be done next
- what the user approved
- what the user forbade
- whether the project is fully complete

## Mandatory Startup Protocol

At the start of every session, the agent must read these files in this order:

1. AGENTS.md
2. memory/PROJECT_MEMORY.md
3. memory/STATE.json
4. memory/NEXT_ACTION.md
5. memory/USER_REQUESTS.md
6. memory/CONSTRAINTS.md
7. memory/DECISIONS.md
8. memory/SESSION_LOG.md
9. memory/HANDOFF.md
10. memory/OPTIONAL_BACKLOG.md

If any memory file is missing, the agent must create it using the approved templates and record that it was initialized.

## Continue Command

When the user says:

continue

the agent must automatically resume from the stored memory state.

The agent must not ask:
- which prompt should I continue?
- which phase should I resume?
- where did we stop?

The agent must determine the answer from:
- memory/STATE.json
- memory/NEXT_ACTION.md
- memory/PROJECT_MEMORY.md

If memory is missing or corrupted, the agent must say so clearly and then rebuild memory from available project evidence before continuing.

## Status Command

When the user says:

status

the agent must report:
- current project state
- current prompt or phase
- completed work
- pending work
- blockers
- awaiting approvals
- next action
- user constraints that must be respected
- whether all required work is complete

The agent must not modify code when responding to status unless explicitly requested.

## Approval Command

When the user says:

approve

the agent must check whether there is a pending approval.

If there is a pending approval:
- mark it approved in memory/DECISIONS.md
- update memory/STATE.json
- continue automatically from the next approved action

If there is no pending approval:
- report that nothing is waiting for approval

## Memory Update Protocol

The agent must update memory after every meaningful unit of work.

At minimum, these files must be kept current:

- memory/PROJECT_MEMORY.md
- memory/STATE.json
- memory/NEXT_ACTION.md
- memory/SESSION_LOG.md

If the user gives a new request, the agent must record it in:

- memory/USER_REQUESTS.md

If the user gives a new rule, restriction, or preference, the agent must record it in:

- memory/CONSTRAINTS.md

If a decision is approved or rejected, the agent must record it in:

- memory/DECISIONS.md

If context is becoming too long, the agent must write a rescue checkpoint in:

- memory/HANDOFF.md

## Execution Rules

The agent must follow these rules at all times:

1. Do not start implementation before the relevant plan is clear.
2. Do not skip required phases.
3. Do not invent new mandatory requirements.
4. Do not violate constraints stored in memory/CONSTRAINTS.md.
5. Do not override approved decisions unless the user explicitly changes them.
6. Do not consider a task complete unless its definition of done is satisfied.
7. Do not leave memory outdated.
8. Do not silently stop when required work is complete.

## Project Technology Constraints

Unless explicitly changed by the user, these constraints are mandatory:

- Frontend must use React with Feature-Sliced Design.
- Backend must use Node.js with SQLite.
- Generated documentation must be in English only.
- Diagrams must be generated automatically from structured data.
- Users must not be required to write Mermaid manually.
- Markdown is the portable output format.
- Database is the source of truth.
- No external SaaS integrations unless explicitly approved.
- Agent outputs must remain agent-neutral and executable by Claude, ChatGPT, Qwen, or any compatible agent.

## Context Limit Protocol

If the agent detects that the session context is becoming too long, it must stop adding new implementation work and preserve continuity.

The agent must:

1. summarize completed work
2. summarize partially completed work
3. summarize not-started work
4. write exact next steps
5. update memory/HANDOFF.md
6. update memory/NEXT_ACTION.md
7. update memory/STATE.json
8. tell the user that a checkpoint was saved

## Completion Protocol

This rule is mandatory.

Before declaring the project complete, the agent must verify that:

- all required prompts or phases are completed
- all required deliverables exist
- all definition-of-done conditions are satisfied
- all required memory files are updated
- no required task remains pending
- no blocker remains unresolved
- no mandatory approval is missing

If all required work is complete, the agent must not silently stop.

The agent must explicitly report completion.

The agent must say clearly that there is nothing left to do under the approved required scope.

The agent must also propose optional additional tasks, but must not start them without explicit user approval.

## Required Completion Message

When all required work is complete, the agent must respond with a completion report using this structure:

STATUS: ALL_REQUIRED_TASKS_COMPLETED

MESSAGE:
All required tasks have been completed. There is nothing left to execute under the approved required scope.

COMPLETION DETAILS:
- Completed phases:
- Remaining required tasks: 0
- Blockers: 0
- Awaiting approvals: 0

OPTIONAL ADDITIONAL TASKS:
1. Optional task one
2. Optional task two
3. Optional task three
4. Optional task four
5. Optional task five

NEXT ACTION:
Please approve one optional task, provide a new requirement, or close the project.

## Behavior After Completion

If the project status is completed and the user says:

continue

the agent must not restart required work unless the user explicitly asks for it.

Instead, the agent must:

1. report that all required work is already complete
2. show the optional additional tasks from memory/OPTIONAL_BACKLOG.md
3. ask the user to approve one optional task or provide a new requirement

If the user approves an optional task, the agent must:

1. record the approval in memory/DECISIONS.md
2. create a new task entry
3. update memory/STATE.json
4. execute the approved optional task
5. update memory after completion

If the user provides a new requirement after completion, the agent must:

1. record it in memory/USER_REQUESTS.md
2. evaluate whether it is a new mandatory scope or an optional enhancement
3. create a new phase or task if needed
4. update memory before execution

## Forbidden Completion Behavior

The agent must not:

- finish silently
- say "done" without verifying completion
- claim completion while required artifacts are missing
- start optional work without approval
- hide blockers
- forget to update memory
- ask the user where to continue if memory already contains the answer

## Final Rule

The memory system is the source of truth for execution continuity.

If the memory is correct, the agent must be able to resume automatically.

If the memory is incomplete, the agent must fix the memory before continuing.