import type { Database } from "bun:sqlite";

/**
 * Allocates the next stable public ID for a prefix from the id_sequences
 * registry (DEC-002/DEC-005). Example: allocateId(db, "REQ") -> "REQ-0001".
 * The transaction guarantees no duplicates under concurrent writers.
 */
export function allocateId(
  db: Database,
  prefix: string,
  projectId?: string | null,
): string {
  return db.transaction(() => {
    const row = db
      .query("SELECT next_value FROM id_sequences WHERE prefix = ?")
      .get(prefix) as { next_value: number } | null;
    const next = row ? Number(row.next_value) : 1;
    db.query(
      `INSERT INTO id_sequences (prefix, next_value, project_id)
       VALUES (?, ?, ?)
       ON CONFLICT(prefix) DO UPDATE SET
         next_value = excluded.next_value,
         project_id = excluded.project_id`,
    ).run(prefix, next + 1, projectId ?? null);
    return `${prefix}-${String(next).padStart(4, "0")}`;
  })();
}
