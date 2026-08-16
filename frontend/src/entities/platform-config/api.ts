import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type {
  CreateLibraryInput,
  CreateProjectTypeInput,
  CreateStackInput,
  PlatformType,
  UpdateLibraryInput,
  UpdateProjectTypeInput,
  UpdateStackInput,
} from "./types";

export const platformConfigKeys = {
  all: ["platform-config"] as const,
};

function useInvalidatePlatformConfig() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: platformConfigKeys.all });
}

export function usePlatformConfig() {
  return useQuery({
    queryKey: platformConfigKeys.all,
    queryFn: () => api<PlatformType[]>("/platform-config"),
    staleTime: 30_000,
  });
}

export function useCreateProjectType() {
  const invalidate = useInvalidatePlatformConfig();
  return useMutation({
    mutationFn: (input: CreateProjectTypeInput) =>
      api<PlatformType>("/platform-config/types", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useUpdateProjectType() {
  const invalidate = useInvalidatePlatformConfig();
  return useMutation({
    mutationFn: (input: UpdateProjectTypeInput & { id: string }) =>
      api<PlatformType>(`/platform-config/types/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteProjectType() {
  const invalidate = useInvalidatePlatformConfig();
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/platform-config/types/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useCreateStack() {
  const invalidate = useInvalidatePlatformConfig();
  return useMutation({
    mutationFn: (input: CreateStackInput) =>
      api<PlatformType["stacks"][number]>("/platform-config/stacks", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateStack() {
  const invalidate = useInvalidatePlatformConfig();
  return useMutation({
    mutationFn: (input: UpdateStackInput & { id: string }) =>
      api<PlatformType["stacks"][number]>(`/platform-config/stacks/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteStack() {
  const invalidate = useInvalidatePlatformConfig();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/platform-config/stacks/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useCreateLibrary() {
  const invalidate = useInvalidatePlatformConfig();
  return useMutation({
    mutationFn: (input: CreateLibraryInput) =>
      api<PlatformType["stacks"][number]["libraries"][number]>("/platform-config/libraries", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateLibrary() {
  const invalidate = useInvalidatePlatformConfig();
  return useMutation({
    mutationFn: (input: UpdateLibraryInput & { id: string }) =>
      api<PlatformType["stacks"][number]["libraries"][number]>(`/platform-config/libraries/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteLibrary() {
  const invalidate = useInvalidatePlatformConfig();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/platform-config/libraries/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
