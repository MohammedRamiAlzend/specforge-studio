import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";

export type LeonaProvider = "openai" | "anthropic" | "gemini";

export interface LeonaProviderConnection {
  id: string;
  provider: LeonaProvider;
  model: string;
  base_url: string;
  key_last4: string;
  status: "active" | "revoked";
  created_at: string;
  updated_at: string;
}

export function useLeonaProviders() {
  return useQuery({
    queryKey: ["leona", "providers"],
    queryFn: () => api<LeonaProviderConnection[]>("/leona/providers"),
  });
}

export function useSaveLeonaProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { provider: LeonaProvider; model?: string; base_url?: string; api_key: string }) =>
      api<LeonaProviderConnection>("/leona/providers", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leona", "providers"] }),
  });
}

export function useRevokeLeonaProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<{ ok: boolean }>(`/leona/providers/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leona", "providers"] }),
  });
}
