---
id: {{ api.id }}
title: {{ api.method }} {{ api.path }}
type: api-endpoint
status: {{ api.status }}
project: {{ project.id }}
module: {{ api.moduleId }}
related:
  {{#each api.relatedRequirementIds}}- {{this}}
  {{/each}}
updated: {{ updated }}
---

# API Endpoint — {{ api.method }} {{ api.path }}

## 1. Purpose

{{ api.purpose }}

## 2. Request

- **Method**: `{{ api.method }}`
- **Path**: `{{ api.path }}`
- **Auth**: {{ api.auth }}

### Headers

{{#each api.requestHeaders}}
- `{{ this.name }}`: {{ this.description }}
{{/each}}

### Path/Query Parameters

{{#each api.requestParams}}
- `{{ this.name }}` ({{ this.type }}, {{ this.required }}): {{ this.description }}
{{/each}}

### Request Body

```json
{{ api.requestSchema }}
```

## 3. Response

### Success ({{ api.successCode }})

```json
{{ api.responseSchema }}
```

## 4. Errors

| Code | Meaning |
|------|---------|
{{#each api.errors}}
| {{ this.code }} | {{ this.description }} |
{{/each}}

## 5. Related Artifacts

- Requirements: {{#each api.relatedRequirementIds}}{{this}} {{/each}}
- Use cases: {{#each api.useCaseIds}}{{this}} {{/each}}
- Components: {{#each api.componentIds}}{{this}} {{/each}}
- Test cases: {{#each api.testCaseIds}}{{this}} {{/each}}

## 6. Open Points

{{#each api.openPoints}}
- {{ this }}
{{/each}}
