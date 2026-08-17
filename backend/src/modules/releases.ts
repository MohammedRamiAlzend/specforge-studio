/**
 * Per-project Releases module (Prompt 20).
 *
 * Versioned release artifacts (RLS prefix) with a status lifecycle
 * (planned/in_progress/released/archived) and release notes, rendered into
 * the generated workspace (06-ops/releases.md). Project-owned (ON DELETE
 * CASCADE). All operations are audit-logged (entity_type `release`).
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";
import { allocateId } from "../utils/ids";
import { logEvent } from "../utils/events";
import { notFound } from "../utils/errors";

// ---------------------------------------------------------------------------
// Row + view shapes
// ---------------------------------------------------------------------------

export type ReleaseStatus = "planned" | "in_progress" | "released" | "archived";

export interface ReleaseRow {
  id: string;
  project_id: string;
  version: string;
  name: string;
  status: ReleaseStatus;
  notes: string;
  released_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const idSchema = z.object({ id: z.string().regex(/^RLS-\d{4,}$/) });

const createReleaseSchema = z.object({
  project_id: z.string().min(1),
  version: z.string().min(1).max(50),
  name: z.string().min(1).max(300),
  status: z.enum(["planned", "in_progress", "released", "archived"]).default("planned"),
  notes: z.string().max(10000).optional(),
  released_at: z.string().nullable().optional(),
});

const updateReleaseSchema = z
  .object({
    version: z.string().min(1).max(50).optional(),
    name: z.string().min(1).max(300).optional(),
    status: z.enum(["planned", "in_progress", "released", "archived"]).optional(),
    notes: z.string().max(10000).nullable().optional(),
    released_at: z.string().nullable().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Repository layer
// ---------------------------------------------------------------------------

function getProject(db: Database, projectId: string): { id: string } | undefined {
  return db.query("SELECT id FROM projects WHERE id = ?").get(projectId) as { id: string } | undefined;
}

function getRelease(db: Database, id: string): ReleaseRow {
  const row = db.query("SELECT * FROM releases WHERE id = ?").get(id) as ReleaseRow | undefined;
  if (!row) throw notFound(`Release ${id} not found`);
  return row;
}

export function listReleases(db: Database, projectId: string): ReleaseRow[] {
  return db
    .query("SELECT * FROM releases WHERE project_id = ? ORDER BY version DESC")
    .all(projectId) as ReleaseRow[];
}

// ---------------------------------------------------------------------------
// Service layer
// ---------------------------------------------------------------------------

function createRelease(db: Database, input: z.infer<typeof createReleaseSchema>): ReleaseRow {
  if (!getProject(db, input.project_id)) {
    throw notFound(`Project ${input.project_id} not found`);
  }
  const id = allocateId(db, "RLS");
  db.query(
    `INSERT INTO releases (id, project_id, version, name, status, notes, released_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.project_id,
    input.version,
    input.name,
    input.status,
    input.notes ?? "",
    input.released_at ?? null,
  );
  logEvent(db, {
    projectId: input.project_id,
    entityType: "release",
    entityId: id,
    action: "created",
    payload: { version: input.version, name: input.name, status: input.status },
  });
  return getRelease(db, id);
}

function updateRelease(db: Database, id: string, patch: z.infer<typeof updateReleaseSchema>): ReleaseRow {
  const existing = getRelease(db, id);
  const sets: string[] = [];
  const values: (string | null)[] = [];
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
    `UPDATE releases SET ${sets.join(", ")}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
  ).run(...values);
  const updated = getRelease(db, id);
  logEvent(db, {
    projectId: updated.project_id,
    entityType: "release",
    entityId: id,
    action: updated.status !== fromStatus ? "status_change" : "updated",
    fromStatus,
    toStatus: updated.status,
    payload: { to: patch },
  });
  return updated;
}

function deleteRelease(db: Database, id: string): void {
  const existing = getRelease(db, id);
  db.query("DELETE FROM releases WHERE id = ?").run(id);
  logEvent(db, {
    projectId: existing.project_id,
    entityType: "release",
    entityId: id,
    action: "updated",
    payload: { deleted: true },
  });
}

// ---------------------------------------------------------------------------
// HTTP layer
// ---------------------------------------------------------------------------

export function registerReleaseRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/releases", async (request) => {
    const query = z.object({ project: z.string().min(1) }).parse(request.query);
    return { data: listReleases(db, query.project) };
  });

  app.post("/releases", async (request, reply) => {
    const body = createReleaseSchema.parse(request.body);
    reply.code(201);
    return { data: createRelease(db, body) };
  });

  app.patch("/releases/:id", async (request) => {
    const { id } = idSchema.parse(request.params);
    const body = updateReleaseSchema.parse(request.body);
    return { data: updateRelease(db, id, body) };
  });

  app.delete("/releases/:id", async (request, reply) => {
    const { id } = idSchema.parse(request.params);
    deleteRelease(db, id);
    reply.code(204);
    return null;
  });
}