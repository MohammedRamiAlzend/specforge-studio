import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { DashboardSummary } from "./types";
import type { ProjectHealth } from "../health/types";

export const dashboardKeys = {
  summary: ["dashboard", "summary"] as const,
  health: ["dashboard", "health"] as const,
};

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    queryFn: () => api<DashboardSummary>("/dashboard/summary"),
  });
}

/** Batch health for all user projects — eliminates N+1 HealthMiniCard calls. */
export function useDashboardHealth() {
  return useQuery<Record<string, ProjectHealth>>({
    queryKey: dashboardKeys.health,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    queryFn: () => api<Record<string, ProjectHealth>>("/dashboard/health"),
  });
}
