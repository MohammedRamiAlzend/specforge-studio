---
id: ONT-003
type: relationships
phase: 02-domain-ontology-and-ids
status: draft
owner: engineering
---

# Relationships — SpecForge Studio

## 1. Ownership Rules

1. Every entity belongs to exactly **one Project** (directly or transitively through its module).
2. Deleting a Project cascades to all owned entities (with approval, per governance rules).
3. Deleting a parent restricts deletion of children: Workflow requires its Nodes/Edges to be removed first; Entity requires its Fields to be removed first; Task requires its ChecklistItems to be removed first.
4. A child entity cannot outlive its parent.

## 2. Relationship Map

| From | To | Cardinality | Semantics |
|------|----|-------------|-----------|
| Project | Module | 1:N | Project owns modules |
| Project | Requirement | 1:N | Direct or via module |
| Project | Milestone | 1:N | Project has milestones |
| Project | Decision | 1:N | Project has decision records |
| Project | Approval | 1:N | Project has approval records |
| Module | Requirement | 1:N | Module scopes requirements |
| Module | UseCase | 1:N | Module scopes use cases |
| Module | Workflow | 1:N | Module scopes workflows |
| Module | Screen | 1:N | Module scopes screens |
| Module | Entity | 1:N | Module scopes data entities |
| Module | ApiEndpoint | 1:N | Module scopes API endpoints |
| Module | Task | 1:N | Module scopes tasks |
| Requirement | UseCase | N:M | Requirement satisfied by use cases |
| Requirement | Workflow | N:M | Requirement realized by workflows |
| Requirement | TestCase | N:M | Requirement verified by test cases |
| Requirement | Task | N:M | Requirement drives tasks |
| UseCase | Screen | N:M | Use case realized by screens |
| UseCase | ApiEndpoint | N:M | Use case implemented by endpoints |
| UseCase | SequenceDiagram | 1:N | Use case detailed by sequence diagrams |
| Workflow | WorkflowNode | 1:N | Workflow composed of nodes |
| Workflow | WorkflowEdge | 1:N | Workflow connected by edges |
| WorkflowNode | WorkflowEdge | 1:N (out) / 1:N (in) | Node has outgoing/incoming edges |
| Entity | EntityField | 1:N | Entity has fields |
| Entity | EntityRelation | 1:N (as source) / 1:N (as target) | Entity participates in relations |
| Component | ApiEndpoint | M:N | Component owns/serves endpoints |
| Component | Screen | M:N | Component supports screens |
| Component | Entity | M:N | Component uses entities |
| Component | ArchitectureDiagram | M:N | Diagram contains components |
| ArchitectureDiagram | Component | M:N | Diagram shows components |
| SequenceDiagram | ApiEndpoint | M:N | Sequence references endpoints |
| Task | ChecklistItem | 1:N | Task has checklist items |
| Task | AgentRun | 1:N | Task executed by agent runs |
| Task | Milestone | M:N | Tasks assigned to milestones |
| Approval | Artifact | N:1 | Approval targets one artifact |
| Approval | Decision | N:1 | Approval may ratify a decision |
| AgentRun | Artifact | M:N | Agent run produces artifacts |

## 3. Derived (Generated) Relationships

- **Artifacts** are derived from model entities; `sourceEntityIds` records the derivation. A diagram artifact (e.g. `ART-0012`) derives from its diagram entity (`ARCH-0001`, `SEQ-0001`, `WF-0001`, `DB-0001`).
- **Task packs** derive from Requirements, Workflows, and Milestones; each task records its `inputArtifactIds`.

## 4. Referential Integrity Rules

1. Every foreign key field must reference an existing entity ID.
2. No dangling references: traceability reports flag orphans (TR-11).
3. Cross-workspace exports preserve references by canonical ID (TR-06/TR-13 in traceability-rules.md).
