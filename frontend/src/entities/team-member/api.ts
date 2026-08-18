import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { CreateTeamMemberInput, TeamMember, UpdateTeamMemberInput } from "./types";

export const teamMemberKeys = {
  list: (projectId: string) => ["team", projectId] as const,
};

function useInvalidateTeam(projectId: string | undefined) {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: teamMemberKeys.list(projectId ?? "") });
}

export function useTeamMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: teamMemberKeys.list(projectId ?? ""),
    queryFn: () => api<TeamMember[]>(`/team?project=${projectId}`),
    enabled: Boolean(projectId),
  });
}

export function useCreateTeamMember(projectId: string | undefined) {
  const invalidate = useInvalidateTeam(projectId);
  return useMutation({
    mutationFn: (input: Omit<CreateTeamMemberInput, "project_id">) =>
      api<TeamMember>("/team", { method: "POST", body: JSON.stringify({ ...input, project_id: projectId }) }),
    onSuccess: invalidate,
  });
}

export function useUpdateTeamMember(projectId: string | undefined) {
  const invalidate = useInvalidateTeam(projectId);
  return useMutation({
    mutationFn: (input: UpdateTeamMemberInput & { id: string }) =>
      api<TeamMember>(`/team/${input.id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useDeleteTeamMember(projectId: string | undefined) {
  const invalidate = useInvalidateTeam(projectId);
  return useMutation({
    mutationFn: (id: string) => api<void>(`/team/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
