---
id: WS-002
type: workspace-file-naming
phase: 03-markdown-workspace-spec
status: draft
owner: engineering
---

# File Naming — Generated Markdown Workspace

## 1. Rules

1. **kebab-case** for all filenames (lowercase letters, digits, hyphens).
2. **ASCII only** — no spaces, no underscores, no non-ASCII characters.
3. **Pattern** for entity files: `<ENTITY-ID>-<slug>.md`.
   - Example: `REQ-0001-login-required.md`, `DB-0003-user-account.md`.
   - The slug is a short human-readable hint only; the canonical identity is the ID.
4. **Index files**: fixed names per folder (e.g. `requirements.md`, `screens.md`, `milestones.md`).
5. **Reserved names**: `README.md` and `AGENTS.md` are reserved at workspace root; folders may also carry a `README.md`.
6. **Templates** live in `templates/` and use the suffix `.template.md` (e.g. `workflow.template.md`).
7. **Child entities** (workflow nodes, entity fields, checklist items) are **not** separate files; they live inside their parent file.
8. **Never rename a file by changing its ID** — if an ID is retired, keep the old filename with a `superseded` status marker or archive it under `00-meta/`.

## 2. Examples

| Entity | Example filename |
|--------|------------------|
| Project profile | `00-meta/project.md` |
| Requirement | `02-requirements/REQ-0001-login-required.md` |
| Use case | `02-requirements/use-cases/UC-0004-submit-order.md` |
| Workflow | `03-design/workflows/WF-0002-order-fulfillment.md` |
| Entity (data) | `03-design/DB-0003-user-account.md` |
| Sequence diagram | `03-design/sequences/SEQ-0001-place-order.md` |
| Screen | `04-ui/SCR-0002-checkout-page.md` |
| Test case | `05-testing/TC-0007-login-success.md` |
| Task | `09-agent-plans/tasks/TASK-0012-implement-login-endpoint.md` |
| Checklist | `09-agent-plans/checklists/CHK-0001-backend-checklist.md` |

## 3. Sorting and Ordering

- Index files list entries sorted by ID numerically (e.g. `REQ-0001` before `REQ-0010`).
- Folders with numeric prefixes (`00-`, `01-`, …) are always sorted numerically.
