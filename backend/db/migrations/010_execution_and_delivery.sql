-- Migration 010 -- Project execution & delivery (Prompt 20)
-- Additive only: new team_members / issues / releases tables and two
-- assignee columns (tasks, milestones). Existing rows keep NULL assignees.

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

ALTER TABLE milestones ADD COLUMN assignee_id TEXT REFERENCES team_members(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN assignee_id TEXT REFERENCES team_members(id) ON DELETE SET NULL;

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