/**
 * Per-project Issues module (Prompt 20).
 *
 * Structured issue tracking (ISS prefix) for bugs, enhancements, tech debt,
 * and questions. Each issue can link to a requirement, task, and/or test
 * case (validated in the application layer). Project-owned (ON DELETE
 * CASCADE). All operations are audit-logged (entity_type `issue`).
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";
import { allocateId } from "../utils/ids";
import { logEvent } from "../utils/events";
import { badRequest, notFound } from "../utils/errors";

// ---------------------------------------------------------------------------
// Row + view shapes
// ---------------------------------------------------------------------------

export type IssueKind = "bug" | "enhancement" | "tech_debt" | "question";
export type IssueSeverity = "low" | "medium" | "high" | "critical";
export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

export interface IssueRow {
  id: string;
  project_id: string;
  kind: IssueKind;
  severity: IssueSeverity;
  status: IssueStatus;
  title: string;
  description: string;
  requirement_id: string | null;
  task_id: string | null;
  test_case_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const idSchema = z.object({ id: z.string().regex(/^ISS-\d{4,}$/) });

const createIssueSchema = z.object({
  project_id: z.string().min(1),
  kind: z.enum(["bug", "enhancement", "tech_debt", "question"]),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  title: z.string().min(1).max(300),
  description: z.string().max(8000).optional(),
  requirement_id: z.string().regex(/^REQ-\d{4,}$/).nullable().optional(),
  task_id: z.string().regex(/^TASK-\d{4,}$/).nullable().optional(),
  test_case_id: z.string().regex(/^TC-\d{4,}$/).nullable().optional(),
  created_by: z.string().max(200).nullable().optional(),
});

const updateIssueSchema = z
  .object({
    kind: z.enum(["bug", "enhancement", "tech_debt", "question"]).optional(),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
    title: z.string().min(1).max(300).optional(),
    description: z.string().max(8000).nullable().optional(),
    requirement_id: z.string().regex(/^REQ-\d{4,}$/).nullable().optional(),
    task_id: z.string().regex(/^TASK-\d{4,}$/).nullable().optional(),
    test_case_id: z.string().regex(/^TC-\d{4,}$/).nullable().optional(),
    created_by: z.string().max(200).nullable().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Repository layer
// ---------------------------------------------------------------------------

function getProject(db: Database, projectId: string): { id: string } | undefined {
  return db.query("SELECT id FROM projects WHERE id = ?").get(projectId) as { id: string } | undefined;
}

function getIssue(db: Database, id: string): IssueRow {
  const row = db.query("SELECT * FROM issues WHERE id = ?").get(id) as IssueRow | undefined;
  if (!row) throw notFound(`Issue ${id} not found`);
  return row;
}

function assertReferencedArtifact(db: Database, table: string, id: string | null | undefined): void {
  if (!id) return;
  const ok = db.query(`SELECT id FROM ${table} WHERE id = ?`).get(id);
  if (!ok) {
    throw badRequest(`Referenced ${table} ${id} not found`);
  }
}

export function listIssues(
  db: Database,
  projectId: string,
  filter: { status?: string; kind?: string } = {},
): IssueRow[] {
  const where: string[] = ["project_id = ?"];
  const values: (string | null)[] = [projectId];
  if (filter.status) {
    where.push("status = ?");
    values.push(filter.status);
  }
  if (filter.kind) {
    where.push("kind = ?");
    values.push(filter.kind);
  }
  return db
    .query(`SELECT * FROM issues WHERE ${where.join(" AND ")} ORDER BY created_at DESC`)
    .all(...values) as IssueRow[];
}

// ---------------------------------------------------------------------------
// Service layer
// ---------------------------------------------------------------------------

function createIssue(db: Database, input: z.infer<typeof createIssueSchema>): IssueRow {
  if (!getProject(db, input.project_id)) {
    throw notFound(`Project ${input.project_id} not found`);
  }
  assertReferencedArtifact(db, "requirements", input.requirement_id);
  assertReferencedArtifact(db, "tasks", input.task_id);
  assertReferencedArtifact(db, "test_cases", input.test_case_id);
  const id = allocateId(db, "ISS");
  db.query(
    `INSERT INTO issues
       (id, project_id, kind, severity, status, title, description,
        requirement_id, task_id, test_case_id, created_by)
     VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.project_id,
    input.kind,
    input.severity,
    input.title,
    input.description ?? "",
    input.requirement_id ?? null,
    input.task_id ?? null,
    input.test_case_id ?? null,
    input.created_by ?? null,
  );
  logEvent(db, {
    projectId: input.project_id,
    entityType: "issue",
    entityId: id,
    action: "created",
    payload: { kind: input.kind, severity: input.severity, title: input.title },
  });
  return getIssue(db, id);
}

function updateIssue(db: Database, id: string, patch: z.infer<typeof updateIssueSchema>): IssueRow {
  const existing = getIssue(db, id);
  assertReferencedArtifact(db, "requirements", patch.requirement_id);
  assertReferencedArtifact(db, "tasks", patch.task_id);
  assertReferencedArtifact(db, "test_cases", patch.test_case_id);
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  const fromStatus = existing.status;
  for (const [column, value] of Object.entries(patch)) {
    if (value !== undefined) {
      sets.push(`${column} = ?`);
      values.push(value as string | null);
    }
  }
  if (sets.length === 0) return existing;
  values.push(id);
  db.query(
    `UPDATE issues SET ${sets.join(", ")}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
  ).run(...values);
  const updated = getIssue(db, id);
  logEvent(db, {
    projectId: updated.project_id,
    entityType: "issue",
    entityId: id,
    action: updated.status !== fromStatus ? "status_change" : "updated",
    fromStatus,
    toStatus: updated.status,
    payload: { to: patch },
  });
  return updated;
}

function deleteIssue(db: Database, id: string): void {
  const existing = getIssue(db, id);
  db.query("DELETE FROM issues WHERE id = ?").run(id);
  logEvent(db, {
    projectId: existing.project_id,
    entityType: "issue",
    entityId: id,
    action: "updated",
    payload: { deleted: true },
  });
}

// ---------------------------------------------------------------------------
// HTTP layer
// ---------------------------------------------------------------------------

export function registerIssueRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/issues", async (request) => {
    const query = z
      .object({
        project: z.string().min(1),
        status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
        kind: z.enum(["bug", "enhancement", "tech_debt", "question"]).optional(),
      })
      .parse(request.query);
    return { data: listIssues(db, query.project, { status: query.status, kind: query.kind }) };
  });

  app.post("/issues", async (request, reply) => {
    const body = createIssueSchema.parse(request.body);
    reply.code(201);
    return { data: createIssue(db, body) };
  });

  app.patch("/issues/:id", async (request) => {
    const { id } = idSchema.parse(request.params);
    const body = updateIssueSchema.parse(request.body);
    return { data: updateIssue(db, id, body) };
  });

  app.delete("/issues/:id", async (request, reply) => {
    const { id } = idSchema.parse(request.params);
    deleteIssue(db, id);
    reply.code(204);
    return null;
  });
}