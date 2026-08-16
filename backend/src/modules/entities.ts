import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";
import { allocateId } from "../utils/ids";
import { logEvent } from "../utils/events";
import { assertProjectExists, assertModuleExists } from "../utils/exists";
import { conflict } from "../utils/errors";

const createEntitySchema = z.object({
  project_id: z.string().regex(/^PRJ-\d{4,}$/),
  module_id: z.string().regex(/^MOD-\d{4,}$/).optional(),
  name: z.string().min(1).max(200),
  table_name: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).optional(),
});

interface EntityRow {
  id: string;
  project_id: string;
  module_id: string | null;
  name: string;
  table_name: string | null;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function createEntity(db: Database, input: z.infer<typeof createEntitySchema>): EntityRow {
  assertProjectExists(db, input.project_id);
  if (input.module_id) assertModuleExists(db, input.module_id);
  const duplicate = db
    .query("SELECT id FROM entities WHERE project_id = ? AND name = ?")
    .get(input.project_id, input.name);
  if (duplicate) {
    throw conflict(`Entity "${input.name}" already exists in this project`);
  }
  const id = allocateId(db, "DB", input.project_id);
  db.query(
    `INSERT INTO entities (id, project_id, module_id, name, table_name, description, status)
     VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
  ).run(
    id,
    input.project_id,
    input.module_id ?? null,
    input.name,
    input.table_name ?? null,
    input.description ?? null,
  );
  logEvent(db, {
    projectId: input.project_id,
    entityType: "entity",
    entityId: id,
    action: "created",
    toStatus: "draft",
  });
  const row = db.query("SELECT * FROM entities WHERE id = ?").get(id) as EntityRow | undefined;
  if (!row) throw new Error("Entity insert failed");
  return row;
}

function listEntities(db: Database, projectId?: string): EntityRow[] {
  return db
    .query("SELECT * FROM entities WHERE (? IS NULL OR project_id = ?) ORDER BY created_at DESC")
    .all(projectId ?? null, projectId ?? null) as EntityRow[];
}

export function registerEntityRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/entities", async (request) => {
    const query = z
      .object({ project: z.string().regex(/^PRJ-\d{4,}$/).optional() })
      .parse(request.query);
    return { data: listEntities(db, query.project) };
  });

  app.post("/entities", async (request, reply) => {
    const body = createEntitySchema.parse(request.body);
    reply.code(201);
    return { data: createEntity(db, body) };
  });
}
