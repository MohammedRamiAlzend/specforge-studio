-- Migration 008 -- Customizable node palette (Prompt 15)
-- Additive only: adds workspace-global node categories and node types. The
-- modeler's hard-coded catalog is replaced by these tables; seeds live in
-- backend/src/modules/palette/seed.ts (idempotent) so behavior is unchanged
-- until the user edits them from Settings.

CREATE TABLE IF NOT EXISTS node_categories (
  id         TEXT PRIMARY KEY,                          -- NCAT-0001
  key        TEXT NOT NULL UNIQUE,                      -- flow|system|governance|ai|...
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
  id            TEXT PRIMARY KEY,                      -- NTYP-0001
  key           TEXT NOT NULL UNIQUE,                  -- start|end|decision|loop|...
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