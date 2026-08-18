export interface MetricSet {
  total: number;
  completion: number;
}

export interface ProjectHealth {
  project_id: string;
  requirements: MetricSet & { approved: number };
  tasks: MetricSet & { open: number; in_progress: number; blocked: number; done: number; cancelled: number };
  approvals: { total: number; approved: number; pending: number; coverage: number };
  validation: { errors: number; warnings: number; infos: number };
  traceability: { total_requirements: number; covered: number; coverage: number };
  milestones: MetricSet & { reached: number; in_progress: number };
  issues: { total: number; open: number; resolved: number };
  releases: { total: number; released: number };
}

