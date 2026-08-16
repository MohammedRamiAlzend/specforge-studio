import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { CreateRequirementInput, Requirement } from "./types";

export const requirementKeys = {
  list: (projectId?: string) => ["requirements", projectId ?? "all"] as const,
};

export function useRequirements(projectId?: string) {
  const query = projectId ? `?project=${projectId}` : "";
  return useQuery({
    queryKey: requirementKeys.list(projectId),
    queryFn: () => api<Requirement[]>(`/requirements${query}`),
  });
}

export function useCreateRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRequirementInput) =>
      api<Requirement>("/requirements", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: requirementKeys.list(input.project_id) });
    },
  });
}
