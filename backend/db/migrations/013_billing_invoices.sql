-- Migration 013 — Billing lifecycle (DEC-029): invoices for billing history.
-- Additive only: a new table, no changes to existing tables. Subscription
-- expiry is COMPUTED from subscriptions.current_period_end at read time, so
-- the subscriptions CHECK constraint on status is intentionally untouched.
--
-- NOTE: this table is also declared in db/schema.sql (idempotent), which runs
-- on every boot; this file documents the migration history for databases
-- provisioned before DEC-029.

CREATE TABLE IF NOT EXISTS invoices (
  id              TEXT PRIMARY KEY,                        -- INV-0001
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  plan_key        TEXT NOT NULL,
  cycle           TEXT NOT NULL CHECK (cycle IN ('monthly','yearly')),
  amount_cents    INTEGER NOT NULL DEFAULT 0,
  card_last4      TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','refunded')),
  description     TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id, created_at);
