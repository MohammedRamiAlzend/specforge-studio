import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { API_BASE_URL } from "../../shared/config";
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

/**
 * Downloads a generated workspace as a ZIP archive. Uses a raw fetch so the
 * binary response bypasses the JSON-unwrapping api() client, then triggers a
 * browser download via a temporary object URL.
 */
export async function downloadDocsExport(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/docs/exports/${id}/download`, {
    headers: { Accept: "application/zip" },
  });
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  anchor.href = url;
  anchor.download = match?.[1] ?? `specforge-workspace-${id}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function useDownloadDocsExport() {
  return useMutation({
    mutationFn: (id: string) => downloadDocsExport(id),
  });
}
