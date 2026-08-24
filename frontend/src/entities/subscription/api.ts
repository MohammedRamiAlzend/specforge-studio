import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { CheckoutInput } from "../plan/types";
import type { Subscription } from "./types";

export const subscriptionKeys = {
  me: ["subscription", "me"] as const,
};

export function useMySubscription() {
  return useQuery({
    queryKey: subscriptionKeys.me,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        return await api<Subscription | null>("/billing/subscription/me");
      } catch {
        return null;
      }
    },
  });
}

export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckoutInput) =>
      api<Subscription>("/billing/checkout", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (data) => {
      qc.setQueryData(subscriptionKeys.me, data);
    },
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ ok: boolean }>("/billing/subscription/me", { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: subscriptionKeys.me });
    },
  });
}
