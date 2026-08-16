-- Migration 007 — Multi-project workspace links (Prompt 14)
-- Additive only: explicit project-level dependency links between projects.
-- Cross-project workflow calls are stored on model_nodes.metadata and need no
-- schema change (metadata is an existing JSON column).

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