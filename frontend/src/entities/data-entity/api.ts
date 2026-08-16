import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { CreateDataEntityInput, DataEntity } from "./types";

export const dataEntityKeys = {
  list: (projectId?: string) => ["data-entities", projectId ?? "all"] as const,
};

export function useDataEntities(projectId?: string) {
  const query = projectId ? `?project=${projectId}` : "";
  return useQuery({
    queryKey: dataEntityKeys.list(projectId),
    queryFn: () => api<DataEntity[]>(`/entities${query}`),
  });
}

export function useCreateDataEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDataEntityInput) =>
      api<DataEntity>("/entities", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: dataEntityKeys.list(input.project_id) });
    },
  });
}
