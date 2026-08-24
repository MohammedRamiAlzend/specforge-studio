-- ============================================================================
-- SpecForge Studio — SQLite schema (canonical)
-- Source of truth for the database layout. Migrations live in
-- backend/db/migrations/ and are always additive on top of this file.
--
-- Conventions:
--   * Every artifact table has a TEXT primary key holding the stable public
--     ID (see docs/ontology/id-convention.md). Sequence counters are kept in
--     id_sequences.
--   * Timestamps are TEXT ISO-8601 UTC. created_at defaults to now;
--     updated_at is maintained by the application layer.
--   * Booleans are INTEGER (0/1).
--   * JSON columns (TEXT with JSON content) are used only where relational
--     modeling is excessive. Traceability links use artifact_links.
--   * Secrets are never stored in plain text and never in this schema.
--   * Foreign keys are enforced (PRAGMA foreign_keys = ON). Circular and
--     polymorphic references (workflow start/end nodes, approval targets,
--     task approval links) are validated in the application layer.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Infrastructure
-- ---------------------------------------------------------------------------

-- ID allocation counters per prefix (DEC-002: registry-backed allocation).
CREATE TABLE IF NOT EXISTS id_sequences (
  prefix      TEXT PRIMARY KEY,
  next_value  INTEGER NOT NULL DEFAULT 1,
  project_id  TEXT
);

-- Record of applied migrations (see backend/db/migrations/README.md).
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     INTEGER PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ---------------------------------------------------------------------------
-- Core containers
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS projects (
  id             TEXT PRIMARY KEY,                      -- PRJ-0001
  name           TEXT NOT NULL,
  -- DEPRECATED (Prompt 13): legacy primary type for backward compatibility.
  -- The source of truth for a project's full type set is
  -- project_type_assignments (see the Platform configuration section below).
  type           TEXT NOT NULL CHECK (type IN ('web','mobile','api','ai')),
  description    TEXT,
  repository_url TEXT,
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed','archived')),
  created_by     TEXT NOT NULL,
  metadata       TEXT,                                  -- JSON
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS modules (
  id          TEXT PRIMARY KEY,                         -- MOD-0001
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  owner_role  TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','deprecated','archived')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (project_id, name)
);
CREATE INDEX IF NOT EXISTS idx_modules_project ON modules(project_id);

-- ---------------------------------------------------------------------------
-- Requirements and use cases
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS requirements (
  id                 TEXT PRIMARY KEY,                  -- REQ-0001
  project_id         TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  module_id          TEXT REFERENCES modules(id) ON DELETE SET NULL,
  title              TEXT NOT NULL,
  type               TEXT CHECK (type IN ('functional','nonfunctional','constraint','data')),
  priority           TEXT CHECK (priority IN ('must','should','could','wont')),
  criticality        TEXT NOT NULL DEFAULT 'normal' CHECK (criticality IN ('critical','normal')),
  description        TEXT,
  acceptance_criteria TEXT,
  status             TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','implemented','verified','rejected','archived')),
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_requirements_project ON requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_requirements_module ON requirements(module_id);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);

CREATE TABLE IF NOT EXISTS use_cases (
  id               TEXT PRIMARY KEY,                    -- UC-0001
  project_id       TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  module_id        TEXT REFERENCES modules(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  actor            TEXT NOT NULL,
  preconditions    TEXT,                                -- JSON array
  postconditions   TEXT,                                -- JSON array
  main_flow        TEXT,                                -- JSON array
  alternate_flows  TEXT,                                -- JSON array
  status           TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','implemented','verified','archived')),
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_use_cases_project ON use_cases(project_id);
CREATE INDEX IF NOT EXISTS idx_use_cases_module ON use_cases(module_id);

-- ---------------------------------------------------------------------------
-- Workflows
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workflows (
  id            TEXT PRIMARY KEY,                       -- WF-0001
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  module_id     TEXT REFERENCES modules(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  -- start/end node references are validated in the application layer
  -- (graph rules TR-02/TR-03) to avoid a circular FK with workflow_nodes.
  start_node_id TEXT,
  end_node_id   TEXT,
  owner_role    TEXT,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','approved','archived')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_workflows_project ON workflows(project_id);

CREATE TABLE IF NOT EXISTS workflow_nodes (
  id           TEXT PRIMARY KEY,                        -- WF-0001-N01
  workflow_id  TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  node_type    TEXT NOT NULL CHECK (node_type IN ('start','end','task','decision','wait')),
  label        TEXT NOT NULL,
  description  TEXT,
  assignee_role TEXT,
  inputs       TEXT,                                    -- JSON
  outputs      TEXT,                                    -- JSON
  position     TEXT,                                    -- JSON {x, y} canvas layout
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_workflow ON workflow_nodes(workflow_id);

CREATE TABLE IF NOT EXISTS workflow_edges (
  id           TEXT PRIMARY KEY,                        -- WF-0001-E01
  workflow_id  TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  from_node_id TEXT NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  to_node_id   TEXT NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  label        TEXT,
  condition    TEXT,                                    -- required on decision-node edges (TR-04)
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_workflow_edges_workflow ON workflow_edges(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_edges_from ON workflow_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_workflow_edges_to ON workflow_edges(to_node_id);

-- ---------------------------------------------------------------------------
-- Screens, data model, architecture
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS screens (
  id          TEXT PRIMARY KEY,                         -- SCR-0001
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  module_id   TEXT REFERENCES modules(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  route       TEXT,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','designed','implemented','archived')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (module_id, name)
);
CREATE INDEX IF NOT EXISTS idx_screens_project ON screens(project_id);

CREATE TABLE IF NOT EXISTS entities (
  id          TEXT PRIMARY KEY,                         -- DB-0001
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  module_id   TEXT REFERENCES modules(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  table_name  TEXT,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','approved','implemented','archived')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (project_id, name)
);
CREATE INDEX IF NOT EXISTS idx_entities_project ON entities(project_id);

CREATE TABLE IF NOT EXISTS entity_fields (
  id             TEXT PRIMARY KEY,                      -- DB-0001-F01
  entity_id      TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  data_type      TEXT NOT NULL CHECK (data_type IN ('string','number','boolean','date','datetime','json','uuid','reference')),
  nullable       INTEGER NOT NULL DEFAULT 0,
  default_value  TEXT,
  is_primary_key INTEGER NOT NULL DEFAULT 0,
  is_unique      INTEGER NOT NULL DEFAULT 0,
  constraints    TEXT,                                  -- JSON
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (entity_id, name)
);
CREATE INDEX IF NOT EXISTS idx_entity_fields_entity ON entity_fields(entity_id);

CREATE TABLE IF NOT EXISTS entity_relations (
  id               TEXT PRIMARY KEY,                    -- REL-0001
  project_id       TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_entity_id   TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  to_entity_id     TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relation_type    TEXT NOT NULL CHECK (relation_type IN ('1:1','1:N','N:M')),
  through_entity_id TEXT REFERENCES entities(id) ON DELETE SET NULL, -- for N:M
  on_delete        TEXT,
  description      TEXT,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','approved','archived')),
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (from_entity_id <> to_entity_id)
);
CREATE INDEX IF NOT EXISTS idx_entity_relations_from ON entity_relations(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_relations_to ON entity_relations(to_entity_id);

CREATE TABLE IF NOT EXISTS components (
  id            TEXT PRIMARY KEY,                       -- CMP-0001
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  layer         TEXT CHECK (layer IN ('presentation','application','domain','infrastructure','integration')),
  responsibility TEXT,
  technologies  TEXT,                                   -- JSON array
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','approved','archived')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (project_id, name)
);
CREATE INDEX IF NOT EXISTS idx_components_project ON components(project_id);

-- Polymorphic link table: component <-> screens/entities/api_endpoints/
-- architecture_diagrams/sequence_diagrams/modules/tasks (M:N).
CREATE TABLE IF NOT EXISTS component_links (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  component_id TEXT NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  target_type  TEXT NOT NULL CHECK (target_type IN ('screen','entity','api_endpoint','architecture_diagram','sequence_diagram','module','task')),
  target_id    TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (component_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS idx_component_links_target ON component_links(target_type, target_id);

CREATE TABLE IF NOT EXISTS api_endpoints (
  id              TEXT PRIMARY KEY,                     -- API-0001
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  module_id       TEXT REFERENCES modules(id) ON DELETE SET NULL,
  method          TEXT NOT NULL CHECK (method IN ('GET','POST','PUT','PATCH','DELETE')),
  path            TEXT NOT NULL,
  purpose         TEXT,
  auth            TEXT,
  request_schema  TEXT,                                 -- JSON
  response_schema TEXT,                                 -- JSON
  error_codes     TEXT,                                 -- JSON array
  status          TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','implemented','deprecated','archived')),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (module_id, method, path)
);
CREATE INDEX IF NOT EXISTS idx_api_endpoints_project ON api_endpoints(project_id);

-- ---------------------------------------------------------------------------
-- Diagrams
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sequence_diagrams (
  id                 TEXT PRIMARY KEY,                  -- SEQ-0001
  project_id         TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  source_use_case_id TEXT REFERENCES use_cases(id) ON DELETE SET NULL,
  participants       TEXT,                              -- JSON array
  steps              TEXT,                              -- JSON array
  status             TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generated','approved','superseded','archived')),
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_sequence_diagrams_project ON sequence_diagrams(project_id);

CREATE TABLE IF NOT EXISTS architecture_diagrams (
  id          TEXT PRIMARY KEY,                         -- ARCH-0001
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  view_type   TEXT CHECK (view_type IN ('context','container','component','deployment')),
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generated','approved','superseded','archived')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_arch_diagrams_project ON architecture_diagrams(project_id);

-- ---------------------------------------------------------------------------
-- Testing, risk, decisions, milestones
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS test_cases (
  id               TEXT PRIMARY KEY,                    -- TC-0001
  project_id       TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  module_id        TEXT REFERENCES modules(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  test_type        TEXT,
  precondition     TEXT,
  steps            TEXT,                                -- JSON array
  expected_results TEXT,                                -- JSON array
  result           TEXT CHECK (result IN ('passed','failed','blocked')),
  executed_by      TEXT,
  evidence_ref     TEXT,
  status           TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','passed','failed','blocked','archived')),
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_test_cases_project ON test_cases(project_id);

CREATE TABLE IF NOT EXISTS risks (
  id          TEXT PRIMARY KEY,                         -- RISK-0001
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  likelihood  TEXT NOT NULL CHECK (likelihood IN ('low','medium','high')),
  impact      TEXT NOT NULL CHECK (impact IN ('low','medium','high','critical')),
  mitigation  TEXT,
  owner       TEXT,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','mitigated','accepted','closed')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_risks_project ON risks(project_id);

CREATE TABLE IF NOT EXISTS decisions (
  id          TEXT PRIMARY KEY,                         -- ADR-0001
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  decision    TEXT NOT NULL,
  context     TEXT,
  alternatives TEXT,                                    -- JSON array
  consequences TEXT,
  supersedes  TEXT REFERENCES decisions(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','rejected','superseded')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_decisions_project ON decisions(project_id);

-- ---------------------------------------------------------------------------
-- Project execution & delivery (Prompt 20)
-- ---------------------------------------------------------------------------
-- A per-project team roster. Team members can be assigned as owners of tasks
-- and milestones; issues/releases carry a team-visible owner reference too.

CREATE TABLE IF NOT EXISTS team_members (
  id          TEXT PRIMARY KEY,                       -- MEM-0001
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT,
  role        TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_team_members_project ON team_members(project_id);

CREATE TABLE IF NOT EXISTS milestones (
  id            TEXT PRIMARY KEY,                       -- MS-0001
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  due_date      TEXT,
  description   TEXT,
  gate_criteria TEXT,
  assignee_id   TEXT REFERENCES team_members(id) ON DELETE SET NULL,  -- MEM-0001 (Prompt 20)
  status        TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','reached','missed','cancelled')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);

-- ---------------------------------------------------------------------------
-- Tasks and execution
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tasks (
  id                 TEXT PRIMARY KEY,                  -- TASK-0001
  project_id         TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  module_id          TEXT REFERENCES modules(id) ON DELETE SET NULL,
  milestone_id       TEXT REFERENCES milestones(id) ON DELETE SET NULL,
  assignee_id        TEXT REFERENCES team_members(id) ON DELETE SET NULL,  -- MEM-0001 (Prompt 20)
  title              TEXT NOT NULL,
  type               TEXT CHECK (type IN ('spec','backend','frontend','docs','test','governance','ops')),
  priority           TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  objective          TEXT NOT NULL,
  context            TEXT,
  constraints        TEXT,                              -- JSON array
  input_artifacts    TEXT,                              -- JSON array of artifact IDs
  approval_required  INTEGER NOT NULL DEFAULT 0,
  approval_id        TEXT,                              -- APR id; validated in application layer
  status             TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','blocked','done','cancelled')),
  definition_of_done TEXT NOT NULL,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_module ON tasks(module_id);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone ON tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

CREATE TABLE IF NOT EXISTS task_checklists (
  id               TEXT PRIMARY KEY,                    -- TASK-0001-C01
  task_id          TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  position         INTEGER NOT NULL,
  description      TEXT NOT NULL,
  verification_hint TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','skipped')),
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (task_id, position)
);
CREATE INDEX IF NOT EXISTS idx_task_checklists_task ON task_checklists(task_id);

-- ---------------------------------------------------------------------------
-- Governance and audit
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS approvals (
  id                TEXT PRIMARY KEY,                   -- APR-0001
  project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  artifact_id       TEXT NOT NULL,                      -- polymorphic target; app-validated
  artifact_type     TEXT NOT NULL,
  approver_role     TEXT NOT NULL,
  approver_name     TEXT,
  decision          TEXT CHECK (decision IN ('approved','rejected')),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  comments          TEXT,
  related_decision_id TEXT REFERENCES decisions(id) ON DELETE SET NULL,
  supersedes        TEXT REFERENCES approvals(id) ON DELETE SET NULL,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_approvals_artifact ON approvals(artifact_id);
CREATE INDEX IF NOT EXISTS idx_approvals_project ON approvals(project_id);

CREATE TABLE IF NOT EXISTS agent_runs (
  id              TEXT PRIMARY KEY,                     -- AGT-0001
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id         TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_family    TEXT NOT NULL CHECK (agent_family IN ('claude','chatgpt','qwen','compatible_agent')),
  status          TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
  started_at      TEXT,
  completed_at    TEXT,
  error_summary   TEXT,
  log_ref         TEXT,
  output_artifacts TEXT,                                -- JSON array of artifact IDs
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_agent_runs_task ON agent_runs(task_id);

-- Append-only audit log of lifecycle transitions and system actions.
CREATE TABLE IF NOT EXISTS event_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  TEXT,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  action      TEXT NOT NULL,                            -- created|updated|status_change|approved|rejected|generated|exported
  from_status TEXT,
  to_status   TEXT,
  actor       TEXT,
  actor_type  TEXT NOT NULL DEFAULT 'system' CHECK (actor_type IN ('human','agent','system')),
  payload     TEXT,                                     -- JSON
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_event_log_entity ON event_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_event_log_project ON event_log(project_id);

-- ---------------------------------------------------------------------------
-- Traceability links (TR rules backbone)
-- ---------------------------------------------------------------------------

-- Polymorphic link table for all traceability edges:
-- REQ->UC/WF/TC/TASK, UC->SCR/API/SEQ, SEQ->API/CMP, TASK->REQ/ART, etc.
CREATE TABLE IF NOT EXISTS artifact_links (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,  -- DEC-014: no orphan traceability rows
  from_type  TEXT NOT NULL,
  from_id    TEXT NOT NULL,
  to_type    TEXT NOT NULL,
  to_id      TEXT NOT NULL,
  link_type  TEXT NOT NULL DEFAULT 'related',           -- satisfies|verifies|realizes|implements|derives|traces|related
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (from_type, from_id, to_type, to_id, link_type)
);
CREATE INDEX IF NOT EXISTS idx_artifact_links_from ON artifact_links(from_type, from_id);
CREATE INDEX IF NOT EXISTS idx_artifact_links_to ON artifact_links(to_type, to_id);
CREATE INDEX IF NOT EXISTS idx_artifact_links_project ON artifact_links(project_id);

-- ---------------------------------------------------------------------------
-- Visual modeler canvases (Prompt 07)
-- ---------------------------------------------------------------------------
-- A model graph is the persisted, structured model behind a visual canvas.
-- One graph per modeled artifact (workflow, data model, architecture,
-- sequence). Nodes/edges carry the full inspector properties; the Mermaid
-- diagram generator (Prompt 08) consumes these tables as structured input.
-- Node/edge types are validated in the application layer (the catalog in
-- backend/src/modules/modeler.ts) so the type set can grow without a
-- destructive CHECK-constraint migration.

CREATE TABLE IF NOT EXISTS model_graphs (
  id           TEXT PRIMARY KEY,                        -- GRPH-0001
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('workflow','data','architecture','sequence')),
  name         TEXT NOT NULL,
  description  TEXT,
  artifact_type TEXT,                                   -- optional link: workflow|architecture_diagram|...
  artifact_id  TEXT,                                    -- canonical artifact ID this graph models
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','approved','archived')),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_model_graphs_project ON model_graphs(project_id);

CREATE TABLE IF NOT EXISTS model_nodes (
  id                TEXT PRIMARY KEY,                   -- GRPH-0001-N01
  graph_id          TEXT NOT NULL REFERENCES model_graphs(id) ON DELETE CASCADE,
  client_key        TEXT NOT NULL,                      -- stable client-side key (React Flow node id)
  node_type         TEXT NOT NULL,                      -- catalog type: start|step|decision|...
  title             TEXT NOT NULL,
  description       TEXT,
  inputs            TEXT,                               -- JSON array
  outputs           TEXT,                               -- JSON array
  preconditions     TEXT,                               -- JSON array
  postconditions    TEXT,                               -- JSON array
  related_artifacts TEXT,                               -- JSON array of canonical IDs
  metadata          TEXT,                               -- JSON object (kind-specific extras)
  position          TEXT NOT NULL,                      -- JSON {x, y} canvas layout
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (graph_id, client_key)
);
CREATE INDEX IF NOT EXISTS idx_model_nodes_graph ON model_nodes(graph_id);

CREATE TABLE IF NOT EXISTS model_edges (
  id         TEXT PRIMARY KEY,                          -- GRPH-0001-E01
  graph_id   TEXT NOT NULL REFERENCES model_graphs(id) ON DELETE CASCADE,
  from_node  TEXT NOT NULL REFERENCES model_nodes(id) ON DELETE CASCADE,
  to_node    TEXT NOT NULL REFERENCES model_nodes(id) ON DELETE CASCADE,
  label      TEXT,
  condition  TEXT,                                      -- required on decision-node edges (TR-04)
  edge_type  TEXT NOT NULL DEFAULT 'next' CHECK (edge_type IN ('success','failure','next','retry','escalation','related')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_model_edges_graph ON model_edges(graph_id);
CREATE INDEX IF NOT EXISTS idx_model_edges_from ON model_edges(from_node);
CREATE INDEX IF NOT EXISTS idx_model_edges_to ON model_edges(to_node);

-- ---------------------------------------------------------------------------
-- Generated diagrams (Prompt 08)
-- ---------------------------------------------------------------------------
-- Stores every generated Mermaid diagram with its provenance: diagram type,
-- source artifact IDs (model graph and/or canonical artifacts), the mermaid
-- source itself, and the validation warnings that applied at generation time.
-- Mermaid is always generated from structured data; users never write it.

CREATE TABLE IF NOT EXISTS generated_diagrams (
  id              TEXT PRIMARY KEY,                     -- DIAG-0001
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  graph_id        TEXT REFERENCES model_graphs(id) ON DELETE SET NULL,
  diagram_type    TEXT NOT NULL CHECK (diagram_type IN ('workflow','sequence','erd','architecture')),
  name            TEXT NOT NULL,
  mermaid         TEXT NOT NULL,
  source_artifacts TEXT,                                -- JSON array of canonical IDs
  warnings        TEXT,                                 -- JSON array of validation warnings
  status          TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated','approved','superseded','archived')),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_generated_diagrams_project ON generated_diagrams(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_diagrams_graph ON generated_diagrams(graph_id);

-- ---------------------------------------------------------------------------
-- Documentation workspace exports (Prompt 09)
-- ---------------------------------------------------------------------------
-- One row per generated Markdown workspace export. Files are written to the
-- export folder (config EXPORT_DIR/<DOCS-id>/) as the portable output; this
-- table records provenance (file list, counts) and export lifecycle.
-- Regeneration creates a new export and marks older ones superseded.

CREATE TABLE IF NOT EXISTS docs_exports (
  id           TEXT PRIMARY KEY,                        -- DOCS-0001
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated','superseded','archived')),
  file_count   INTEGER NOT NULL,
  files        TEXT NOT NULL,                           -- JSON array of {path, bytes}
  generated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_docs_exports_project ON docs_exports(project_id);

-- ---------------------------------------------------------------------------
-- Roadmaps and agent task packs (Prompt 10)
-- ---------------------------------------------------------------------------
-- The roadmap engine derives a plan (phases, milestones, epics, task drafts,
-- dependencies, priorities, approval gates) from project artifacts and stores
-- it as a snapshot. The agent task packager materializes the roadmap task
-- drafts into the canonical tasks/task_checklists tables (executable,
-- agent-neutral task packs) and records TASK->TASK ordering in
-- task_dependencies. Child IDs: RMP-0001-P01 (phase), RMP-0001-EP01 (epic),
-- RMP-0001-M01 (milestone), RMP-0001-T01 (task draft).

CREATE TABLE IF NOT EXISTS roadmaps (
  id         TEXT PRIMARY KEY,                          -- RMP-0001
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','archived')),
  metadata   TEXT,                                      -- JSON {input_counts, derived_counts, generated_at}
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_roadmaps_project ON roadmaps(project_id);

CREATE TABLE IF NOT EXISTS roadmap_phases (
  id               TEXT PRIMARY KEY,                    -- RMP-0001-P01
  roadmap_id       TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  position         INTEGER NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  approval_required INTEGER NOT NULL DEFAULT 0,
  gate_criteria    TEXT,
  UNIQUE (roadmap_id, position)
);
CREATE INDEX IF NOT EXISTS idx_roadmap_phases_roadmap ON roadmap_phases(roadmap_id);

CREATE TABLE IF NOT EXISTS roadmap_epics (
  id          TEXT PRIMARY KEY,                         -- RMP-0001-EP01
  roadmap_id  TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  phase_id    TEXT REFERENCES roadmap_phases(id) ON DELETE CASCADE,
  module_id   TEXT REFERENCES modules(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  description TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (roadmap_id, name)
);
CREATE INDEX IF NOT EXISTS idx_roadmap_epics_roadmap ON roadmap_epics(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_epics_phase ON roadmap_epics(phase_id);

CREATE TABLE IF NOT EXISTS roadmap_milestones (
  id            TEXT PRIMARY KEY,                       -- RMP-0001-M01
  roadmap_id    TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  phase_id      TEXT REFERENCES roadmap_phases(id) ON DELETE SET NULL,
  position      INTEGER NOT NULL,
  name          TEXT NOT NULL,
  due_date      TEXT,
  gate_criteria TEXT,
  status        TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','reached','missed','cancelled')),
  UNIQUE (roadmap_id, position)
);
CREATE INDEX IF NOT EXISTS idx_roadmap_milestones_roadmap ON roadmap_milestones(roadmap_id);

CREATE TABLE IF NOT EXISTS roadmap_tasks (
  id                   TEXT PRIMARY KEY,                -- RMP-0001-T01
  roadmap_id           TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  epic_id              TEXT REFERENCES roadmap_epics(id) ON DELETE SET NULL,
  phase_id             TEXT REFERENCES roadmap_phases(id) ON DELETE SET NULL,
  module_id            TEXT REFERENCES modules(id) ON DELETE SET NULL,
  source_type          TEXT NOT NULL,                   -- requirement|api_endpoint|entity|screen|workflow|risk|test_case
  source_id            TEXT NOT NULL,
  title                TEXT NOT NULL,
  type                 TEXT NOT NULL CHECK (type IN ('spec','backend','frontend','docs','test','governance','ops')),
  priority             TEXT NOT NULL CHECK (priority IN ('high','medium','low')),
  objective            TEXT NOT NULL,
  context              TEXT,
  constraints          TEXT,                            -- JSON array
  input_artifacts      TEXT,                            -- JSON array of canonical artifact IDs
  checklist            TEXT NOT NULL,                   -- JSON array of {description, verification}
  definition_of_done   TEXT NOT NULL,
  approval_required    INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','archived')),
  materialized_task_id TEXT,                            -- TASK id once packaged (agent-tasks)
  UNIQUE (roadmap_id, source_type, source_id)
);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_roadmap ON roadmap_tasks(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_epic ON roadmap_tasks(epic_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_phase ON roadmap_tasks(phase_id);

CREATE TABLE IF NOT EXISTS roadmap_task_dependencies (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  roadmap_id          TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  task_id             TEXT NOT NULL REFERENCES roadmap_tasks(id) ON DELETE CASCADE,
  depends_on_task_id  TEXT NOT NULL REFERENCES roadmap_tasks(id) ON DELETE CASCADE,
  reason              TEXT,
  UNIQUE (task_id, depends_on_task_id),
  CHECK (task_id <> depends_on_task_id)
);
CREATE INDEX IF NOT EXISTS idx_roadmap_deps_task ON roadmap_task_dependencies(task_id);

-- Canonical TASK->TASK ordering recorded by the agent task packager.
CREATE TABLE IF NOT EXISTS task_dependencies (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id         TEXT NOT NULL,
  task_id            TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  reason             TEXT,
  UNIQUE (task_id, depends_on_task_id),
  CHECK (task_id <> depends_on_task_id)
);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends ON task_dependencies(depends_on_task_id);

-- ---------------------------------------------------------------------------
-- Governance overlay (Prompt 11)
-- ---------------------------------------------------------------------------
-- The canonical governance status lifecycle (draft -> auto_generated ->
-- needs_review -> approved -> ready_for_agent -> in_progress ->
-- needs_verification -> done, with rejected as a branch) lives here as a
-- per-artifact overlay. Domain status columns on the artifact tables remain
-- the artifacts' own lifecycles; the governance service validates transitions
-- against this overlay, enforces approval gates (final requirements,
-- architecture, data model, API contracts, security workflows, production
-- decisions — DEC-003), best-effort syncs the domain status via a per-type
-- translation, and records every transition in event_log.

CREATE TABLE IF NOT EXISTS artifact_governance (
  artifact_type TEXT NOT NULL,
  artifact_id   TEXT NOT NULL,
  project_id    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','auto_generated','needs_review','approved','ready_for_agent','in_progress','needs_verification','done','rejected')),
  needs_approval INTEGER NOT NULL DEFAULT 0,
  approval_id   TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (artifact_type, artifact_id)
);
CREATE INDEX IF NOT EXISTS idx_artifact_governance_project ON artifact_governance(project_id);

-- ---------------------------------------------------------------------------
-- Platform configuration (Prompt 13)
-- ---------------------------------------------------------------------------
-- Project platform types, stacks, and libraries are fully dynamic and stored
-- here (managed from the global Settings page) instead of hardcoded enum
-- values. A project can carry MULTIPLE types; per type it may optionally pick
-- one stack and any libraries of that stack. `projects.type` is DEPRECATED:
-- it remains only as the legacy primary type for backward compatibility —
-- the source of truth for a project's full type set is
-- project_type_assignments (+ project_type_config / project_libraries).

CREATE TABLE IF NOT EXISTS project_types (
  id          TEXT PRIMARY KEY,                          -- PTYPE-0001
  key         TEXT NOT NULL UNIQUE,                      -- web|mobile|api|ai|custom...
  label       TEXT NOT NULL,
  description TEXT,
  color       TEXT,
  icon        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  enabled     INTEGER NOT NULL DEFAULT 1,                -- disabled rows hide from creation but stay readable
  built_in    INTEGER NOT NULL DEFAULT 0,                -- built-in rows may be edited/disabled but not deleted
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_project_types_enabled ON project_types(enabled);

CREATE TABLE IF NOT EXISTS stacks (
  id          TEXT PRIMARY KEY,                          -- STK-0001
  type_id     TEXT NOT NULL REFERENCES project_types(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  language    TEXT,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  enabled     INTEGER NOT NULL DEFAULT 1,
  built_in    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (type_id, name)
);
CREATE INDEX IF NOT EXISTS idx_stacks_type ON stacks(type_id);

CREATE TABLE IF NOT EXISTS libraries (
  id          TEXT PRIMARY KEY,                          -- LIB-0001
  stack_id    TEXT NOT NULL REFERENCES stacks(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  purpose     TEXT,
  category    TEXT,                                      -- free text: smtp|api-docs|auth|orm|logging|...
  url         TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  enabled     INTEGER NOT NULL DEFAULT 1,
  built_in    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (stack_id, name)
);
CREATE INDEX IF NOT EXISTS idx_libraries_stack ON libraries(stack_id);

-- Multi-type projects: which project types a project carries.
CREATE TABLE IF NOT EXISTS project_type_assignments (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type_id    TEXT NOT NULL REFERENCES project_types(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (project_id, type_id)
);
CREATE INDEX IF NOT EXISTS idx_pta_project ON project_type_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_pta_type ON project_type_assignments(type_id);

-- Per-type stack choice for a project (one stack per project type).
CREATE TABLE IF NOT EXISTS project_type_config (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type_id    TEXT NOT NULL REFERENCES project_types(id) ON DELETE CASCADE,
  stack_id   TEXT REFERENCES stacks(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (project_id, type_id)
);
CREATE INDEX IF NOT EXISTS idx_ptc_project ON project_type_config(project_id);
CREATE INDEX IF NOT EXISTS idx_ptc_stack ON project_type_config(stack_id);

-- Library selections for a project across its types (libraries of chosen stacks).
CREATE TABLE IF NOT EXISTS project_libraries (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type_id    TEXT NOT NULL REFERENCES project_types(id) ON DELETE CASCADE,
  library_id TEXT NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (project_id, type_id, library_id)
);
CREATE INDEX IF NOT EXISTS idx_project_libraries_project ON project_libraries(project_id);
CREATE INDEX IF NOT EXISTS idx_project_libraries_library ON project_libraries(library_id);

-- ---------------------------------------------------------------------------
-- Multi-project workspace links (Prompt 14)
-- ---------------------------------------------------------------------------
-- Explicit project-level dependencies: a project declares that it depends on
-- another project, with a kind and an optional note. Self-links are rejected
-- (CHECK); application layer re-validates and returns 400. Cycles are allowed
-- and reported as warnings by the governance validation (TR-21).
-- Cross-project workflow calls themselves are stored on model_nodes.metadata
-- (cross_project = { project_id, graph_id, node_id? }) and validated by the
-- modeler module; this table only records the declared project links.

CREATE TABLE IF NOT EXISTS project_dependencies (
  id                    TEXT PRIMARY KEY,                   -- PDEP-0001
  project_id            TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  depends_on_project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind                  TEXT NOT NULL CHECK (kind IN ('workflow_call','data','deploy','other')),
  note                  TEXT,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (project_id, depends_on_project_id, kind),
  CHECK (project_id <> depends_on_project_id)
);
CREATE INDEX IF NOT EXISTS idx_project_dependencies_project ON project_dependencies(project_id);
CREATE INDEX IF NOT EXISTS idx_project_dependencies_depends ON project_dependencies(depends_on_project_id);

-- ---------------------------------------------------------------------------
-- Customizable node palette (Prompt 15)
-- ---------------------------------------------------------------------------
-- Node categories and node types are workspace-global configuration stored in
-- the database instead of the hard-coded modeler catalog. Built-in rows are
-- seeded idempotently so existing behavior is unchanged until edited.
-- `node_types.kinds` is a JSON array of model kinds the type is available for;
-- `node_types.fields` is a JSON array of custom field definitions that the
-- inspector renders into a custom node's metadata.

CREATE TABLE IF NOT EXISTS node_categories (
  id         TEXT PRIMARY KEY,                     -- NCAT-0001
  key        TEXT NOT NULL UNIQUE,                 -- flow|system|governance|ai|...
  label      TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#64748b',
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled    INTEGER NOT NULL DEFAULT 1,
  built_in   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_node_categories_enabled ON node_categories(enabled);

CREATE TABLE IF NOT EXISTS node_types (
  id            TEXT PRIMARY KEY,                  -- NTYP-0001
  key           TEXT NOT NULL UNIQUE,              -- start|end|decision|loop|...
  label         TEXT NOT NULL,
  category_id   TEXT NOT NULL REFERENCES node_categories(id) ON DELETE RESTRICT,
  description   TEXT NOT NULL DEFAULT '',
  color         TEXT NOT NULL DEFAULT '#64748b',
  kinds         TEXT NOT NULL DEFAULT '["workflow"]',  -- JSON array of ModelKind
  default_title TEXT NOT NULL DEFAULT '',
  fields        TEXT NOT NULL DEFAULT '[]',            -- JSON array of NodeFieldDef
  sort_order    INTEGER NOT NULL DEFAULT 0,
  enabled       INTEGER NOT NULL DEFAULT 1,
  built_in      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_node_types_category ON node_types(category_id);
CREATE INDEX IF NOT EXISTS idx_node_types_enabled ON node_types(enabled);

-- ---------------------------------------------------------------------------
-- Per-project skills (Prompt 16)
-- ---------------------------------------------------------------------------
-- A project's Skills section. Two skill kinds live in one table:
--   * `capability` skills describe a team capability (e.g. "Payments
--     engineering") and carry a `level` (beginner/intermediate/advanced/expert).
--   * `tech` skills describe a technology/stack skill (e.g. "React") and carry
--     a free-text `tag` (e.g. "frontend", "smtp").
-- One table keeps skill management uniform; validation is enforced in the
-- application layer (skilled level vs tag per kind).

CREATE TABLE IF NOT EXISTS skills (
  id          TEXT PRIMARY KEY,                      -- SKL-0001
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('capability','tech')),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  level       TEXT CHECK (level IN ('beginner','intermediate','advanced','expert')),  -- capability skills
  tag         TEXT,                                  -- tech skills (frontend, payments, smtp, ...)
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_skills_project ON skills(project_id);
CREATE INDEX IF NOT EXISTS idx_skills_kind ON skills(project_id, kind);

-- ---------------------------------------------------------------------------
-- Issues (Prompt 20)
-- ---------------------------------------------------------------------------
-- Structured defect/improvement tracking linkable to requirements, tasks, and
-- test cases. Kind distinguishes bugs from enhancements, tech debt, and plain
-- questions; severity drives triage ordering.

CREATE TABLE IF NOT EXISTS issues (
  id            TEXT PRIMARY KEY,                       -- ISS-0001
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('bug','enhancement','tech_debt','question')),
  severity      TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  requirement_id TEXT REFERENCES requirements(id) ON DELETE SET NULL,
  task_id       TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  test_case_id  TEXT REFERENCES test_cases(id) ON DELETE SET NULL,
  created_by    TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(project_id, status);

-- ---------------------------------------------------------------------------
-- Releases (Prompt 20)
-- ---------------------------------------------------------------------------
-- Versioned release artifacts with a status lifecycle and release notes,
-- rendered into the generated workspace (06-ops/releases.md).

CREATE TABLE IF NOT EXISTS releases (
  id           TEXT PRIMARY KEY,                        -- RLS-0001
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version      TEXT NOT NULL,                           -- v1.0.0
  name         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','released','archived')),
  notes        TEXT NOT NULL DEFAULT '',
  released_at  TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_releases_project ON releases(project_id);
CREATE INDEX IF NOT EXISTS idx_releases_status ON releases(project_id, status);

-- ---------------------------------------------------------------------------
-- Users & sessions (Prompt 21)
-- ---------------------------------------------------------------------------
-- Accounts for the public landing + subscribe flow. Passwords are stored as
-- argon2id hashes (Bun.password); sessions hold SHA-256 token hashes only.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,                       -- USR-0001
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,          -- 0 until OTP verification (migration 012 grandfathers legacy rows)
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,                          -- SES-0001
  token_hash TEXT NOT NULL UNIQUE,                      -- sha256(token)
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);

-- ---------------------------------------------------------------------------
-- Plans & subscriptions (Prompt 21)
-- ---------------------------------------------------------------------------
-- Billing plans shown on the landing pricing section and the user's active
-- subscription. Prices are integer cents; features is a JSON string[].

CREATE TABLE IF NOT EXISTS plans (
  id                  TEXT PRIMARY KEY,                  -- PLAN-0001
  key                 TEXT NOT NULL UNIQUE,              -- free | plus | premium
  name                TEXT NOT NULL,
  tagline             TEXT NOT NULL DEFAULT '',
  monthly_price_cents INTEGER NOT NULL,
  yearly_price_cents  INTEGER NOT NULL,
  features            TEXT NOT NULL DEFAULT '[]',        -- JSON string[]
  popular             INTEGER NOT NULL DEFAULT 0,
  active              INTEGER NOT NULL DEFAULT 1,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                 TEXT PRIMARY KEY,                   -- SUB-0001
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id            TEXT NOT NULL REFERENCES plans(id),
  cycle              TEXT NOT NULL CHECK (cycle IN ('monthly','yearly')),
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','canceled')),
  card_last4         TEXT NOT NULL DEFAULT '',
  started_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  current_period_end TEXT NOT NULL,
  canceled_at        TEXT
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(user_id, status);


-- ---------------------------------------------------------------------------
-- OTP codes (Prompt: auth hardening)
-- ---------------------------------------------------------------------------
-- One-time codes for email verification and password reset. Only the SHA-256
-- hash of the code is stored; codes expire after 10 minutes, allow at most
-- 5 attempts, and are single-use (consumed_at).

CREATE TABLE IF NOT EXISTS otp_codes (
  id          TEXT PRIMARY KEY,                        -- OTP-0001
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     TEXT NOT NULL CHECK (purpose IN ('verify_email','password_reset')),
  code_hash   TEXT NOT NULL,                           -- sha256(code)
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TEXT NOT NULL,
  consumed_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_otp_codes_user ON otp_codes(user_id, purpose);