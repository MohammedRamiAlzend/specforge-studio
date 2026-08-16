import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";
import { allocateId } from "../utils/ids";
import { logEvent } from "../utils/events";
import { assertProjectExists, assertModuleExists } from "../utils/exists";

const idSchema = z.string().regex(/^[A-Z]{2,4}-\d{4,}$/);

const createRequirementSchema = z.object({
  project_id: z.string().regex(/^PRJ-\d{4,}$/),
  module_id: idSchema.optional(),
  title: z.string().min(1).max(300),
  type: z.enum(["functional", "nonfunctional", "constraint", "data"]).default("functional"),
  priority: z.enum(["must", "should", "could", "wont"]).default("should"),
  criticality: z.enum(["critical", "normal"]).default("normal"),
  description: z.string().max(4000).optional(),
  acceptance_criteria: z.string().max(4000).optional(),
});

interface RequirementRow {
  id: string;
  project_id: string;
  module_id: string | null;
  title: string;
  type: string;
  priority: string;
  criticality: string;
  description: string | null;
  acceptance_criteria: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function insertRequirement(
  db: Database,
  row: {
    id: string;
    project_id: string;
    module_id: string | null;
    title: string;
    type: string;
    priority: string;
    criticality: string;
    description: string | null;
    acceptance_criteria: string | null;
  },
): void {
  db.query(
    `INSERT INTO requirements
       (id, project_id, module_id, title, type, priority, criticality, description, acceptance_criteria, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'proposed')`,
  ).run(
    row.id,
    row.project_id,
    row.module_id,
    row.title,
    row.type,
    row.priority,
    row.criticality,
    row.description,
    row.acceptance_criteria,
  );
}

function getRequirementById(db: Database, id: string): RequirementRow | undefined {
  return db.query("SELECT * FROM requirements WHERE id = ?").get(id) as RequirementRow | undefined;
}

function createRequirement(db: Database, input: z.infer<typeof createRequirementSchema>): RequirementRow {
  assertProjectExists(db, input.project_id);
  if (input.module_id) assertModuleExists(db, input.module_id);
  const id = allocateId(db, "REQ", input.project_id);
  insertRequirement(db, {
    id,
    project_id: input.project_id,
    module_id: input.module_id ?? null,
    title: input.title,
    type: input.type,
    priority: input.priority,
    criticality: input.criticality,
    description: input.description ?? null,
    acceptance_criteria: input.acceptance_criteria ?? null,
  });
  logEvent(db, {
    projectId: input.project_id,
    entityType: "requirement",
    entityId: id,
    action: "created",
    toStatus: "proposed",
  });
  const row = getRequirementById(db, id);
  if (!row) throw new Error("Requirement insert failed");
  return row;
}

function listRequirements(db: Database, projectId?: string): RequirementRow[] {
  return db
    .query("SELECT * FROM requirements WHERE (? IS NULL OR project_id = ?) ORDER BY created_at DESC")
    .all(projectId ?? null, projectId ?? null) as RequirementRow[];
}

export function registerRequirementRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/requirements", async (request) => {
    const query = z
      .object({ project: z.string().regex(/^PRJ-\d{4,}$/).optional() })
      .parse(request.query);
    return { data: listRequirements(db, query.project) };
  });

  app.post("/requirements", async (request, reply) => {
    const body = createRequirementSchema.parse(request.body);
    reply.code(201);
    return { data: createRequirement(db, body) };
  });
}
