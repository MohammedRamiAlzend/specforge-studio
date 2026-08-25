import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { DashboardSummary } from "./types";

export const dashboardKeys = {
  summary: ["dashboard", "summary"] as const,
};

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary,
    refetchOnWindowFocus: false,
    queryFn: () => api<DashboardSummary>("/dashboard/summary"),
  });
}
