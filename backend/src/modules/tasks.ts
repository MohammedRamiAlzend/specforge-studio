import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";
import { allocateId } from "../utils/ids";
import { logEvent } from "../utils/events";
import { assertProjectExists, assertModuleExists } from "../utils/exists";

const createTaskSchema = z.object({
  project_id: z.string().regex(/^PRJ-\d{4,}$/),
  module_id: z.string().regex(/^MOD-\d{4,}$/).optional(),
  milestone_id: z.string().regex(/^MS-\d{4,}$/).optional(),
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

interface TaskRow {
  id: string;
  project_id: string;
  module_id: string | null;
  milestone_id: string | null;
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

  return db.transaction(() => {
    const id = allocateId(db, "TASK", input.project_id);
    db.query(
      `INSERT INTO tasks
         (id, project_id, module_id, milestone_id, title, type, priority, objective, context,
          constraints, input_artifacts, approval_required, status, definition_of_done)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
    ).run(
      id,
      input.project_id,
      input.module_id ?? null,
      input.milestone_id ?? null,
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

function listTasks(db: Database, projectId?: string): TaskRow[] {
  return db
    .query("SELECT * FROM tasks WHERE (? IS NULL OR project_id = ?) ORDER BY created_at DESC")
    .all(projectId ?? null, projectId ?? null) as TaskRow[];
}

export function registerTaskRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/tasks", async (request) => {
    const query = z
      .object({ project: z.string().regex(/^PRJ-\d{4,}$/).optional() })
      .parse(request.query);
    return { data: listTasks(db, query.project) };
  });

  app.post("/tasks", async (request, reply) => {
    const body = createTaskSchema.parse(request.body);
    reply.code(201);
    return { data: createTask(db, body) };
  });
}
