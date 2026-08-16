---
id: WS-003
type: workspace-frontmatter-spec
phase: 03-markdown-workspace-spec
status: draft
owner: engineering
---

# Frontmatter Specification — Generated Markdown Workspace

## 1. Mandatory Fields

Every generated Markdown file must begin with YAML frontmatter between `---` delimiters, containing at least:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Stable artifact ID (see `docs/ontology/id-convention.md`) |
| `title` | string | yes | Human-readable title |
| `type` | string | yes | Artifact type (see section 3) |
| `status` | string | yes | Status from the lifecycle (`docs/ontology/status-lifecycle.md`) |
| `related` | list | yes | Related artifact IDs (traceability links, TR rules) |
| `updated` | string (ISO date) | yes | Last update timestamp (e.g. `2026-08-16`) |

## 2. Recommended Fields

| Field | Type | Description |
|-------|------|-------------|
| `project` | string | Owning project ID (PRJ) |
| `module` | string | Owning module ID (MOD), when scoped to a module |
| `version` | string | Artifact version (e.g. `1.0.0`) |
| `owner` | string | Owning role or person (see `docs/product/user-roles.md`) |
| `approval` | string | Approval record ID (APR) when approved |
| `supersedes` | string | ID of the artifact this one replaces |
| `tags` | list | Free-form tags |

## 3. Type Values

`type` must be one of the canonical values (matching the entity catalog):

`project`, `module`, `artifact`, `requirement`, `use-case`, `workflow`, `workflow-node`, `workflow-edge`, `screen`, `entity`, `entity-field`, `entity-relation`, `component`, `api-endpoint`, `sequence-diagram`, `architecture-diagram`, `test-case`, `risk`, `decision`, `milestone`, `task`, `checklist-item`, `checklist`, `approval`, `agent-run`, `index`, `guide`, `plan`

## 4. Example

```yaml
---
id: REQ-0001
title: Users must be able to log in
type: requirement
status: approved
project: PRJ-0001
module: MOD-0002
related:
  - UC-0003
  - TC-0007
approval: APR-0002
updated: 2026-08-16
---
```

## 5. Rules

1. Frontmatter is the **first thing** in the file; nothing precedes the opening `---`.
2. `related` always references canonical IDs, never titles.
3. The ID in frontmatter must match the filename ID (see `file-naming.md`).
4. Frontmatter values are generated from the database; agents and humans must not edit them as a source of truth.
5. `status` transitions must follow `docs/ontology/status-lifecycle.md`.
6. Frontmatter must be valid YAML; the generator validates it before export.
