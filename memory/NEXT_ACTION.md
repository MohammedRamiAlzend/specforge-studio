# NEXT_ACTION

STATUS NOTE (2026-08-17): Prompt 18 (Full-detail e-commerce seeder) is COMPLETE and verified. This extends the completed scope (Prompts 00–17) with the user-requested second "most common e-commerce project" demo (.NET backend + React frontend).

- prompts/18-ecommerce-full-seeder.md created; prompts/README.md sequence updated to 18 with a Prompt 18 note.
- backend/scripts/seed-ecommerce.ts: `seedEcommerceProject(db, {projectId?, graphId?})` (defaults live PRJ-0003 / GRPH-0003) + `isEcommerceSeeded(db, projectId)`. Seeds the StoreSphere E-Commerce Platform:
  - Multi-type project: api → .NET stack (STK-0001) + MailKit/Scalar/EF Core/Serilog; web → React stack (STK-0004) + React Router/Zustand/Tailwind CSS (INSERT...SELECT resolved from platform-config seeds).
  - 8 modules MOD-0101..0108, 14 requirements REQ-0101..0114 (functional/constraint/data/nonfunctional), 5 use cases, 4 workflows, 4 workflow model graphs (graph IDs derived from the base via graphN(offset) so the committed example at GRPH-0004 never collides), 11 entities + 51 fields + 10 relations (1:1/1:N/N:M per CHECK), 13 API endpoints with per-endpoint auth, 8 screens, 7 components, 8 skills (capability requires level, tech requires tag), 4 risks, 3 ADRs, 3 milestones, 6 test cases.
  - Approvals APR-0101 (REQ-0101 approved) + APR-0102 (WF-0101 pending → approved by Alan Turing with artifact_governance sync); 21 artifact_links; storeRoadmap + materializeTaskPack (60 packaged tasks); governance demo (roadmap needs_review + first task in_progress).
  - Child IDs use 0100+ ranges so Acme (0001+) and user projects never collide.
- backend/scripts/generate-ecommerce-example.ts (`bun run --cwd backend seed-ecommerce-example`) → committed docs/workspace/generated-example-ecommerce/ (PRJ-0004, 34 files).
- backend/scripts/seed-ecommerce-live.ts (`bun run --cwd backend seed-ecommerce-live`) → live DB PRJ-0003 + 3 diagrams (workflow GRPH-0003, ERD, architecture) via the real routes (DIAG-0001/0002/0003); idempotent.
- backend/package.json scripts added (seed-ecommerce-example / seed-ecommerce-live).
- backend/tests/seed-ecommerce.test.ts: 8 tests (content counts, .NET+React type/library assignment, skill rules, roadmap + task pack, approvals/governance/traceability, diagrams, docs workspace, coexistence with the Acme demo in one DB).
- Type fixes applied: graph edge tuples allow null conditions; endpoint tuples carry explicit auth; screens 5-tuples; seed-data.ts edge condition nullable; hard-coded GRPH-0004..0006 replaced with derived graph IDs.

Verified:
- root `bun run typecheck` clean.
- `bun test backend/tests frontend/tests`: 171 pass / 0 fail (23 files, 682 expects).
- `bun run build` (frontend) + `bun run --cwd backend build` succeed.
- backend smoke 275/275 PASS (SMOKE TEST OK).
- seed-ecommerce-example writes 34 files; seed-ecommerce-live idempotent (second run skips) + stores 3 diagrams.

Current next action:
FINALIZE Prompt 18: deliver the completion report per AGENTS.md (all completed work done — required + user-requested scope), then commit changes to main (the user previously requested committing to master; the local repo branch is main), then wait for the user's next request or explicit approval of an optional backlog task.

Reason:
Prompts 00–18 all have satisfied definitions of done. No remaining required tasks, no blockers, no pending approvals. Per AGENTS.md Completion Protocol, the agent must deliver the required completion report and must NOT silently stop; optional work only after explicit user approval.

Required files to update after executing the next action:
- memory/PROJECT_MEMORY.md
- memory/STATE.json
- memory/SESSION_LOG.md
- memory/NEXT_ACTION.md
- memory/DECISIONS.md (DEC-022 added)
- memory/USER_REQUESTS.md (Prompt 18 request added)

If the user says:
continue

Then the agent must:
1. Read all memory files (and MASTER_PROMPT.md).
2. Report that all completed work is already done (do NOT restart completed work).
3. Show the optional additional tasks and ask the user to approve one or provide a new requirement.
4. Only execute optional work after explicit approval.