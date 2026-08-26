import { Database } from "bun:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Opens (creating if needed) the SQLite database and applies the canonical
 * schema from backend/db/schema.sql. The schema is idempotent (IF NOT EXISTS),
 * so opening an existing database is safe.
 *
 * Because CREATE TABLE IF NOT EXISTS cannot alter tables that already exist,
 * column additions for pre-existing databases are applied by ensureColumn
 * patches below (migration 012): they run exactly once — at the moment the
 * missing column is first detected.
 */
export function openDatabase(path: string): Database {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path, { create: true });
  db.exec("PRAGMA foreign_keys = ON;");
  // WAL improves concurrency for the dev server; on :memory: this is a no-op.
  db.exec("PRAGMA journal_mode = WAL;");
  const schemaUrl = new URL("../../db/schema.sql", import.meta.url);
  db.exec(readFileSync(schemaUrl, "utf8"));
  migrate0012EmailVerified(db);
  migrate0016GlobalAdmin(db);
  migrate0017BmcCanvasMetadata(db);
  return db;
}

function tableColumns(db: Database, table: string): string[] {
  return (db.query(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(
    (column) => column.name,
  );
}

/**
 * Migration 012 (auth hardening): adds users.email_verified to databases
 * created before OTP enforcement and grandfathers every existing account as
 * verified. Fresh installs already have the column from schema.sql and are
 * left untouched — brand-new registrations start unverified.
 */
function migrate0012EmailVerified(db: Database): void {
  const columns = tableColumns(db, "users");
  if (columns.length === 0 || columns.includes("email_verified")) return;
  db.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;");
  db.exec("UPDATE users SET email_verified = 1;");
}

/** Migration 016: adds the deny-by-default global admin flag to legacy DBs. */
function migrate0016GlobalAdmin(db: Database): void {
  const columns = tableColumns(db, "users");
  if (columns.length === 0 || columns.includes("is_admin")) return;
  db.exec("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;");
  db.exec("CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin);");
}

/** Migration 017: adds persisted placement and color for Miro-style BMC notes. */
function migrate0017BmcCanvasMetadata(db: Database): void {
  const columns = tableColumns(db, "bmc_notes");
  if (columns.length === 0) return;
  if (!columns.includes("position_x")) db.exec("ALTER TABLE bmc_notes ADD COLUMN position_x REAL NOT NULL DEFAULT 24;");
  if (!columns.includes("position_y")) db.exec("ALTER TABLE bmc_notes ADD COLUMN position_y REAL NOT NULL DEFAULT 96;");
  if (!columns.includes("color")) db.exec("ALTER TABLE bmc_notes ADD COLUMN color TEXT NOT NULL DEFAULT 'yellow';");
}
