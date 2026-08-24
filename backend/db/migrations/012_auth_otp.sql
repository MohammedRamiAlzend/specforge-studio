-- Migration 012 ?? Auth hardening: email verification + password recovery
-- Additive only:
--   * users.email_verified flag (existing rows are grandfathered as verified
--     so accounts created before OTP enforcement keep working);
--   * otp_codes table backing both verify-email and password-reset flows
--     (codes stored as SHA-256 hashes, 10-minute expiry, attempt counter).

-- Fresh installs get the column straight from schema.sql; this file records
-- the change for existing databases (applied by the ensureColumn patch in
-- backend/src/db/index.ts, which also runs the backfill below exactly once,
-- at the moment the column is first added).

ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
UPDATE users SET email_verified = 1;

CREATE TABLE IF NOT EXISTS otp_codes (
  id          TEXT PRIMARY KEY,                        -- OTP-0001
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     TEXT NOT NULL CHECK (purpose IN ('verify_email','password_reset')),
  code_hash   TEXT NOT NULL,                           -- sha256(code)
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TEXT NOT NULL,
  consumed_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_otp_codes_user ON otp_codes(user_id, purpose);
