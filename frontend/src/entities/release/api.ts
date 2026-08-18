import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { CreateReleaseInput, Release, UpdateReleaseInput } from "./types";

export const releaseKeys = {
  list: (projectId: string) => ["releases", projectId] as const,
};

export function useReleases(projectId: string | undefined) {
  return useQuery({
    queryKey: releaseKeys.list(projectId ?? ""),
    queryFn: () => api<Release[]>(`/releases?project=${projectId}`),
    enabled: Boolean(projectId),
  });
}

function useInvalidateReleases(projectId: string | undefined) {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: releaseKeys.list(projectId ?? "") });
}

export function useCreateRelease(projectId: string | undefined) {
  const invalidate = useInvalidateReleases(projectId);
  return useMutation({
    mutationFn: (input: Omit<CreateReleaseInput, "project_id">) =>
      api<Release>("/releases", { method: "POST", body: JSON.stringify({ ...input, project_id: projectId }) }),
    onSuccess: invalidate,
  });
}

export function useUpdateRelease(projectId: string | undefined) {
  const invalidate = useInvalidateReleases(projectId);
  return useMutation({
    mutationFn: (input: UpdateReleaseInput & { id: string }) =>
      api<Release>(`/releases/${input.id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useDeleteRelease(projectId: string | undefined) {
  const invalidate = useInvalidateReleases(projectId);
  return useMutation({
    mutationFn: (id: string) => api<void>(`/releases/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
