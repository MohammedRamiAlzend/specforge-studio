/**
 * Per-project Skills module (Prompt 16).
 *
 * Each project has its own Skills section with two kinds of skills stored in
 * one `skills` table:
 *   * capability — a team capability with a proficiency `level`;
 *   * tech       — a technology/stack skill with a free-text `tag`.
 *
 * Skills are project-owned (project_id FK, ON DELETE CASCADE) and carry the
 * SKL ID prefix. Operations are audit-logged (entity_type `skill`).
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";
import { allocateId } from "../utils/ids";
import { logEvent } from "../utils/events";
import { badRequest, notFound } from "../utils/errors";

// ---------------------------------------------------------------------------
// Row + view shapes
// ---------------------------------------------------------------------------

export type SkillKind = "capability" | "tech";
export type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface SkillRow {
  id: string;
  project_id: string;
  kind: SkillKind;
  name: string;
  description: string;
  level: SkillLevel | null;
  tag: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const skillLevelSchema = z.enum(["beginner", "intermediate", "advanced", "expert"]);
const skillKindSchema = z.enum(["capability", "tech"]);

const createSkillSchema = z.object({
  project_id: z.string().min(1),
  kind: skillKindSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  level: skillLevelSchema.nullable().optional(),
  tag: z.string().max(120).nullable().optional(),
  sort_order: z.number().int().optional(),
});

const updateSkillSchema = z
  .object({
    kind: skillKindSchema.optional(),
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(4000).nullable().optional(),
    level: skillLevelSchema.nullable().optional(),
    tag: z.string().max(120).nullable().optional(),
    sort_order: z.number().int().optional(),
  })
  .strict();

const idSchema = z.object({ id: z.string().regex(/^SKL-\d{4,}$/) });

// ---------------------------------------------------------------------------
// Repository layer
// ---------------------------------------------------------------------------

function toRow(raw: SkillRow): SkillRow {
  return {
    ...raw,
    level: (raw.level ?? null) as SkillLevel | null,
    tag: raw.tag ?? null,
  };
}

export function listSkills(db: Database, projectId: string): SkillRow[] {
  const rows = db.query(
    "SELECT * FROM skills WHERE project_id = ? ORDER BY sort_order, id",
  ).all(projectId) as SkillRow[];
  return rows.map(toRow);
}

function getSkill(db: Database, id: string): SkillRow {
  const row = db.query("SELECT * FROM skills WHERE id = ?").get(id) as SkillRow | undefined;
  if (!row) throw notFound(`Skill ${id} not found`);
  return toRow(row);
}

function getProject(db: Database, projectId: string): { id: string } | undefined {
  return db.query("SELECT id FROM projects WHERE id = ?").get(projectId) as { id: string } | undefined;
}

// ---------------------------------------------------------------------------
// Service layer
// ---------------------------------------------------------------------------

function assertKindConsistency(kind: SkillKind, level: string | null, tag: string | null): void {
  if (kind === "capability" && !level) {
    throw badRequest("A capability skill requires a level (beginner|intermediate|advanced|expert).");
  }
  if (kind === "tech" && level) {
    throw badRequest("A tech skill cannot carry a level. Use a tag instead.");
  }
  if (kind === "tech" && tag !== null && tag !== undefined && String(tag).trim() === "") {
    throw badRequest("A tech skill tag cannot be empty when provided.");
  }
}

function createSkill(db: Database, input: z.infer<typeof createSkillSchema>): SkillRow {
  if (!getProject(db, input.project_id)) {
    throw notFound(`Project ${input.project_id} not found`);
  }
  assertKindConsistency(input.kind, input.level ?? null, input.tag ?? null);
  const id = allocateId(db, "SKL");
  db.query(
    `INSERT INTO skills (id, project_id, kind, name, description, level, tag, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.project_id,
    input.kind,
    input.name,
    input.description ?? "",
    input.kind === "capability" ? input.level ?? null : null,
    input.kind === "tech" ? input.tag ?? null : null,
    input.sort_order ?? 0,
  );
  logEvent(db, {
    projectId: input.project_id,
    entityType: "skill",
    entityId: id,
    action: "created",
    payload: { kind: input.kind, name: input.name },
  });
  return getSkill(db, id);
}

function updateSkill(db: Database, id: string, patch: z.infer<typeof updateSkillSchema>): SkillRow {
  const existing = getSkill(db, id);
  const kind = patch.kind ?? existing.kind;
  const level = patch.level === undefined ? existing.level : patch.level;
  const tag = patch.tag === undefined ? existing.tag : patch.tag;
  assertKindConsistency(kind, level, tag);

  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  const fields: Record<string, unknown> = {
    kind,
    name: patch.name,
    description: patch.description === undefined ? undefined : patch.description ?? "",
    level: kind === "capability" ? level : null,
    tag: kind === "tech" ? tag : null,
    sort_order: patch.sort_order,
  };
  for (const [column, value] of Object.entries(fields)) {
    if (value !== undefined) {
      sets.push(`${column} = ?`);
      values.push(value as string | number | null);
    }
  }
  values.push(id);
  db.query(
    `UPDATE skills SET ${sets.join(", ")}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
  ).run(...values);
  const updated = getSkill(db, id);
  logEvent(db, {
    projectId: updated.project_id,
    entityType: "skill",
    entityId: id,
    action: "updated",
    payload: { to: patch },
  });
  return updated;
}

function deleteSkill(db: Database, id: string): void {
  const existing = getSkill(db, id);
  db.query("DELETE FROM skills WHERE id = ?").run(id);
  logEvent(db, {
    projectId: existing.project_id,
    entityType: "skill",
    entityId: id,
    action: "updated",
    payload: { deleted: true },
  });
}

// ---------------------------------------------------------------------------
// HTTP layer
// ---------------------------------------------------------------------------

export function registerSkillRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/skills", async (request) => {
    const query = z.object({ project: z.string().min(1) }).parse(request.query);
    return { data: listSkills(db, query.project) };
  });

  app.post("/skills", async (request, reply) => {
    const body = createSkillSchema.parse(request.body);
    reply.code(201);
    return { data: createSkill(db, body) };
  });

  app.patch("/skills/:id", async (request) => {
    const { id } = idSchema.parse(request.params);
    const body = updateSkillSchema.parse(request.body);
    return { data: updateSkill(db, id, body) };
  });

  app.delete("/skills/:id", async (request, reply) => {
    const { id } = idSchema.parse(request.params);
    deleteSkill(db, id);
    reply.code(204);
    return null;
  });
}