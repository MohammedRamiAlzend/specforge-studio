-- Migration 003 — Documentation workspace exports (Prompt 09)
-- ---------------------------------------------------------------------------
-- Additive-only change. Adds the docs_exports table recording every generated
-- Markdown workspace export (files are written to EXPORT_DIR/<DOCS-id>/).
--
-- The same DDL is embedded in backend/db/schema.sql (canonical, idempotent),
-- so fresh databases get the table automatically. Applying this file to an
-- existing database is safe (CREATE TABLE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS docs_exports (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated','superseded','archived')),
  file_count   INTEGER NOT NULL,
  files        TEXT NOT NULL,
  generated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_docs_exports_project ON docs_exports(project_id);
