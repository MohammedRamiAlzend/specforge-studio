import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { DocsExport, DocsExportDetail, GenerateDocsInput } from "./types";

export const docsKeys = {
  list: (projectId: string) => ["docs-exports", projectId] as const,
  detail: (id: string) => ["docs-export", id] as const,
};

export function useDocsExports(projectId: string | undefined) {
  return useQuery({
    queryKey: docsKeys.list(projectId ?? ""),
    queryFn: () => api<DocsExport[]>(`/docs/exports?project=${projectId}`),
    enabled: Boolean(projectId),
  });
}

export function useDocsExport(id: string | undefined) {
  return useQuery({
    queryKey: docsKeys.detail(id ?? ""),
    queryFn: () => api<DocsExportDetail>(`/docs/exports/${id}`),
    enabled: Boolean(id),
  });
}

export function useGenerateDocs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateDocsInput) =>
      api<DocsExportDetail>("/docs/generate", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (detail) => {
      void qc.invalidateQueries({ queryKey: docsKeys.list(detail.project_id) });
      void qc.setQueryData(docsKeys.detail(detail.id), detail);
    },
  });
}

export function useDeleteDocsExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; projectId: string }) =>
      api<void>(`/docs/exports/${input.id}`, { method: "DELETE" }),
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: docsKeys.list(input.projectId) });
      void qc.removeQueries({ queryKey: docsKeys.detail(input.id) });
    },
  });
}
