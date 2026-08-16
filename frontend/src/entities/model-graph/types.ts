export type ModelKind = "workflow" | "data" | "architecture" | "sequence";

export interface ModelGraph {
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

export type ModelNodeFieldType = "text" | "textarea" | "number" | "select" | "boolean";

export interface ModelNodeFieldDef {
  key: string;
  label: string;
  type: ModelNodeFieldType;
  options?: string[];
  required?: boolean;
  default?: string | number | boolean;
}

/** Catalog shape returned by GET /modeler/node-types (Prompt 15: DB-driven). */
export interface ModelNodeType {
  type: string;
  label: string;
  category: string;
  description: string;
  color: string;
  kinds: ModelKind[];
  defaultTitle: string;
  fields?: ModelNodeFieldDef[];
}

export interface ModelNode {
  id: string;
  key: string;
  graph_id: string;
  node_type: string;
  title: string;
  description: string | null;
  inputs: string[];
  outputs: string[];
  preconditions: string[];
  postconditions: string[];
  related_artifacts: string[];
  metadata: Record<string, unknown> | null;
  position: { x: number; y: number };
  created_at: string;
  updated_at: string;
}

export interface ModelEdge {
  id: string;
  graph_id: string;
  source: string;
  target: string;
  label: string | null;
  condition: string | null;
  type: string;
}

export type WarningLevel = "error" | "warning" | "info";

export interface ValidationWarning {
  code: string;
  level: WarningLevel;
  message: string;
  nodeKey?: string;
  edgeKey?: string;
}

export interface ModelGraphPayload {
  graph: ModelGraph;
  nodes: ModelNode[];
  edges: ModelEdge[];
  warnings: ValidationWarning[];
}

/** Cross-project reference stored on a workflow_call node (Prompt 14). */
export interface CrossProjectRef {
  project_id: string;
  graph_id: string;
  node_id?: string | null;
}

export interface NodeDraft {
  key: string;
  type: string;
  title: string;
  description?: string;
  inputs?: string[];
  outputs?: string[];
  preconditions?: string[];
  postconditions?: string[];
  related_artifacts?: string[];
  metadata?: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface EdgeDraft {
  key: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
  type: string;
}

export interface SaveGraphInput {
  name?: string;
  description?: string | null;
  nodes: NodeDraft[];
  edges: EdgeDraft[];
}

export interface CreateGraphInput {
  project_id: string;
  kind: ModelKind;
  name: string;
  description?: string;
}
