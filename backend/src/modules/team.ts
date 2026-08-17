/**
 * Per-project Team Members module (Prompt 20).
 *
 * A project's team roster (MEM prefix). Members can be assigned as owners of
 * tasks and milestones via `assignee_id`. Project-owned (project_id FK, ON
 * DELETE CASCADE). All operations are audit-logged (entity_type `team_member`).
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

export interface TeamMemberRow {
  id: string;
  project_id: string;
  name: string;
  email: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const idSchema = z.object({ id: z.string().regex(/^MEM-\d{4,}$/) });

const createMemberSchema = z.object({
  project_id: z.string().min(1),
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional(),
  role: z.string().max(120).nullable().optional(),
});

const updateMemberSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    email: z.string().email().nullable().optional(),
    role: z.string().max(120).nullable().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Repository layer
// ---------------------------------------------------------------------------

function getProject(db: Database, projectId: string): { id: string } | undefined {
  return db.query("SELECT id FROM projects WHERE id = ?").get(projectId) as { id: string } | undefined;
}

function getMember(db: Database, id: string): TeamMemberRow {
  const row = db.query("SELECT * FROM team_members WHERE id = ?").get(id) as TeamMemberRow | undefined;
  if (!row) throw notFound(`Team member ${id} not found`);
  return row;
}

export function listTeamMembers(db: Database, projectId: string): TeamMemberRow[] {
  return db
    .query("SELECT * FROM team_members WHERE project_id = ? ORDER BY id")
    .all(projectId) as TeamMemberRow[];
}

function assertMemberExists(db: Database, id: string): void {
  if (!db.query("SELECT id FROM team_members WHERE id = ?").get(id)) {
    throw notFound(`Team member ${id} not found`);
  }
}

// ---------------------------------------------------------------------------
// Service layer
// ---------------------------------------------------------------------------

function createMember(db: Database, input: z.infer<typeof createMemberSchema>): TeamMemberRow {
  if (!getProject(db, input.project_id)) {
    throw notFound(`Project ${input.project_id} not found`);
  }
  const id = allocateId(db, "MEM");
  db.query(
    `INSERT INTO team_members (id, project_id, name, email, role)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, input.project_id, input.name, input.email ?? null, input.role ?? null);
  logEvent(db, {
    projectId: input.project_id,
    entityType: "team_member",
    entityId: id,
    action: "created",
    payload: { name: input.name, role: input.role ?? null },
  });
  return getMember(db, id);
}

function updateMember(db: Database, id: string, patch: z.infer<typeof updateMemberSchema>): TeamMemberRow {
  const existing = getMember(db, id);
  const sets: string[] = [];
  const values: (string | null)[] = [];
  for (const [column, value] of Object.entries(patch)) {
    if (value !== undefined) {
      sets.push(`${column} = ?`);
      values.push(value as string | null);
    }
  }
  if (sets.length === 0) return existing;
  values.push(id);
  db.query(
    `UPDATE team_members SET ${sets.join(", ")}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
  ).run(...values);
  const updated = getMember(db, id);
  logEvent(db, {
    projectId: updated.project_id,
    entityType: "team_member",
    entityId: id,
    action: "updated",
    payload: { to: patch },
  });
  return updated;
}

function deleteMember(db: Database, id: string): void {
  const existing = getMember(db, id);
  db.query("DELETE FROM team_members WHERE id = ?").run(id);
  logEvent(db, {
    projectId: existing.project_id,
    entityType: "team_member",
    entityId: id,
    action: "updated",
    payload: { deleted: true },
  });
}

// ---------------------------------------------------------------------------
// HTTP layer
// ---------------------------------------------------------------------------

export function registerTeamRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/team", async (request) => {
    const query = z.object({ project: z.string().min(1) }).parse(request.query);
    return { data: listTeamMembers(db, query.project) };
  });

  app.post("/team", async (request, reply) => {
    const body = createMemberSchema.parse(request.body);
    reply.code(201);
    return { data: createMember(db, body) };
  });

  app.patch("/team/:id", async (request) => {
    const { id } = idSchema.parse(request.params);
    const body = updateMemberSchema.parse(request.body);
    return { data: updateMember(db, id, body) };
  });

  app.delete("/team/:id", async (request, reply) => {
    const { id } = idSchema.parse(request.params);
    deleteMember(db, id);
    reply.code(204);
    return null;
  });
}

export { assertMemberExists };