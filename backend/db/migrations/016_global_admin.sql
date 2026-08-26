-- 016_global_admin.sql
-- Add explicit global admin access. Existing users remain non-admin by default.
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin);
