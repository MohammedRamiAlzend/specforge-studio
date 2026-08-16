/**
 * Customizable node palette API (Prompt 15).
 *
 * Node categories and node types are workspace-global configuration stored in
 * the database and managed from Settings > Node palette. The modeler reads its
 * palette from here instead of a hard-coded catalog. Rows carry `enabled`
 * (disabled rows disappear from the modeler palette but remain readable on
 * saved graphs) and `built_in` (editable/disableable, never hard-deletable).
 * Delete guards: a category referenced by node types is blocked (re-parent
 * first), and a node type used by any saved model node is blocked.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../../types";
import { allocateId } from "../../utils/ids";
import { logEvent } from "../../utils/events";
import { badRequest, conflict, notFound } from "../../utils/errors";
import type { ModelKind } from "../modeler";

// ---------------------------------------------------------------------------
// Row + view shapes
// ---------------------------------------------------------------------------

export type NodeFieldType = "text" | "textarea" | "number" | "select" | "boolean";

export interface NodeFieldDef {
  key: string;
  label: string;
  type: NodeFieldType;
  options?: string[];
  required?: boolean;
  default?: string | number | boolean;
}

export interface NodeCategoryRow {
  id: string;
  key: string;
  label: string;
  color: string;
  sort_order: number;
  enabled: number;
  built_in: number;
  created_at: string;
  updated_at: string;
}

export interface NodeTypeRow {
  id: string;
  key: string;
  label: string;
  category_id: string;
  description: string;
  color: string;
  kinds: ModelKind[];
  default_title: string;
  fields: NodeFieldDef[];
  sort_order: number;
  enabled: number;
  built_in: number;
  created_at: string;
  updated_at: string;
}

export interface NodeTypeView extends NodeTypeRow {
  category_key: string;
  category_label: string;
}

export interface NodeCategoryView extends NodeCategoryRow {
  nodeTypes: NodeTypeView[];
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const idSchema = z.object({ id: z.string().min(1) });

const createCategorySchema = z.object({
  key: z.string().min(1).max(40).regex(/^[a-z][a-z0-9_-]*$/i, "key must be a lowercase identifier"),
  label: z.string().min(1).max(120),
  color: z.string().max(40).optional(),
  sort_order: z.number().int().optional(),
});

const updateCategorySchema = z
  .object({
    label: z.string().min(1).max(120).optional(),
    color: z.string().max(40).optional(),
    sort_order: z.number().int().optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

const fieldDefSchema = z.object({
  key: z.string().min(1).max(60).regex(/^[a-z][a-z0-9_]*$/i),
  label: z.string().min(1).max(120),
  type: z.enum(["text", "textarea", "number", "select", "boolean"]),
  options: z.array(z.string().max(200)).max(50).optional(),
  required: z.boolean().optional(),
  default: z.union([z.string().max(500), z.number().finite(), z.boolean()]).optional(),
});

const createTypeSchema = z.object({
  key: z.string().min(1).max(60).regex(/^[a-z][a-z0-9_]*$/i),
  label: z.string().min(1).max(120),
  category_id: z.string().min(1),
  description: z.string().max(4000).optional(),
  color: z.string().max(40).optional(),
  kinds: z.array(z.enum(["workflow", "data", "architecture", "sequence"])).min(1).max(4),
  default_title: z.string().max(300).optional(),
  fields: z.array(fieldDefSchema).max(50).optional(),
  sort_order: z.number().int().optional(),
});

const updateTypeSchema = z
  .object({
    label: z.string().min(1).max(120).optional(),
    category_id: z.string().min(1).optional(),
    description: z.string().max(4000).nullable().optional(),
    color: z.string().max(40).nullable().optional(),
    kinds: z.array(z.enum(["workflow", "data", "architecture", "sequence"])).min(1).max(4).optional(),
    default_title: z.string().max(300).nullable().optional(),
    fields: z.array(fieldDefSchema).max(50).nullable().optional(),
    sort_order: z.number().int().optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Repository layer
// ---------------------------------------------------------------------------

function parseJsonArray<T>(value: string | null): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function listNodeCategories(db: Database): NodeCategoryRow[] {
  return db.query("SELECT * FROM node_categories ORDER BY sort_order, id").all() as NodeCategoryRow[];
}

export function getNodeCategory(db: Database, id: string): NodeCategoryRow {
  const row = db.query("SELECT * FROM node_categories WHERE id = ?").get(id) as NodeCategoryRow | undefined;
  if (!row) throw notFound(`Node category ${id} not found`);
  return row;
}

function getCategoryByKey(db: Database, key: string): NodeCategoryRow | undefined {
  return db.query("SELECT * FROM node_categories WHERE key = ?").get(key) as NodeCategoryRow | undefined;
}

function toRow(raw: NodeTypeRow): NodeTypeRow {
  return {
    ...raw,
    kinds: parseJsonArray<ModelKind>(String(raw.kinds)),
    fields: parseJsonArray<NodeFieldDef>(String(raw.fields)),
  };
}

export function listNodeTypes(db: Database): NodeTypeRow[] {
  const rows = db.query("SELECT * FROM node_types ORDER BY sort_order, id").all() as NodeTypeRow[];
  return rows.map(toRow);
}

function getNodeType(db: Database, id: string): NodeTypeRow {
  const row = db.query("SELECT * FROM node_types WHERE id = ?").get(id) as NodeTypeRow | undefined;
  if (!row) throw notFound(`Node type ${id} not found`);
  return toRow(row);
}

export function getNodeTypeByKey(db: Database, key: string): NodeTypeRow | undefined {
  const row = db.query("SELECT * FROM node_types WHERE key = ?").get(key) as NodeTypeRow | undefined;
  return row ? toRow(row) : undefined;
}

function toTypeView(row: NodeTypeRow, categories: Map<string, NodeCategoryRow>): NodeTypeView {
  const category = categories.get(row.category_id);
  return {
    ...row,
    category_key: category?.key ?? row.category_id,
    category_label: category?.label ?? category?.key ?? row.category_id,
  };
}

function isNodeTypeUsed(db: Database, key: string): boolean {
  return Boolean(db.query("SELECT 1 FROM model_nodes WHERE node_type = ? LIMIT 1").get(key));
}

// ---------------------------------------------------------------------------
// Service layer
// ---------------------------------------------------------------------------

/** Full palette with categories (and their node types) plus orphan types. */
export function getNodePalette(db: Database): NodeCategoryView[] {
  const categories = listNodeCategories(db);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const types = listNodeTypes(db).map((t) => toTypeView(t, categoryById));
  return categories.map((category) => ({
    ...category,
    nodeTypes: types.filter((t) => t.category_id === category.id),
  }));
}

function createCategory(db: Database, input: z.infer<typeof createCategorySchema>): NodeCategoryRow {
  if (getCategoryByKey(db, input.key)) {
    throw conflict(`A node category with key "${input.key}" already exists`);
  }
  const id = allocateId(db, "NCAT");
  db.query(
    `INSERT INTO node_categories (id, key, label, color, sort_order, enabled, built_in)
     VALUES (?, ?, ?, ?, ?, 1, 0)`,
  ).run(id, input.key, input.label, input.color ?? "#64748b", input.sort_order ?? 0);
  logEvent(db, {
    entityType: "node_category",
    entityId: id,
    action: "created",
    payload: { key: input.key, label: input.label },
  });
  return getNodeCategory(db, id);
}

function updateCategory(
  db: Database,
  id: string,
  patch: z.infer<typeof updateCategorySchema>,
): NodeCategoryRow {
  const existing = getNodeCategory(db, id);
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  const fields: Record<string, unknown> = {
    label: patch.label,
    color: patch.color === undefined ? undefined : patch.color || existing.color,
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
      `UPDATE node_categories SET ${sets.join(", ")}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
    ).run(...values);
  }
  const updated = getNodeCategory(db, id);
  logEvent(db, {
    entityType: "node_category",
    entityId: id,
    action: "updated",
    payload: { to: patch },
  });
  return updated;
}

function deleteCategory(db: Database, id: string): void {
  const existing = getNodeCategory(db, id);
  if (existing.built_in) {
    throw badRequest("Built-in node categories cannot be deleted. Disable them instead.");
  }
  const typeCount = db
    .query("SELECT 1 FROM node_types WHERE category_id = ? LIMIT 1")
    .get(id);
  if (typeCount) {
    throw conflict(`Node category "${existing.label}" still has node types. Move them to another category first.`);
  }
  db.query("DELETE FROM node_categories WHERE id = ?").run(id);
  logEvent(db, {
    entityType: "node_category",
    entityId: id,
    action: "updated",
    payload: { deleted: true },
  });
}

function createType(db: Database, input: z.infer<typeof createTypeSchema>): NodeTypeRow {
  if (getNodeTypeByKey(db, input.key)) {
    throw conflict(`A node type with key "${input.key}" already exists`);
  }
  getNodeCategory(db, input.category_id);
  const id = allocateId(db, "NTYP");
  db.query(
    `INSERT INTO node_types (id, key, label, category_id, description, color, kinds, default_title, fields, sort_order, enabled, built_in)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
  ).run(
    id,
    input.key,
    input.label,
    input.category_id,
    input.description ?? "",
    input.color ?? "#64748b",
    JSON.stringify(input.kinds),
    input.default_title ?? input.label,
    JSON.stringify(input.fields ?? []),
    input.sort_order ?? 0,
  );
  logEvent(db, {
    entityType: "node_type",
    entityId: id,
    action: "created",
    payload: { key: input.key, label: input.label, category_id: input.category_id },
  });
  return getNodeType(db, id);
}

function updateType(db: Database, id: string, patch: z.infer<typeof updateTypeSchema>): NodeTypeRow {
  const existing = getNodeType(db, id);
  getNodeCategory(db, patch.category_id ?? existing.category_id);
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  const fields: Record<string, unknown> = {
    label: patch.label,
    category_id: patch.category_id,
    description: patch.description === undefined ? undefined : patch.description ?? "",
    color: patch.color === undefined ? undefined : patch.color ?? "#64748b",
    kinds: patch.kinds === undefined ? undefined : JSON.stringify(patch.kinds),
    default_title: patch.default_title === undefined ? undefined : patch.default_title ?? "",
    fields: patch.fields === undefined ? undefined : JSON.stringify(patch.fields ?? []),
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
      `UPDATE node_types SET ${sets.join(", ")}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
    ).run(...values);
  }
  const updated = getNodeType(db, id);
  logEvent(db, {
    entityType: "node_type",
    entityId: id,
    action: "updated",
    payload: { to: patch },
  });
  return updated;
}

function deleteType(db: Database, id: string): void {
  const existing = getNodeType(db, id);
  if (existing.built_in) {
    throw badRequest("Built-in node types cannot be deleted. Disable them instead.");
  }
  if (isNodeTypeUsed(db, existing.key)) {
    throw conflict(`Node type "${existing.label}" is used by saved model nodes and cannot be deleted.`);
  }
  db.query("DELETE FROM node_types WHERE id = ?").run(id);
  logEvent(db, {
    entityType: "node_type",
    entityId: id,
    action: "updated",
    payload: { deleted: true },
  });
}

// ---------------------------------------------------------------------------
// HTTP layer
// ---------------------------------------------------------------------------

export function registerPaletteRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/node-palette", async () => {
    return { data: { categories: getNodePalette(db) } };
  });

  app.post("/node-palette/categories", async (request, reply) => {
    const body = createCategorySchema.parse(request.body);
    reply.code(201);
    return { data: createCategory(db, body) };
  });

  app.patch("/node-palette/categories/:id", async (request) => {
    const { id } = idSchema.parse(request.params);
    const body = updateCategorySchema.parse(request.body);
    return { data: updateCategory(db, id, body) };
  });

  app.delete("/node-palette/categories/:id", async (request, reply) => {
    const { id } = idSchema.parse(request.params);
    deleteCategory(db, id);
    reply.code(204);
    return null;
  });

  app.post("/node-palette/types", async (request, reply) => {
    const body = createTypeSchema.parse(request.body);
    reply.code(201);
    return { data: createType(db, body) };
  });

  app.patch("/node-palette/types/:id", async (request) => {
    const { id } = idSchema.parse(request.params);
    const body = updateTypeSchema.parse(request.body);
    return { data: updateType(db, id, body) };
  });

  app.delete("/node-palette/types/:id", async (request, reply) => {
    const { id } = idSchema.parse(request.params);
    deleteType(db, id);
    reply.code(204);
    return null;
  });
}