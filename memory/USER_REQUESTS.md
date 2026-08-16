# USER_REQUESTS

This file records every user request that affects the project.

The agent must update this file whenever the user gives a new request.

Each request must include:
- date
- request
- implication
- mandatory or optional
- affected phase or artifact

## Request Log

### 2026-08-16 — Inspect repo and configure Freebuff preview
- request: Inspect the connected GitHub repo MohammedRamiAlzend/specforge-studio, configure (but do NOT start) the install, dev/preview, and build commands via the freebuff-preview tooling, and summarize what the project does plus its env var/setup needs.
- implication: Freebuff preview configuration only. Repo has no application code yet, so commands were configured for the planned stack and the preview cannot run until the app is scaffolded.
- mandatory or optional: mandatory (operational)
- affected phase or artifact: Freebuff preview config; later app phases (05 backend, 06 frontend)

### 2026-08-16 — Adopt MASTER PROMPT as execution OS
- request: Adopt the provided MASTER PROMPT (Project Execution Operating System) as the governing execution protocol and execute the project end-to-end using the memory-driven prompt sequence (00–13).
- implication: Master prompt governs continuity, approval gates, traceability, task pack rules, and completion reporting. Prompt sequence is the required scope.
- mandatory or optional: mandatory
- affected phase or artifact: all phases

### 2026-08-16 — Step-by-step guide with example for making an e-commerce project
- request: "generate step by step guid with example for making eccomerce project" — a tutorial that walks through building an e-commerce project with SpecForge Studio, with a concrete example at every step.
- implication: New deliverable docs/tutorial-ecommerce.md (GUIDE-002) — 14 steps (0–13) using the committed Acme Commerce example (PRJ-0001) with real generated outputs (workflow Mermaid, ERD, TASK-0001 pack, APR-0002 flow).
- mandatory or optional: mandatory (user-requested deliverable)
- affected phase or artifact: docs/tutorial-ecommerce.md

### 2026-08-16 — Generate a full detailed project guide
- request: "generate full detaild guid for this projec" — create a comprehensive, detailed guide for the SpecForge Studio project.
- implication: New deliverable docs/guide.md (GUIDE-001) covering principles, layout, stack, execution model, backend/frontend architecture, feature tour, workspace, governance, ops, limitations; GUIDE prefix added to id-convention. Non-phase documentation work.
- mandatory or optional: mandatory (user-requested deliverable)
- affected phase or artifact: docs/guide.md, docs/ontology/id-convention.md

### 2026-08-16 — Defer Prompt 13 and run the preview
- request: "ignore prompt 13 for currnet and run /preview" — pause the required Prompt 13 (deployment and final audit) and launch/verify the Freebuff preview now.
- implication: Prompt 13 remains in the required scope but its execution is explicitly deferred by the user; it must resume when the user says so (it is still the pending next action). Preview run surfaced two fixes: backend dev port pinned to 3000 (Freebuff injects PORT=5173, colliding with Vite) and the Vite /api proxy now strips the /api prefix (backend routes are unprefixed).
- mandatory or optional: mandatory (user-directed ordering override)
- affected phase or artifact: 13-deployment-and-final-audit (deferred); preview/dev config (backend/package.json dev script, frontend/vite.config.ts proxy rewrite)