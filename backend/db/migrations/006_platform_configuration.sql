-- Migration 006 — Platform configuration (Prompt 13)
-- Additive only: adds dynamic project platform types, stacks, libraries, and
-- the per-project selection tables. `projects.type` stays untouched
-- (deprecated, back-compat); the new type set lives in project_type_assignments.

CREATE TABLE IF NOT EXISTS project_types (
  id          TEXT PRIMARY KEY,                          -- PTYPE-0001
  key         TEXT NOT NULL UNIQUE,                      -- web|mobile|api|ai|custom...
  label       TEXT NOT NULL,
  description TEXT,
  color       TEXT,
  icon        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  enabled     INTEGER NOT NULL DEFAULT 1,
  built_in    INTEGER NOT NULL DEFAULT 0,
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
  category    TEXT,
  url         TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  enabled     INTEGER NOT NULL DEFAULT 1,
  built_in    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (stack_id, name)
);
CREATE INDEX IF NOT EXISTS idx_libraries_stack ON libraries(stack_id);

CREATE TABLE IF NOT EXISTS project_type_assignments (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type_id    TEXT NOT NULL REFERENCES project_types(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (project_id, type_id)
);
CREATE INDEX IF NOT EXISTS idx_pta_project ON project_type_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_pta_type ON project_type_assignments(type_id);

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

CREATE TABLE IF NOT EXISTS project_libraries (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type_id    TEXT NOT NULL REFERENCES project_types(id) ON DELETE CASCADE,
  library_id TEXT NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (project_id, type_id, library_id)
);
CREATE INDEX IF NOT EXISTS idx_project_libraries_project ON project_libraries(project_id);
CREATE INDEX IF NOT EXISTS idx_project_libraries_library ON project_libraries(library_id);