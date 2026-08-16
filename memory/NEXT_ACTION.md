# NEXT_ACTION

STATUS NOTE (2026-08-16): The user explicitly deferred Prompt 13 ("ignore prompt 13 for currnet and run /preview"). The preview is running and verified; two dev-config fixes were made (backend dev port pinned to PORT=3000; Vite /api proxy rewrite). Prompt 13 remains the next required phase and resumes when the user says "continue" or otherwise asks.

Current next action:
Execute Prompt 13 — Deployment and Final Audit (deployment files, hybrid workspace docs, final audit against all constraints, completion report).

Reason:
Prompt 12 (testing and validation) is complete: backend suites in backend/tests/ (api, database, diagrams, docs, roadmap, tasks, approvals, validation — 53 tests) and frontend suites in frontend/tests/ (lib, api-client, visual-modeler, ui-states, pages — 22 tests) run via bun:test with zero new dependencies (fresh in-memory app per backend file; react-dom/server static rendering for frontend); test dirs added to root tsconfig so tests are typechecked. Fixed artifact_links to cascade on project delete in canonical schema (DEC-014; live-DB rebuild migration deferred pending APR). Docs: docs/testing/test-plan.md (TEST-001) + docs/testing/validation-rules.md (TEST-002); TEST + missing DOCS prefixes added to docs/ontology/id-convention.md. Root scripts: `bun test backend/tests frontend/tests` (+ backend/frontend `test` scripts). Verified: 75/75 tests PASS, root tsc -b --noEmit clean (incl. tests), backend smoke 185/185 PASS, seed-example regenerates. STATE.json now points to Prompt 13.

Required files to update after executing the next action:
- memory/PROJECT_MEMORY.md
- memory/STATE.json
- memory/SESSION_LOG.md
- memory/NEXT_ACTION.md
- memory/DECISIONS.md (decisions made during Prompt 13)
- memory/OPTIONAL_BACKLOG.md (final phase — write future improvement backlog)

If the user says:
continue

Then the agent must:
1. Read all memory files (and MASTER_PROMPT.md).
2. Resume from this next action.
3. Execute Prompt 13 (read prompts/13-deployment-and-final-audit.md first).
4. Not ask which prompt to continue unless memory is missing or corrupted.
5. Per the completion protocol: verify all deliverables, report completion explicitly, propose optional tasks, and wait for approval before starting any optional work.
