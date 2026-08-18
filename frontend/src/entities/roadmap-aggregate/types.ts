export interface RoadmapAggregateProject {
  project_id: string;
  project_name: string;
  project_type: string;
  link_kind: string; // "self" | PDEP dependency kind | "dependent"
  roadmap_id: string | null;
  roadmap_name: string | null;
  roadmap_status: string | null;
  phases: number;
  epics: number;
  milestones: number;
  tasks_total: number;
  tasks_packaged: number;
  tasks_done: number;
  completion: number;
}

export interface RoadmapAggregate {
  root_project_id: string;
  projects: RoadmapAggregateProject[];
  totals: {
    projects: number;
    roadmaps: number;
    phases: number;
    milestones: number;
    tasks_total: number;
    tasks_packaged: number;
    tasks_done: number;
    completion: number;
  };
}
