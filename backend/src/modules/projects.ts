import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database, SQLQueryBindings } from "bun:sqlite";
import type { Deps } from "../types";
import { allocateId } from "../utils/ids";
import { logEvent } from "../utils/events";
import { badRequest, notFound } from "../utils/errors";

const projectTypeSchema = z.enum(["web", "mobile", "api", "ai"]);
const projectStatusSchema = z.enum(["draft", "active", "completed", "archived"]);

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  type: projectTypeSchema,
  description: z.string().max(2000).optional(),
  repository_url: z.string().url().optional(),
  created_by: z.string().min(1).max(200),
});

const updateProjectSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    type: projectTypeSchema.optional(),
    description: z.string().max(2000).nullable().optional(),
    repository_url: z.string().url().nullable().optional(),
    status: projectStatusSchema.optional(),
  })
  .strict();

const idParamSchema = z.object({ id: z.string().regex(/^PRJ-\d{4,}$/) });

interface ProjectRow {
  id: string;
  name: string;
  type: string;
  description: string | null;
  repository_url: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Repository layer (SQL only)
// ---------------------------------------------------------------------------

function insertProject(
  db: Database,
  row: Pick<ProjectRow, "id" | "name" | "type" | "created_by"> & {
    description?: string | null;
    repository_url?: string | null;
  },
): void {
  db.query(
    `INSERT INTO projects (id, name, type, description, repository_url, status, created_by)
     VALUES (?, ?, ?, ?, ?, 'draft', ?)`,
  ).run(row.id, row.name, row.type, row.description ?? null, row.repository_url ?? null, row.created_by);
}

function getProjectById(db: Database, id: string): ProjectRow | undefined {
  return db.query("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined;
}

function listProjects(db: Database): ProjectRow[] {
  return db.query("SELECT * FROM projects ORDER BY created_at DESC").all() as ProjectRow[];
}

const PROJECT_COLUMNS = ["name", "type", "description", "repository_url", "status"] as const;

function updateProject(
  db: Database,
  id: string,
  patch: z.infer<typeof updateProjectSchema>,
): void {
  const sets: string[] = [];
  const values: SQLQueryBindings[] = [];
  for (const key of PROJECT_COLUMNS) {
    if (key in patch) {
      sets.push(`${key} = ?`);
      values.push(((patch as Record<string, unknown>)[key] ?? null) as SQLQueryBindings);
    }
  }
  if (sets.length === 0) return;
  values.push(id);
  db.query(
    `UPDATE projects SET ${sets.join(", ")},
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`,
  ).run(...values);
}

// ---------------------------------------------------------------------------
// Service layer (domain logic)
// ---------------------------------------------------------------------------

function createProject(db: Database, input: z.infer<typeof createProjectSchema>): ProjectRow {
  const id = allocateId(db, "PRJ");
  insertProject(db, { id, ...input });
  logEvent(db, {
    projectId: id,
    entityType: "project",
    entityId: id,
    action: "created",
    toStatus: "draft",
    actor: input.created_by,
    actorType: "human",
  });
  const row = getProjectById(db, id);
  if (!row) throw new Error("Project insert failed");
  return row;
}

function getProject(db: Database, id: string): ProjectRow {
  const row = getProjectById(db, id);
  if (!row) throw notFound(`Project ${id} not found`);
  return row;
}

function listProjectRows(db: Database): ProjectRow[] {
  return listProjects(db);
}

function updateProjectRow(
  db: Database,
  id: string,
  patch: z.infer<typeof updateProjectSchema>,
): ProjectRow {
  const existing = getProject(db, id);
  if (patch.status && existing.status === "archived" && patch.status !== "archived") {
    throw badRequest("Archived projects cannot be reactivated");
  }
  updateProject(db, id, patch);
  const updated = getProjectById(db, id);
  if (!updated) throw notFound(`Project ${id} not found`);
  if (patch.status && patch.status !== existing.status) {
    logEvent(db, {
      projectId: id,
      entityType: "project",
      entityId: id,
      action: "status_change",
      fromStatus: existing.status,
      toStatus: patch.status,
    });
  }
  return updated;
}

// ---------------------------------------------------------------------------
// HTTP layer (thin handlers)
// ---------------------------------------------------------------------------

export function registerProjectRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/projects", async (request) => {
    return { data: listProjectRows(db) };
  });

  app.post("/projects", async (request, reply) => {
    const body = createProjectSchema.parse(request.body);
    reply.code(201);
    return { data: createProject(db, body) };
  });

  app.get("/projects/:id", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    return { data: getProject(db, id) };
  });

  app.patch("/projects/:id", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const body = updateProjectSchema.parse(request.body);
    return { data: updateProjectRow(db, id, body) };
  });
}
