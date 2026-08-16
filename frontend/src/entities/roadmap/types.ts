export interface RoadmapSummary {
  id: string;
  project_id: string;
  name: string;
  status: string;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoadmapPhase {
  id: string;
  roadmap_id: string;
  position: number;
  name: string;
  description: string | null;
  approval_required: number;
  gate_criteria: string | null;
}

export interface RoadmapEpic {
  id: string;
  roadmap_id: string;
  phase_id: string | null;
  module_id: string | null;
  name: string;
  description: string | null;
  position: number;
}

export interface RoadmapMilestone {
  id: string;
  roadmap_id: string;
  phase_id: string | null;
  position: number;
  name: string;
  due_date: string | null;
  gate_criteria: string | null;
  status: string;
}

export interface RoadmapTask {
  id: string;
  roadmap_id: string;
  epic_id: string | null;
  phase_id: string | null;
  module_id: string | null;
  source_type: string;
  source_id: string;
  title: string;
  type: string;
  priority: string;
  objective: string;
  context: string | null;
  constraints: string[];
  input_artifacts: string[];
  checklist: { description: string; verification: string }[];
  definition_of_done: string;
  approval_required: number;
  status: string;
  materialized_task_id: string | null;
}

export interface RoadmapDependency {
  task_id: string;
  depends_on_task_id: string;
  reason: string | null;
}

export interface RoadmapDetail {
  roadmap: RoadmapSummary;
  phases: RoadmapPhase[];
  epics: RoadmapEpic[];
  milestones: RoadmapMilestone[];
  tasks: RoadmapTask[];
  dependencies: RoadmapDependency[];
}
