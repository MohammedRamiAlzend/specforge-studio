import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { CreateWorkflowInput, Workflow } from "./types";

export const workflowKeys = {
  list: (projectId?: string) => ["workflows", projectId ?? "all"] as const,
};

export function useWorkflows(projectId?: string) {
  const query = projectId ? `?project=${projectId}` : "";
  return useQuery({
    queryKey: workflowKeys.list(projectId),
    queryFn: () => api<Workflow[]>(`/workflows${query}`),
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkflowInput) =>
      api<Workflow>("/workflows", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: workflowKeys.list(input.project_id) });
    },
  });
}
