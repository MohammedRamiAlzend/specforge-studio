import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { ApiEndpoint, CreateApiEndpointInput } from "./types";

export const apiEndpointKeys = {
  list: (projectId?: string) => ["api-endpoints", projectId ?? "all"] as const,
};

export function useApiEndpoints(projectId?: string) {
  const query = projectId ? `?project=${projectId}` : "";
  return useQuery({
    queryKey: apiEndpointKeys.list(projectId),
    queryFn: () => api<ApiEndpoint[]>(`/api-endpoints${query}`),
  });
}

export function useCreateApiEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateApiEndpointInput) =>
      api<ApiEndpoint>("/api-endpoints", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: apiEndpointKeys.list(input.project_id) });
    },
  });
}
