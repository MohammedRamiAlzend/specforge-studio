import type { EdgeDraft, NodeDraft } from "../model-graph/types";

export type DiagramType = "workflow" | "sequence" | "erd" | "architecture";

export interface DiagramWarning {
  code: string;
  level: "error" | "warning" | "info";
  message: string;
}

export interface GeneratedDiagram {
  id: string;
  project_id: string;
  graph_id: string | null;
  diagram_type: DiagramType;
  name: string;
  mermaid: string;
  source_artifacts: string[];
  warnings: DiagramWarning[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GenerateDiagramInput {
  project_id: string;
  diagram_type: DiagramType;
  graph_id?: string;
  name?: string;
}

export type PreviewKind = "workflow" | "data" | "architecture" | "sequence";

export interface DiagramPreviewInput {
  kind: PreviewKind;
  nodes: NodeDraft[];
  edges: EdgeDraft[];
}

export interface DiagramPreview {
  diagram_type: DiagramType;
  mermaid: string;
  warnings: DiagramWarning[];
}
