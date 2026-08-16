import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../../types";
import { allocateId } from "../../utils/ids";
import { logEvent } from "../../utils/events";
import { assertProjectExists } from "../../utils/exists";
import { notFound } from "../../utils/errors";
import { loadGraph, modelerEdgeInputSchema, modelerNodeInputSchema } from "../modeler";
import {
  generateArchitectureFromComponents,
  generateDiagram,
  generateErd,
  resolveCrossProjectCalls,
  type DiagramEdge,
  type DiagramNode,
  type DiagramType,
  type DiagramWarning,
  type ErdEntity,
  type ErdRelation,
} from "./generator";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const diagramTypeSchema = z.enum(["workflow", "sequence", "erd", "architecture"]);

const generateSchema = z.object({
  project_id: z.string().regex(/^PRJ-\d{4,}$/),
  diagram_type: diagramTypeSchema,
  graph_id: z.string().regex(/^GRPH-\d{4,}$/).optional(),
  name: z.string().min(1).max(300).optional(),
});

const previewSchema = z.object({
  kind: z.enum(["workflow", "data", "architecture", "sequence"]),
  nodes: z.array(modelerNodeInputSchema).max(500),
  edges: z.array(modelerEdgeInputSchema).max(1000),
});

const diagramIdSchema = z.object({ id: z.string().regex(/^DIAG-\d{4,}$/) });

const listQuerySchema = z.object({ project: z.string().regex(/^PRJ-\d{4,}$/).optional() });

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

interface GeneratedDiagramRow {
  id: string;
  project_id: string;
  graph_id: string | null;
  diagram_type: string;
  name: string;
  mermaid: string;
  source_artifacts: string | null;
  warnings: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Normalization (DB rows / preview drafts -> generator input)
// ---------------------------------------------------------------------------

interface GraphPayload {
  graph: { id: string; kind: string; name: string };
  nodes: {
    id: string;
    key: string;
    node_type: string;
    title: string;
    description: string | null;
    position: { x: number; y: number };
    metadata: Record<string, unknown> | null;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label: string | null;
    condition: string | null;
    type: string;
  }[];
}

function nodesToDiagram(nodes: GraphPayload["nodes"]): DiagramNode[] {
  return nodes.map((n) => ({
    id: n.id,
    key: n.key,
    type: n.node_type,
    title: n.title,
    description: n.description,
    position: n.position,
    metadata: n.metadata,
  }));
}

function edgesToDiagram(edges: GraphPayload["edges"]): DiagramEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    condition: e.condition,
    type: e.type,
  }));
}

// ---------------------------------------------------------------------------
// ERD data sources
// ---------------------------------------------------------------------------

interface EntityFieldRow {
  id: string;
  entity_id: string;
  name: string;
  data_type: string;
  is_primary_key: number;
  is_unique: number;
}

interface EntityRow {
  id: string;
  name: string;
}

interface EntityRelationRow {
  id: string;
  from_entity_id: string;
  to_entity_id: string;
  relation_type: string;
  description: string | null;
}

export function erdFromTables(db: Database, projectId: string): { entities: ErdEntity[]; relations: ErdRelation[] } {
  const entities = db
    .query("SELECT id, name FROM entities WHERE project_id = ? ORDER BY id")
    .all(projectId) as EntityRow[];
  const fields = db
    .query(
      `SELECT f.id, f.entity_id, f.name, f.data_type, f.is_primary_key, f.is_unique
       FROM entity_fields f
       JOIN entities e ON e.id = f.entity_id
       WHERE e.project_id = ?
       ORDER BY f.entity_id, f.id`,
    )
    .all(projectId) as EntityFieldRow[];
  const relations = db
    .query("SELECT * FROM entity_relations WHERE project_id = ? ORDER BY id")
    .all(projectId) as EntityRelationRow[];

  const fieldsByEntity = new Map<string, EntityFieldRow[]>();
  for (const field of fields) {
    fieldsByEntity.set(field.entity_id, [...(fieldsByEntity.get(field.entity_id) ?? []), field]);
  }

  return {
    entities: entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      fields: (fieldsByEntity.get(entity.id) ?? []).map((f) => ({
        name: f.name,
        data_type: f.data_type,
        is_primary_key: f.is_primary_key === 1,
        is_unique: f.is_unique === 1,
      })),
    })),
    relations: relations.map((relation) => ({
      id: relation.id,
      from: relation.from_entity_id,
      to: relation.to_entity_id,
      relation_type: relation.relation_type as ErdRelation["relation_type"],
      description: relation.description,
    })),
  };
}

function erdFromGraph(nodes: GraphPayload["nodes"], edges: GraphPayload["edges"]): {
  entities: ErdEntity[];
  relations: ErdRelation[];
} {
  const entities: ErdEntity[] = nodes.map((node) => {
    const rawFields = node.metadata?.fields;
    const fields: ErdEntity["fields"] = Array.isArray(rawFields)
      ? rawFields.map((f) => {
          if (typeof f === "string") return { name: f, data_type: "string" };
          const record = f as Record<string, unknown>;
          return {
            name: String(record.name ?? "field"),
            data_type: String(record.data_type ?? "string"),
            is_primary_key: record.is_primary_key === true,
            is_unique: record.is_unique === true,
          };
        })
      : [];
    return { id: node.id, name: node.title, fields };
  });

  const relations: ErdRelation[] = edges.map((edge) => {
    const candidate = edge.condition ?? edge.label;
    const relationType =
      candidate === "1:1" || candidate === "1:N" || candidate === "N:M" ? candidate : "1:N";
    return {
      id: edge.id,
      from: edge.source,
      to: edge.target,
      relation_type: relationType,
      description: edge.label ?? (edge.condition ? null : null),
    };
  });

  return { entities, relations };
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function rowToApi(row: GeneratedDiagramRow) {
  return {
    id: row.id,
    project_id: row.project_id,
    graph_id: row.graph_id,
    diagram_type: row.diagram_type,
    name: row.name,
    mermaid: row.mermaid,
    source_artifacts: row.source_artifacts ? (JSON.parse(row.source_artifacts) as string[]) : [],
    warnings: row.warnings ? (JSON.parse(row.warnings) as DiagramWarning[]) : [],
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function listDiagrams(db: Database, projectId?: string): GeneratedDiagramRow[] {
  return db
    .query("SELECT * FROM generated_diagrams WHERE (? IS NULL OR project_id = ?) ORDER BY created_at DESC")
    .all(projectId ?? null, projectId ?? null) as GeneratedDiagramRow[];
}

function getDiagramRow(db: Database, id: string): GeneratedDiagramRow {
  const row = db.query("SELECT * FROM generated_diagrams WHERE id = ?").get(id) as
    | GeneratedDiagramRow
    | undefined;
  if (!row) throw notFound(`Generated diagram ${id} not found`);
  return row;
}

function storeDiagram(
  db: Database,
  input: {
    projectId: string;
    diagramType: DiagramType;
    name: string;
    mermaid: string;
    sourceArtifacts: string[];
    warnings: DiagramWarning[];
    graphId?: string;
  },
): GeneratedDiagramRow {
  const id = allocateId(db, "DIAG", input.projectId);
  db.query(
    `INSERT INTO generated_diagrams
       (id, project_id, graph_id, diagram_type, name, mermaid, source_artifacts, warnings, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'generated')`,
  ).run(
    id,
    input.projectId,
    input.graphId ?? null,
    input.diagramType,
    input.name,
    input.mermaid,
    JSON.stringify(input.sourceArtifacts),
    JSON.stringify(input.warnings),
  );
  logEvent(db, {
    projectId: input.projectId,
    entityType: "generated_diagram",
    entityId: id,
    action: "generated",
    payload: { diagramType: input.diagramType, graphId: input.graphId ?? null },
  });
  return getDiagramRow(db, id);
}

// ---------------------------------------------------------------------------
// Generation orchestration
// ---------------------------------------------------------------------------

function defaultName(diagramType: DiagramType, graphName?: string): string {
  const base: Record<DiagramType, string> = {
    workflow: "Workflow diagram",
    sequence: "Sequence diagram",
    erd: "ERD diagram",
    architecture: "Architecture diagram",
  };
  return graphName ? `${base[diagramType]} — ${graphName}` : base[diagramType];
}

interface GenerateOutcome {
  diagramType: DiagramType;
  mermaid: string;
  warnings: DiagramWarning[];
  sourceArtifacts: string[];
}

function generateForProject(
  db: Database,
  projectId: string,
  diagramType: DiagramType,
  graphId?: string,
): GenerateOutcome {
  if (graphId) {
    const payload = loadGraph(db, graphId) as unknown as GraphPayload;
    const nodes = nodesToDiagram(payload.nodes);
    const edges = edgesToDiagram(payload.edges);
    const graphKind = payload.graph.kind as "sequence" | "workflow";
    const sourceArtifacts = [graphId, ...payload.nodes.map((n) => n.id)];

    switch (diagramType) {
      case "workflow": {
        const crossProject = resolveCrossProjectCalls(db, payload.nodes);
        return {
          diagramType,
          ...generateDiagram("workflow", nodes, edges, undefined, crossProject),
          sourceArtifacts,
        };
      }
      case "sequence":
        return {
          diagramType,
          ...generateDiagram("sequence", nodes, edges, graphKind === "workflow" ? "workflow" : "sequence"),
          sourceArtifacts,
        };
      case "architecture":
        return { diagramType, ...generateDiagram("architecture", nodes, edges), sourceArtifacts };
      case "erd": {
        const { entities, relations } = erdFromGraph(payload.nodes, payload.edges);
        const result = generateErd(entities, relations);
        return { diagramType, ...result, sourceArtifacts };
      }
    }
  }

  switch (diagramType) {
    case "erd": {
      const { entities, relations } = erdFromTables(db, projectId);
      const result = generateErd(entities, relations);
      return { diagramType, ...result, sourceArtifacts: entities.map((e) => e.id) };
    }
    case "architecture": {
      const components = db
        .query("SELECT id, name, layer, technologies FROM components WHERE project_id = ? ORDER BY id")
        .all(projectId) as {
        id: string;
        name: string;
        layer: string | null;
        technologies: string | null;
      }[];
      const result = generateArchitectureFromComponents(
        components.map((c) => ({
          id: c.id,
          name: c.name,
          layer: c.layer,
          technologies: c.technologies ? (JSON.parse(c.technologies) as string[]) : null,
        })),
      );
      return { diagramType, ...result, sourceArtifacts: components.map((c) => c.id) };
    }
    case "workflow":
      return {
        diagramType,
        ...generateDiagram("workflow", [], []),
        sourceArtifacts: [],
      };
    case "sequence":
      return {
        diagramType,
        ...generateDiagram("sequence", [], [], "sequence"),
        sourceArtifacts: [],
      };
  }
}

// ---------------------------------------------------------------------------
// HTTP layer
// ---------------------------------------------------------------------------

export function registerDiagramRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/diagrams", async (request) => {
    const query = listQuerySchema.parse(request.query);
    return { data: listDiagrams(db, query.project).map(rowToApi) };
  });

  app.get("/diagrams/:id", async (request) => {
    const { id } = diagramIdSchema.parse(request.params);
    return { data: rowToApi(getDiagramRow(db, id)) };
  });

  app.post("/diagrams/generate", async (request, reply) => {
    const body = generateSchema.parse(request.body);
    assertProjectExists(db, body.project_id);
    const graphName = body.graph_id
      ? (db.query("SELECT name FROM model_graphs WHERE id = ?").get(body.graph_id) as
          | { name: string }
          | undefined)?.name
      : undefined;
    const outcome = generateForProject(db, body.project_id, body.diagram_type, body.graph_id);
    const row = storeDiagram(db, {
      projectId: body.project_id,
      diagramType: outcome.diagramType,
      name: body.name ?? defaultName(outcome.diagramType, graphName),
      mermaid: outcome.mermaid,
      sourceArtifacts: outcome.sourceArtifacts,
      warnings: outcome.warnings,
      graphId: body.graph_id,
    });
    reply.code(201);
    return { data: rowToApi(row) };
  });

  app.delete("/diagrams/:id", async (request, reply) => {
    const { id } = diagramIdSchema.parse(request.params);
    const row = getDiagramRow(db, id);
    db.query("DELETE FROM generated_diagrams WHERE id = ?").run(id);
    logEvent(db, {
      projectId: row.project_id,
      entityType: "generated_diagram",
      entityId: id,
      action: "updated",
      payload: { deleted: true },
    });
    reply.code(204);
    return null;
  });

  /** Live preview without storage — used by the modeler canvas. */
  app.post("/diagrams/preview", async (request) => {
    const body = previewSchema.parse(request.body);
    const kind = body.kind;
    const nodes: DiagramNode[] = body.nodes.map((n) => ({
      id: n.key,
      key: n.key,
      type: n.type,
      title: n.title,
      description: n.description,
      position: n.position,
      metadata: n.metadata ?? null,
    }));
    const edges: DiagramEdge[] = body.edges.map((e) => ({
      id: e.key,
      source: e.source,
      target: e.target,
      label: e.label,
      condition: e.condition,
      type: e.type,
    }));

    let diagramType: DiagramType;
    let outcome: GenerateOutcome;
    switch (kind) {
      case "workflow":
        diagramType = "workflow";
        outcome = {
          diagramType,
          ...generateDiagram("workflow", nodes, edges, undefined, resolveCrossProjectCalls(db, nodes)),
          sourceArtifacts: [],
        };
        break;
      case "sequence":
        diagramType = "sequence";
        outcome = { diagramType, ...generateDiagram("sequence", nodes, edges, "sequence"), sourceArtifacts: [] };
        break;
      case "architecture":
        diagramType = "architecture";
        outcome = { diagramType, ...generateDiagram("architecture", nodes, edges), sourceArtifacts: [] };
        break;
      case "data": {
        diagramType = "erd";
        const { entities, relations } = erdFromGraph(
          body.nodes.map((n) => ({
            id: n.key,
            key: n.key,
            node_type: n.type,
            title: n.title,
            description: n.description ?? null,
            position: n.position,
            metadata: n.metadata ?? null,
          })),
          body.edges.map((e) => ({
            id: e.key,
            source: e.source,
            target: e.target,
            label: e.label ?? null,
            condition: e.condition ?? null,
            type: e.type,
          })),
        );
        outcome = { diagramType, ...generateErd(entities, relations), sourceArtifacts: [] };
        break;
      }
    }

    return { data: { diagram_type: diagramType, mermaid: outcome.mermaid, warnings: outcome.warnings } };
  });
}
