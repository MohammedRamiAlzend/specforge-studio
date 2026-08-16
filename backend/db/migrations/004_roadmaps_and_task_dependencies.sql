-- Migration 004 — Roadmaps and agent task packs (Prompt 10)
-- Additive only: adds roadmap snapshot tables and the canonical
-- task_dependencies table. Applied after schema.sql (idempotent).

CREATE TABLE IF NOT EXISTS roadmaps (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','archived')),
  metadata   TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_roadmaps_project ON roadmaps(project_id);

CREATE TABLE IF NOT EXISTS roadmap_phases (
  id                TEXT PRIMARY KEY,
  roadmap_id        TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  position          INTEGER NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  approval_required INTEGER NOT NULL DEFAULT 0,
  gate_criteria     TEXT,
  UNIQUE (roadmap_id, position)
);
CREATE INDEX IF NOT EXISTS idx_roadmap_phases_roadmap ON roadmap_phases(roadmap_id);

CREATE TABLE IF NOT EXISTS roadmap_epics (
  id          TEXT PRIMARY KEY,
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
  id            TEXT PRIMARY KEY,
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
  id                   TEXT PRIMARY KEY,
  roadmap_id           TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  epic_id              TEXT REFERENCES roadmap_epics(id) ON DELETE SET NULL,
  phase_id             TEXT REFERENCES roadmap_phases(id) ON DELETE SET NULL,
  module_id            TEXT REFERENCES modules(id) ON DELETE SET NULL,
  source_type          TEXT NOT NULL,
  source_id            TEXT NOT NULL,
  title                TEXT NOT NULL,
  type                 TEXT NOT NULL CHECK (type IN ('spec','backend','frontend','docs','test','governance','ops')),
  priority             TEXT NOT NULL CHECK (priority IN ('high','medium','low')),
  objective            TEXT NOT NULL,
  context              TEXT,
  constraints          TEXT,
  input_artifacts      TEXT,
  checklist            TEXT NOT NULL,
  definition_of_done   TEXT NOT NULL,
  approval_required    INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','archived')),
  materialized_task_id TEXT,
  UNIQUE (roadmap_id, source_type, source_id)
);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_roadmap ON roadmap_tasks(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_epic ON roadmap_tasks(epic_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_phase ON roadmap_tasks(phase_id);

CREATE TABLE IF NOT EXISTS roadmap_task_dependencies (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  roadmap_id         TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  task_id            TEXT NOT NULL REFERENCES roadmap_tasks(id) ON DELETE CASCADE,
  depends_on_task_id TEXT NOT NULL REFERENCES roadmap_tasks(id) ON DELETE CASCADE,
  reason             TEXT,
  UNIQUE (task_id, depends_on_task_id),
  CHECK (task_id <> depends_on_task_id)
);
CREATE INDEX IF NOT EXISTS idx_roadmap_deps_task ON roadmap_task_dependencies(task_id);

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
