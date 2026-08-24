-- Migration 011 — Auth & billing (Prompt 21)
-- Additive only: users / sessions / plans / subscriptions tables for the
-- public landing + subscribe flow. No existing tables are altered.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,                       -- USR-0001
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,                          -- SES-0001
  token_hash TEXT NOT NULL UNIQUE,                      -- sha256(token)
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);

CREATE TABLE IF NOT EXISTS plans (
  id                  TEXT PRIMARY KEY,                  -- PLAN-0001
  key                 TEXT NOT NULL UNIQUE,              -- free | plus | premium
  name                TEXT NOT NULL,
  tagline             TEXT NOT NULL DEFAULT '',
  monthly_price_cents INTEGER NOT NULL,
  yearly_price_cents  INTEGER NOT NULL,
  features            TEXT NOT NULL DEFAULT '[]',        -- JSON string[]
  popular             INTEGER NOT NULL DEFAULT 0,
  active              INTEGER NOT NULL DEFAULT 1,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                 TEXT PRIMARY KEY,                   -- SUB-0001
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id            TEXT NOT NULL REFERENCES plans(id),
  cycle              TEXT NOT NULL CHECK (cycle IN ('monthly','yearly')),
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','canceled')),
  card_last4         TEXT NOT NULL DEFAULT '',
  started_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  current_period_end TEXT NOT NULL,
  canceled_at        TEXT
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(user_id, status);

INSERT OR IGNORE INTO schema_migrations (version, description, applied_at)
VALUES (11, 'auth_and_billing', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
