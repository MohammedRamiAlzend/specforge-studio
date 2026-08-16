---
id: ONT-001
type: entity-catalog
phase: 02-domain-ontology-and-ids
status: draft
owner: engineering
---

# Entity Catalog — SpecForge Studio

This catalog defines every entity in the system. For each entity: purpose, required fields, optional fields, relationships, ID format, status values, and validation rules.

Legend:
- **ID format** follows `docs/ontology/id-convention.md`.
- **Status values** follow `docs/ontology/status-lifecycle.md`.
- **Relationships** follow `docs/ontology/relationships.md` (cardinality in parentheses).

---

## 1. Project (PRJ)

- **Purpose**: top-level container for a product being planned (web, mobile, API, or AI; built from scratch).
- **Required fields**: id, name, type, createdBy, status, createdAt.
- **Optional fields**: description, repositoryUrl, tags, metadata (JSON).
- **Relationships**: owns Modules (1:N), Requirements (1:N), Milestones (1:N), Decisions (1:N), Approvals (1:N).
- **ID format**: `PRJ-0001`.
- **Status values**: draft, active, completed, archived.
- **Validation**: name required and non-empty; type ∈ {web, mobile, api, ai}; archived is terminal.

## 2. Module (MOD)

- **Purpose**: functional area within a project (e.g., auth, billing, reporting).
- **Required fields**: id, projectId, name, status.
- **Optional fields**: description, ownerRole, sortOrder.
- **Relationships**: belongs to Project (N:1); contains Requirements, UseCases, Workflows, Screens, Entities, Components, ApiEndpoints, Tasks (1:N each).
- **ID format**: `MOD-0001` (project-qualified via projectId field).
- **Status values**: draft, active, deprecated, archived.
- **Validation**: name unique within project; projectId must reference an existing Project.

## 3. Artifact (ART)

- **Purpose**: generic generated output (Markdown document, diagram export, workspace bundle) produced by the generators.
- **Required fields**: id, projectId, kind, name, status.
- **Optional fields**: format, contentHash, sourceEntityIds, generatedFromPhase.
- **Relationships**: derived from model entities (N:M); may be the subject of Approvals (1:N).
- **ID format**: `ART-0001`.
- **Status values**: draft, generated, reviewed, approved, superseded, archived.
- **Validation**: kind ∈ {document, diagram, workspace, report}; contentHash required once generated; sourceEntityIds must reference existing entities.

## 4. Requirement (REQ)

- **Purpose**: a capability the product must provide; the unit of scope.
- **Required fields**: id, projectId, moduleId, title, type, priority, status.
- **Optional fields**: description, acceptanceCriteria, criticality, relatedRequirementIds.
- **Relationships**: linked to UseCases and/or Workflows (must have ≥ 1); linked to TestCases (criticality-dependent); linked to Tasks.
- **ID format**: `REQ-0001`.
- **Status values**: proposed, approved, implemented, verified, rejected, archived.
- **Validation**: title required; type ∈ {functional, nonfunctional, constraint, data}; priority ∈ {must, should, could, wont}; must link to ≥ 1 UC or WF (traceability rule TR-01).

## 5. UseCase (UC)

- **Purpose**: a user or system goal achieved through interaction.
- **Required fields**: id, projectId, moduleId, title, actor, status.
- **Optional fields**: preconditions, postconditions, mainFlow, alternateFlows, relatedRequirementIds, screenIds, apiEndpointIds.
- **Relationships**: satisfies Requirements (M:N); realized by Screens (M:N) and ApiEndpoints (M:N); source of SequenceDiagrams (1:N).
- **ID format**: `UC-0001`.
- **Status values**: proposed, approved, implemented, verified, archived.
- **Validation**: actor required; mainFlow non-empty when status ≥ approved.

## 6. Workflow (WF)

- **Purpose**: a process with a start and an end, composed of nodes and edges.
- **Required fields**: id, projectId, moduleId, name, startNodeId, endNodeId, status.
- **Optional fields**: description, relatedRequirementIds, ownerRole.
- **Relationships**: has WorkflowNodes (1:N) and WorkflowEdges (1:N); linked to Requirements (M:N).
- **ID format**: `WF-0001`.
- **Status values**: draft, reviewed, approved, archived.
- **Validation**: exactly one start node and one end node; every node reachable from start; end node reachable from start (TR-02, TR-03).

## 7. WorkflowNode (WF-N)

- **Purpose**: a step in a workflow (start, end, task, decision, wait).
- **Required fields**: id, workflowId, nodeType, label, status.
- **Optional fields**: assigneeRole, inputs, outputs, timerDuration.
- **Relationships**: belongs to Workflow (N:1); has outgoing/incoming WorkflowEdges.
- **ID format**: `WF-0001-N01` (child of workflow).
- **Status values**: inherited from parent workflow.
- **Validation**: nodeType ∈ {start, end, task, decision, wait}; exactly one start per workflow; decisions have ≥ 2 outgoing edges (TR-04); end nodes have 0 outgoing edges.

## 8. WorkflowEdge (WF-E)

- **Purpose**: connection between two workflow nodes.
- **Required fields**: id, workflowId, fromNodeId, toNodeId.
- **Optional fields**: label, condition.
- **Relationships**: belongs to Workflow (N:1); references two WorkflowNodes.
- **ID format**: `WF-0001-E01` (child of workflow).
- **Status values**: inherited from parent workflow.
- **Validation**: no self-loops; fromNodeId/toNodeId exist in same workflow; edges leaving a decision node must carry a condition (TR-04).

## 9. Screen (SCR)

- **Purpose**: a UI screen in the product.
- **Required fields**: id, projectId, moduleId, name, status.
- **Optional fields**: route, description, components, mockupRef, useCaseIds.
- **Relationships**: realizes UseCases (M:N); uses Components (M:N).
- **ID format**: `SCR-0001`.
- **Status values**: proposed, approved, designed, implemented, archived.
- **Validation**: name unique within module; route must start with "/" when present.

## 10. Entity (DB)

- **Purpose**: a data entity (table/collection) in the product's data model.
- **Required fields**: id, projectId, moduleId, name, status.
- **Optional fields**: description, tableName, notes.
- **Relationships**: has EntityFields (1:N); participates in EntityRelations (M:N); linked to Components (M:N).
- **ID format**: `DB-0001`.
- **Status values**: draft, reviewed, approved, implemented, archived.
- **Validation**: must have exactly one primary-key field (TR-05); name unique within project.

## 11. EntityField (DB-F)

- **Purpose**: a field/column of an Entity.
- **Required fields**: id, entityId, name, dataType, status.
- **Optional fields**: nullable, defaultValue, isPrimaryKey, isUnique, constraints.
- **Relationships**: belongs to Entity (N:1).
- **ID format**: `DB-0001-F01` (child of entity).
- **Status values**: inherited from parent entity.
- **Validation**: dataType ∈ {string, number, boolean, date, datetime, json, uuid, reference}; exactly one isPrimaryKey per entity (TR-05).

## 12. EntityRelation (REL)

- **Purpose**: a relationship between two Entities.
- **Required fields**: id, projectId, fromEntityId, toEntityId, relationType, status.
- **Optional fields**: onDelete, description, throughEntityId.
- **Relationships**: references two Entities.
- **ID format**: `REL-0001`.
- **Status values**: draft, reviewed, approved, archived.
- **Validation**: relationType ∈ {1:1, 1:N, N:M}; fromEntityId ≠ toEntityId; N:M requires throughEntityId.

## 13. Component (CMP)

- **Purpose**: an architecture component (service, layer, module) of the product.
- **Required fields**: id, projectId, name, layer, status.
- **Optional fields**: responsibility, technologies, dependsOn.
- **Relationships**: appears in ArchitectureDiagrams (M:N); serves Screens and ApiEndpoints (M:N); owns Entities (1:N).
- **ID format**: `CMP-0001`.
- **Status values**: draft, reviewed, approved, archived.
- **Validation**: layer ∈ {presentation, application, domain, infrastructure, integration}; dependsOn must reference existing components.

## 14. ApiEndpoint (API)

- **Purpose**: a REST API endpoint contract.
- **Required fields**: id, projectId, moduleId, path, method, status.
- **Optional fields**: requestSchema, responseSchema, errorCodes, auth, relatedRequirementIds.
- **Relationships**: implements UseCases (M:N); owned by Components (M:N); referenced by SequenceDiagrams (M:N).
- **ID format**: `API-0001`.
- **Status values**: proposed, approved, implemented, deprecated, archived.
- **Validation**: method ∈ {GET, POST, PUT, PATCH, DELETE}; path starts with "/"; must define input, output, and errors (TR-06).

## 15. SequenceDiagram (SEQ)

- **Purpose**: a sequence interaction between participants.
- **Required fields**: id, projectId, name, participants, status.
- **Optional fields**: sourceUseCaseId, steps, relatedApiEndpointIds.
- **Relationships**: derived from UseCases (N:1); references Components and ApiEndpoints (M:N).
- **ID format**: `SEQ-0001`.
- **Status values**: draft, generated, approved, superseded, archived.
- **Validation**: participants non-empty; sourceUseCaseId references an existing UseCase when present.

## 16. ArchitectureDiagram (ARCH)

- **Purpose**: an architecture view of the product.
- **Required fields**: id, projectId, name, status.
- **Optional fields**: viewType, description.
- **Relationships**: contains Components (M:N); generated from the architecture model.
- **ID format**: `ARCH-0001`.
- **Status values**: draft, generated, approved, superseded, archived.
- **Validation**: viewType ∈ {context, container, component, deployment} when present.

## 17. TestCase (TC)

- **Purpose**: a test case verifying behavior.
- **Required fields**: id, projectId, moduleId, title, precondition, steps, expectedResult, status.
- **Optional fields**: requirementIds, automationRef, testType.
- **Relationships**: verifies Requirements (M:N); linked to Tasks that implement the verification.
- **ID format**: `TC-0001`.
- **Status values**: proposed, approved, passed, failed, blocked, archived.
- **Validation**: steps non-empty; every critical requirement must have ≥ 1 TC (TR-07).

## 18. Risk (RISK)

- **Purpose**: a recorded risk with likelihood and impact.
- **Required fields**: id, projectId, title, likelihood, impact, status.
- **Optional fields**: mitigation, owner, relatedArtifactIds.
- **Relationships**: linked to Modules, Tasks, or Decisions (M:N).
- **ID format**: `RISK-0001`.
- **Status values**: open, mitigated, accepted, closed.
- **Validation**: likelihood ∈ {low, medium, high}; impact ∈ {low, medium, high, critical}.

## 19. Decision (ADR)

- **Purpose**: an architecture decision record.
- **Required fields**: id, projectId, title, decision, status.
- **Optional fields**: context, alternatives, consequences, relatedArtifactIds, supersedes.
- **Relationships**: linked to the artifacts it affects (M:N); Approvals may reference it (1:N).
- **ID format**: `ADR-0001`.
- **Status values**: proposed, approved, rejected, superseded.
- **Validation**: decision text required; supersedes must reference an existing ADR.

## 20. Milestone (MS)

- **Purpose**: a planning milestone with a due date.
- **Required fields**: id, projectId, name, dueDate, status.
- **Optional fields**: description, taskIds, gateCriteria.
- **Relationships**: contains Tasks (M:N); belongs to Project (N:1).
- **ID format**: `MS-0001`.
- **Status values**: planned, in_progress, reached, missed, cancelled.
- **Validation**: dueDate required; must link to ≥ 1 task unless it is the final milestone (TR-08).

## 21. Task (TASK)

- **Purpose**: an executable unit of work, packaged for humans or agents.
- **Required fields**: id, projectId, moduleId, title, type, priority, objective, status, definitionOfDone.
- **Optional fields**: context, constraints, inputArtifactIds, approvalRequired, milestoneId.
- **Relationships**: has ChecklistItems (1:N); executed by AgentRuns (1:N); belongs to Milestones (M:N); linked to Requirements/Artifacts (M:N).
- **ID format**: `TASK-0001`.
- **Status values**: open, in_progress, blocked, done, cancelled.
- **Validation**: must have objective, ≥ 1 checklist item, and a definition of done (TR-09); type ∈ {spec, backend, frontend, docs, test, governance, ops}.

## 22. ChecklistItem (TASK-C)

- **Purpose**: a concrete, sequential step in a task checklist.
- **Required fields**: id, taskId, position, description, status.
- **Optional fields**: verificationHint.
- **Relationships**: belongs to Task (N:1).
- **ID format**: `TASK-0001-C01` (child of task).
- **Status values**: pending, done, skipped.
- **Validation**: description must be a concrete action (no vague verbs); position unique per task; order enforced sequentially (TR-09).

## 23. Approval (APR)

- **Purpose**: a recorded human approval or rejection of an artifact.
- **Required fields**: id, artifactId, approverRole, decision, date, status.
- **Optional fields**: comments, supersedes, relatedDecisionId.
- **Relationships**: references the approved artifact (N:1); references a Decision (N:1 when applicable).
- **ID format**: `APR-0001`.
- **Status values**: pending, approved, rejected.
- **Validation**: approverRole must have approval rights for the artifact kind (see user-roles); decision ∈ {approved, rejected}; artifactId must reference an existing artifact (TR-10).

## 24. AgentRun (AGT)

- **Purpose**: a record of an agent (AI executor) working a task.
- **Required fields**: id, taskId, agentFamily, status, startedAt.
- **Optional fields**: completedAt, outputArtifactIds, logRef, errorSummary.
- **Relationships**: belongs to Task (N:1); produces Artifacts (M:N).
- **ID format**: `AGT-0001`.
- **Status values**: queued, running, completed, failed.
- **Validation**: agentFamily ∈ {claude, chatgpt, qwen, compatible_agent}; completed requires completedAt; failed requires errorSummary.

---

## Summary of Prefixes

| Prefix | Entity | Child IDs |
|--------|--------|-----------|
| PRJ | Project | — |
| MOD | Module | — |
| ART | Artifact | — |
| REQ | Requirement | — |
| UC | UseCase | — |
| WF | Workflow | WF-…-N01, WF-…-E01 |
| SCR | Screen | — |
| DB | Entity | DB-…-F01 |
| REL | EntityRelation | — |
| CMP | Component | — |
| API | ApiEndpoint | — |
| SEQ | SequenceDiagram | — |
| ARCH | ArchitectureDiagram | — |
| TC | TestCase | — |
| RISK | Risk | — |
| ADR | Decision | — |
| MS | Milestone | — |
| TASK | Task | TASK-…-C01 |
| APR | Approval | — |
| AGT | AgentRun | — |
