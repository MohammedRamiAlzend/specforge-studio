import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";
import { allocateId } from "../utils/ids";
import { logEvent } from "../utils/events";
import { assertProjectExists, assertModuleExists } from "../utils/exists";
import { conflict } from "../utils/errors";

const createApiEndpointSchema = z.object({
  project_id: z.string().regex(/^PRJ-\d{4,}$/),
  module_id: z.string().regex(/^MOD-\d{4,}$/).optional(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().regex(/^\//).max(500),
  purpose: z.string().max(1000).optional(),
  auth: z.string().max(200).optional(),
  request_schema: z.record(z.unknown()).optional(),
  response_schema: z.record(z.unknown()).optional(),
  error_codes: z.array(z.object({ code: z.string(), description: z.string() })).optional(),
});

interface ApiEndpointRow {
  id: string;
  project_id: string;
  module_id: string | null;
  method: string;
  path: string;
  purpose: string | null;
  auth: string | null;
  request_schema: string | null;
  response_schema: string | null;
  error_codes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function createApiEndpoint(
  db: Database,
  input: z.infer<typeof createApiEndpointSchema>,
): ApiEndpointRow {
  assertProjectExists(db, input.project_id);
  if (input.module_id) assertModuleExists(db, input.module_id);
  const duplicate = db
    .query("SELECT id FROM api_endpoints WHERE module_id IS ? AND method = ? AND path = ?")
    .get(input.module_id ?? null, input.method, input.path);
  if (duplicate) {
    throw conflict(`${input.method} ${input.path} already exists`);
  }
  const id = allocateId(db, "API", input.project_id);
  db.query(
    `INSERT INTO api_endpoints
       (id, project_id, module_id, method, path, purpose, auth, request_schema, response_schema, error_codes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'proposed')`,
  ).run(
    id,
    input.project_id,
    input.module_id ?? null,
    input.method,
    input.path,
    input.purpose ?? null,
    input.auth ?? null,
    input.request_schema ? JSON.stringify(input.request_schema) : null,
    input.response_schema ? JSON.stringify(input.response_schema) : null,
    input.error_codes ? JSON.stringify(input.error_codes) : null,
  );
  logEvent(db, {
    projectId: input.project_id,
    entityType: "api_endpoint",
    entityId: id,
    action: "created",
    toStatus: "proposed",
  });
  const row = db.query("SELECT * FROM api_endpoints WHERE id = ?").get(id) as ApiEndpointRow | undefined;
  if (!row) throw new Error("ApiEndpoint insert failed");
  return row;
}

function listApiEndpoints(db: Database, projectId?: string): ApiEndpointRow[] {
  return db
    .query("SELECT * FROM api_endpoints WHERE (? IS NULL OR project_id = ?) ORDER BY created_at DESC")
    .all(projectId ?? null, projectId ?? null) as ApiEndpointRow[];
}

export function registerApiEndpointRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/api-endpoints", async (request) => {
    const query = z
      .object({ project: z.string().regex(/^PRJ-\d{4,}$/).optional() })
      .parse(request.query);
    return { data: listApiEndpoints(db, query.project) };
  });

  app.post("/api-endpoints", async (request, reply) => {
    const body = createApiEndpointSchema.parse(request.body);
    reply.code(201);
    return { data: createApiEndpoint(db, body) };
  });
}
