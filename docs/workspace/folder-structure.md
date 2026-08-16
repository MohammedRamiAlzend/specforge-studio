---
id: WS-001
type: workspace-folder-structure
phase: 03-markdown-workspace-spec
status: draft
owner: engineering
---

# Folder Structure — Generated Markdown Workspace

## 1. Rules

1. The workspace is a **generated export** from the database. It is regenerable and must never be hand-maintained as a source of truth.
2. Folder names are fixed and numbered for stable ordering.
3. Each folder contains an index file or README describing its contents.
4. Every generated file carries YAML frontmatter (see `frontmatter-spec.md`).
5. All content is English only.

## 2. Workspace Tree

```
<workspace>/
├── README.md                  # Workspace index + reading order
├── AGENTS.md                  # Agent guide for this workspace (from template)
├── 00-meta/                   # Project metadata and registries
│   ├── project.md             # Project profile (PRJ-0001)
│   ├── id-registry.md         # All assigned IDs and owners
│   ├── glossary.md            # Domain glossary
│   ├── decisions.md           # ADR index (decision records)
│   └── open-questions.md      # OQ index
├── 01-planning/               # Product definition and roadmap
│   ├── vision.md              # Product vision (VSN)
│   ├── scope.md               # Scope and non-goals (SCP/NGL)
│   ├── milestones.md          # Milestone list (MS)
│   └── roadmap.md             # Generated roadmap
├── 02-requirements/           # Requirements and use cases
│   ├── requirements.md        # REQ index
│   ├── REQ-0001-<slug>.md     # One file per requirement
│   └── use-cases/             # One file per use case (UC)
├── 03-design/                 # Architecture, data, workflows, sequences
│   ├── architecture.md        # ARCH overview + component views
│   ├── components.md          # Component catalog (CMP)
│   ├── data-model.md          # Data model overview (DB)
│   ├── DB-0001-<slug>.md      # One file per entity
│   ├── workflows/             # One file per workflow (WF, with Mermaid)
│   └── sequences/             # One file per sequence diagram (SEQ)
├── 04-ui/                     # Screen specifications
│   ├── screens.md             # SCR index
│   └── SCR-0001-<slug>.md     # One file per screen
├── 05-testing/                # Test plan and test cases
│   ├── test-plan.md           # Test strategy and coverage
│   ├── TC-0001-<slug>.md      # One file per test case
│   └── validation-report.md   # Traceability + validation results
├── 06-ops/                    # Operations and risk
│   ├── deployment.md          # Deployment guide
│   ├── environments.md        # Environment descriptions
│   ├── runbooks.md            # Operational runbooks
│   └── risks.md               # Risk register (RISK)
├── 07-guides/                 # Human and agent guides
│   ├── user-guide.md          # How to use the product
│   ├── developer-guide.md     # How to extend the product
│   └── agent-guide.md         # How agents should work here
├── 08-governance/             # Approvals and audit
│   ├── approvals.md           # APR index
│   ├── decisions.md           # Full ADR records
│   └── audit-log.md           # Status transition audit
├── 09-agent-plans/            # Executable plans
│   ├── master-plan.md         # Overall plan (MS + TASK overview)
│   ├── phases/                # Phase plans
│   ├── tasks/                 # One file per task (TASK)
│   └── checklists/            # Standalone checklist artifacts (CHK)
└── templates/                 # Copy of the template set
```

## 3. Folder Purpose

| Folder | Purpose | Typical Contents |
|--------|---------|------------------|
| 00-meta | Machine and human metadata | IDs, glossary, decisions index |
| 01-planning | Why and when | Vision, scope, milestones, roadmap |
| 02-requirements | What | REQ and UC files |
| 03-design | How | ARCH, CMP, DB, WF, SEQ |
| 04-ui | Screens | SCR specs |
| 05-testing | Verification | TC files, plan, validation report |
| 06-ops | Run it | Deployment, environments, runbooks, risks |
| 07-guides | Use it | User, developer, agent guides |
| 08-governance | Approve it | APR, ADR, audit log |
| 09-agent-plans | Execute it | Master plan, phases, tasks, checklists |
| templates | Blank forms | Template files for drafts |

## 4. Workspace README.md (generated)

The workspace `README.md` must contain:

1. Project name and ID (PRJ).
2. Reading order (01-planning → 02-requirements → 03-design → 04-ui → 05-testing → 06-ops → 07-guides → 08-governance → 09-agent-plans).
3. A link to `AGENTS.md` for agents.
4. Generation timestamp and source database fingerprint.
