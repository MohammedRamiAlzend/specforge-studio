# Migrations — SpecForge Studio (SQLite)

## 1. Policy

1. `backend/db/schema.sql` is the **canonical schema**. The database must be reproducible from scratch by running `schema.sql` and then every migration in order.
2. Migrations are **append-only** files under this folder, numbered `NNNN_description.sql` starting at `0001`.
3. Every migration must be **additive** (new tables, new columns, new indexes). Destructive changes (dropping tables/columns, data rewrites, constraint changes that can lose data) require explicit user approval (APR) before being applied.
4. Applied migrations are recorded in the `schema_migrations` table (`version`, `description`, `applied_at`).
5. Migration files must be immutable once applied. Corrections are shipped as new migrations.
6. All migrations must be idempotent where practical (`CREATE TABLE IF NOT EXISTS`, guarded `ALTER TABLE`) and must pass on a fresh database built from `schema.sql`.

## 2. Workflow

1. Update `backend/db/schema.sql` to reflect the new end state.
2. Add `NNNN_description.sql` containing only the delta from the previous version.
3. Apply locally: `sqlite3 data/specforge.db < backend/db/migrations/NNNN_description.sql`.
4. Record the version in `schema_migrations` (the migration file inserts the row).
5. Run the migration test: apply all migrations to a fresh DB built from `schema.sql` and verify no errors and no data loss.

## 3. Destructive Change Approval

- Destructive migrations require a recorded approval (APR) in the governance module (see `docs/ontology/status-lifecycle.md`).
- The migration file must reference the APR ID in a header comment.
- A backup must be taken before applying a destructive migration (see backup rules below).

## 4. Backup and Restore

- SQLite is a single file (default `data/specforge.db`), easy to back up.
- Before backup, checkpoint WAL: `sqlite3 data/specforge.db "PRAGMA wal_checkpoint(TRUNCATE);"`
- Backup: copy the database file (or use `sqlite3 data/specforge.db ".backup backup.db"`).
- Restore: stop the app, replace the file, verify `PRAGMA integrity_check;`.
