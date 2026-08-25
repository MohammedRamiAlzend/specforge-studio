/**
 * Activity / notification feed (Prompt 20).
 *
 * A project-aware activity feed built on the existing append-only `event_log`
 * (newest first), optionally merged with pending approvals so the UI can show
 * "action needed" items alongside recent changes. Read-only — the event_log is
 * written by every other module.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";

export interface ActivityItem {
  id: number;
  project_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  actor: string | null;
  actor_type: string;
  payload: unknown;
  created_at: string;
  pending?: boolean;
}

export function listActivity(
  db: Database,
  options: { projectId?: string; limit?: number; includePendingApprovals?: boolean } = {},
): ActivityItem[] {
  const limit = options.limit ?? 50;
  const conditions: string[] = [];
  const values: (string | number)[] = [];
  if (options.projectId) {
    conditions.push("project_id = ?");
    values.push(options.projectId);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  values.push(limit);

  const rows = db
    .query(
      `SELECT id, project_id, entity_type, entity_id, action, from_status, to_status,
              actor, actor_type, payload, created_at
       FROM event_log ${where} ORDER BY id DESC LIMIT ?`,
    )
    .all(...values) as {
    id: number;
    project_id: string | null;
    entity_type: string;
    entity_id: string;
    action: string;
    from_status: string | null;
    to_status: string | null;
    actor: string | null;
    actor_type: string;
    payload: string | null;
    created_at: string;
  }[];

  const items: ActivityItem[] = rows.map((row) => ({
    ...row,
    payload: row.payload ? (JSON.parse(row.payload) as unknown) : null,
  }));

  if (options.includePendingApprovals) {
    // Scoped feeds merge every pending approval of the project; the GLOBAL
    // feed (no projectId) previously dropped them entirely (DEC-030 fix) —
    // now it merges a capped cross-project batch so action-required items are
    // never invisible on the dashboard.
    const pending = (
      options.projectId
        ? db
            .query(
              `SELECT id, project_id, artifact_id, artifact_type, approver_role, status, created_at
               FROM approvals WHERE project_id = ? AND status = 'pending' ORDER BY created_at DESC`,
            )
            .all(options.projectId)
        : db
            .query(
              `SELECT id, project_id, artifact_id, artifact_type, approver_role, status, created_at
               FROM approvals WHERE status = 'pending' ORDER BY created_at DESC LIMIT 20`,
            )
            .all()
    ) as {
      id: string;
      project_id: string;
      artifact_id: string;
      artifact_type: string;
      approver_role: string;
      status: string;
      created_at: string;
    }[];
    for (const apr of pending) {
      items.push({
        id: 0,
        project_id: apr.project_id,
        entity_type: "approval",
        entity_id: apr.id,
        action: "approval_requested",
        from_status: null,
        to_status: "pending",
        actor: null,
        actor_type: "system",
        payload: { artifact_id: apr.artifact_id, artifact_type: apr.artifact_type, approver_role: apr.approver_role },
        created_at: apr.created_at,
        pending: true,
      });
    }
    // Pending approvals float above the newest events so they can never be
    // pushed out of the feed window by high event volume.
    items.sort((a, b) => {
      if (Boolean(a.pending) !== Boolean(b.pending)) return a.pending ? -1 : 1;
      return a.id > b.id ? -1 : a.id < b.id ? 1 : 0;
    });
  }

  return items.slice(0, limit);
}

export function registerActivityRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/activity", async (request) => {
    const query = z
      .object({
        project: z.string().regex(/^PRJ-\d{4,}$/).optional(),
        limit: z.coerce.number().int().min(1).max(200).default(50),
        approvals: z.coerce.boolean().default(true),
      })
      .parse(request.query);
    return {
      data: listActivity(db, {
        projectId: query.project,
        limit: query.limit,
        includePendingApprovals: query.approvals,
      }),
    };
  });
}