/**
 * Dashboard summary types (DEC-030) — mirrors backend/modules/dashboard.ts.
 */
export interface BlockedTaskItem {
  id: string;
  title: string;
  priority: string;
  project_id: string;
  project_name: string;
}

export interface CriticalIssueItem {
  id: string;
  title: string;
  severity: string;
  project_id: string;
  project_name: string;
}

export interface PendingApprovalItem {
  id: string;
  artifact_id: string;
  artifact_type: string;
  approver_role: string | null;
  project_id: string;
  project_name: string;
}

export interface UpcomingMilestoneItem {
  id: string;
  name: string;
  due_date: string;
  status: string;
  project_id: string;
  project_name: string;
}

export type PlanKey = "free" | "plus" | "premium";

export interface DashboardSummary {
  projects: { total: number; by_status: Record<string, number> };
  quota: { used: number; limit: number | null; plan_key: PlanKey };
  subscription: {
    plan_key: PlanKey;
    status: "active" | "expired";
    cycle: "monthly" | "yearly";
    current_period_end: string;
    card_last4: string;
  };
  tasks: { open: number; in_progress: number; blocked: number; done: number; cancelled: number };
  blocked_tasks: BlockedTaskItem[];
  issues: { open: number; critical_open: number };
  critical_issues: CriticalIssueItem[];
  pending_approvals: PendingApprovalItem[];
  pending_approvals_count: number;
  upcoming_milestones: UpcomingMilestoneItem[];
}
