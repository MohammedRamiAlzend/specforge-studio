import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { CreateIssueInput, Issue, IssueFilters, UpdateIssueInput } from "./types";

export const issueKeys = {
  list: (projectId: string, filters: IssueFilters = {}) =>
    ["issues", projectId, filters.status ?? "all", filters.kind ?? "all"] as const,
};

export function useIssues(projectId: string | undefined, filters: IssueFilters = {}) {
  const params = new URLSearchParams();
  if (projectId) params.set("project", projectId);
  if (filters.status) params.set("status", filters.status);
  if (filters.kind) params.set("kind", filters.kind);
  return useQuery({
    queryKey: issueKeys.list(projectId ?? "", filters),
    queryFn: () => api<Issue[]>(`/issues?${params.toString()}`),
    enabled: Boolean(projectId),
  });
}

function useInvalidateIssues(projectId: string | undefined) {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ["issues", projectId ?? ""] });
}

export function useCreateIssue(projectId: string | undefined) {
  const invalidate = useInvalidateIssues(projectId);
  return useMutation({
    mutationFn: (input: Omit<CreateIssueInput, "project_id">) =>
      api<Issue>("/issues", { method: "POST", body: JSON.stringify({ ...input, project_id: projectId }) }),
    onSuccess: invalidate,
  });
}

export function useUpdateIssue(projectId: string | undefined) {
  const invalidate = useInvalidateIssues(projectId);
  return useMutation({
    mutationFn: (input: UpdateIssueInput & { id: string }) =>
      api<Issue>(`/issues/${input.id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useDeleteIssue(projectId: string | undefined) {
  const invalidate = useInvalidateIssues(projectId);
  return useMutation({
    mutationFn: (id: string) => api<void>(`/issues/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
