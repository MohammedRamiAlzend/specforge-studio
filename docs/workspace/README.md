# Workspace Specification — SpecForge Studio

This folder specifies the exact Markdown workspace the system generates for every project (phase 03).

## Reading Order

1. `folder-structure.md` — the generated workspace tree and what each folder contains
2. `file-naming.md` — filename conventions
3. `frontmatter-spec.md` — required YAML frontmatter for every generated file
4. `templates/README.md` — how templates are used
5. `templates/` — the file templates (AGENTS.md, workflow, use-case, api, entity, test-case, task)

## Principles

- The workspace is **generated output**; the database is the source of truth.
- Every file is English-only and readable by humans and agents.
- Every file carries stable IDs in frontmatter (see `docs/ontology/id-convention.md`).
- The workspace is fully regenerable from the database at any time.
