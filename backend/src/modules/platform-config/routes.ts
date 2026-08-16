/**
 * Platform configuration API (Prompt 13).
 *
 * Project types, stacks, and libraries are workspace-global configuration
 * stored in the database and managed from the Settings page. Rows carry an
 * `enabled` flag (disabled rows disappear from the creation form but remain
 * readable on existing projects) and a `built_in` flag (built-in rows may be
 * edited or disabled but not hard-deleted). Deleting a type/stack/library that
 * is referenced by any project is blocked with a clear conflict error.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../../types";
import { allocateId } from "../../utils/ids";
import { logEvent } from "../../utils/events";
import { badRequest, conflict, notFound } from "../../utils/errors";

// ---------------------------------------------------------------------------
// Row + view shapes
// ---------------------------------------------------------------------------

export interface ProjectTypeRow {
  id: string;
  key: string;
  label: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  sort_order: number;
  enabled: number;
  built_in: number;
  created_at: string;
  updated_at: string;
}

export interface StackRow {
  id: string;
  type_id: string;
  name: string;
  language: string | null;
  description: string | null;
  sort_order: number;
  enabled: number;
  built_in: number;
  created_at: string;
  updated_at: string;
}

export interface LibraryRow {
  id: string;
  stack_id: string;
  name: string;
  purpose: string | null;
  category: string | null;
  url: string | null;
  sort_order: number;
  enabled: number;
  built_in: number;
  created_at: string;
  updated_at: string;
}

export interface LibraryView extends LibraryRow {}
export interface StackView extends StackRow {
  libraries: LibraryView[];
}
export interface ProjectTypeView extends ProjectTypeRow {
  stacks: StackView[];
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const idSchema = z.object({ id: z.string().min(1) });

const createTypeSchema = z.object({
  key: z.string().min(1).max(40).regex(/^[a-z][a-z0-9_-]*$/i, "key must be a lowercase identifier"),
  label: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  color: z.string().max(40).optional(),
  icon: z.string().max(40).optional(),
  sort_order: z.number().int().optional(),
});

const updateTypeSchema = createTypeSchema
  .partial()
  .extend({ enabled: z.boolean().optional() })
  .strict();

const createStackSchema = z.object({
  type_id: z.string().min(1),
  name: z.string().min(1).max(120),
  language: z.string().max(80).optional(),
  description: z.string().max(1000).optional(),
  sort_order: z.number().int().optional(),
});

const updateStackSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    language: z.string().max(80).nullable().optional(),
    description: z.string().max(1000).nullable().optional(),
    sort_order: z.number().int().optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

const createLibrarySchema = z.object({
  stack_id: z.string().min(1),
  name: z.string().min(1).max(160),
  purpose: z.string().max(500).optional(),
  category: z.string().max(80).optional(),
  url: z.string().url().optional(),
  sort_order: z.number().int().optional(),
});

const updateLibrarySchema = z
  .object({
    name: z.string().min(1).max(160).optional(),
    purpose: z.string().max(500).nullable().optional(),
    category: z.string().max(80).nullable().optional(),
    url: z.string().url().nullable().optional(),
    sort_order: z.number().int().optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Repository layer (SQL only)
// ---------------------------------------------------------------------------

function listTypes(db: Database): ProjectTypeRow[] {
  return db.query("SELECT * FROM project_types ORDER BY sort_order, id").all() as ProjectTypeRow[];
}

function getType(db: Database, id: string): ProjectTypeRow {
  const row = db.query("SELECT * FROM project_types WHERE id = ?").get(id) as ProjectTypeRow | undefined;
  if (!row) throw notFound(`Project type ${id} not found`);
  return row;
}

function getTypeByKey(db: Database, key: string): ProjectTypeRow | undefined {
  return db.query("SELECT * FROM project_types WHERE key = ?").get(key) as ProjectTypeRow | undefined;
}

function listStacks(db: Database, typeId?: string): StackRow[] {
  return typeId
    ? (db.query("SELECT * FROM stacks WHERE type_id = ? ORDER BY sort_order, id").all(typeId) as StackRow[])
    : (db.query("SELECT * FROM stacks ORDER BY sort_order, id").all() as StackRow[]);
}

function getStack(db: Database, id: string): StackRow {
  const row = db.query("SELECT * FROM stacks WHERE id = ?").get(id) as StackRow | undefined;
  if (!row) throw notFound(`Stack ${id} not found`);
  return row;
}

function listLibraries(db: Database, stackId?: string): LibraryRow[] {
  return stackId
    ? (db.query("SELECT * FROM libraries WHERE stack_id = ? ORDER BY sort_order, id").all(stackId) as LibraryRow[])
    : (db.query("SELECT * FROM libraries ORDER BY sort_order, id").all() as LibraryRow[]);
}

function getLibrary(db: Database, id: string): LibraryRow {
  const row = db.query("SELECT * FROM libraries WHERE id = ?").get(id) as LibraryRow | undefined;
  if (!row) throw notFound(`Library ${id} not found`);
  return row;
}

function isTypeUsed(db: Database, typeId: string): boolean {
  return Boolean(db.query("SELECT 1 FROM project_type_assignments WHERE type_id = ? LIMIT 1").get(typeId));
}

function isStackUsed(db: Database, stackId: string): boolean {
  return Boolean(db.query("SELECT 1 FROM project_type_config WHERE stack_id = ? LIMIT 1").get(stackId));
}

function isLibraryUsed(db: Database, libraryId: string): boolean {
  return Boolean(db.query("SELECT 1 FROM project_libraries WHERE library_id = ? LIMIT 1").get(libraryId));
}

// ---------------------------------------------------------------------------
// Service layer (domain logic)
// ---------------------------------------------------------------------------

/** Full configuration tree: all types with their stacks and libraries. */
export function getPlatformConfig(db: Database): ProjectTypeView[] {
  return listTypes(db).map((type) => ({
    ...type,
    stacks: listStacks(db, type.id).map((stack) => ({
      ...stack,
      libraries: listLibraries(db, stack.id),
    })),
  }));
}

function createType(db: Database, input: z.infer<typeof createTypeSchema>): ProjectTypeRow {
  if (getTypeByKey(db, input.key)) {
    throw conflict(`A project type with key "${input.key}" already exists`);
  }
  const id = allocateId(db, "PTYPE");
  db.query(
    `INSERT INTO project_types (id, key, label, description, color, icon, sort_order, enabled, built_in)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)`,
  ).run(
    id,
    input.key,
    input.label,
    input.description ?? null,
    input.color ?? null,
    input.icon ?? null,
    input.sort_order ?? 0,
  );
  logEvent(db, {
    entityType: "project_type",
    entityId: id,
    action: "created",
    payload: { key: input.key, label: input.label },
  });
  return getType(db, id);
}

function updateType(db: Database, id: string, patch: z.infer<typeof updateTypeSchema>): ProjectTypeRow {
  const existing = getType(db, id);
  if (patch.key && patch.key !== existing.key && getTypeByKey(db, patch.key)) {
    throw conflict(`A project type with key "${patch.key}" already exists`);
  }
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  const fields: Record<string, unknown> = {
    key: patch.key,
    label: patch.label,
    description: patch.description ?? null,
    color: patch.color ?? null,
    icon: patch.icon ?? null,
    sort_order: patch.sort_order,
    enabled: patch.enabled === undefined ? undefined : patch.enabled ? 1 : 0,
  };
  for (const [column, value] of Object.entries(fields)) {
    if (value !== undefined) {
      sets.push(`${column} = ?`);
      values.push(value as string | number | null);
    }
  }
  if (sets.length > 0) {
    values.push(id);
    db.query(
      `UPDATE project_types SET ${sets.join(", ")}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
    ).run(...values);
  }
  const updated = getType(db, id);
  logEvent(db, {
    entityType: "project_type",
    entityId: id,
    action: "updated",
    payload: { to: { ...patch, enabled: updated.enabled === 1 || patch.enabled === true } },
  });
  return updated;
}

function deleteType(db: Database, id: string): void {
  const existing = getType(db, id);
  if (existing.built_in) {
    throw badRequest("Built-in project types cannot be deleted. Disable them instead.");
  }
  if (isTypeUsed(db, id)) {
    throw conflict(`Project type "${existing.label}" is used by projects and cannot be deleted.`);
  }
  db.query("DELETE FROM project_types WHERE id = ?").run(id);
  logEvent(db, {
    entityType: "project_type",
    entityId: id,
    action: "updated",
    payload: { deleted: true },
  });
}

function createStack(db: Database, input: z.infer<typeof createStackSchema>): StackRow {
  getType(db, input.type_id);
  const id = allocateId(db, "STK");
  db.query(
    `INSERT INTO stacks (id, type_id, name, language, description, sort_order, enabled, built_in)
     VALUES (?, ?, ?, ?, ?, ?, 1, 0)`,
  ).run(
    id,
    input.type_id,
    input.name,
    input.language ?? null,
    input.description ?? null,
    input.sort_order ?? 0,
  );
  logEvent(db, {
    entityType: "stack",
    entityId: id,
    action: "created",
    payload: { type_id: input.type_id, name: input.name },
  });
  return getStack(db, id);
}

function updateStack(db: Database, id: string, patch: z.infer<typeof updateStackSchema>): StackRow {
  getStack(db, id);
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  const fields: Record<string, unknown> = {
    name: patch.name,
    language: patch.language ?? null,
    description: patch.description ?? null,
    sort_order: patch.sort_order,
    enabled: patch.enabled === undefined ? undefined : patch.enabled ? 1 : 0,
  };
  for (const [column, value] of Object.entries(fields)) {
    if (value !== undefined) {
      sets.push(`${column} = ?`);
      values.push(value as string | number | null);
    }
  }
  if (sets.length > 0) {
    values.push(id);
    db.query(
      `UPDATE stacks SET ${sets.join(", ")}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
    ).run(...values);
  }
  const updated = getStack(db, id);
  logEvent(db, {
    entityType: "stack",
    entityId: id,
    action: "updated",
    payload: { to: patch },
  });
  return updated;
}

function deleteStack(db: Database, id: string): void {
  const existing = getStack(db, id);
  if (existing.built_in) {
    throw badRequest("Built-in stacks cannot be deleted. Disable them instead.");
  }
  if (isStackUsed(db, id)) {
    throw conflict(`Stack "${existing.name}" is used by projects and cannot be deleted.`);
  }
  db.query("DELETE FROM stacks WHERE id = ?").run(id);
  logEvent(db, {
    entityType: "stack",
    entityId: id,
    action: "updated",
    payload: { deleted: true },
  });
}

function createLibrary(db: Database, input: z.infer<typeof createLibrarySchema>): LibraryRow {
  getStack(db, input.stack_id);
  const id = allocateId(db, "LIB");
  db.query(
    `INSERT INTO libraries (id, stack_id, name, purpose, category, url, sort_order, enabled, built_in)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)`,
  ).run(
    id,
    input.stack_id,
    input.name,
    input.purpose ?? null,
    input.category ?? null,
    input.url ?? null,
    input.sort_order ?? 0,
  );
  logEvent(db, {
    entityType: "library",
    entityId: id,
    action: "created",
    payload: { stack_id: input.stack_id, name: input.name },
  });
  return getLibrary(db, id);
}

function updateLibrary(db: Database, id: string, patch: z.infer<typeof updateLibrarySchema>): LibraryRow {
  getLibrary(db, id);
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  const fields: Record<string, unknown> = {
    name: patch.name,
    purpose: patch.purpose ?? null,
    category: patch.category ?? null,
    url: patch.url ?? null,
    sort_order: patch.sort_order,
    enabled: patch.enabled === undefined ? undefined : patch.enabled ? 1 : 0,
  };
  for (const [column, value] of Object.entries(fields)) {
    if (value !== undefined) {
      sets.push(`${column} = ?`);
      values.push(value as string | number | null);
    }
  }
  if (sets.length > 0) {
    values.push(id);
    db.query(
      `UPDATE libraries SET ${sets.join(", ")}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
    ).run(...values);
  }
  const updated = getLibrary(db, id);
  logEvent(db, {
    entityType: "library",
    entityId: id,
    action: "updated",
    payload: { to: patch },
  });
  return updated;
}

function deleteLibrary(db: Database, id: string): void {
  const existing = getLibrary(db, id);
  if (existing.built_in) {
    throw badRequest("Built-in libraries cannot be deleted. Disable them instead.");
  }
  if (isLibraryUsed(db, id)) {
    throw conflict(`Library "${existing.name}" is used by projects and cannot be deleted.`);
  }
  db.query("DELETE FROM libraries WHERE id = ?").run(id);
  logEvent(db, {
    entityType: "library",
    entityId: id,
    action: "updated",
    payload: { deleted: true },
  });
}

// ---------------------------------------------------------------------------
// HTTP layer
// ---------------------------------------------------------------------------

export function registerPlatformConfigRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/platform-config", async () => {
    return { data: getPlatformConfig(db) };
  });

  // Types
  app.post("/platform-config/types", async (request, reply) => {
    const body = createTypeSchema.parse(request.body);
    reply.code(201);
    return { data: createType(db, body) };
  });

  app.patch("/platform-config/types/:id", async (request) => {
    const { id } = idSchema.parse(request.params);
    const body = updateTypeSchema.parse(request.body);
    return { data: updateType(db, id, body) };
  });

  app.delete("/platform-config/types/:id", async (request, reply) => {
    const { id } = idSchema.parse(request.params);
    deleteType(db, id);
    reply.code(204);
    return null;
  });

  // Stacks
  app.post("/platform-config/stacks", async (request, reply) => {
    const body = createStackSchema.parse(request.body);
    reply.code(201);
    return { data: createStack(db, body) };
  });

  app.patch("/platform-config/stacks/:id", async (request) => {
    const { id } = idSchema.parse(request.params);
    const body = updateStackSchema.parse(request.body);
    return { data: updateStack(db, id, body) };
  });

  app.delete("/platform-config/stacks/:id", async (request, reply) => {
    const { id } = idSchema.parse(request.params);
    deleteStack(db, id);
    reply.code(204);
    return null;
  });

  // Libraries
  app.post("/platform-config/libraries", async (request, reply) => {
    const body = createLibrarySchema.parse(request.body);
    reply.code(201);
    return { data: createLibrary(db, body) };
  });

  app.patch("/platform-config/libraries/:id", async (request) => {
    const { id } = idSchema.parse(request.params);
    const body = updateLibrarySchema.parse(request.body);
    return { data: updateLibrary(db, id, body) };
  });

  app.delete("/platform-config/libraries/:id", async (request, reply) => {
    const { id } = idSchema.parse(request.params);
    deleteLibrary(db, id);
    reply.code(204);
    return null;
  });
}