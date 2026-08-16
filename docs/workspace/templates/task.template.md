---
id: {{ task.id }}
title: {{ task.title }}
type: task
status: {{ task.status }}
project: {{ project.id }}
module: {{ task.moduleId }}
related:
  {{#each task.relatedArtifactIds}}- {{this}}
  {{/each}}
updated: {{ updated }}
---

# Task — {{ task.title }}

## 1. Objective

{{ task.objective }}

## 2. Context

{{ task.context }}

## 3. Inputs

{{#each task.inputArtifactIds}}
- {{ this }}
{{/each}}

## 4. Constraints

{{#each task.constraints}}
1. {{ this }}
{{/each}}

## 5. Executable Checklist

{{#each task.checklistItems}}
- [ ] {{ this.description }}
{{/each}}

## 6. Verification

{{#each task.verificationSteps}}
1. {{ this }}
{{/each}}

## 7. Definition of Done

{{ task.definitionOfDone }}

## 8. Related Artifacts

- Requirements: {{#each task.requirementIds}}{{this}} {{/each}}
- Workflows: {{#each task.workflowIds}}{{this}} {{/each}}
- Test cases: {{#each task.testCaseIds}}{{this}} {{/each}}
- Milestone: {{ task.milestoneId }}

## 9. Approval

- Approval required: {{ task.approvalRequired }}
- Approval record: {{ task.approvalId }}
