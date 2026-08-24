import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { SkillMatchReport } from "./types";

export const skillMatchKeys = {
  one: (projectId: string) => ["skill-matches", projectId] as const,
};

export function useSkillMatches(projectId: string | undefined) {
  return useQuery({
    queryKey: skillMatchKeys.one(projectId ?? ""),
    queryFn: () => api<SkillMatchReport>(`/skill-matches?project=${projectId}`),
    enabled: Boolean(projectId),
  });
}
