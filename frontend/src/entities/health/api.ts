import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { ProjectHealth } from "./types";

export const healthKeys = {
  one: (projectId: string) => ["health", projectId] as const,
};

export function useProjectHealth(projectId: string | undefined) {
  return useQuery({
    queryKey: healthKeys.one(projectId ?? ""),
    queryFn: () => api<ProjectHealth>(`/projects/${projectId}/health`),
    enabled: Boolean(projectId),
  });
}
