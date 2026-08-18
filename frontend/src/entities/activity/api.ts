import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { ActivityItem } from "./types";

export const activityKeys = {
  list: (projectId: string | undefined, limit: number) =>
    ["activity", projectId ?? "all", limit] as const,
};

export function useActivity(projectId: string | undefined, limit = 20) {
  const params = new URLSearchParams();
  if (projectId) params.set("project", projectId);
  params.set("limit", String(limit));
  return useQuery({
    queryKey: activityKeys.list(projectId, limit),
    queryFn: () => api<ActivityItem[]>(`/activity?${params.toString()}`),
  });
}

/** Human-readable verb for an activity action. */
export function describeAction(item: Pick<ActivityItem, "entity_type" | "action" | "to_status">): string {
  switch (item.action) {
    case "created":
      return "created";
    case "updated":
      return "updated";
    case "deleted":
      return "deleted";
    case "status_change":
      return `moved to ${item.to_status ?? "a new status"}`;
    case "approved":
      return "approved";
    case "requested":
      return "requested";
    case "approval_requested":
      return "requested approval for";
    case "generated":
      return "generated";
    case "materialized":
      return "materialized";
    default:
      return item.action.replace(/_/g, " ");
  }
}
