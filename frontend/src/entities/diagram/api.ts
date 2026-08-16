import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { DiagramPreview, DiagramPreviewInput, GenerateDiagramInput, GeneratedDiagram } from "./types";

export const diagramKeys = {
  list: (projectId: string) => ["diagrams", projectId] as const,
  detail: (id: string) => ["diagram", id] as const,
};

export function useGeneratedDiagrams(projectId: string | undefined) {
  return useQuery({
    queryKey: diagramKeys.list(projectId ?? ""),
    queryFn: () => api<GeneratedDiagram[]>(`/diagrams?project=${projectId}`),
    enabled: Boolean(projectId),
  });
}

export function useGenerateDiagram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateDiagramInput) =>
      api<GeneratedDiagram>("/diagrams/generate", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (diagram) => {
      void qc.invalidateQueries({ queryKey: diagramKeys.list(diagram.project_id) });
    },
  });
}

export function usePreviewDiagram() {
  return useMutation({
    mutationFn: (input: DiagramPreviewInput) =>
      api<DiagramPreview>("/diagrams/preview", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  });
}

export function useDeleteDiagram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; projectId: string }) =>
      api<void>(`/diagrams/${input.id}`, { method: "DELETE" }),
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: diagramKeys.list(input.projectId) });
      void qc.removeQueries({ queryKey: diagramKeys.detail(input.id) });
    },
  });
}
