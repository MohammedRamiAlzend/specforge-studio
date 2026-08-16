import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";
import { allocateId } from "../utils/ids";
import { logEvent } from "../utils/events";
import { assertProjectExists, assertModuleExists } from "../utils/exists";

const createUseCaseSchema = z.object({
  project_id: z.string().regex(/^PRJ-\d{4,}$/),
  module_id: z.string().regex(/^MOD-\d{4,}$/).optional(),
  title: z.string().min(1).max(300),
  actor: z.string().min(1).max(200),
  preconditions: z.array(z.string()).optional(),
  postconditions: z.array(z.string()).optional(),
  main_flow: z.array(z.string()).optional(),
  alternate_flows: z
    .array(z.object({ title: z.string(), steps: z.array(z.string()) }))
    .optional(),
});

interface UseCaseRow {
  id: string;
  project_id: string;
  module_id: string | null;
  title: string;
  actor: string;
  preconditions: string | null;
  postconditions: string | null;
  main_flow: string | null;
  alternate_flows: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function createUseCase(db: Database, input: z.infer<typeof createUseCaseSchema>): UseCaseRow {
  assertProjectExists(db, input.project_id);
  if (input.module_id) assertModuleExists(db, input.module_id);
  const id = allocateId(db, "UC", input.project_id);
  db.query(
    `INSERT INTO use_cases
       (id, project_id, module_id, title, actor, preconditions, postconditions, main_flow, alternate_flows, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'proposed')`,
  ).run(
    id,
    input.project_id,
    input.module_id ?? null,
    input.title,
    input.actor,
    input.preconditions ? JSON.stringify(input.preconditions) : null,
    input.postconditions ? JSON.stringify(input.postconditions) : null,
    input.main_flow ? JSON.stringify(input.main_flow) : null,
    input.alternate_flows ? JSON.stringify(input.alternate_flows) : null,
  );
  logEvent(db, {
    projectId: input.project_id,
    entityType: "use_case",
    entityId: id,
    action: "created",
    toStatus: "proposed",
  });
  const row = db.query("SELECT * FROM use_cases WHERE id = ?").get(id) as UseCaseRow | undefined;
  if (!row) throw new Error("Use case insert failed");
  return row;
}

function listUseCases(db: Database, projectId?: string): UseCaseRow[] {
  return db
    .query("SELECT * FROM use_cases WHERE (? IS NULL OR project_id = ?) ORDER BY created_at DESC")
    .all(projectId ?? null, projectId ?? null) as UseCaseRow[];
}

export function registerUseCaseRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/use-cases", async (request) => {
    const query = z
      .object({ project: z.string().regex(/^PRJ-\d{4,}$/).optional() })
      .parse(request.query);
    return { data: listUseCases(db, query.project) };
  });

  app.post("/use-cases", async (request, reply) => {
    const body = createUseCaseSchema.parse(request.body);
    reply.code(201);
    return { data: createUseCase(db, body) };
  });
}
