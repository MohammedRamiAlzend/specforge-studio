import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type {
  CreateGraphInput,
  ModelGraph,
  ModelGraphPayload,
  ModelKind,
  ModelNodeType,
  SaveGraphInput,
  ValidationWarning,
} from "./types";

export const modelGraphKeys = {
  all: ["model-graphs"] as const,
  list: (projectId: string, kind?: ModelKind) =>
    ["model-graphs", projectId, kind ?? "all"] as const,
  detail: (graphId: string) => ["model-graph", graphId] as const,
};

export function useModelNodeTypes() {
  return useQuery({
    queryKey: ["modeler", "node-types"],
    queryFn: () => api<ModelNodeType[]>("/modeler/node-types"),
    staleTime: Infinity,
  });
}

export function useModelGraphs(projectId: string, kind?: ModelKind) {
  const query = kind ? `?project=${projectId}&kind=${kind}` : `?project=${projectId}`;
  return useQuery({
    queryKey: modelGraphKeys.list(projectId, kind),
    queryFn: () => api<ModelGraph[]>(`/modeler/graphs${query}`),
  });
}

export function useModelGraph(graphId: string | undefined) {
  return useQuery({
    queryKey: modelGraphKeys.detail(graphId ?? ""),
    queryFn: () => api<ModelGraphPayload>(`/modeler/graphs/${graphId}`),
    enabled: Boolean(graphId),
  });
}

export function useCreateModelGraph() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGraphInput) =>
      api<ModelGraph>("/modeler/graphs", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (graph) => {
      void qc.invalidateQueries({ queryKey: modelGraphKeys.list(graph.project_id) });
    },
  });
}

export function useSaveModelGraph(graphId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveGraphInput) =>
      api<ModelGraphPayload>(`/modeler/graphs/${graphId}`, {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    onSuccess: (payload) => {
      void qc.invalidateQueries({ queryKey: modelGraphKeys.detail(graphId ?? "") });
    },
  });
}

export function useValidateGraph() {
  return useMutation({
    mutationFn: (input: { kind: ModelKind; nodes: SaveGraphInput["nodes"]; edges: SaveGraphInput["edges"] }) =>
      api<{ warnings: ValidationWarning[] }>("/modeler/validate", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  });
}

export function useDeleteModelGraph() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { graphId: string; projectId: string }) =>
      api<void>(`/modeler/graphs/${input.graphId}`, { method: "DELETE" }),
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: modelGraphKeys.list(input.projectId) });
      void qc.removeQueries({ queryKey: modelGraphKeys.detail(input.graphId) });
    },
  });
}
