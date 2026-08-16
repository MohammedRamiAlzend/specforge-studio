---
id: {{ useCase.id }}
title: {{ useCase.title }}
type: use-case
status: {{ useCase.status }}
project: {{ project.id }}
module: {{ useCase.moduleId }}
related:
  {{#each useCase.relatedRequirementIds}}- {{this}}
  {{/each}}
  {{#each useCase.screenIds}}- {{this}}
  {{/each}}
  {{#each useCase.apiEndpointIds}}- {{this}}
  {{/each}}
updated: {{ updated }}
---

# Use Case — {{ useCase.title }}

## 1. Goal

{{ useCase.goal }}

## 2. Actors

{{ useCase.actor }}

## 3. Preconditions

{{#each useCase.preconditions}}
1. {{ this }}
{{/each}}

## 4. Main Flow

{{#each useCase.mainFlow}}
1. {{ this }}
{{/each}}

## 5. Alternate Flows

{{#each useCase.alternateFlows}}
### {{ this.title }}

{{#each this.steps}}
1. {{ this }}
{{/each}}
{{/each}}

## 6. Postconditions

{{#each useCase.postconditions}}
1. {{ this }}
{{/each}}

## 7. Related Artifacts

- Requirements: {{#each useCase.relatedRequirementIds}}{{this}} {{/each}}
- Screens: {{#each useCase.screenIds}}{{this}} {{/each}}
- API endpoints: {{#each useCase.apiEndpointIds}}{{this}} {{/each}}
- Sequence diagrams: {{#each useCase.sequenceIds}}{{this}} {{/each}}

## 8. Open Points

{{#each useCase.openPoints}}
- {{ this }}
{{/each}}
