// ---------------------------------------------------------------------------
// Multi-project workspace links (Prompt 14).
// Explicit project-level dependencies (project_dependencies, PDEP ids) plus
// reference-targets for the modeler picker and resolved cross-project
// workflow calls. Cross-project calls themselves live on model_nodes.metadata
// (workflow_call nodes) and are resolved here against the database.
// ---------------------------------------------------------------------------

import type { Database } from "bun:sqlite";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Deps } from "../../types";
import { allocateId } from "../../utils/ids";
import { logEvent } from "../../utils/events";
import { assertProjectExists } from "../../utils/exists";
import { badRequest, conflict, notFound } from "../../utils/errors";
import { crossProjectRefOf, crossProjectRefStatus } from "../modeler";

// ---------------------------------------------------------------------------
// Row / API shapes
// ---------------------------------------------------------------------------

export type DependencyKind = "workflow_call" | "data" | "deploy" | "other";

export interface ProjectDependencyView {
  id: string;
  project_id: string;
  depends_on_project_id: string;
  depends_on_project_name: string;
  depends_on_project_status: string;
  depends_on_project_type: string;
  kind: DependencyKind;
  note: string | null;
  created_at: string;
}

export interface ProjectDependentView {
  id: string;
  project_id: string;
  depending_project_id: string;
  depending_project_name: string;
  depending_project_status: string;
  depending_project_type: string;
  kind: DependencyKind;
  note: string | null;
  created_at: string;
}

export interface ReferenceTarget {
  project_id: string;
  project_name: string;
  project_type: string;
  is_linked: boolean;
  workflows: { graph_id: string; name: string }[];
}

export interface CrossProjectCall {
  workflow_id: string;
  workflow_name: string;
  node_id: string;
  node_title: string;
  target_project_id: string;
  target_project_name: string;
  target_graph_id: string;
  target_graph_name: string;
}

interface DependencyRow {
  id: string;
  project_id: string;
  depends_on_project_id: string;
  kind: string;
  note: string | null;
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const projectIdSchema = z.object({ id: z.string().regex(/^PRJ-\d{4,}$/) });
const dependencyIdSchema = z.object({ depId: z.string().regex(/^PDEP-\d{4,}$/) });

const createDependencySchema = z.object({
  depends_on_project_id: z.string().regex(/^PRJ-\d{4,}$/),
  kind: z.enum(["workflow_call", "data", "deploy", "other"]),
  note: z.string().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// Repository layer
// ---------------------------------------------------------------------------

export function listProjectDependencies(db: Database, projectId: string): ProjectDependencyView[] {
  return db
    .query(
      `SELECT pd.id, pd.project_id, pd.depends_on_project_id, pd.kind, pd.note, pd.created_at,
              p.name  AS depends_on_project_name,
              p.type  AS depends_on_project_type,
              p.status AS depends_on_project_status
       FROM project_dependencies pd
       JOIN projects p ON p.id = pd.depends_on_project_id
       WHERE pd.project_id = ?
       ORDER BY pd.id`,
    )
    .all(projectId) as ProjectDependencyView[];
}

export function listProjectDependents(db: Database, projectId: string): ProjectDependentView[] {
  return db
    .query(
      `SELECT pd.id,
              pd.project_id AS depending_project_id,
              pd.depends_on_project_id,
              pd.kind, pd.note, pd.created_at,
              p.name  AS depending_project_name,
              p.type  AS depending_project_type,
              p.status AS depending_project_status
       FROM project_dependencies pd
       JOIN projects p ON p.id = pd.project_id
       WHERE pd.depends_on_project_id = ?
       ORDER BY pd.id`,
    )
    .all(projectId) as ProjectDependentView[];
}

function getDependencyRow(db: Database, id: string): DependencyRow {
  const row = db.query("SELECT * FROM project_dependencies WHERE id = ?").get(id) as
    | DependencyRow
    | undefined;
  if (!row) throw notFound(`Project dependency ${id} not found`);
  return row;
}

function createDependency(
  db: Database,
  projectId: string,
  input: z.infer<typeof createDependencySchema>,
): ProjectDependencyView {
  assertProjectExists(db, projectId);
  assertProjectExists(db, input.depends_on_project_id);
  if (projectId === input.depends_on_project_id) {
    throw badRequest("A project cannot depend on itself.");
  }
  const existing = db
    .query(
      "SELECT 1 FROM project_dependencies WHERE project_id = ? AND depends_on_project_id = ? AND kind = ?",
    )
    .get(projectId, input.depends_on_project_id, input.kind);
  if (existing) {
    throw conflict(
      `Project ${projectId} already depends on ${input.depends_on_project_id} with kind "${input.kind}".`,
    );
  }
  const id = allocateId(db, "PDEP", projectId);
  db.query(
    "INSERT INTO project_dependencies (id, project_id, depends_on_project_id, kind, note) VALUES (?, ?, ?, ?, ?)",
  ).run(id, projectId, input.depends_on_project_id, input.kind, input.note ?? null);
  logEvent(db, {
    projectId,
    entityType: "project_dependency",
    entityId: id,
    action: "created",
    payload: { depends_on_project_id: input.depends_on_project_id, kind: input.kind },
  });
  const view = listProjectDependencies(db, projectId).find((d) => d.id === id);
  if (!view) throw notFound(`Project dependency ${id} not found`);
  return view;
}

function deleteDependency(db: Database, projectId: string, id: string): void {
  const row = getDependencyRow(db, id);
  if (row.project_id !== projectId) {
    throw notFound(`Project dependency ${id} not found in project ${projectId}`);
  }
  db.query("DELETE FROM project_dependencies WHERE id = ?").run(id);
  logEvent(db, {
    projectId,
    entityType: "project_dependency",
    entityId: id,
    action: "updated",
    payload: { deleted: true, depends_on_project_id: row.depends_on_project_id },
  });
}

// ---------------------------------------------------------------------------
// Reference targets + resolved cross-project calls
// ---------------------------------------------------------------------------

/** Reference targets for the modeler picker: linked projects first, then all others. */
export function referenceTargets(db: Database, projectId: string): ReferenceTarget[] {
  const dependencies = listProjectDependencies(db, projectId);
  const linkedIds = [...new Set(dependencies.map((d) => d.depends_on_project_id))];
  const workflowsByProject = new Map<string, { graph_id: string; name: string }[]>();
  for (const row of db
    .query(
      "SELECT project_id, id AS graph_id, name FROM model_graphs WHERE kind = 'workflow' ORDER BY project_id, id",
    )
    .all() as { project_id: string; graph_id: string; name: string }[]) {
    workflowsByProject.set(row.project_id, [...(workflowsByProject.get(row.project_id) ?? []), row]);
  }

  const target = (id: string, name: string, type: string, isLinked: boolean): ReferenceTarget => ({
    project_id: id,
    project_name: name,
    project_type: type,
    is_linked: isLinked,
    workflows: workflowsByProject.get(id) ?? [],
  });

  const linked = linkedIds
    .map((id) => db.query("SELECT id, name, type FROM projects WHERE id = ?").get(id) as
      | { id: string; name: string; type: string }
      | undefined)
    .filter((p): p is { id: string; name: string; type: string } => Boolean(p))
    .map((p) => target(p.id, p.name, p.type, true));

  const others = (
    db.query(
      `SELECT id, name, type FROM projects WHERE id <> ?
       ORDER BY name, id`,
    ).all(projectId) as { id: string; name: string; type: string }[]
  )
    .filter((p) => !linkedIds.includes(p.id))
    .map((p) => target(p.id, p.name, p.type, false));

  return [...linked, ...others];
}

/** Resolves every workflow_call node in a project's workflow graphs. */
export function workflowCallsForProject(db: Database, projectId: string): CrossProjectCall[] {
  const graphs = db
    .query("SELECT id, name FROM model_graphs WHERE project_id = ? AND kind = 'workflow' ORDER BY id")
    .all(projectId) as { id: string; name: string }[];
  const calls: CrossProjectCall[] = [];
  for (const graph of graphs) {
    const nodes = db
      .query(
        "SELECT id, node_type, title, metadata FROM model_nodes WHERE graph_id = ? AND node_type = 'workflow_call' ORDER BY id",
      )
      .all(graph.id) as { id: string; node_type: string; title: string; metadata: string | null }[];
    for (const node of nodes) {
      const ref = crossProjectRefOf({
        metadata: node.metadata ? (JSON.parse(node.metadata) as Record<string, unknown>) : null,
      });
      if (!ref) continue;
      if (crossProjectRefStatus(db, ref) !== "ok") continue;
      const targetProject = db
        .query("SELECT name FROM projects WHERE id = ?")
        .get(ref.projectId) as { name: string } | undefined;
      const targetGraph = db
        .query("SELECT name FROM model_graphs WHERE id = ?")
        .get(ref.graphId) as { name: string } | undefined;
      if (!targetProject || !targetGraph) continue;
      calls.push({
        workflow_id: graph.id,
        workflow_name: graph.name,
        node_id: node.id,
        node_title: node.title,
        target_project_id: ref.projectId,
        target_project_name: targetProject.name,
        target_graph_id: ref.graphId,
        target_graph_name: targetGraph.name,
      });
    }
  }
  return calls;
}

// ---------------------------------------------------------------------------
// HTTP layer
// ---------------------------------------------------------------------------

export function registerLinkRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/projects/:id/dependencies", async (request) => {
    const { id } = projectIdSchema.parse(request.params);
    return { data: listProjectDependencies(db, id) };
  });

  app.get("/projects/:id/dependents", async (request) => {
    const { id } = projectIdSchema.parse(request.params);
    return { data: listProjectDependents(db, id) };
  });

  app.post("/projects/:id/dependencies", async (request, reply) => {
    const { id } = projectIdSchema.parse(request.params);
    const body = createDependencySchema.parse(request.body);
    reply.code(201);
    return { data: createDependency(db, id, body) };
  });

  app.delete("/projects/:id/dependencies/:depId", async (request, reply) => {
    const params = { ...projectIdSchema.parse(request.params), ...dependencyIdSchema.parse(request.params) };
    deleteDependency(db, params.id, params.depId);
    reply.code(204);
    return null;
  });

  app.get("/projects/:id/reference-targets", async (request) => {
    const { id } = projectIdSchema.parse(request.params);
    assertProjectExists(db, id);
    return { data: referenceTargets(db, id) };
  });

  app.get("/projects/:id/workflow-calls", async (request) => {
    const { id } = projectIdSchema.parse(request.params);
    assertProjectExists(db, id);
    return { data: workflowCallsForProject(db, id) };
  });
}