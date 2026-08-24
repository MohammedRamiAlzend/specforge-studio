import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { BillingCycle } from "../plan/types";

export const planKeys = {
  all: ["plans"] as const,
};

export function usePlans() {
  return useQuery({
    queryKey: planKeys.all,
    staleTime: 5 * 60 * 1000,
    queryFn: () => api<import("./types").Plan[]>("/plans"),
  });
}
