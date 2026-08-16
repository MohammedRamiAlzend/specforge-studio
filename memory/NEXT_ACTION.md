# NEXT_ACTION

Current next action:
Execute Prompt 00 and initialize the full memory system.

Reason:
The project has not started yet. Prompt 00 is required before any implementation work.

Required files to update after executing the next action:
- memory/PROJECT_MEMORY.md
- memory/STATE.json
- memory/SESSION_LOG.md
- memory/NEXT_ACTION.md

If the user says:
continue

Then the agent must:
1. Read all memory files.
2. Resume from this next action.
3. Not ask which prompt to continue unless memory is missing or corrupted.