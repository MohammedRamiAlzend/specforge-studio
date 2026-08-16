---
id: {{ workflow.id }}
title: {{ workflow.name }}
type: workflow
status: {{ workflow.status }}
project: {{ project.id }}
module: {{ workflow.moduleId }}
related:
  {{#each workflow.relatedRequirementIds}}- {{this}}
  {{/each}}
updated: {{ updated }}
---

# Workflow — {{ workflow.name }}

## 1. Goal

{{ workflow.goal }}

## 2. Diagram

```mermaid
{{ mermaid.diagram }}
```

## 3. Steps

{{#each workflow.nodes}}
### {{ this.id }} — {{ this.label }} ({{ this.nodeType }})

{{ this.description }}
{{/each}}

## 4. Business Rules

{{#each workflow.businessRules}}
1. {{ this }}
{{/each}}

## 5. Exceptions

{{#each workflow.exceptions}}
- **{{ this.condition }}**: {{ this.handling }}
{{/each}}

## 6. Related Artifacts

- Requirements: {{#each workflow.relatedRequirementIds}}{{this}} {{/each}}
- Tasks: {{#each workflow.relatedTaskIds}}{{this}} {{/each}}

## 7. Open Points

{{#each workflow.openPoints}}
- {{ this }}
{{/each}}
