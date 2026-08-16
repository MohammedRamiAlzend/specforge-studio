import type { Edge, Node } from "@xyflow/react";
import type {
  ModelEdge,
  ModelNode,
  ModelNodeType,
} from "../../entities/model-graph/types";

/** Node type metadata attached to every canvas node for rendering. */
export interface NodeTypeMeta {
  label: string;
  category: string;
  description: string;
  color: string;
}

export type ModelerNodeData = {
  /** Canonical node type from the catalog (start, step, decision, ...). */
  type: string;
  title: string;
  description: string;
  inputs: string[];
  outputs: string[];
  preconditions: string[];
  postconditions: string[];
  relatedArtifacts: string[];
  meta: NodeTypeMeta;
  /** Kind-specific extra metadata (e.g. cross_project on workflow_call nodes). */
  metadata?: Record<string, unknown> | null;
  /** Canonical server ID after the last save (null before first save). */
  serverId: string | null;
};

export type ModelerNode = Node<ModelerNodeData>;

export type ModelerEdgeData = {
  label: string;
  condition: string;
  edgeType: string;
};

export type ModelerEdge = Edge<ModelerEdgeData>;

export const EDGE_TYPES = ["success", "failure", "next", "retry", "escalation", "related"] as const;

export function metaForType(type: string, catalog: ModelNodeType[]): NodeTypeMeta {
  const def = catalog.find((t) => t.type === type);
  return {
    label: def?.label ?? type,
    category: def?.category ?? "flow",
    description: def?.description ?? "",
    color: def?.color ?? "#64748b",
  };
}

/** Display text shown on an edge (label, or condition when no label). */
export function edgeDisplayText(label: string, condition: string): string {
  if (label && condition) return `${label}: ${condition}`;
  return label || condition || "";
}

export function serverNodeToRf(node: ModelNode, catalog: ModelNodeType[]): ModelerNode {
  return {
    id: node.key,
    type: "model",
    position: node.position,
    data: {
      type: node.node_type,
      title: node.title,
      description: node.description ?? "",
      inputs: node.inputs,
      outputs: node.outputs,
      preconditions: node.preconditions,
      postconditions: node.postconditions,
      relatedArtifacts: node.related_artifacts,
      meta: metaForType(node.node_type, catalog),
      metadata: node.metadata,
      serverId: node.id,
    },
  };
}

export function serverEdgeToRf(edge: ModelEdge, idToKey: Map<string, string>): ModelerEdge {
  const label = edge.label ?? "";
  const condition = edge.condition ?? "";
  return {
    id: edge.id,
    source: idToKey.get(edge.source) ?? edge.source,
    target: idToKey.get(edge.target) ?? edge.target,
    label: edgeDisplayText(label, condition),
    data: { label, condition, edgeType: edge.type },
  };
}
