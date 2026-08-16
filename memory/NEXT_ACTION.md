# NEXT_ACTION

STATUS NOTE (2026-08-16): The user asked to remove plan 13 and add new plans for complex multi-project functionality. Old Prompt 13 (deployment-and-final-audit) is DELETED from the required scope (DEC-015). Four new required prompts were created and the user chose "create plans only" — NO implementation has started (DEC-016).

Current next action:
Execute Prompt 13 — Dynamic Platform Configuration (prompts/13-platform-configuration.md): DB-backed project types/stacks/libraries, multi-type projects, creation form with stack + library selection, global Settings UI. Then Prompts 14 (multi-project workspace), 15 (custom node palette), 16 (skills + final audit).

Reason:
Prompts 00–12 are complete and verified (75/75 tests, backend smoke 185/185). The user's new request removed the old required phase 13 and replaced it with Prompts 13–16 covering: configurable project types (from a table, not static Web/Mobile/API/AI), stacks + libraries per type at project creation, multiple types per project, workspaces that connect projects, cross-project workflow calls (dropdown + manual ID), a customizable node palette with customizable categories and custom fields, a per-project Skills section (capability + tech), and per-project docs exports. The clarifying answers are recorded in DEC-016; the plans are written; execution awaits user approval.

Required files to update after executing the next action:
- memory/PROJECT_MEMORY.md
- memory/STATE.json
- memory/SESSION_LOG.md
- memory/NEXT_ACTION.md
- memory/DECISIONS.md (decisions made during Prompt 13)
- memory/USER_REQUESTS.md (if new requests arrive)

If the user says:
continue

Then the agent must:
1. Read all memory files (and MASTER_PROMPT.md).
2. Resume from this next action (execute prompts/13-platform-configuration.md).
3. Not ask which prompt to continue unless memory is missing or corrupted.
4. Per the completion protocol: verify all deliverables, report completion explicitly, propose optional tasks, and wait for approval before starting any optional work.
