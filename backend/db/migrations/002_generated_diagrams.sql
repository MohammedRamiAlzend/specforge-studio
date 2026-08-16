-- Migration 002 — Generated diagrams (Prompt 08)
-- ---------------------------------------------------------------------------
-- Additive-only change. Adds the generated_diagrams table that stores every
-- generated Mermaid diagram with provenance (diagram type, source artifact
-- IDs, warnings, generated timestamp).
--
-- The same DDL is embedded in backend/db/schema.sql (canonical, idempotent),
-- so fresh databases get the table automatically. Applying this file to an
-- existing database is safe (CREATE TABLE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS generated_diagrams (
  id              TEXT PRIMARY KEY,
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  graph_id        TEXT REFERENCES model_graphs(id) ON DELETE SET NULL,
  diagram_type    TEXT NOT NULL CHECK (diagram_type IN ('workflow','sequence','erd','architecture')),
  name            TEXT NOT NULL,
  mermaid         TEXT NOT NULL,
  source_artifacts TEXT,
  warnings        TEXT,
  status          TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated','approved','superseded','archived')),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_generated_diagrams_project ON generated_diagrams(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_diagrams_graph ON generated_diagrams(graph_id);
