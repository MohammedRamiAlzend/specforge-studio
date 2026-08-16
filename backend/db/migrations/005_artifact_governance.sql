-- Migration 005 — Governance overlay (Prompt 11)
-- Additive only: adds the canonical governance status overlay. The approvals
-- and event_log tables already exist in schema.sql.

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
