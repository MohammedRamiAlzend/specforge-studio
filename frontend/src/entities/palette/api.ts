import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type {
  CreateNodeCategoryInput,
  CreateNodeTypeInput,
  NodeCategory,
  NodePalette,
  NodeType,
  UpdateNodeCategoryInput,
  UpdateNodeTypeInput,
} from "./types";

export const paletteKeys = {
  all: ["node-palette"] as const,
};

function useInvalidatePalette() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: paletteKeys.all });
}

export function useNodePalette() {
  return useQuery({
    queryKey: paletteKeys.all,
    queryFn: () => api<NodePalette>("/node-palette"),
    staleTime: 30_000,
  });
}

export function useCreateNodeCategory() {
  const invalidate = useInvalidatePalette();
  return useMutation({
    mutationFn: (input: CreateNodeCategoryInput) =>
      api<NodeCategory>("/node-palette/categories", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useUpdateNodeCategory() {
  const invalidate = useInvalidatePalette();
  return useMutation({
    mutationFn: (input: UpdateNodeCategoryInput & { id: string }) =>
      api<NodeCategory>(`/node-palette/categories/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteNodeCategory() {
  const invalidate = useInvalidatePalette();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/node-palette/categories/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useCreateNodeType() {
  const invalidate = useInvalidatePalette();
  return useMutation({
    mutationFn: (input: CreateNodeTypeInput) =>
      api<NodeType>("/node-palette/types", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useUpdateNodeType() {
  const invalidate = useInvalidatePalette();
  return useMutation({
    mutationFn: (input: UpdateNodeTypeInput & { id: string }) =>
      api<NodeType>(`/node-palette/types/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteNodeType() {
  const invalidate = useInvalidatePalette();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/node-palette/types/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}