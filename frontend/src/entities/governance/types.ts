export type GovernanceStatus =
  | "draft"
  | "auto_generated"
  | "needs_review"
  | "approved"
  | "ready_for_agent"
  | "in_progress"
  | "needs_verification"
  | "done"
  | "rejected";

export interface StatusRegistry {
  statuses: GovernanceStatus[];
  transitions: Record<GovernanceStatus, GovernanceStatus[]>;
  approval_gated_types: string[];
  auto_generated_allowed: boolean;
}

export interface StatusInfo {
  artifact_type: string;
  artifact_id: string;
  project_id: string;
  status: GovernanceStatus;
  allowed_next: GovernanceStatus[];
  needs_approval: number;
  approval_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TransitionResult {
  artifact_type: string;
  artifact_id: string;
  project_id: string;
  from_status: GovernanceStatus;
  to_status: GovernanceStatus;
  approval_id: string | null;
}

export interface Approval {
  id: string;
  project_id: string;
  artifact_id: string;
  artifact_type: string;
  approver_role: string;
  approver_name: string | null;
  decision: string | null;
  status: string;
  comments: string | null;
  related_decision_id: string | null;
  supersedes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditEvent {
  id: number;
  project_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  actor: string | null;
  actor_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface ValidationWarning {
  rule: string;
  level: "error" | "warning" | "info";
  message: string;
  violations: string[];
}

export interface ValidationReport {
  errors: ValidationWarning[];
  warnings: ValidationWarning[];
  infos: ValidationWarning[];
  all: ValidationWarning[];
}

export interface RequirementCoverage {
  id: string;
  title: string;
  priority: string | null;
  criticality: string;
  links: { use_cases: number; workflows: number; test_cases: number; tasks: number; total: number };
}

export interface TraceabilityReport {
  requirements_coverage: RequirementCoverage[];
  summary: {
    total_requirements: number;
    covered: number;
    uncovered: number;
    uncovered_ids: string[];
    total_links: number;
  };
  orphan_references: { id: number; reference: string }[];
}
