import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";
import { allocateId } from "../utils/ids";
import { logEvent } from "../utils/events";
import { assertProjectExists, assertModuleExists } from "../utils/exists";

const createWorkflowSchema = z.object({
  project_id: z.string().regex(/^PRJ-\d{4,}$/),
  module_id: z.string().regex(/^MOD-\d{4,}$/).optional(),
  name: z.string().min(1).max(300),
  description: z.string().max(4000).optional(),
  owner_role: z.string().max(200).optional(),
});

interface WorkflowRow {
  id: string;
  project_id: string;
  module_id: string | null;
  name: string;
  description: string | null;
  start_node_id: string | null;
  end_node_id: string | null;
  owner_role: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function createWorkflow(db: Database, input: z.infer<typeof createWorkflowSchema>): WorkflowRow {
  assertProjectExists(db, input.project_id);
  if (input.module_id) assertModuleExists(db, input.module_id);
  const id = allocateId(db, "WF", input.project_id);
  db.query(
    `INSERT INTO workflows (id, project_id, module_id, name, description, owner_role, status)
     VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
  ).run(
    id,
    input.project_id,
    input.module_id ?? null,
    input.name,
    input.description ?? null,
    input.owner_role ?? null,
  );
  logEvent(db, {
    projectId: input.project_id,
    entityType: "workflow",
    entityId: id,
    action: "created",
    toStatus: "draft",
  });
  const row = db.query("SELECT * FROM workflows WHERE id = ?").get(id) as WorkflowRow | undefined;
  if (!row) throw new Error("Workflow insert failed");
  return row;
}

function listWorkflows(db: Database, projectId?: string): WorkflowRow[] {
  return db
    .query("SELECT * FROM workflows WHERE (? IS NULL OR project_id = ?) ORDER BY created_at DESC")
    .all(projectId ?? null, projectId ?? null) as WorkflowRow[];
}

export function registerWorkflowRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/workflows", async (request) => {
    const query = z
      .object({ project: z.string().regex(/^PRJ-\d{4,}$/).optional() })
      .parse(request.query);
    return { data: listWorkflows(db, query.project) };
  });

  app.post("/workflows", async (request, reply) => {
    const body = createWorkflowSchema.parse(request.body);
    reply.code(201);
    return { data: createWorkflow(db, body) };
  });
}
