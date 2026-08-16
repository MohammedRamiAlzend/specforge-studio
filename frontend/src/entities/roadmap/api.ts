import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { RoadmapDetail, RoadmapSummary } from "./types";

export const roadmapKeys = {
  list: (projectId: string) => ["roadmaps", projectId] as const,
  detail: (id: string) => ["roadmap", id] as const,
};

export function useRoadmaps(projectId: string | undefined) {
  return useQuery({
    queryKey: roadmapKeys.list(projectId ?? ""),
    queryFn: () => api<RoadmapSummary[]>(`/roadmaps?project=${projectId}`),
    enabled: Boolean(projectId),
  });
}

export function useGenerateRoadmap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { project_id: string; name?: string }) =>
      api<RoadmapDetail>("/roadmaps/generate", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (detail) => {
      void qc.invalidateQueries({ queryKey: roadmapKeys.list(detail.roadmap.project_id) });
      void qc.setQueryData(roadmapKeys.detail(detail.roadmap.id), detail);
    },
  });
}

export function useRoadmap(id: string | undefined) {
  return useQuery({
    queryKey: roadmapKeys.detail(id ?? ""),
    queryFn: () => api<RoadmapDetail>(`/roadmaps/${id}`),
    enabled: Boolean(id),
  });
}

export function useDeleteRoadmap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; projectId: string }) =>
      api<void>(`/roadmaps/${input.id}`, { method: "DELETE" }),
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: roadmapKeys.list(input.projectId) });
      void qc.removeQueries({ queryKey: roadmapKeys.detail(input.id) });
    },
  });
}
