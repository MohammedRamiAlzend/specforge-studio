import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { CreateTaskInput, Task } from "./types";

export const taskKeys = {
  list: (projectId?: string) => ["tasks", projectId ?? "all"] as const,
};

export function useTasks(projectId?: string) {
  const query = projectId ? `?project=${projectId}` : "";
  return useQuery({
    queryKey: taskKeys.list(projectId),
    queryFn: () => api<Task[]>(`/tasks${query}`),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      api<Task>("/tasks", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: taskKeys.list(input.project_id) });
    },
  });
}
