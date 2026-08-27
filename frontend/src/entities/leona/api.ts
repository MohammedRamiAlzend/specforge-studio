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

export interface LeonaDraft {
  summary: string;
  assumptions: string[];
  warnings: string[];
  requirements: Array<{ title: string; description: string; priority: string }>;
  workflows: Array<{ name: string; goal: string; steps: string[] }>;
  entities: Array<{ name: string; purpose: string; fields: string[] }>;
  api_endpoints: Array<{ method: string; path: string; purpose: string }>;
  roadmap_tasks: Array<{ title: string; description: string; priority: string }>;
  markdown_files: Array<{ path: string; title: string; content: string }>;
}

export interface LeonaGenerationResult {
  run_id: string;
  project_id: string;
  provider: LeonaProvider;
  model: string;
  status: "draft";
  usage: { input_tokens: number; output_tokens: number };
  draft: LeonaDraft;
}

export function useGenerateLeonaDraft() {
  return useMutation({
    mutationFn: (input: { project_id: string; connection_id?: string; instruction?: string }) =>
      api<LeonaGenerationResult>("/leona/generate", { method: "POST", body: JSON.stringify(input) }),
  });
}

export function useRevokeLeonaProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<{ ok: boolean }>(`/leona/providers/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leona", "providers"] }),
  });
}
