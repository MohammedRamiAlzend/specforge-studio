import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type {
  CreateDependencyInput,
  CrossProjectCall,
  ProjectDependency,
  ProjectDependent,
  ReferenceTarget,
} from "./types";

export const projectLinkKeys = {
  all: ["project-links"] as const,
  dependencies: (projectId: string) => ["project-links", projectId, "dependencies"] as const,
  dependents: (projectId: string) => ["project-links", projectId, "dependents"] as const,
  referenceTargets: (projectId: string) => ["project-links", projectId, "reference-targets"] as const,
  workflowCalls: (projectId: string) => ["project-links", projectId, "workflow-calls"] as const,
};

export function useProjectDependencies(projectId: string | undefined) {
  return useQuery({
    queryKey: projectLinkKeys.dependencies(projectId ?? ""),
    queryFn: () => api<ProjectDependency[]>(`/projects/${projectId}/dependencies`),
    enabled: Boolean(projectId),
  });
}

export function useProjectDependents(projectId: string | undefined) {
  return useQuery({
    queryKey: projectLinkKeys.dependents(projectId ?? ""),
    queryFn: () => api<ProjectDependent[]>(`/projects/${projectId}/dependents`),
    enabled: Boolean(projectId),
  });
}

export function useReferenceTargets(projectId: string | undefined) {
  return useQuery({
    queryKey: projectLinkKeys.referenceTargets(projectId ?? ""),
    queryFn: () => api<ReferenceTarget[]>(`/projects/${projectId}/reference-targets`),
    enabled: Boolean(projectId),
  });
}

export function useWorkflowCalls(projectId: string | undefined) {
  return useQuery({
    queryKey: projectLinkKeys.workflowCalls(projectId ?? ""),
    queryFn: () => api<CrossProjectCall[]>(`/projects/${projectId}/workflow-calls`),
    enabled: Boolean(projectId),
  });
}

export function useCreateProjectDependency(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDependencyInput) =>
      api<ProjectDependency>(`/projects/${projectId}/dependencies`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (dep) => {
      if (!dep) return;
      void qc.invalidateQueries({ queryKey: projectLinkKeys.all });
      void qc.invalidateQueries({ queryKey: projectLinkKeys.referenceTargets(projectId ?? "") });
      void qc.invalidateQueries({ queryKey: projectLinkKeys.referenceTargets(dep.depends_on_project_id) });
    },
  });
}

export function useDeleteProjectDependency(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (depId: string) =>
      api<void>(`/projects/${projectId}/dependencies/${depId}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectLinkKeys.all });
      void qc.invalidateQueries({ queryKey: projectLinkKeys.referenceTargets(projectId ?? "") });
    },
  });
}