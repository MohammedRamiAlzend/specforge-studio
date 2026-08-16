---
id: ONT-002
type: id-convention
phase: 02-domain-ontology-and-ids
status: draft
owner: engineering
---

# ID Convention — SpecForge Studio

## 1. Principle

Every artifact has a **stable, immutable, globally unique ID**. IDs are the backbone of traceability: they are preserved in the database, in generated Markdown frontmatter, in diagrams, and in task packs. An ID is never reused, even after its entity is deleted.

## 2. ID Format

### 2.1 Top-level entities

```
<PREFIX>-<SEQUENCE>
```

- `<PREFIX>` is the uppercase type prefix (see table below).
- `<SEQUENCE>` is a zero-padded integer, minimum 4 digits.
- Example: `REQ-0001`, `API-0042`, `PRJ-0001`.

### 2.2 Child entities (nodes, edges, fields, checklist items)

```
<PARENT-ID>-<CHILD-TYPE><2-DIGIT-SEQUENCE>
```

- `<CHILD-TYPE>` is a one- or two-letter uppercase code.
- Example: `WF-0001-N01` (workflow node), `WF-0001-E01` (workflow edge), `DB-0001-F01` (entity field), `TASK-0001-C01` (checklist item).

### 2.3 Human-readable suffix (optional)

For generated documentation, an optional slug suffix may follow the ID for readability. It is never part of the canonical ID.

```
REQ-0001-login-required
```

## 3. Prefix Table

Base prefixes (mandatory):

| Prefix | Entity |
|--------|--------|
| PRJ | Project |
| MOD | Module |
| REQ | Requirement |
| UC | UseCase |
| WF | Workflow |
| SCR | Screen |
| DB | Entity (data model) |
| API | ApiEndpoint |
| ARCH | ArchitectureDiagram |
| SEQ | SequenceDiagram |
| TC | TestCase |
| RISK | Risk |
| ADR | Decision (architecture decision record) |
| MS | Milestone |
| TASK | Task |
| CHK | Checklist (standalone checklist artifact) |
| APR | Approval |

Extended prefixes (added by this ontology, DEC-002):

| Prefix | Entity |
|--------|--------|
| ART | Artifact (generic generated output) |
| CMP | Component (architecture) |
| REL | EntityRelation |
| AGT | AgentRun |
| OQ | OpenQuestion (working docs, not persisted entities) |
| GRPH | ModelGraph (visual modeler canvas, Prompt 07) |
| FEAT | FeatureSpec (feature documentation, e.g. docs/features/) |
| DIAG | GeneratedDiagram (stored Mermaid output, Prompt 08) |
| DOCS | DocsExport (generated Markdown workspace export, Prompt 09) |
| RMP | Roadmap (generated plan snapshot, Prompt 10) |
| TEST | TestingDocs (testing/validation documentation, e.g. docs/testing/) |
| GUIDE | ProjectGuide (project-level documentation, e.g. docs/guide.md) |

Child codes:

| Code | Child of | Meaning |
|------|----------|---------|
| N | WF | Workflow node |
| E | WF | Workflow edge |
| F | DB | Entity field |
| R | DB | Entity relation (alternate child form; standalone REL also allowed) |
| C | TASK | Checklist item |
| N | GRPH | Model graph node (e.g. GRPH-0001-N01) |
| E | GRPH | Model graph edge (e.g. GRPH-0001-E01) |
| P | RMP | Roadmap phase (e.g. RMP-0001-P01) |
| EP | RMP | Roadmap epic (e.g. RMP-0001-EP01) |
| M | RMP | Roadmap milestone (e.g. RMP-0001-M01) |
| T | RMP | Roadmap task draft (e.g. RMP-0001-T01) |

## 4. ID Rules

1. **Immutable**: an assigned ID never changes.
2. **Never reused**: deleted entities' IDs are retired, not recycled.
3. **Registry**: the database is the source of truth for ID allocation and ownership.
4. **Sequencing**: sequence counters are allocated per prefix from the database; no client-side generation.
5. **Preservation**: IDs appear in Markdown frontmatter (`id:`), Mermaid labels, and task packs unchanged.
6. **Uniqueness**: an ID is unique across the entire workspace, not just its project.
7. **References**: cross-references always use the canonical ID, never titles or slugs.
8. **No aliases**: do not create parallel ID systems in frontend, docs, or exports.

## 5. Frontmatter Example

```yaml
---
id: REQ-0001
type: requirement
status: approved
project: PRJ-0001
module: MOD-0002
---
```

## 6. Validation

- IDs must match `^[A-Z]{2,4}-\d{4,}(-[A-Z]\d{2})?$` (child form) or the top-level form `^[A-Z]{2,4}-\d{4,}$`.
- Every ID referenced by another entity must exist (referential integrity; see traceability-rules.md).
