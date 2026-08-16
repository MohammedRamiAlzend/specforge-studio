export type DependencyKind = "workflow_call" | "data" | "deploy" | "other";

export interface ProjectDependency {
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

export interface ProjectDependent {
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

export interface ReferenceTargetWorkflow {
  graph_id: string;
  name: string;
}

export interface ReferenceTarget {
  project_id: string;
  project_name: string;
  project_type: string;
  is_linked: boolean;
  workflows: ReferenceTargetWorkflow[];
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

export interface CreateDependencyInput {
  depends_on_project_id: string;
  kind: DependencyKind;
  note?: string;
}

import type { CrossProjectRef } from "../model-graph/types";
export type { CrossProjectRef };