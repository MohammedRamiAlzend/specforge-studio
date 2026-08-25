-- DEC-030 Phase A: Business Model Canvas notes.
-- One row = one sticky-note item inside one of the 9 canonical BMC blocks.
-- Project-owned (ON DELETE CASCADE), BMC ID prefix.

CREATE TABLE IF NOT EXISTS bmc_notes (
  id         TEXT PRIMARY KEY,                    -- BMC-0001
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  block      TEXT NOT NULL CHECK (block IN (
    'key_partners','key_activities','key_resources','value_propositions',
    'customer_relationships','channels','customer_segments',
    'cost_structure','revenue_streams')),
  content    TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_bmc_notes_project ON bmc_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_bmc_notes_block ON bmc_notes(project_id, block);
