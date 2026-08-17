import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";
import { allocateId } from "../utils/ids";
import { logEvent } from "../utils/events";
import { badRequest, notFound } from "../utils/errors";
import { assertProjectExists, assertModuleExists } from "../utils/exists";
import { assertMemberExists } from "./team";

const createTaskSchema = z.object({
  project_id: z.string().regex(/^PRJ-\d{4,}$/),
  module_id: z.string().regex(/^MOD-\d{4,}$/).optional(),
  milestone_id: z.string().regex(/^MS-\d{4,}$/).optional(),
  assignee_id: z.string().regex(/^MEM-\d{4,}$/).nullable().optional(),
  title: z.string().min(1).max(300),
  type: z.enum(["spec", "backend", "frontend", "docs", "test", "governance", "ops"]).default("spec"),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  objective: z.string().min(1).max(2000),
  context: z.string().max(4000).optional(),
  constraints: z.array(z.string()).optional(),
  input_artifacts: z.array(z.string()).optional(),
  checklist: z.array(z.string().min(1)).optional(),
  approval_required: z.boolean().default(false),
  definition_of_done: z.string().min(1).max(2000),
});

const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(300).optional(),
    priority: z.enum(["high", "medium", "low"]).optional(),
    objective: z.string().min(1).max(2000).optional(),
    status: z.enum(["open", "in_progress", "blocked", "done", "cancelled"]).optional(),
    assignee_id: z.string().regex(/^MEM-\d{4,}$/).nullable().optional(),
  })
  .strict();

interface TaskRow {
  id: string;
  project_id: string;
  module_id: string | null;
  milestone_id: string | null;
  assignee_id: string | null;
  title: string;
  type: string;
  priority: string;
  objective: string;
  context: string | null;
  constraints: string | null;
  input_artifacts: string | null;
  approval_required: number;
  approval_id: string | null;
  status: string;
  definition_of_done: string;
  created_at: string;
  updated_at: string;
}

function createTask(db: Database, input: z.infer<typeof createTaskSchema>): TaskRow {
  assertProjectExists(db, input.project_id);
  if (input.module_id) assertModuleExists(db, input.module_id);
  if (input.assignee_id) assertMemberExists(db, input.assignee_id);

  return db.transaction(() => {
    const id = allocateId(db, "TASK", input.project_id);
    db.query(
      `INSERT INTO tasks
         (id, project_id, module_id, milestone_id, assignee_id, title, type, priority, objective, context,
          constraints, input_artifacts, approval_required, status, definition_of_done)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
    ).run(
      id,
      input.project_id,
      input.module_id ?? null,
      input.milestone_id ?? null,
      input.assignee_id ?? null,
      input.title,
      input.type,
      input.priority,
      input.objective,
      input.context ?? null,
      input.constraints ? JSON.stringify(input.constraints) : null,
      input.input_artifacts ? JSON.stringify(input.input_artifacts) : null,
      input.approval_required ? 1 : 0,
      input.definition_of_done,
    );
    (input.checklist ?? []).forEach((description, index) => {
      const itemId = `${id}-C${String(index + 1).padStart(2, "0")}`;
      db.query(
        `INSERT INTO task_checklists (id, task_id, position, description, status)
         VALUES (?, ?, ?, ?, 'pending')`,
      ).run(itemId, id, index + 1, description);
    });
    logEvent(db, {
      projectId: input.project_id,
      entityType: "task",
      entityId: id,
      action: "created",
      toStatus: "open",
    });
    const row = db.query("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | undefined;
    if (!row) throw new Error("Task insert failed");
    return row;
  })();
}

function listTasks(
  db: Database,
  projectId?: string,
  filter: { status?: string; assignee?: string } = {},
): TaskRow[] {
  const where: string[] = [];
  const values: (string | null)[] = [];
  if (projectId) {
    where.push("project_id = ?");
    values.push(projectId);
  }
  if (filter.status) {
    where.push("status = ?");
    values.push(filter.status);
  }
  if (filter.assignee) {
    where.push("assignee_id = ?");
    values.push(filter.assignee);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return db
    .query(`SELECT * FROM tasks ${clause} ORDER BY created_at DESC`)
    .all(...values) as TaskRow[];
}

function getTask(db: Database, id: string): TaskRow {
  const row = db.query("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | undefined;
  if (!row) throw notFound(`Task ${id} not found`);
  return row;
}

function updateTask(db: Database, id: string, patch: z.infer<typeof updateTaskSchema>): TaskRow {
  const existing = getTask(db, id);
  if (patch.assignee_id !== undefined && patch.assignee_id !== null) {
    assertMemberExists(db, patch.assignee_id);
  }
  if (patch.status !== undefined && !["open", "in_progress", "blocked", "done", "cancelled"].includes(patch.status)) {
    throw badRequest(`Invalid task status: ${patch.status}`);
  }
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
    `UPDATE tasks SET ${sets.join(", ")}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
  ).run(...values);
  const updated = getTask(db, id);
  logEvent(db, {
    projectId: updated.project_id,
    entityType: "task",
    entityId: id,
    action: updated.status !== fromStatus ? "status_change" : "updated",
    fromStatus,
    toStatus: updated.status,
    payload: { to: patch },
  });
  return updated;
}

export function registerTaskRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/tasks", async (request) => {
    const query = z
      .object({
        project: z.string().regex(/^PRJ-\d{4,}$/).optional(),
        status: z.enum(["open", "in_progress", "blocked", "done", "cancelled"]).optional(),
        assignee: z.string().regex(/^MEM-\d{4,}$/).optional(),
      })
      .parse(request.query);
    return { data: listTasks(db, query.project, { status: query.status, assignee: query.assignee }) };
  });

  app.get("/tasks/:id", async (request) => {
    const { id } = z.object({ id: z.string().regex(/^TASK-\d{4,}$/) }).parse(request.params);
    return { data: getTask(db, id) };
  });

  app.post("/tasks", async (request, reply) => {
    const body = createTaskSchema.parse(request.body);
    reply.code(201);
    return { data: createTask(db, body) };
  });

  app.patch("/tasks/:id", async (request) => {
    const { id } = z.object({ id: z.string().regex(/^TASK-\d{4,}$/) }).parse(request.params);
    const body = updateTaskSchema.parse(request.body);
    return { data: updateTask(db, id, body) };
  });
}
