import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { CreateSkillInput, Skill, UpdateSkillInput } from "./types";

export const skillKeys = {
  all: (projectId: string) => ["skills", projectId] as const,
};

function useInvalidateSkills(projectId: string | undefined) {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: skillKeys.all(projectId ?? "") });
}

export function useSkills(projectId: string | undefined) {
  return useQuery({
    queryKey: skillKeys.all(projectId ?? ""),
    queryFn: () => api<Skill[]>(`/skills?project=${projectId}`),
    enabled: Boolean(projectId),
  });
}

export function useCreateSkill(projectId: string | undefined) {
  const invalidate = useInvalidateSkills(projectId);
  return useMutation({
    mutationFn: (input: Omit<CreateSkillInput, "project_id">) =>
      api<Skill>("/skills", { method: "POST", body: JSON.stringify({ ...input, project_id: projectId }) }),
    onSuccess: invalidate,
  });
}

export function useUpdateSkill(projectId: string | undefined) {
  const invalidate = useInvalidateSkills(projectId);
  return useMutation({
    mutationFn: (input: UpdateSkillInput & { id: string }) =>
      api<Skill>(`/skills/${input.id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useDeleteSkill(projectId: string | undefined) {
  const invalidate = useInvalidateSkills(projectId);
  return useMutation({
    mutationFn: (id: string) => api<void>(`/skills/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}