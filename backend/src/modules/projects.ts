import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database, SQLQueryBindings } from "bun:sqlite";
import type { Deps } from "../types";
import { allocateId } from "../utils/ids";
import { logEvent } from "../utils/events";
import { badRequest, notFound } from "../utils/errors";
import { requireUser } from "./auth";
import { assertProjectAllowance } from "./billing";

const projectTypeSchema = z.enum(["web", "mobile", "api", "ai"]);
const projectStatusSchema = z.enum(["draft", "active", "completed", "archived"]);

// Prompt 13: a project may declare multiple types, each with an optional
// chosen stack and selected libraries of that stack.
const projectTypeDraftSchema = z.object({
  type_id: z.string().min(1),
  stack_id: z.string().min(1).nullable().optional(),
  library_ids: z.array(z.string().min(1)).optional(),
});

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  type: projectTypeSchema,
  description: z.string().max(2000).optional(),
  repository_url: z.string().url().optional(),
  created_by: z.string().min(1).max(200),
  types: z.array(projectTypeDraftSchema).min(1).optional(),
});

const updateProjectSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    type: projectTypeSchema.optional(),
    description: z.string().max(2000).nullable().optional(),
    repository_url: z.string().url().nullable().optional(),
    status: projectStatusSchema.optional(),
    types: z.array(projectTypeDraftSchema).min(1).optional(),
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

interface ProjectTypeRow {
  id: string;
  key: string;
  label: string;
  color: string | null;
  icon: string | null;
  enabled: number;
}

interface StackRow {
  id: string;
  type_id: string;
  name: string;
  language: string | null;
  enabled: number;
}

interface LibraryRow {
  id: string;
  stack_id: string;
  name: string;
  purpose: string | null;
  category: string | null;
  enabled: number;
}

/** A resolved per-type selection stored on a project. */
interface SelectionItem {
  type_id: string;
  stack_id: string | null;
  library_ids: string[];
}

/** Enriched type selection attached to project API payloads. */
export interface ProjectTypeSelection {
  type_id: string;
  key: string;
  label: string;
  color: string | null;
  icon: string | null;
  stack_id: string | null;
  stack_name: string | null;
  stack_language: string | null;
  libraries: { id: string; name: string; purpose: string | null; category: string | null }[];
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

function listProjects(db: Database, userId?: string): ProjectRow[] {
  if (!userId) return db.query("SELECT * FROM projects ORDER BY created_at DESC").all() as ProjectRow[];
  return db
    .query(
      `SELECT p.* FROM projects p
       JOIN project_members pm ON pm.project_id = p.id
       WHERE pm.user_id = ?
       ORDER BY p.created_at DESC`,
    )
    .all(userId) as ProjectRow[];
}

const ROLE_RANK: Record<"viewer" | "editor" | "owner", number> = { viewer: 1, editor: 2, owner: 3 };

export function assertProjectAccess(
  db: Database,
  projectId: string,
  userId: string,
  minimumRole: "viewer" | "editor" | "owner" = "viewer",
): void {
  const member = db
    .query("SELECT role FROM project_members WHERE project_id = ? AND user_id = ?")
    .get(projectId, userId) as { role: "viewer" | "editor" | "owner" } | undefined;
  if (!member || ROLE_RANK[member.role] < ROLE_RANK[minimumRole]) {
    throw notFound(`Project ${projectId} not found`);
  }
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
// Platform selection persistence (Prompt 13)
// ---------------------------------------------------------------------------

function getTypeRow(db: Database, id: string): ProjectTypeRow | undefined {
  return db.query("SELECT id, key, label, color, icon, enabled FROM project_types WHERE id = ?").get(id) as
    | ProjectTypeRow
    | undefined;
}

function getTypeByKey(db: Database, key: string): ProjectTypeRow | undefined {
  return db.query("SELECT id, key, label, color, icon, enabled FROM project_types WHERE key = ?").get(key) as
    | ProjectTypeRow
    | undefined;
}

function getStackById(db: Database, id: string): StackRow | undefined {
  return db.query("SELECT id, type_id, name, language, enabled FROM stacks WHERE id = ?").get(id) as
    | StackRow
    | undefined;
}

function getLibraryById(db: Database, id: string): LibraryRow | undefined {
  return db.query("SELECT id, stack_id, name, purpose, category, enabled FROM libraries WHERE id = ?").get(id) as
    | LibraryRow
    | undefined;
}

/**
 * Resolves the raw creation input into validated selection items.
 * When `types` is omitted the legacy `type` key is mapped to its (seeded)
 * project type row so existing single-type callers keep working unchanged.
 */
function resolveProjectSelection(
  db: Database,
  legacyType: string,
  types?: z.infer<typeof createProjectSchema>["types"],
): SelectionItem[] {
  if (types) {
    return types.map((draft) => {
      const type = getTypeRow(db, draft.type_id);
      if (!type) throw badRequest(`Project type ${draft.type_id} not found`);
      if (!type.enabled) throw badRequest(`Project type "${type.label}" is disabled`);
      let stack: StackRow | null | undefined = null;
      if (draft.stack_id) {
        stack = getStackById(db, draft.stack_id);
        if (!stack) throw badRequest(`Stack ${draft.stack_id} not found`);
        if (stack.type_id !== draft.type_id) {
          throw badRequest(`Stack "${stack.name}" does not belong to project type "${type.label}"`);
        }
        if (!stack.enabled) throw badRequest(`Stack "${stack.name}" is disabled`);
      }
      const libraryIds: string[] = [];
      if (draft.library_ids && draft.library_ids.length > 0) {
        if (!stack) throw badRequest(`Libraries require a chosen stack for type "${type.label}"`);
        for (const libraryId of draft.library_ids) {
          const library = getLibraryById(db, libraryId);
          if (!library) throw badRequest(`Library ${libraryId} not found`);
          if (library.stack_id !== stack.id) {
            throw badRequest(`Library "${library.name}" does not belong to stack "${stack.name}"`);
          }
          if (!library.enabled) throw badRequest(`Library "${library.name}" is disabled`);
          libraryIds.push(libraryId);
        }
      }
      return { type_id: draft.type_id, stack_id: draft.stack_id ?? null, library_ids: libraryIds };
    });
  }

  const type = getTypeByKey(db, legacyType);
  if (!type) throw badRequest(`Unknown project type "${legacyType}"`);
  return [{ type_id: type.id, stack_id: null, library_ids: [] }];
}

/** Stores the resolved selection (assignments + per-type stack + libraries). */
function storeProjectSelection(db: Database, projectId: string, selections: SelectionItem[]): void {
  db.query("DELETE FROM project_type_assignments WHERE project_id = ?").run(projectId);
  db.query("DELETE FROM project_type_config WHERE project_id = ?").run(projectId);
  db.query("DELETE FROM project_libraries WHERE project_id = ?").run(projectId);
  const insertAssignment = db.query("INSERT INTO project_type_assignments (project_id, type_id) VALUES (?, ?)");
  const insertConfig = db.query("INSERT INTO project_type_config (project_id, type_id, stack_id) VALUES (?, ?, ?)");
  const insertLibrary = db.query("INSERT INTO project_libraries (project_id, type_id, library_id) VALUES (?, ?, ?)");
  for (const selection of selections) {
    insertAssignment.run(projectId, selection.type_id);
    insertConfig.run(projectId, selection.type_id, selection.stack_id);
    for (const libraryId of selection.library_ids) {
      insertLibrary.run(projectId, selection.type_id, libraryId);
    }
  }
}

/** Loads the enriched type selection for a project (types + stack + libraries). */
function loadProjectTypes(db: Database, projectId: string): ProjectTypeSelection[] {
  const rows = db
    .query(
      `SELECT pt.id AS type_id, pt.key, pt.label, pt.color, pt.icon,
              ptc.stack_id AS stack_id, st.name AS stack_name, st.language AS stack_language
       FROM project_type_assignments pta
       JOIN project_types pt ON pt.id = pta.type_id
       LEFT JOIN project_type_config ptc ON ptc.project_id = pta.project_id AND ptc.type_id = pta.type_id
       LEFT JOIN stacks st ON st.id = ptc.stack_id
       WHERE pta.project_id = ?
       ORDER BY pt.sort_order, pt.id`,
    )
    .all(projectId) as {
    type_id: string;
    key: string;
    label: string;
    color: string | null;
    icon: string | null;
    stack_id: string | null;
    stack_name: string | null;
    stack_language: string | null;
  }[];

  const libraryQuery = db.query(
    `SELECT lib.id, lib.name, lib.purpose, lib.category
     FROM project_libraries pl
     JOIN libraries lib ON lib.id = pl.library_id
     WHERE pl.project_id = ? AND pl.type_id = ?
     ORDER BY lib.name`,
  );
  return rows.map((row) => ({
    ...row,
    libraries: libraryQuery.all(projectId, row.type_id) as { id: string; name: string; purpose: string | null; category: string | null }[],
  }));
}

function legacyValueFor(key: string): string | null {
  return ["web", "mobile", "api", "ai"].includes(key) ? key : null;
}

// ---------------------------------------------------------------------------
// Service layer (domain logic)
// ---------------------------------------------------------------------------

function createProject(
  db: Database,
  input: z.infer<typeof createProjectSchema>,
): ProjectRow & { types: ProjectTypeSelection[] } {
  const id = allocateId(db, "PRJ");
  insertProject(db, { id, ...input });
  const selections = resolveProjectSelection(db, input.type, input.types);
  storeProjectSelection(db, id, selections);
  if (db.query("SELECT 1 FROM users WHERE id = ?").get(input.created_by)) {
    db.query(
      `INSERT OR IGNORE INTO project_members (project_id, user_id, role)
       VALUES (?, ?, 'owner')`,
    ).run(id, input.created_by);
  }
  logEvent(db, {
    projectId: id,
    entityType: "project",
    entityId: id,
    action: "created",
    toStatus: "draft",
    actor: input.created_by,
    actorType: "human",
    payload: { types: selections.length },
  });
  const row = getProjectById(db, id);
  if (!row) throw new Error("Project insert failed");
  return { ...row, types: loadProjectTypes(db, id) };
}

function getProject(
  db: Database,
  id: string,
  userId?: string,
): ProjectRow & { types: ProjectTypeSelection[] } {
  if (userId) assertProjectAccess(db, id, userId);
  const row = getProjectById(db, id);
  if (!row) throw notFound(`Project ${id} not found`);
  return { ...row, types: loadProjectTypes(db, id) };
}

function listProjectRows(db: Database, userId?: string): (ProjectRow & { types: ProjectTypeSelection[] })[] {
  return listProjects(db, userId).map((row) => ({ ...row, types: loadProjectTypes(db, row.id) }));
}

function updateProjectRow(
  db: Database,
  id: string,
  patch: z.infer<typeof updateProjectSchema>,
): ProjectRow & { types: ProjectTypeSelection[] } {
  const existing = getProjectById(db, id);
  if (!existing) throw notFound(`Project ${id} not found`);
  if (patch.status && existing.status === "archived" && patch.status !== "archived") {
    throw badRequest("Archived projects cannot be reactivated");
  }
  updateProject(db, id, patch);
  if (patch.types) {
    const selections = resolveProjectSelection(db, patch.type ?? existing.type, patch.types);
    storeProjectSelection(db, id, selections);
    // Keep the legacy `type` column pointing at the first type where possible.
    const primaryKey = legacyValueFor(typeKeyForSelection(db, selections[0]!) ?? "");
    if (primaryKey) {
      db.query("UPDATE projects SET type = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(
        primaryKey,
        id,
      );
    }
  }
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
  return { ...updated, types: loadProjectTypes(db, id) };
}

// Small helper so the patch path can read the first selected type's key.
function typeKeyForSelection(db: Database, selection: SelectionItem): string | null {
  const type = getTypeRow(db, selection.type_id);
  return type?.key ?? null;
}

// ---------------------------------------------------------------------------
// HTTP layer (thin handlers)
// ---------------------------------------------------------------------------

export function registerProjectRoutes(app: FastifyInstance, deps: Deps): void {
  const { db, config } = deps;
  const requestUserId = (request: Parameters<typeof requireUser>[1]): string | undefined =>
    config.AUTH_REQUIRED ? requireUser(db, request).id : undefined;

  app.get("/projects", async (request) => {
    return { data: listProjectRows(db, requestUserId(request)) };
  });

  app.post("/projects", async (request, reply) => {
    const body = createProjectSchema.parse(request.body);
    // Plan-limit enforcement (DEC-029) applies only to authenticated callers:
    // anonymous requests (legacy tests/seeds/scripts) keep unrestricted
    // behavior, while a signed-in Free user is capped at FREE_PROJECT_LIMIT.
    let creator = body.created_by;
    try {
      const user = requireUser(db, request);
      assertProjectAllowance(db, user);
      // A session outranks the client-supplied creator string: without this
      // stamp the UI's legacy default ("owner@internal") silently bypassed
      // both quota accounting and the Free limit itself (DEC-030 fix).
      creator = user.id;
    } catch (error) {
      // Re-throw plan limits; swallow authentication absence (anonymous OK).
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "PLAN_LIMIT_REACHED"
      ) {
        throw error;
      }
    }
    reply.code(201);
    return { data: createProject(db, { ...body, created_by: creator }) };
  });

  app.get("/projects/:id", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    return { data: getProject(db, id, requestUserId(request)) };
  });

  app.patch("/projects/:id", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const body = updateProjectSchema.parse(request.body);
    const userId = requestUserId(request);
    if (userId) assertProjectAccess(db, id, userId, "editor");
    return { data: updateProjectRow(db, id, body) };
  });
}