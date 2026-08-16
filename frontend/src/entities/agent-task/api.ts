import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { GenerateTaskPackResult, TaskPack } from "./types";

export const taskPackKeys = {
  list: (projectId: string) => ["agent-tasks", projectId] as const,
  detail: (id: string) => ["agent-task", id] as const,
};

export function useGenerateTaskPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { roadmap_id: string }) =>
      api<GenerateTaskPackResult>("/agent-tasks/generate", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: taskPackKeys.list(result.project_id) });
      for (const pack of result.packs) {
        void qc.setQueryData(taskPackKeys.detail(pack.task.id), pack);
      }
    },
  });
}

export function useTaskPacks(projectId: string | undefined) {
  return useQuery({
    queryKey: taskPackKeys.list(projectId ?? ""),
    queryFn: () => api<TaskPack[]>(`/agent-tasks?project=${projectId}`),
    enabled: Boolean(projectId),
  });
}
