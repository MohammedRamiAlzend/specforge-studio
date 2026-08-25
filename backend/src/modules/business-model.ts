/**
 * Per-project Business Model Canvas module (DEC-030 Phase A).
 *
 * The classic 9-block canvas stored as structured sticky-note rows in one
 * `bmc_notes` table:
 *   key_partners, key_activities, key_resources, value_propositions,
 *   customer_relationships, channels, customer_segments, cost_structure,
 *   revenue_streams
 *
 * Notes are project-owned (project_id FK, ON DELETE CASCADE) and carry the
 * BMC ID prefix. Operations are audit-logged (entity_type `bmc`). The data
 * feeds both the BusinessModelPage canvas grid and the generated workspace
 * doc `07-guides/business-model.md`, and is a source for the pitch deck.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";
import { allocateId } from "../utils/ids";
import { logEvent } from "../utils/events";
import { notFound } from "../utils/errors";

// ---------------------------------------------------------------------------
// Row + block shapes
// ---------------------------------------------------------------------------

export const BMC_BLOCKS = [
  "key_partners",
  "key_activities",
  "key_resources",
  "value_propositions",
  "customer_relationships",
  "channels",
  "customer_segments",
  "cost_structure",
  "revenue_streams",
] as const;

export type BmcBlock = (typeof BMC_BLOCKS)[number];

export interface BmcNoteRow {
  id: string;
  project_id: string;
  block: BmcBlock;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const bmcBlockSchema = z.enum(BMC_BLOCKS);

const createNoteSchema = z.object({
  project_id: z.string().min(1),
  block: bmcBlockSchema,
  content: z.string().min(1).max(2000),
  sort_order: z.number().int().optional(),
});

const updateNoteSchema = z
  .object({
    content: z.string().min(1).max(2000).optional(),
    sort_order: z.number().int().optional(),
  })
  .strict();

const idSchema = z.object({ id: z.string().regex(/^BMC-\d{4,}$/) });

// ---------------------------------------------------------------------------
// Repository layer
// ---------------------------------------------------------------------------

export function listBmcNotes(db: Database, projectId: string): BmcNoteRow[] {
  return db
    .query("SELECT * FROM bmc_notes WHERE project_id = ? ORDER BY sort_order, id")
    .all(projectId) as BmcNoteRow[];
}

function getNote(db: Database, id: string): BmcNoteRow {
  const row = db.query("SELECT * FROM bmc_notes WHERE id = ?").get(id) as BmcNoteRow | undefined;
  if (!row) throw notFound(`Canvas note ${id} not found`);
  return row;
}

function getProject(db: Database, projectId: string): { id: string } | undefined {
  return db.query("SELECT id FROM projects WHERE id = ?").get(projectId) as { id: string } | undefined;
}

// ---------------------------------------------------------------------------
// Service layer
// ---------------------------------------------------------------------------

function createNote(db: Database, input: z.infer<typeof createNoteSchema>): BmcNoteRow {
  if (!getProject(db, input.project_id)) {
    throw notFound(`Project ${input.project_id} not found`);
  }
  const id = allocateId(db, "BMC");
  db.query(
    `INSERT INTO bmc_notes (id, project_id, block, content, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, input.project_id, input.block, input.content, input.sort_order ?? 0);
  logEvent(db, {
    projectId: input.project_id,
    entityType: "bmc",
    entityId: id,
    action: "created",
    payload: { block: input.block },
  });
  return getNote(db, id);
}

function updateNote(db: Database, id: string, patch: z.infer<typeof updateNoteSchema>): BmcNoteRow {
  getNote(db, id);
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  const fields: Record<string, unknown> = {
    content: patch.content,
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
    `UPDATE bmc_notes SET ${sets.join(", ")}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
  ).run(...values);
  const updated = getNote(db, id);
  logEvent(db, {
    projectId: updated.project_id,
    entityType: "bmc",
    entityId: id,
    action: "updated",
    payload: { to: patch },
  });
  return updated;
}

function deleteNote(db: Database, id: string): void {
  const existing = getNote(db, id);
  db.query("DELETE FROM bmc_notes WHERE id = ?").run(id);
  logEvent(db, {
    projectId: existing.project_id,
    entityType: "bmc",
    entityId: id,
    action: "updated",
    payload: { deleted: true },
  });
}

// ---------------------------------------------------------------------------
// HTTP layer
// ---------------------------------------------------------------------------

export function registerBusinessModelRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/bmc", async (request) => {
    const query = z.object({ project: z.string().min(1) }).parse(request.query);
    return { data: listBmcNotes(db, query.project) };
  });

  app.post("/bmc", async (request, reply) => {
    const body = createNoteSchema.parse(request.body);
    reply.code(201);
    return { data: createNote(db, body) };
  });

  app.patch("/bmc/:id", async (request) => {
    const { id } = idSchema.parse(request.params);
    const body = updateNoteSchema.parse(request.body);
    return { data: updateNote(db, id, body) };
  });

  app.delete("/bmc/:id", async (request, reply) => {
    const { id } = idSchema.parse(request.params);
    deleteNote(db, id);
    reply.code(204);
    return null;
  });
}
