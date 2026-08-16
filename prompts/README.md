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
13. Deployment and final audit