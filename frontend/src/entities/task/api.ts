import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type { CreateTaskInput, Task, UpdateTaskInput } from "./types";

export const taskKeys = {
  list: (projectId?: string, filter?: { status?: string; assignee?: string }) =>
    [
      "tasks",
      projectId ?? "all",
      filter?.status ?? "all",
      filter?.assignee ?? "all",
    ] as const,
};

export function useTasks(
  projectId?: string,
  filter?: { status?: string; assignee?: string },
) {
  const params = new URLSearchParams();
  if (projectId) params.set("project", projectId);
  if (filter?.status) params.set("status", filter.status);
  if (filter?.assignee) params.set("assignee", filter.assignee);
  const query = params.toString() ? `?${params.toString()}` : "";
  return useQuery({
    queryKey: taskKeys.list(projectId, filter),
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

export function useUpdateTask(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTaskInput & { id: string }) =>
      api<Task>(`/tasks/${input.id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.list(projectId) });
    },
  });
}
