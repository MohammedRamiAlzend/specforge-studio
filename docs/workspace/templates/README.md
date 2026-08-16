# Templates — Generated Markdown Workspace

These templates define the exact shape of generated files. The generator fills `{{ placeholders }}` from database entities.

## Usage

1. **Canonical generation**: the document generator (Prompt 09) renders these templates from database entities. This is the only supported path for canonical artifacts.
2. **Drafting**: agents may copy a template to produce a draft for review; the draft must be entered into the model (via the app) and regenerated — never merged as a source of truth.
3. **Validation**: every rendered file must satisfy `docs/workspace/frontmatter-spec.md` and the traceability rules (TR-xx).

## Template List

| Template | Rendered for | Mandatory sections |
|----------|--------------|--------------------|
| `AGENTS.md` | Workspace root | Reading order, execution protocol, rules |
| `workflow.template.md` | Each WF | Goal, Mermaid diagram, steps, business rules, exceptions, related |
| `use-case.template.md` | Each UC | Actors, preconditions, main/alternate flows, postconditions |
| `api.template.md` | Each API | Request, response, errors, auth |
| `entity.template.md` | Each DB | Fields, relations, constraints |
| `test-case.template.md` | Each TC | Precondition, steps, expected results |
| `task.template.md` | Each TASK | Objective, context, inputs, constraints, checklist, verification, DoD |

## Placeholder Convention

- `{{ entity.field }}` — substituted from the entity record.
- `{{ mermaid.diagram }}` — rendered Mermaid source generated from structured data (never hand-written by users).
- `{{ list:entity.field }}` — repeated block per related item.
- `{{ #if field }}` / `{{ /if }}` — conditional sections.
