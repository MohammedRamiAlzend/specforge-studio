import { Database } from "bun:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Opens (creating if needed) the SQLite database and applies the canonical
 * schema from backend/db/schema.sql. The schema is idempotent (IF NOT EXISTS),
 * so opening an existing database is safe.
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
  return db;
}
