-- BMC canvas enhancement: persist sticky-note placement and color.
-- Additive-only migration for existing databases.

ALTER TABLE bmc_notes ADD COLUMN position_x REAL NOT NULL DEFAULT 24;
ALTER TABLE bmc_notes ADD COLUMN position_y REAL NOT NULL DEFAULT 96;
ALTER TABLE bmc_notes ADD COLUMN color TEXT NOT NULL DEFAULT 'yellow';
