import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { SearchResult } from "./types";

export const searchKeys = {
  results: (q: string, projectId: string | undefined) => ["search", q, projectId ?? "all"] as const,
};

export function useSearch(q: string, projectId: string | undefined) {
  const trimmed = q.trim();
  const params = new URLSearchParams();
  if (trimmed) params.set("q", trimmed);
  if (projectId) params.set("project", projectId);
  return useQuery({
    queryKey: searchKeys.results(trimmed, projectId),
    queryFn: () => api<SearchResult[]>(`/search?${params.toString()}`),
    enabled: trimmed.length >= 2,
  });
}
