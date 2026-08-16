---
id: ONT-005
type: status-lifecycle
phase: 02-domain-ontology-and-ids
status: draft
owner: engineering
---

# Status Lifecycle — SpecForge Studio

## 1. Global Principles

1. **Forward motion** is default: statuses move forward through the lifecycle.
2. **Review gates**: approval-dependent artifacts (REQ, ARCH, DB, API, security workflows) cannot reach an approved state without a recorded Approval (APR).
3. **Rejected allows rework**: rejected artifacts return to draft/proposed (never deleted silently).
4. **Archived is terminal**: archived entities are read-only and retain their IDs.
5. **No skipping**: transitions skip states only when explicitly allowed in the tables below.

## 2. Lifecycles by Entity Group

### 2.1 Spec artifacts (REQ, UC, SCR, DB, REL, CMP, API, WF)

```
proposed → approved → implemented → verified → archived
    ↑          ↓
    └── rejected ──→ (rework: proposed)
```

Allowed transitions:

| From | To |
|------|----|
| proposed | approved, rejected |
| approved | implemented, archived |
| implemented | verified |
| verified | archived |
| rejected | proposed |

Notes:
- REQ/UC/SCR/WF add `draft` before `proposed` (draft → proposed → …).
- `approved` requires an Approval record (APR) for: final requirements, final architecture, final database schema, final API contracts.

### 2.2 Workflow child nodes/edges and Entity fields

Inherit the parent's lifecycle; they carry no independent status.

### 2.3 Generated artifacts (ART, SEQ, ARCH diagrams)

```
draft → generated → reviewed → approved → superseded → archived
```

Notes:
- `generated` is produced automatically; `reviewed`/`approved` are human steps.
- `superseded` applies when a newer version replaces the artifact.

### 2.4 Tasks (TASK)

```
open → in_progress → done
   ↓        ↓
blocked  (reopen → in_progress)
   ↓
cancelled
```

| From | To |
|------|----|
| open | in_progress, cancelled |
| in_progress | done, blocked |
| blocked | in_progress |
| done | — (terminal; reopen requires new task) |
| cancelled | — (terminal) |

### 2.5 Checklist items (TASK-C)

```
pending → done
pending → skipped
```

### 2.6 Approvals (APR)

```
pending → approved
pending → rejected
```

Notes: an APR is created when an approval is requested; `approved`/`rejected` are terminal for that record. Rejection spawns a new APR after rework.

### 2.7 Agent runs (AGT)

```
queued → running → completed
              ↓
            failed
```

| From | To |
|------|----|
| queued | running, failed |
| running | completed, failed |
| completed | — (terminal) |
| failed | — (terminal; retry = new AGT record) |

### 2.8 Decisions (ADR)

```
proposed → approved → superseded
proposed → rejected
```

### 2.9 Milestones (MS)

```
planned → in_progress → reached → missed → cancelled
```

### 2.10 Risks (RISK)

```
open → mitigated → closed
open → accepted → closed
```

### 2.11 Project (PRJ) and Module (MOD)

```
draft → active → completed → archived
```

## 3. Transition Audit

1. Every transition is logged with timestamp and actor (human or agent ID).
2. Approval-dependent transitions store the linked APR ID.
3. The governance report lists all transitions for audited artifacts.
