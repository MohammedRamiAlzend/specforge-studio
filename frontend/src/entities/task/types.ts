export type TaskType = "spec" | "backend" | "frontend" | "docs" | "test" | "governance" | "ops";
export type TaskStatus = "open" | "in_progress" | "blocked" | "done" | "cancelled";

export interface Task {
  id: string;
  project_id: string;
  module_id: string | null;
  milestone_id: string | null;
  assignee_id: string | null;
  title: string;
  type: TaskType;
  priority: "high" | "medium" | "low";
  objective: string;
  context: string | null;
  constraints: string | null;
  input_artifacts: string | null;
  approval_required: number;
  approval_id: string | null;
  status: TaskStatus;
  definition_of_done: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateTaskInput {
  title?: string;
  priority?: "high" | "medium" | "low";
  objective?: string;
  status?: TaskStatus;
  assignee_id?: string | null;
}

export interface CreateTaskInput {
  project_id: string;
  module_id?: string;
  milestone_id?: string;
  title: string;
  type?: TaskType;
  priority?: "high" | "medium" | "low";
  objective: string;
  context?: string;
  constraints?: string[];
  input_artifacts?: string[];
  checklist?: string[];
  approval_required?: boolean;
  definition_of_done: string;
}
