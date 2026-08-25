import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { BmcNote, CreateBmcNoteInput, UpdateBmcNoteInput } from "./types";

export const bmcKeys = {
  all: (projectId: string) => ["bmc", projectId] as const,
};

export function useBmcNotes(projectId: string | undefined) {
  return useQuery({
    queryKey: bmcKeys.all(projectId ?? ""),
    queryFn: () => api<BmcNote[]>(`/bmc?project=${projectId}`),
    enabled: Boolean(projectId),
  });
}

function useInvalidateBmc(projectId: string) {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: bmcKeys.all(projectId) });
}

export function useCreateBmcNote(projectId: string) {
  const invalidate = useInvalidateBmc(projectId);
  return useMutation({
    mutationFn: (input: CreateBmcNoteInput) =>
      api<BmcNote>("/bmc", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useUpdateBmcNote(projectId: string) {
  const invalidate = useInvalidateBmc(projectId);
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateBmcNoteInput }) =>
      api<BmcNote>(`/bmc/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: invalidate,
  });
}

export function useDeleteBmcNote(projectId: string) {
  const invalidate = useInvalidateBmc(projectId);
  return useMutation({
    mutationFn: (id: string) => api<null>(`/bmc/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
