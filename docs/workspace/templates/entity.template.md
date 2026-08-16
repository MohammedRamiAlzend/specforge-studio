---
id: {{ entity.id }}
title: {{ entity.name }}
type: entity
status: {{ entity.status }}
project: {{ project.id }}
module: {{ entity.moduleId }}
related:
  {{#each entity.relatedComponentIds}}- {{this}}
  {{/each}}
updated: {{ updated }}
---

# Entity — {{ entity.name }}

## 1. Purpose

{{ entity.description }}

## 2. Fields

| Field | Type | PK | Nullable | Default | Notes |
|-------|------|----|----------|---------|-------|
{{#each entity.fields}}
| {{ this.name }} | {{ this.dataType }} | {{ this.isPrimaryKey }} | {{ this.nullable }} | {{ this.defaultValue }} | {{ this.constraints }} |
{{/each}}

## 3. Relations

| From | To | Type | On delete | Notes |
|------|----|------|-----------|-------|
{{#each entity.relations}}
| {{ this.fromEntityId }} | {{ this.toEntityId }} | {{ this.relationType }} | {{ this.onDelete }} | {{ this.description }} |
{{/each}}

## 4. Constraints

{{#each entity.constraints}}
1. {{ this }}
{{/each}}

## 5. Related Artifacts

- Components: {{#each entity.relatedComponentIds}}{{this}} {{/each}}
- Requirements: {{#each entity.relatedRequirementIds}}{{this}} {{/each}}
- Test cases: {{#each entity.testCaseIds}}{{this}} {{/each}}

## 6. Open Points

{{#each entity.openPoints}}
- {{ this }}
{{/each}}
