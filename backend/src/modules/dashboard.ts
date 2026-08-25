/**
 * Cross-project dashboard summary (DEC-030).
 *
 * One auth-required endpoint that aggregates everything the redesigned
 * dashboard renders: plan/quota awareness, task and issue attention counts,
 * pending approvals, and upcoming milestone due dates. Read-only over the
 * existing tables — no schema changes, no new dependencies.
 */
import type { FastifyInstance } from "fastify";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";
import { requireUser } from "./auth";
import { FREE_PROJECT_LIMIT, getSubscriptionSummary } from "./billing";

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

export interface DashboardSummary {
  projects: { total: number; by_status: Record<string, number> };
  quota: { used: number; limit: number | null; plan_key: "free" | "plus" | "premium" };
  subscription: ReturnType<typeof getSubscriptionSummary>;
  tasks: { open: number; in_progress: number; blocked: number; done: number; cancelled: number };
  blocked_tasks: BlockedTaskItem[];
  issues: { open: number; critical_open: number };
  critical_issues: CriticalIssueItem[];
  pending_approvals: PendingApprovalItem[];
  upcoming_milestones: UpcomingMilestoneItem[];
}

function countByStatus(db: Database, table: string): Record<string, number> {
  const rows = db.query(`SELECT status, COUNT(*) AS n FROM ${table} GROUP BY status`).all() as {
    status: string;
    n: number;
  }[];
  const out: Record<string, number> = {};
  for (const row of rows) out[row.status] = row.n;
  return out;
}

/**
 * Next milestone due dates across BOTH milestone stores: the governance
 * lifecycle `milestones` table and the roadmap engine's `roadmap_milestones`
 * (joined through roadmaps for the owning project).
 */
function listUpcomingMilestones(db: Database, projectsById: Map<string, string>): UpcomingMilestoneItem[] {
  const rows = db
    .query(
      `SELECT id, name, due_date, status, project_id FROM milestones
       WHERE due_date IS NOT NULL AND due_date >= date('now')
       UNION ALL
       SELECT rm.id, rm.name, rm.due_date, rm.status, r.project_id
       FROM roadmap_milestones rm JOIN roadmaps r ON r.id = rm.roadmap_id
       WHERE rm.due_date IS NOT NULL AND rm.due_date >= date('now')
       ORDER BY due_date ASC
       LIMIT 6`,
    )
    .all() as { id: string; name: string; due_date: string; status: string; project_id: string }[];
  return rows.map((row) => ({
    ...row,
    project_name: projectsById.get(row.project_id) ?? row.project_id,
  }));
}

export function buildDashboardSummary(db: Database, userId: string): DashboardSummary {
  const projectRows = db.query("SELECT id, name, status FROM projects").all() as {
    id: string;
    name: string;
    status: string;
  }[];
  const byStatus: Record<string, number> = {};
  for (const row of projectRows) byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
  const projectsById = new Map(projectRows.map((row) => [row.id, row.name]));

  const taskCounts = countByStatus(db, "tasks");
  const issueCounts = countByStatus(db, "issues");

  const blockedTasks = (
    db
      .query(
        `SELECT t.id, t.title, t.priority, t.project_id FROM tasks t
         WHERE t.status = 'blocked' ORDER BY t.id DESC LIMIT 5`,
      )
      .all() as { id: string; title: string; priority: string; project_id: string }[]
  ).map((row) => ({ ...row, project_name: projectsById.get(row.project_id) ?? row.project_id }));

  const criticalIssues = (
    db
      .query(
        `SELECT i.id, i.title, i.severity, i.project_id FROM issues i
         WHERE i.severity = 'critical' AND i.status IN ('open', 'in_progress')
         ORDER BY i.id DESC LIMIT 5`,
      )
      .all() as { id: string; title: string; severity: string; project_id: string }[]
  ).map((row) => ({ ...row, project_name: projectsById.get(row.project_id) ?? row.project_id }));

  const pendingApprovals = (
    db
      .query(
        `SELECT a.id, a.artifact_id, a.artifact_type, a.approver_role, a.project_id
         FROM approvals a WHERE a.status = 'pending' ORDER BY a.created_at DESC LIMIT 5`,
      )
      .all() as {
      id: string;
      artifact_id: string;
      artifact_type: string;
      approver_role: string | null;
      project_id: string;
    }[]
  ).map((row) => ({ ...row, project_name: projectsById.get(row.project_id) ?? row.project_id }));

  const planKey = getSubscriptionSummary(db, userId).plan_key;

  return {
    projects: { total: projectRows.length, by_status: byStatus },
    quota: {
      used: (
        db.query("SELECT COUNT(*) AS n FROM projects WHERE created_by = ?").get(userId) as { n: number }
      ).n,
      limit: planKey === "free" ? FREE_PROJECT_LIMIT : null,
      plan_key: planKey,
    },
    subscription: getSubscriptionSummary(db, userId),
    tasks: {
      open: taskCounts.open ?? 0,
      in_progress: taskCounts.in_progress ?? 0,
      blocked: taskCounts.blocked ?? 0,
      done: taskCounts.done ?? 0,
      cancelled: taskCounts.cancelled ?? 0,
    },
    blocked_tasks: blockedTasks,
    issues: {
      open: (issueCounts.open ?? 0) + (issueCounts.in_progress ?? 0),
      critical_open: (
        db
          .query(
            "SELECT COUNT(*) AS n FROM issues WHERE severity = 'critical' AND status IN ('open', 'in_progress')",
          )
          .get() as { n: number }
      ).n,
    },
    critical_issues: criticalIssues,
    pending_approvals: pendingApprovals,
    upcoming_milestones: listUpcomingMilestones(db, projectsById),
  };
}

/** Registers GET /dashboard/summary (auth-required). */
export function registerDashboardRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/dashboard/summary", async (request) => {
    const user = requireUser(db, request);
    return { data: buildDashboardSummary(db, user.id) };
  });
}
