# Continue Command

Read the memory files immediately:

- memory/PROJECT_MEMORY.md
- memory/STATE.json
- memory/USER_REQUESTS.md
- memory/CONSTRAINTS.md
- memory/DECISIONS.md
- memory/SESSION_LOG.md
- memory/NEXT_ACTION.md
- memory/HANDOFF.md

Then resume work exactly from the stored next action.

Do not ask the user which prompt or phase to continue unless the memory is missing, corrupted, or contradictory.

If memory is missing, start from Prompt 00.

After resuming and after every meaningful unit of work, update the memory files.