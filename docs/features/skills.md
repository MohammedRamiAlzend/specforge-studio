---
id: FEAT-011
title: Per-Project Skills
type: guide
phase: 16-skills-and-final-audit
status: implemented
owner: engineering
related:
  - FEAT-008
  - FEAT-009
  - FEAT-010
  - ONT-002
  - SKL-0001
  - SKL-0003
updated: 2026-08-16
---

# Per-Project Skills — SpecForge Studio

## 1. Goal

Every project has its own **Skills section** alongside Workflows, Data Model,
Architecture, Docs Export, and Tasks. Skills record the **capabilities** and
**technologies** a project relies on, so human teams and executing agents know
what expertise a project's task packs assume. Skills are per-project data
stored in the database and exported into each project's own docs workspace.

## 2. Domain Model

One `skills` table holds both skill kinds:

```
skills
  ├── id           SKL-0001 (project-scoped, non-unique across projects)
  ├── project_id   FK → projects ON DELETE CASCADE
  ├── kind         capability | tech
  ├── name         required
  ├── description  optional
  ├── level        beginner | intermediate | advanced | expert   (capability)
  ├── tag          free text e.g. frontend, payments, smtp        (tech)
  └── sort_order
```

- **Capability skills** describe a team capability ("Payments engineering",
  "SRE") and carry a proficiency `level`.
- **Tech skills** describe a technology/stack skill ("React",
  "Node.js / Fastify") and carry a free-text `tag`.
- Validation is explicit: a capability skill **requires** `level`; a tech
  skill **cannot** carry `level` (it uses `tag`) and rejects empty tags.
- Skills belong to exactly one project; deleting the project cascades and
  removes its skills.

## 3. Backend APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/skills?project=:id` | List a project's skills (ordered by sort_order) |
| POST | `/api/skills` | Create a skill (kind-consistent validation) |
| PATCH | `/api/skills/:id` | Edit a skill |
| DELETE | `/api/skills/:id` | Delete a skill |

Validation failures return `400 BAD_REQUEST` (capability without level, tech
with level, empty tag, unknown kind, empty name); unknown projects return
`404 NOT_FOUND`. Every change is appended to the audit trail
(`entity_type: skill`).

## 4. Frontend (FSD)

- `entities/skill/` — types + TanStack Query hooks
  (`useSkills`, `useCreateSkill`, `useUpdateSkill`, `useDeleteSkill`) and lib
  helpers (`splitSkills`, `LEVELS`, `LEVEL_COLORS`, labels).
- `pages/SkillsPage.tsx` — route `/projects/:projectId/skills`. Two sections,
  **Capability skills** and **Tech skills**, each with an inline add/edit form
  (capability → level select; tech → tag input), edit/delete actions, level
  badges and tag chips, empty states, and loading/error states following the
  standard page conventions.
- `pages/ProjectDetailsPage.tsx` — gains the Skills section card.
- `widgets/layout/AppShell.tsx` — project workspace nav gains the **Skills**
  link.
- `app/App.tsx` — route registered under the project workspace.

## 5. Docs Integration

Each project's generated workspace gains `07-guides/skills.md`
(ART id appended at the end so existing ART ids never shift). It renders:

- a **Capability Skills** table (id, name, level, description);
- a **Tech Skills** table (id, name, tag, description);
- a **Task tie-in** line listing skill names so executing agents know the
  project's expected competencies.

The workspace README now lists skills under `07-guides`. Docs exports stay
per-project: a project's export contains only its own skills
(`docs_exports.project_id`), never another project's.

## 6. Definition of Done

- Skills section exists per project (capability + tech) with full CRUD UI. ✔
- Per-project docs exports include skills, platform configuration
  (00-meta/project.md), and dependencies/cross-project calls
  (00-meta/dependencies.md + workflows.md); exports stay isolated per
  project. ✔
- SKL prefix recorded in the ontology; skills audit-logged. ✔
- `docs/final-audit.md` covers the 13–16 scope; stale Prompt-13 references
  corrected in guide + tutorial. ✔
- Backend + frontend typechecks and tests pass; smoke covers skills CRUD +
  docs; seed-example regenerates (34 files). ✔