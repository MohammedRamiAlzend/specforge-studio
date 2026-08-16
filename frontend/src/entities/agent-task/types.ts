export interface AgentChecklistItem {
  task_id: string;
  position: number;
  description: string;
  verification_hint: string | null;
  status: string;
}

export interface AgentTask {
  id: string;
  project_id: string;
  module_id: string | null;
  milestone_id: string | null;
  title: string;
  type: string;
  priority: string;
  objective: string;
  context: string | null;
  constraints: string[];
  input_artifacts: string[];
  approval_required: number;
  approval_id: string | null;
  status: string;
  definition_of_done: string;
  created_at: string;
  updated_at: string;
}

export interface TaskPack {
  task: AgentTask;
  checklist: AgentChecklistItem[];
  dependencies: { depends_on_task_id: string }[];
}

export interface GenerateTaskPackResult {
  roadmap_id: string;
  project_id: string;
  created: number;
  skipped: number;
  task_ids: string[];
  packs: TaskPack[];
}
