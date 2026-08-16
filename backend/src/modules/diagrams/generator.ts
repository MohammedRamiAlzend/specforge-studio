// ---------------------------------------------------------------------------
// Deterministic Mermaid generation from structured model data.
// Users never write Mermaid: every diagram below is derived from model nodes,
// edges, entities, and components stored in the database (Prompt 08).
// ---------------------------------------------------------------------------

import type { Database } from "bun:sqlite";
import { crossProjectRefOf, crossProjectRefStatus } from "../modeler";

export type DiagramType = "workflow" | "sequence" | "erd" | "architecture";
export type WarningLevel = "error" | "warning" | "info";

export interface DiagramWarning {
  code: string;
  level: WarningLevel;
  message: string;
}

export interface GenerateResult {
  mermaid: string;
  warnings: DiagramWarning[];
  sourceArtifacts: string[];
}

/** Minimal normalized node consumed by the generators. */
export interface DiagramNode {
  id: string;
  key: string;
  type: string;
  title: string;
  description?: string | null;
  position: { x: number; y: number };
  metadata?: Record<string, unknown> | null;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string | null;
  condition?: string | null;
  type: string;
}

export interface ErdField {
  name: string;
  data_type: string;
  is_primary_key?: boolean;
  is_unique?: boolean;
}

export interface ErdEntity {
  id: string;
  name: string;
  fields: ErdField[];
}

export interface ErdRelation {
  id: string;
  from: string;
  to: string;
  relation_type: "1:1" | "1:N" | "N:M";
  description?: string | null;
}

export interface ArchComponent {
  id: string;
  name: string;
  layer: string | null;
  technologies?: string[] | null;
}

/** A resolved cross-project workflow call (Prompt 14: workflow_call nodes). */
export interface CrossProjectCall {
  projectId: string;
  projectName: string;
  graphId: string;
  graphName: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeId(id: string): string {
  const cleaned = id.replace(/[^A-Za-z0-9_]/g, "_");
  return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned;
}

function mermaidLabel(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ")}"`;
}

function byPosition(a: DiagramNode, b: DiagramNode): number {
  return (
    a.position.y - b.position.y ||
    a.position.x - b.position.x ||
    a.id.localeCompare(b.id)
  );
}

function byEdgeOrder(
  a: DiagramEdge,
  b: DiagramEdge,
  nodeIndex: Map<string, number>,
): number {
  const ai = nodeIndex.get(a.source) ?? 0;
  const bi = nodeIndex.get(b.source) ?? 0;
  if (ai !== bi) return ai - bi;
  const at = nodeIndex.get(a.target) ?? 0;
  const bt = nodeIndex.get(b.target) ?? 0;
  return at - bt || a.id.localeCompare(b.id);
}

/** Human-readable edge text: label (condition) [type]. Empty when nothing. */
export function edgeText(edge: DiagramEdge): string {
  const parts: string[] = [];
  if (edge.label) parts.push(edge.label);
  if (edge.condition) parts.push(`(${edge.condition})`);
  if (edge.type && edge.type !== "next") parts.push(edge.type);
  return parts.join(" ");
}

function danglingEdgeWarnings(edges: DiagramEdge[], nodeIds: Set<string>): DiagramWarning[] {
  const warnings: DiagramWarning[] = [];
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      warnings.push({
        code: "EDGE_MISSING_SOURCE",
        level: "error",
        message: `Edge "${edge.id}" references a missing source node.`,
      });
    }
    if (!nodeIds.has(edge.target)) {
      warnings.push({
        code: "EDGE_MISSING_TARGET",
        level: "error",
        message: `Edge "${edge.id}" references a missing target node.`,
      });
    }
  }
  return warnings;
}

/**
 * Resolves workflow_call nodes against the database into their target project
 * and workflow metadata. Keyed by the node id the caller passes (canonical
 * model-node ids for stored graphs, client keys for previews) so stored and
 * preview rendering stay deterministic and byte-identical for the same input.
 */
export function resolveCrossProjectCalls(
  db: Database,
  nodes: { id: string; metadata?: Record<string, unknown> | null }[],
): Map<string, CrossProjectCall> {
  const calls = new Map<string, CrossProjectCall>();
  for (const node of nodes) {
    const ref = crossProjectRefOf({ metadata: node.metadata ?? null });
    if (!ref) continue;
    if (crossProjectRefStatus(db, ref) !== "ok") continue;
    const project = db.query("SELECT name FROM projects WHERE id = ?").get(ref.projectId) as
      | { name: string }
      | undefined;
    const graph = db.query("SELECT name FROM model_graphs WHERE id = ?").get(ref.graphId) as
      | { name: string }
      | undefined;
    if (!project || !graph) continue;
    calls.set(node.id, {
      projectId: ref.projectId,
      projectName: project.name,
      graphId: ref.graphId,
      graphName: graph.name,
    });
  }
  return calls;
}

// ---------------------------------------------------------------------------
// Workflow (flowchart)
// ---------------------------------------------------------------------------

/**
 * Canonical node shape per type. Custom node types (Prompt 15) have no
 * dedicated shape and fall back to the generic rounded box, keeping diagrams
 * renderable for any palette without generator changes.
 */
function workflowShape(type: string): "stadium" | "decision" | "generic" {
  if (type === "start" || type === "end") return "stadium";
  if (type === "decision") return "decision";
  return "generic";
}

export function generateWorkflow(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  crossProject?: Map<string, CrossProjectCall>,
): GenerateResult {
  const warnings: DiagramWarning[] = [];
  const sourceArtifacts: string[] = [];
  const sorted = [...nodes].sort(byPosition);
  const calls = crossProject ?? new Map<string, CrossProjectCall>();

  if (sorted.length === 0) {
    warnings.push({ code: "EMPTY_GRAPH", level: "info", message: "No nodes to render in the workflow diagram." });
    return { mermaid: "flowchart TD\n", warnings, sourceArtifacts };
  }

  const starts = sorted.filter((n) => n.type === "start");
  const ends = sorted.filter((n) => n.type === "end");
  if (starts.length === 0) {
    warnings.push({ code: "NO_START", level: "error", message: "Workflow has no Start node." });
  }
  if (ends.length === 0) {
    warnings.push({ code: "NO_END", level: "warning", message: "Workflow has no End node." });
  }

  const nodeIds = new Set(sorted.map((n) => n.id));
  warnings.push(...danglingEdgeWarnings(edges, nodeIds));

  const lines = ["flowchart TD"];
  for (const node of sorted) {
    const id = sanitizeId(node.id);
    const label = mermaidLabel(node.title);
    const shape = workflowShape(node.type);
    if (node.type === "workflow_call" && calls.has(node.id)) {
      const call = calls.get(node.id)!;
      lines.push(`  subgraph ${sanitizeId(`xp_${node.id}`)}[${mermaidLabel(`${call.projectName} (${call.projectId})`)}]`);
      lines.push(`    ${id}[${mermaidLabel(`${call.graphName} (${call.graphId})`)}]`);
      lines.push("  end");
    } else if (shape === "stadium") {
      lines.push(`  ${id}([${label}])`);
    } else if (shape === "decision") {
      lines.push(`  ${id}{${label}}`);
    } else {
      if (node.type === "workflow_call") {
        warnings.push({
          code: "CROSS_PROJECT_REF_MISSING",
          level: "warning",
          message: `Workflow call "${node.title}" references a target that does not exist or is not a workflow-kind graph.`,
        });
      }
      lines.push(`  ${id}[${label}]`);
    }
  }

  const nodeIndex = new Map(sorted.map((n, index) => [n.id, index]));
  const sortedEdges = [...edges].sort((a, b) => byEdgeOrder(a, b, nodeIndex));
  for (const edge of sortedEdges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    const text = edgeText(edge);
    const arrow = edge.type === "failure" ? "--x" : "-->";
    lines.push(
      `  ${sanitizeId(edge.source)} ${arrow}${text ? `|${mermaidLabel(text)}|` : ""} ${sanitizeId(edge.target)}`,
    );
  }

  return { mermaid: lines.join("\n") + "\n", warnings, sourceArtifacts };
}

// ---------------------------------------------------------------------------
// Sequence
// ---------------------------------------------------------------------------

/** Maps a workflow node type to a participant role (Prompt 08 sequence rules). */
const WORKFLOW_ROLE: Record<string, string> = {
  start: "Actor",
  end: "Actor",
  step: "System",
  decision: "System",
  wait: "System",
  event: "Event",
  screen: "UI",
  api_call: "API",
  database: "DB",
  external_system: "External",
  approval: "Approver",
  ai_agent: "AI Agent",
};

const SEQUENCE_ARROW: Record<string, string> = {
  success: "->>",
  next: "->>",
  failure: "--x",
  retry: "-->>",
  escalation: "-x",
  related: "-->>",
};

/**
 * Generates a sequence diagram from a model graph.
 * - kind=sequence: nodes are participants, edges are messages.
 * - kind=workflow: participants are derived per node role; edges become
 *   messages between the roles of their endpoints.
 */
export function generateSequence(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  graphKind: "sequence" | "workflow",
): GenerateResult {
  const warnings: DiagramWarning[] = [];
  const sorted = [...nodes].sort(byPosition);

  if (sorted.length === 0) {
    warnings.push({ code: "EMPTY_GRAPH", level: "info", message: "No nodes to render in the sequence diagram." });
    return { mermaid: "sequenceDiagram\n", warnings, sourceArtifacts: [] };
  }

  const lines = ["sequenceDiagram"];
  const messages: { from: string; to: string; text: string; arrow: string }[] = [];

  if (graphKind === "sequence") {
    const participantByNode = new Map<string, string>();
    sorted.forEach((node, index) => {
      const pid = `P${index + 1}`;
      participantByNode.set(node.id, pid);
      lines.push(`  participant ${pid} as ${mermaidLabel(node.title)}`);
    });
    for (const edge of edges) {
      const from = participantByNode.get(edge.source);
      const to = participantByNode.get(edge.target);
      if (!from || !to) continue;
      const text = edgeText(edge);
      const arrow = SEQUENCE_ARROW[edge.type] ?? "->>";
      messages.push({ from, to, text, arrow });
    }
  } else {
    // Workflow-kind: derive participants from node roles.
    const roleOrder = ["Actor", "UI", "API", "DB", "External", "AI Agent", "Event", "Approver", "System"];
    const present = new Set(sorted.map((n) => WORKFLOW_ROLE[n.type] ?? "System"));
    const roles = roleOrder.filter((r) => present.has(r));
    if (roles.length === 0) {
      warnings.push({ code: "NO_PARTICIPANTS", level: "warning", message: "No participants could be derived for the sequence diagram." });
    }
    roles.forEach((role, index) => {
      lines.push(`  participant P${index + 1} as ${mermaidLabel(role)}`);
    });
    const roleByNode = new Map(sorted.map((n) => [n.id, WORKFLOW_ROLE[n.type] ?? "System"]));
    const rolePid = new Map(roles.map((role, index) => [role, `P${index + 1}`]));
    for (const edge of edges) {
      const fromRole = roleByNode.get(edge.source);
      const toRole = roleByNode.get(edge.target);
      const from = fromRole ? rolePid.get(fromRole) : undefined;
      const to = toRole ? rolePid.get(toRole) : undefined;
      if (!from || !to) continue;
      const text = edgeText(edge);
      const arrow = SEQUENCE_ARROW[edge.type] ?? "->>";
      messages.push({ from, to, text, arrow });
    }
  }

  for (const message of messages) {
    lines.push(`  ${message.from}${message.arrow}${message.to}${message.text ? `: ${message.text}` : ""}`);
  }

  if (messages.length === 0 && sorted.length > 0) {
    warnings.push({ code: "NO_MESSAGES", level: "info", message: "Participants exist but no messages (edges) connect them." });
  }

  return { mermaid: lines.join("\n") + "\n", warnings, sourceArtifacts: [] };
}

// ---------------------------------------------------------------------------
// ERD
// ---------------------------------------------------------------------------

const ERD_TYPE: Record<string, string> = {
  string: "string",
  uuid: "string",
  reference: "string",
  number: "int",
  boolean: "bool",
  date: "date",
  datetime: "datetime",
  json: "json",
};

const CROWS: Record<ErdRelation["relation_type"], string> = {
  "1:1": "||--||",
  "1:N": "||--o{",
  "N:M": "}o--o{",
};

export function generateErd(entities: ErdEntity[], relations: ErdRelation[]): GenerateResult {
  const warnings: DiagramWarning[] = [];
  const sourceArtifacts = entities.map((e) => e.id);

  if (entities.length === 0) {
    warnings.push({ code: "NO_ENTITIES", level: "warning", message: "No entities to render in the ERD." });
    return { mermaid: "erDiagram\n", warnings, sourceArtifacts };
  }

  const lines = ["erDiagram"];
  const sortedEntities = [...entities].sort((a, b) => a.id.localeCompare(b.id));

  for (const entity of sortedEntities) {
    if (entity.fields.length === 0) {
      warnings.push({
        code: "ENTITY_NO_FIELDS",
        level: "info",
        message: `Entity "${entity.name}" has no fields defined.`,
      });
      continue;
    }
    lines.push(`  ${sanitizeId(entity.id)} {`);
    for (const field of entity.fields) {
      const type = ERD_TYPE[field.data_type] ?? "string";
      const key = field.is_primary_key ? " PK" : field.is_unique ? " UK" : "";
      lines.push(`    ${type} ${field.name}${key}`);
    }
    lines.push("  }");
  }

  const entityIds = new Set(sortedEntities.map((e) => e.id));
  for (const relation of [...relations].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!entityIds.has(relation.from) || !entityIds.has(relation.to)) continue;
    const label = relation.description || relation.relation_type;
    lines.push(
      `  ${sanitizeId(relation.from)} ${CROWS[relation.relation_type]} ${sanitizeId(relation.to)} : ${label}`,
    );
  }

  return { mermaid: lines.join("\n") + "\n", warnings, sourceArtifacts };
}

// ---------------------------------------------------------------------------
// Architecture
// ---------------------------------------------------------------------------

const ARCH_LAYER: Record<string, string> = {
  start: "context",
  end: "context",
  screen: "presentation",
  step: "application",
  decision: "application",
  wait: "application",
  api_call: "application",
  ai_agent: "ai",
  approval: "governance",
  database: "data",
  external_system: "integration",
  event: "integration",
};

const LAYER_ORDER = ["context", "presentation", "application", "data", "ai", "governance", "integration"];

function layerOf(node: DiagramNode): string {
  const fromMetadata = node.metadata?.layer;
  if (typeof fromMetadata === "string" && LAYER_ORDER.includes(fromMetadata)) return fromMetadata;
  return ARCH_LAYER[node.type] ?? "application";
}

export function generateArchitecture(nodes: DiagramNode[], edges: DiagramEdge[]): GenerateResult {
  const warnings: DiagramWarning[] = [];
  const sorted = [...nodes].sort(byPosition);

  if (sorted.length === 0) {
    warnings.push({ code: "EMPTY_GRAPH", level: "info", message: "No components to render in the architecture diagram." });
    return { mermaid: "flowchart LR\n", warnings, sourceArtifacts: [] };
  }

  const nodeIds = new Set(sorted.map((n) => n.id));
  warnings.push(...danglingEdgeWarnings(edges, nodeIds));

  const lines = ["flowchart LR"];
  const grouped = new Map<string, DiagramNode[]>();
  for (const node of sorted) {
    const layer = layerOf(node);
    grouped.set(layer, [...(grouped.get(layer) ?? []), node]);
  }

  for (const layer of LAYER_ORDER) {
    const group = grouped.get(layer);
    if (!group || group.length === 0) continue;
    lines.push(`  subgraph ${sanitizeId(`layer_${layer}`)}[${mermaidLabel(layer)}]`);
    for (const node of group) {
      lines.push(`    ${sanitizeId(node.id)}[${mermaidLabel(node.title)}]`);
    }
    lines.push("  end");
  }

  const nodeIndex = new Map(sorted.map((n, index) => [n.id, index]));
  const sortedEdges = [...edges].sort((a, b) => byEdgeOrder(a, b, nodeIndex));
  for (const edge of sortedEdges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    const text = edgeText(edge);
    const arrow = edge.type === "failure" ? "--x" : "-->";
    lines.push(
      `  ${sanitizeId(edge.source)} ${arrow}${text ? `|${mermaidLabel(text)}|` : ""} ${sanitizeId(edge.target)}`,
    );
  }

  return { mermaid: lines.join("\n") + "\n", warnings, sourceArtifacts: [] };
}

/** Architecture diagram from the components table (no graph) grouped by layer. */
export function generateArchitectureFromComponents(components: ArchComponent[]): GenerateResult {
  const warnings: DiagramWarning[] = [];
  const sourceArtifacts = components.map((c) => c.id);

  if (components.length === 0) {
    warnings.push({ code: "NO_COMPONENTS", level: "warning", message: "No components to render in the architecture diagram." });
    return { mermaid: "flowchart LR\n", warnings, sourceArtifacts };
  }

  const lines = ["flowchart LR"];
  const grouped = new Map<string, ArchComponent[]>();
  for (const component of components) {
    const layer = component.layer ?? "application";
    grouped.set(layer, [...(grouped.get(layer) ?? []), component]);
  }

  for (const layer of LAYER_ORDER) {
    const group = grouped.get(layer);
    if (!group || group.length === 0) continue;
    lines.push(`  subgraph ${sanitizeId(`layer_${layer}`)}[${mermaidLabel(layer)}]`);
    for (const component of [...group].sort((a, b) => a.id.localeCompare(b.id))) {
      const tech = component.technologies?.length
        ? ` (${component.technologies.join(", ")})`
        : "";
      lines.push(`    ${sanitizeId(component.id)}[${mermaidLabel(component.name + tech)}]`);
    }
    lines.push("  end");
  }

  return { mermaid: lines.join("\n") + "\n", warnings, sourceArtifacts };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function generateDiagram(
  diagramType: DiagramType,
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  graphKind?: "sequence" | "workflow",
  crossProject?: Map<string, CrossProjectCall>,
): GenerateResult {
  switch (diagramType) {
    case "workflow":
      return generateWorkflow(nodes, edges, crossProject);
    case "sequence":
      return generateSequence(nodes, edges, graphKind ?? "sequence");
    case "architecture":
      return generateArchitecture(nodes, edges);
    default:
      throw new Error(`Unsupported diagram type: ${diagramType}`);
  }
}
