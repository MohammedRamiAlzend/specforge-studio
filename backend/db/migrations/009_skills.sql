-- Migration 009 -- Per-project skills (Prompt 16)
-- Additive only: adds a project-scoped skill table (SKL prefix). Capability
-- skills carry a level; tech skills carry a free-text tag. Project deletion
-- cascades (a project owns its skills). No seeds required — skills are
-- user-managed data for each project.

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