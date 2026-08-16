# Prompt Pack — SpecForge Studio

This folder contains the scheduled prompt sequence for building SpecForge Studio.

## Rules

- Execute prompts in numeric order.
- Never start implementation work without reading the memory files first.
- After every session, update all memory files.
- If the user says `continue`, resume automatically from memory.
- All product artifacts, documentation, code comments, and task outputs must be in English.
- Frontend must use React with Feature-Sliced Design.
- Backend must use Node.js with SQLite.
- No external SaaS integrations are allowed unless explicitly approved.

## Prompt Sequence

00. Bootstrap memory and rules
01. Product definition
02. Domain ontology and IDs
03. Markdown workspace specification
04. Database schema
05. Backend core
06. Frontend foundation with FSD
07. Visual modeler
08. Diagram generation
09. Document generation
10. Roadmap and agent tasks
11. Governance and approvals
12. Testing and validation
13. Dynamic platform configuration (project types, stacks, libraries)
14. Multi-project workspace and cross-project workflow calls
15. Customizable node palette and categories
16. Skills section, per-project docs integration, and final audit
17. UI polish and motion (smooth navigation, micro-interactions, reduced-motion)
18. Full-detail e-commerce seeder (.NET backend + React frontend demo example)

Note: the original Prompt 13 (Deployment and Final Audit) was removed from the
required scope by user request (2026-08-16) and replaced by Prompts 13–16
covering dynamic platform configuration, multi-project workspaces, a
customizable node palette, and the Skills section with a final audit of the new
scope. Deployment packaging is no longer required scope; it remains a candidate
for the optional backlog.

Prompt 17 (2026-08-16) was added after the Prompt 16 completion report by user
request ("add animation prompt for navigation etc., anything to make the
website smoother") — a UI polish scope executed without new runtime
dependencies.

Prompt 18 (2026-08-17) was added by user request ("add seeder prompt for
ecommerce project with full details ... using dotnet for back and using react
for front with skills") — a full-detail demo e-commerce seeder (ASP.NET Core +
React) seeded as PRJ-0003 (live) / PRJ-0004 (committed example) alongside the
existing Acme example.