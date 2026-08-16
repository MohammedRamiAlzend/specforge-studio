import type { DependencyKind } from "./types";

const KIND_LABELS: Record<DependencyKind, string> = {
  workflow_call: "Workflow call",
  data: "Data",
  deploy: "Deploy",
  other: "Other",
};

export function dependencyKindLabel(kind: DependencyKind): string {
  return KIND_LABELS[kind] ?? kind;
}

export const DEPENDENCY_KINDS: DependencyKind[] = ["workflow_call", "data", "deploy", "other"];

/**
 * Serializes a cross-project reference into node metadata (used by the
 * workflow_call inspector section). Returns the updated `metadata` object.
 */
export function buildCrossProjectMetadata(
  currentMetadata: Record<string, unknown> | null | undefined,
  ref: { project_id: string; graph_id: string },
): Record<string, unknown> {
  return { ...(currentMetadata ?? {}), cross_project: { project_id: ref.project_id, graph_id: ref.graph_id } };
}

/** Legacy: resolves a stored metadata blob to its cross_project ref (or null). */
export function crossProjectRefOf(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata || typeof metadata.cross_project !== "object" || !metadata.cross_project) return null;
  const raw = metadata.cross_project as Record<string, unknown>;
  const projectId = typeof raw.project_id === "string" ? raw.project_id : "";
  const graphId = typeof raw.graph_id === "string" ? raw.graph_id : "";
  if (!projectId || !graphId) return null;
  return { project_id: projectId, graph_id: graphId } as const;
}