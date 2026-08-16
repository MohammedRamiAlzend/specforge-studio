-- Migration 001 — Visual modeler canvases (Prompt 07)
-- ---------------------------------------------------------------------------
-- Additive-only change. Adds three tables backing the visual modeler:
--   model_graphs  — one canvas per modeled artifact (workflow/data/architecture/sequence)
--   model_nodes   — canvas nodes with full inspector properties (GRPH-0001-N01)
--   model_edges   — canvas edges with label/condition/type (GRPH-0001-E01)
--
-- The same DDL is embedded in backend/db/schema.sql (canonical, idempotent),
-- so fresh databases get the tables automatically. This file documents the
-- change for existing databases; applying it is safe (CREATE TABLE IF NOT EXISTS).
--
-- Node/edge types are validated in the application layer
-- (backend/src/modules/modeler.ts catalog), not by CHECK constraints, so the
-- supported type set can grow without a destructive migration.

CREATE TABLE IF NOT EXISTS model_graphs (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('workflow','data','architecture','sequence')),
  name         TEXT NOT NULL,
  description  TEXT,
  artifact_type TEXT,
  artifact_id  TEXT,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','approved','archived')),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_model_graphs_project ON model_graphs(project_id);

CREATE TABLE IF NOT EXISTS model_nodes (
  id                TEXT PRIMARY KEY,
  graph_id          TEXT NOT NULL REFERENCES model_graphs(id) ON DELETE CASCADE,
  client_key        TEXT NOT NULL,
  node_type         TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  inputs            TEXT,
  outputs           TEXT,
  preconditions     TEXT,
  postconditions    TEXT,
  related_artifacts TEXT,
  metadata          TEXT,
  position          TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (graph_id, client_key)
);
CREATE INDEX IF NOT EXISTS idx_model_nodes_graph ON model_nodes(graph_id);

CREATE TABLE IF NOT EXISTS model_edges (
  id         TEXT PRIMARY KEY,
  graph_id   TEXT NOT NULL REFERENCES model_graphs(id) ON DELETE CASCADE,
  from_node  TEXT NOT NULL REFERENCES model_nodes(id) ON DELETE CASCADE,
  to_node    TEXT NOT NULL REFERENCES model_nodes(id) ON DELETE CASCADE,
  label      TEXT,
  condition  TEXT,
  edge_type  TEXT NOT NULL DEFAULT 'next' CHECK (edge_type IN ('success','failure','next','retry','escalation','related')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_model_edges_graph ON model_edges(graph_id);
CREATE INDEX IF NOT EXISTS idx_model_edges_from ON model_edges(from_node);
CREATE INDEX IF NOT EXISTS idx_model_edges_to ON model_edges(to_node);
