---
id: {{ testCase.id }}
title: {{ testCase.title }}
type: test-case
status: {{ testCase.status }}
project: {{ project.id }}
module: {{ testCase.moduleId }}
related:
  {{#each testCase.requirementIds}}- {{this}}
  {{/each}}
updated: {{ updated }}
---

# Test Case — {{ testCase.title }}

## 1. Purpose

{{ testCase.purpose }}

## 2. Preconditions

{{#each testCase.preconditions}}
1. {{ this }}
{{/each}}

## 3. Steps

{{#each testCase.steps}}
1. {{ this }}
{{/each}}

## 4. Expected Results

{{#each testCase.expectedResults}}
1. {{ this }}
{{/each}}

## 5. Verification

- **Result**: {{ testCase.result }} (passed / failed / blocked)
- **Executed by**: {{ testCase.executedBy }}
- **Evidence**: {{ testCase.evidenceRef }}

## 6. Related Artifacts

- Requirements: {{#each testCase.requirementIds}}{{this}} {{/each}}
- Tasks: {{#each testCase.taskIds}}{{this}} {{/each}}
- API endpoints: {{#each testCase.apiEndpointIds}}{{this}} {{/each}}
