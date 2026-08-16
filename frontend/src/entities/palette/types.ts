import type { ModelKind } from "../model-graph/types";

export type NodeFieldType = "text" | "textarea" | "number" | "select" | "boolean";

export interface NodeFieldDef {
  key: string;
  label: string;
  type: NodeFieldType;
  options?: string[];
  required?: boolean;
  default?: string | number | boolean;
}

export interface NodeCategory {
  id: string;
  key: string;
  label: string;
  color: string;
  sort_order: number;
  enabled: number;
  built_in: number;
  created_at: string;
  updated_at: string;
  nodeTypes: NodeType[];
}

export interface NodeType {
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
  category_key: string;
  category_label: string;
}

export interface NodePalette {
  categories: NodeCategory[];
}

export interface CreateNodeCategoryInput {
  key: string;
  label: string;
  color?: string;
  sort_order?: number;
}

export interface UpdateNodeCategoryInput {
  label?: string;
  color?: string;
  sort_order?: number;
  enabled?: boolean;
}

export interface CreateNodeTypeInput {
  key: string;
  label: string;
  category_id: string;
  description?: string;
  color?: string;
  kinds: ModelKind[];
  default_title?: string;
  fields?: NodeFieldDef[];
  sort_order?: number;
}

export interface UpdateNodeTypeInput {
  label?: string;
  category_id?: string;
  description?: string | null;
  color?: string | null;
  kinds?: ModelKind[];
  default_title?: string | null;
  fields?: NodeFieldDef[] | null;
  sort_order?: number;
  enabled?: boolean;
}