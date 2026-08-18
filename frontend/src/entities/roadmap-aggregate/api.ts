import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { RoadmapAggregate } from "./types";

export const roadmapAggregateKeys = {
  one: (projectId: string) => ["roadmap-aggregate", projectId] as const,
};

export function useRoadmapAggregate(projectId: string | undefined) {
  return useQuery({
    queryKey: roadmapAggregateKeys.one(projectId ?? ""),
    queryFn: () => api<RoadmapAggregate>(`/roadmaps/aggregate?project=${projectId}`),
    enabled: Boolean(projectId),
  });
}

/** Human-readable label for a project's link kind in the aggregate. */
export function linkKindLabel(kind: string): string {
  switch (kind) {
    case "self":
      return "This project";
    case "dependent":
      return "Depends on this project";
    case "workflow_call":
      return "Workflow calls";
    case "data":
      return "Shares data";
    case "deploy":
      return "Deploy dependency";
    case "other":
      return "Linked project";
    default:
      return kind.replace(/_/g, " ");
  }
}
