import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";
import { allocateId } from "../utils/ids";
import { logEvent } from "../utils/events";
import { assertProjectExists } from "../utils/exists";
import { badRequest, notFound } from "../utils/errors";

// ---------------------------------------------------------------------------
// Node type catalog (Prompt 07: at least these 12 types)
// ---------------------------------------------------------------------------

export type ModelKind = "workflow" | "data" | "architecture" | "sequence";

export interface NodeTypeDefinition {
  type: string;
  label: string;
  category: "flow" | "system" | "governance" | "ai";
  description: string;
  color: string;
  kinds: ModelKind[];
  defaultTitle: string;
}

export const NODE_TYPE_CATALOG: NodeTypeDefinition[] = [
  {
    type: "start",
    label: "Start",
    category: "flow",
    description: "Entry point of a process or flow.",
    color: "#059669",
    kinds: ["workflow", "architecture", "sequence"],
    defaultTitle: "Start",
  },
  {
    type: "end",
    label: "End",
    category: "flow",
    description: "Terminal state of a process or flow.",
    color: "#64748b",
    kinds: ["workflow", "architecture", "sequence"],
    defaultTitle: "End",
  },
  {
    type: "step",
    label: "Step",
    category: "flow",
    description: "A single action or activity performed by a role or system.",
    color: "#0284c7",
    kinds: ["workflow", "architecture", "sequence"],
    defaultTitle: "New step",
  },
  {
    type: "decision",
    label: "Decision",
    category: "flow",
    description: "A branch point; outgoing edges must carry conditions.",
    color: "#d97706",
    kinds: ["workflow"],
    defaultTitle: "Decision",
  },
  {
    type: "wait",
    label: "Wait",
    category: "flow",
    description: "A delay, queue, or scheduled pause before continuing.",
    color: "#7c3aed",
    kinds: ["workflow", "sequence"],
    defaultTitle: "Wait",
  },
  {
    type: "event",
    label: "Event",
    category: "system",
    description: "An external or internal event that triggers or interrupts a flow.",
    color: "#0891b2",
    kinds: ["workflow", "architecture", "sequence"],
    defaultTitle: "New event",
  },
  {
    type: "screen",
    label: "Screen",
    category: "system",
    description: "A user-facing screen or page in the product.",
    color: "#4f46e5",
    kinds: ["workflow", "architecture", "sequence"],
    defaultTitle: "New screen",
  },
  {
    type: "api_call",
    label: "API Call",
    category: "system",
    description: "A request to an API endpoint.",
    color: "#2563eb",
    kinds: ["workflow", "architecture", "sequence"],
    defaultTitle: "New API call",
  },
  {
    type: "database",
    label: "Database",
    category: "system",
    description: "A data store, table, or entity in the data model.",
    color: "#0d9488",
    kinds: ["workflow", "data", "architecture", "sequence"],
    defaultTitle: "New entity",
  },
  {
    type: "external_system",
    label: "External System",
    category: "system",
    description: "A third-party or legacy system outside the product boundary.",
    color: "#ea580c",
    kinds: ["workflow", "architecture", "sequence"],
    defaultTitle: "External system",
  },
  {
    type: "approval",
    label: "Approval",
    category: "governance",
    description: "A human approval gate; progress pauses until decided.",
    color: "#e11d48",
    kinds: ["workflow", "sequence"],
    defaultTitle: "Approval",
  },
  {
    type: "ai_agent",
    label: "AI Agent",
    category: "ai",
    description: "An AI/agent step that produces output or makes a decision.",
    color: "#c026d3",
    kinds: ["workflow", "architecture", "sequence"],
    defaultTitle: "AI agent",
  },
];

const NODE_TYPE_SET = new Set(NODE_TYPE_CATALOG.map((n) => n.type));
const EDGE_TYPE_SET = new Set(["success", "failure", "next", "retry", "escalation", "related"]);
const KIND_SET = new Set<ModelKind>(["workflow", "data", "architecture", "sequence"]);

// ---------------------------------------------------------------------------
// Graph row shapes
// ---------------------------------------------------------------------------

interface ModelGraphRow {
  id: string;
  project_id: string;
  kind: ModelKind;
  name: string;
  description: string | null;
  artifact_type: string | null;
  artifact_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ModelNodeRow {
  id: string;
  graph_id: string;
  client_key: string;
  node_type: string;
  title: string;
  description: string | null;
  inputs: string | null;
  outputs: string | null;
  preconditions: string | null;
  postconditions: string | null;
  related_artifacts: string | null;
  metadata: string | null;
  position: string;
  created_at: string;
  updated_at: string;
}

interface ModelEdgeRow {
  id: string;
  graph_id: string;
  from_node: string;
  to_node: string;
  label: string | null;
  condition: string | null;
  edge_type: string;
}

// ---------------------------------------------------------------------------
// API shapes (Zod)
// ---------------------------------------------------------------------------

const graphIdSchema = z.object({ id: z.string().regex(/^GRPH-\d{4,}$/) });

const createGraphSchema = z.object({
  project_id: z.string().regex(/^PRJ-\d{4,}$/),
  kind: z.enum(["workflow", "data", "architecture", "sequence"]),
  name: z.string().min(1).max(300),
  description: z.string().max(4000).optional(),
  artifact_type: z.string().max(100).optional(),
  artifact_id: z.string().max(100).optional(),
});

const listGraphsQuerySchema = z.object({
  project: z.string().regex(/^PRJ-\d{4,}$/).optional(),
  kind: z.enum(["workflow", "data", "architecture", "sequence"]).optional(),
});

const stringArraySchema = z.array(z.string().max(500)).max(200).optional();

export const modelerNodeInputSchema = z.object({
  key: z.string().min(1).max(100),
  type: z.string().min(1).max(100),
  title: z.string().min(1).max(300),
  description: z.string().max(4000).optional(),
  inputs: stringArraySchema,
  outputs: stringArraySchema,
  preconditions: stringArraySchema,
  postconditions: stringArraySchema,
  related_artifacts: stringArraySchema,
  metadata: z.record(z.unknown()).optional(),
  position: z.object({ x: z.number().finite(), y: z.number().finite() }),
});

export const modelerEdgeInputSchema = z.object({
  key: z.string().min(1).max(100),
  source: z.string().min(1).max(100),
  target: z.string().min(1).max(100),
  label: z.string().max(500).optional(),
  condition: z.string().max(1000).optional(),
  type: z.string().min(1).max(100).default("next"),
});

const saveGraphSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  description: z.string().max(4000).nullable().optional(),
  nodes: z.array(modelerNodeInputSchema).max(500),
  edges: z.array(modelerEdgeInputSchema).max(1000),
});

const validateGraphSchema = z.object({
  kind: z.enum(["workflow", "data", "architecture", "sequence"]),
  nodes: z.array(modelerNodeInputSchema).max(500),
  edges: z.array(modelerEdgeInputSchema).max(1000),
});

export type NodeInput = z.infer<typeof modelerNodeInputSchema>;
export type EdgeInput = z.infer<typeof modelerEdgeInputSchema>;

// ---------------------------------------------------------------------------
// Validation warnings (TR rules + modeler rules)
// ---------------------------------------------------------------------------

export type WarningLevel = "error" | "warning" | "info";

export interface ValidationWarning {
  code: string;
  level: WarningLevel;
  message: string;
  nodeKey?: string;
  edgeKey?: string;
}

function validateGraph(
  kind: ModelKind,
  nodes: NodeInput[],
  edges: EdgeInput[],
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const nodeKeys = new Set(nodes.map((n) => n.key));
  const nodeTypeById = new Map(nodes.map((n) => [n.key, n.type]));

  if (nodes.length === 0) {
    warnings.push({
      code: "EMPTY_GRAPH",
      level: "info",
      message: "The graph is empty — add nodes to start modeling.",
    });
    return warnings;
  }

  // Structural integrity: every edge must reference existing nodes.
  for (const edge of edges) {
    if (!nodeKeys.has(edge.source)) {
      warnings.push({
        code: "EDGE_MISSING_SOURCE",
        level: "error",
        message: `Edge "${edge.key}" points to a missing source node.`,
        edgeKey: edge.key,
      });
    }
    if (!nodeKeys.has(edge.target)) {
      warnings.push({
        code: "EDGE_MISSING_TARGET",
        level: "error",
        message: `Edge "${edge.key}" points to a missing target node.`,
        edgeKey: edge.key,
      });
    }
    if (edge.source === edge.target) {
      warnings.push({
        code: "SELF_LOOP",
        level: "warning",
        message: `Edge "${edge.key}" connects a node to itself.`,
        edgeKey: edge.key,
      });
    }
  }

  const outgoing = new Map<string, { condition?: string; key: string }[]>();
  const incoming = new Map<string, string[]>();
  for (const edge of edges) {
    if (!nodeKeys.has(edge.source) || !nodeKeys.has(edge.target)) continue;
    const out = outgoing.get(edge.source) ?? [];
    out.push({ condition: edge.condition, key: edge.key });
    outgoing.set(edge.source, out);
    const inn = incoming.get(edge.target) ?? [];
    inn.push(edge.source);
    incoming.set(edge.target, inn);
  }

  // Kind-aware rules.
  if (kind === "workflow") {
    const starts = nodes.filter((n) => n.type === "start");
    const ends = nodes.filter((n) => n.type === "end");

    if (starts.length === 0) {
      warnings.push({
        code: "NO_START",
        level: "error",
        message: "Workflow has no Start node.",
      });
    } else if (starts.length > 1) {
      warnings.push({
        code: "MULTIPLE_START",
        level: "warning",
        message: "Workflow has multiple Start nodes — expected exactly one.",
      });
    }

    if (ends.length === 0) {
      warnings.push({
        code: "NO_END",
        level: "warning",
        message: "Workflow has no End node.",
      });
    } else if (ends.length > 1) {
      warnings.push({
        code: "MULTIPLE_END",
        level: "warning",
        message: "Workflow has multiple End nodes — expected exactly one.",
      });
    }

    for (const node of nodes) {
      const out = outgoing.get(node.key) ?? [];
      if (node.type === "end" && out.length > 0) {
        warnings.push({
          code: "END_HAS_OUTGOING",
          level: "warning",
          message: `End node "${node.title}" should not have outgoing edges.`,
          nodeKey: node.key,
        });
      }
      if (node.type === "start") {
        const inn = incoming.get(node.key) ?? [];
        if (inn.length > 0) {
          warnings.push({
            code: "START_HAS_INCOMING",
            level: "warning",
            message: `Start node "${node.title}" should not have incoming edges.`,
            nodeKey: node.key,
          });
        }
        if (out.length === 0) {
          warnings.push({
            code: "START_DEAD_END",
            level: "error",
            message: `Start node "${node.title}" has no outgoing edges.`,
            nodeKey: node.key,
          });
        }
      }
      if (node.type === "decision") {
        const missing = out.filter((e) => !e.condition?.trim());
        if (out.length > 0 && missing.length > 0) {
          warnings.push({
            code: "DECISION_EDGE_NO_CONDITION",
            level: "warning",
            message: `Decision "${node.title}" has ${missing.length} outgoing edge(s) without a condition.`,
            nodeKey: node.key,
          });
        }
      }
      if (node.type !== "end" && node.type !== "start" && out.length === 0) {
        warnings.push({
          code: "DEAD_END_NODE",
          level: "info",
          message: `"${node.title}" has no outgoing edges (dead end).`,
          nodeKey: node.key,
        });
      }
    }
  }

  // Kind-agnostic rules.
  for (const node of nodes) {
    if (!NODE_TYPE_SET.has(node.type)) {
      warnings.push({
        code: "UNKNOWN_NODE_TYPE",
        level: "error",
        message: `Node "${node.title}" uses unknown type "${node.type}".`,
        nodeKey: node.key,
      });
    }
    const out = outgoing.get(node.key) ?? [];
    const inn = incoming.get(node.key) ?? [];
    if (out.length === 0 && inn.length === 0) {
      warnings.push({
        code: "ISOLATED_NODE",
        level: "warning",
        message: `"${node.title}" is isolated — connect it or remove it.`,
        nodeKey: node.key,
      });
    }
  }

  for (const edge of edges) {
    if (!EDGE_TYPE_SET.has(edge.type)) {
      warnings.push({
        code: "UNKNOWN_EDGE_TYPE",
        level: "error",
        message: `Edge "${edge.key}" uses unknown type "${edge.type}".`,
        edgeKey: edge.key,
      });
    }
  }

  // Duplicate parallel edges between the same pair.
  const seen = new Map<string, number>();
  for (const edge of edges) {
    const pair = `${edge.source}->${edge.target}`;
    const count = (seen.get(pair) ?? 0) + 1;
    seen.set(pair, count);
    if (count === 2) {
      warnings.push({
        code: "PARALLEL_EDGES",
        level: "warning",
        message: `Multiple edges connect the same nodes ("${edge.source}" → "${edge.target}") — label each branch to keep the diagram readable.`,
        edgeKey: edge.key,
      });
    }
  }

  const order: Record<WarningLevel, number> = { error: 0, warning: 1, info: 2 };
  return warnings.sort((a, b) => order[a.level] - order[b.level]);
}

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

function getGraphRow(db: Database, id: string): ModelGraphRow {
  const row = db.query("SELECT * FROM model_graphs WHERE id = ?").get(id) as
    | ModelGraphRow
    | undefined;
  if (!row) throw notFound(`Model graph ${id} not found`);
  return row;
}

function getNodeRows(db: Database, graphId: string): ModelNodeRow[] {
  return db
    .query("SELECT * FROM model_nodes WHERE graph_id = ? ORDER BY id")
    .all(graphId) as ModelNodeRow[];
}

function getEdgeRows(db: Database, graphId: string): ModelEdgeRow[] {
  return db
    .query("SELECT * FROM model_edges WHERE graph_id = ? ORDER BY id")
    .all(graphId) as ModelEdgeRow[];
}

function nodeToApi(row: ModelNodeRow) {
  return {
    id: row.id,
    key: row.client_key,
    graph_id: row.graph_id,
    node_type: row.node_type,
    title: row.title,
    description: row.description,
    inputs: parseJsonArray<string>(row.inputs),
    outputs: parseJsonArray<string>(row.outputs),
    preconditions: parseJsonArray<string>(row.preconditions),
    postconditions: parseJsonArray<string>(row.postconditions),
    related_artifacts: parseJsonArray<string>(row.related_artifacts),
    metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : null,
    position: JSON.parse(row.position) as { x: number; y: number },
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function edgeToApi(row: ModelEdgeRow) {
  return {
    id: row.id,
    graph_id: row.graph_id,
    source: row.from_node,
    target: row.to_node,
    label: row.label,
    condition: row.condition,
    type: row.edge_type,
  };
}

function assertNodeInputsValid(input: NodeInput[]): void {
  for (const node of input) {
    if (!NODE_TYPE_SET.has(node.type)) {
      throw badRequest(`Unknown node type "${node.type}"`, {
        validTypes: [...NODE_TYPE_SET],
      });
    }
  }
}

function assertEdgeInputsValid(input: EdgeInput[]): void {
  for (const edge of input) {
    if (!EDGE_TYPE_SET.has(edge.type)) {
      throw badRequest(`Unknown edge type "${edge.type}"`, {
        validTypes: [...EDGE_TYPE_SET],
      });
    }
  }
}

function createGraph(db: Database, input: z.infer<typeof createGraphSchema>): ModelGraphRow {
  assertProjectExists(db, input.project_id);
  const id = allocateId(db, "GRPH", input.project_id);
  db.query(
    `INSERT INTO model_graphs (id, project_id, kind, name, description, artifact_type, artifact_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`,
  ).run(
    id,
    input.project_id,
    input.kind,
    input.name,
    input.description ?? null,
    input.artifact_type ?? null,
    input.artifact_id ?? null,
  );
  logEvent(db, {
    projectId: input.project_id,
    entityType: "model_graph",
    entityId: id,
    action: "created",
    toStatus: "draft",
    payload: { kind: input.kind },
  });
  return getGraphRow(db, id);
}

function listGraphs(db: Database, projectId?: string, kind?: ModelKind): ModelGraphRow[] {
  return db
    .query(
      `SELECT * FROM model_graphs
       WHERE (? IS NULL OR project_id = ?) AND (? IS NULL OR kind = ?)
       ORDER BY updated_at DESC`,
    )
    .all(projectId ?? null, projectId ?? null, kind ?? null, kind ?? null) as ModelGraphRow[];
}

export function loadGraph(db: Database, graphId: string) {
  const graph = getGraphRow(db, graphId);
  const nodes = getNodeRows(db, graphId).map(nodeToApi);
  const edges = getEdgeRows(db, graphId).map(edgeToApi);
  // Validation works on client keys; map stored canonical node IDs back.
  const keyById = new Map(nodes.map((n) => [n.id, n.key]));
  const warnings = validateGraph(
    graph.kind,
    nodes.map((n) => ({
      key: n.key,
      type: n.node_type,
      title: n.title,
      position: n.position,
    })),
    edges.map((e) => ({
      key: e.id,
      source: keyById.get(e.source) ?? e.source,
      target: keyById.get(e.target) ?? e.target,
      type: e.type,
      label: e.label ?? undefined,
      condition: e.condition ?? undefined,
    })),
  );
  return { graph, nodes, edges, warnings };
}

/**
 * Persists the full graph (replace semantics: nodes and edges are swapped in
 * one transaction). Client temp keys are mapped to canonical IDs
 * (GRPH-0001-N01 / GRPH-0001-E01) so the frontend can reconcile after save.
 */
function saveGraph(
  db: Database,
  graphId: string,
  input: z.infer<typeof saveGraphSchema>,
) {
  assertNodeInputsValid(input.nodes);
  assertEdgeInputsValid(input.edges);

  const graph = getGraphRow(db, graphId);
  const nodeKeys = new Set(input.nodes.map((n) => n.key));
  for (const edge of input.edges) {
    if (!nodeKeys.has(edge.source) || !nodeKeys.has(edge.target)) {
      throw badRequest(
        `Edge "${edge.key}" references a node that is not part of this save payload`,
      );
    }
  }

  db.transaction(() => {
    if (input.name !== undefined || input.description !== undefined) {
      db.query(
        `UPDATE model_graphs
         SET name = COALESCE(?, name),
             description = ?,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?`,
      ).run(
        input.name ?? null,
        input.description === undefined ? null : input.description,
        graphId,
      );
    }

    // Replace semantics: clear previous nodes (edges cascade) and re-insert.
    db.query("DELETE FROM model_nodes WHERE graph_id = ?").run(graphId);

    const nodeIdByKey = new Map<string, string>();
    const insertNode = db.query(
      `INSERT INTO model_nodes
         (id, graph_id, client_key, node_type, title, description, inputs, outputs,
          preconditions, postconditions, related_artifacts, metadata, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    let nodeSeq = 0;
    for (const node of input.nodes) {
      nodeSeq += 1;
      const nodeId = `${graphId}-N${String(nodeSeq).padStart(2, "0")}`;
      nodeIdByKey.set(node.key, nodeId);
      insertNode.run(
        nodeId,
        graphId,
        node.key,
        node.type,
        node.title,
        node.description ?? null,
        JSON.stringify(node.inputs ?? []),
        JSON.stringify(node.outputs ?? []),
        JSON.stringify(node.preconditions ?? []),
        JSON.stringify(node.postconditions ?? []),
        JSON.stringify(node.related_artifacts ?? []),
        node.metadata ? JSON.stringify(node.metadata) : null,
        JSON.stringify(node.position),
      );
    }

    const insertEdge = db.query(
      `INSERT INTO model_edges (id, graph_id, from_node, to_node, label, condition, edge_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    let edgeSeq = 0;
    for (const edge of input.edges) {
      edgeSeq += 1;
      // Presence of source/target keys in the payload is validated above.
      const sourceId = nodeIdByKey.get(edge.source)!;
      const targetId = nodeIdByKey.get(edge.target)!;
      insertEdge.run(
        `${graphId}-E${String(edgeSeq).padStart(2, "0")}`,
        graphId,
        sourceId,
        targetId,
        edge.label ?? null,
        edge.condition ?? null,
        edge.type,
      );
    }
  })();

  logEvent(db, {
    projectId: graph.project_id,
    entityType: "model_graph",
    entityId: graphId,
    action: "updated",
    payload: { nodes: input.nodes.length, edges: input.edges.length },
  });

  return loadGraph(db, graphId);
}

function deleteGraph(db: Database, graphId: string): void {
  const graph = getGraphRow(db, graphId);
  db.query("DELETE FROM model_graphs WHERE id = ?").run(graphId);
  logEvent(db, {
    projectId: graph.project_id,
    entityType: "model_graph",
    entityId: graphId,
    action: "updated",
    payload: { deleted: true },
  });
}

// ---------------------------------------------------------------------------
// HTTP layer
// ---------------------------------------------------------------------------

export function registerModelerRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/modeler/node-types", async () => {
    return { data: NODE_TYPE_CATALOG };
  });

  app.get("/modeler/graphs", async (request) => {
    const query = listGraphsQuerySchema.parse(request.query);
    return { data: listGraphs(db, query.project, query.kind) };
  });

  app.post("/modeler/graphs", async (request, reply) => {
    const body = createGraphSchema.parse(request.body);
    reply.code(201);
    return { data: createGraph(db, body) };
  });

  app.get("/modeler/graphs/:id", async (request) => {
    const { id } = graphIdSchema.parse(request.params);
    return { data: loadGraph(db, id) };
  });

  app.put("/modeler/graphs/:id", async (request) => {
    const { id } = graphIdSchema.parse(request.params);
    const body = saveGraphSchema.parse(request.body);
    return { data: saveGraph(db, id, body) };
  });

  app.delete("/modeler/graphs/:id", async (request, reply) => {
    const { id } = graphIdSchema.parse(request.params);
    deleteGraph(db, id);
    reply.code(204);
    return null;
  });

  app.post("/modeler/validate", async (request) => {
    const body = validateGraphSchema.parse(request.body);
    return { data: { warnings: validateGraph(body.kind, body.nodes, body.edges) } };
  });
}
