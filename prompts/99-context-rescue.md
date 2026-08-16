# Prompt 99 — Context Rescue

Stop all new implementation work immediately.

Read all memory files and create a complete rescue checkpoint.

Update these files:

- memory/HANDOFF.md
- memory/NEXT_ACTION.md
- memory/STATE.json
- memory/SESSION_LOG.md

The checkpoint must include:

1. What was completed
2. What is partially completed
3. What is not started
4. Exact next command or next file to modify
5. Known blockers
6. Constraints that must not be violated
7. User requests that must be preserved
8. Any pending approvals

Do not ask the user for help unless memory is corrupted.