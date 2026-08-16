import type { Database } from "bun:sqlite";

export interface EventInput {
  projectId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  actor?: string | null;
  actorType?: "human" | "agent" | "system";
  payload?: unknown;
}

/** Appends an audit record to the event_log table (append-only). */
export function logEvent(db: Database, input: EventInput): void {
  db.query(
    `INSERT INTO event_log
       (project_id, entity_type, entity_id, action, from_status, to_status, actor, actor_type, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.projectId ?? null,
    input.entityType,
    input.entityId,
    input.action,
    input.fromStatus ?? null,
    input.toStatus ?? null,
    input.actor ?? "system",
    input.actorType ?? "system",
    input.payload === undefined ? null : JSON.stringify(input.payload),
  );
}
