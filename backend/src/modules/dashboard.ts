/**
 * Cross-project dashboard summary (DEC-030 + dashboard hardening).
 *
 * One auth-required endpoint that aggregates everything the redesigned
 * dashboard renders: plan/quota awareness, task and issue attention counts,
 * pending approvals, and upcoming milestone due dates. Read-only over the
 * existing tables — no schema changes, no new dependencies.
 *
 * All project/task/issue queries are scoped to the authenticated user's
 * projects (created_by = userId). Pending approvals remain global because
 * they represent governance decisions the user needs to act on.
 */
import type { FastifyInstance } from "fastify";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";
import { requireUser } from "./auth";
import { FREE_PROJECT_LIMIT, getSubscriptionSummary, type SubscriptionSummary } from "./billing";
import { computeProjectHealth, type ProjectHealth } from "./health";

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
  subscription: SubscriptionSummary;
  tasks: { open: number; in_progress: number; blocked: number; done: number; cancelled: number };
  blocked_tasks: BlockedTaskItem[];
  issues: { open: number; critical_open: number };
  critical_issues: CriticalIssueItem[];
  pending_approvals: PendingApprovalItem[];
  pending_approvals_count: number;
  upcoming_milestones: UpcomingMilestoneItem[];
}

/** Scoped to user's projects only. */
function userProjectsQuery(db: Database, userId: string) {
  return db.query("SELECT id, name, status FROM projects WHERE created_by = ?").all(userId) as {
    id: string;
    name: string;
    status: string;
  }[];
}

/** Count tasks by status, scoped to user's projects. */
function countTasksByStatus(db: Database, userId: string): Record<string, number> {
  const rows = db
    .query(
      `SELECT t.status, COUNT(*) AS n FROM tasks t
       WHERE t.project_id IN (SELECT id FROM projects WHERE created_by = ?)
       GROUP BY t.status`,
    )
    .all(userId) as { status: string; n: number }[];
  const out: Record<string, number> = {};
  for (const row of rows) out[row.status] = row.n;
  return out;
}

/** Count issues by status, scoped to user's projects. */
function countIssuesByStatus(db: Database, userId: string): Record<string, number> {
  const rows = db
    .query(
      `SELECT i.status, COUNT(*) AS n FROM issues i
       WHERE i.project_id IN (SELECT id FROM projects WHERE created_by = ?)
       GROUP BY i.status`,
    )
    .all(userId) as { status: string; n: number }[];
  const out: Record<string, number> = {};
  for (const row of rows) out[row.status] = row.n;
  return out;
}

/** Next milestone due dates across BOTH milestone stores, scoped to user's projects. */
function listUpcomingMilestones(db: Database, projectsById: Map<string, string>, userId: string): UpcomingMilestoneItem[] {
  const rows = db
    .query(
      `SELECT id, name, due_date, status, project_id FROM milestones
       WHERE due_date IS NOT NULL AND due_date >= date('now')
         AND project_id IN (SELECT id FROM projects WHERE created_by = ?)
       UNION ALL
       SELECT rm.id, rm.name, rm.due_date, rm.status, r.project_id
       FROM roadmap_milestones rm JOIN roadmaps r ON r.id = rm.roadmap_id
       WHERE rm.due_date IS NOT NULL AND rm.due_date >= date('now')
         AND r.project_id IN (SELECT id FROM projects WHERE created_by = ?)
       ORDER BY due_date ASC
       LIMIT 6`,
    )
    .all(userId, userId) as { id: string; name: string; due_date: string; status: string; project_id: string }[];
  return rows.map((row) => ({
    ...row,
    project_name: projectsById.get(row.project_id) ?? row.project_id,
  }));
}

export function buildDashboardSummary(db: Database, userId: string): DashboardSummary {
  // --- User-scoped projects ---
  const projectRows = userProjectsQuery(db, userId);
  const byStatus: Record<string, number> = {};
  for (const row of projectRows) byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
  const projectsById = new Map(projectRows.map((row) => [row.id, row.name]));
  const projectIds = projectRows.map((r) => r.id);

  // --- Subscription (single call, reused) ---
  const subscription = getSubscriptionSummary(db, userId);

  // --- Scoped task / issue counts ---
  const taskCounts = countTasksByStatus(db, userId);
  const issueCounts = countIssuesByStatus(db, userId);

  // --- Blocked tasks (scoped) ---
  const blockedTasks = (
    projectIds.length === 0
      ? []
      : db
          .query(
            `SELECT t.id, t.title, t.priority, t.project_id FROM tasks t
             WHERE t.status = 'blocked'
               AND t.project_id IN (${projectIds.map(() => "?").join(",")})
             ORDER BY t.id DESC LIMIT 5`,
          )
          .all(...projectIds) as { id: string; title: string; priority: string; project_id: string }[]
  ).map((row) => ({ ...row, project_name: projectsById.get(row.project_id) ?? row.project_id }));

  // --- Critical issues (scoped) ---
  const criticalIssues = (
    projectIds.length === 0
      ? []
      : db
          .query(
            `SELECT i.id, i.title, i.severity, i.project_id FROM issues i
             WHERE i.severity = 'critical' AND i.status IN ('open', 'in_progress')
               AND i.project_id IN (${projectIds.map(() => "?").join(",")})
             ORDER BY i.id DESC LIMIT 5`,
          )
          .all(...projectIds) as { id: string; title: string; severity: string; project_id: string }[]
  ).map((row) => ({ ...row, project_name: projectsById.get(row.project_id) ?? row.project_id }));

  // --- Pending approvals (global — governance decisions apply regardless of ownership) ---
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

  // Count total pending approvals (not capped at 5)
  const pendingApprovalsCount = (
    db.query("SELECT COUNT(*) AS n FROM approvals WHERE status = 'pending'").get() as { n: number }
  ).n;

  return {
    projects: { total: projectRows.length, by_status: byStatus },
    quota: {
      used: (
        db.query("SELECT COUNT(*) AS n FROM projects WHERE created_by = ?").get(userId) as { n: number }
      ).n,
      limit: subscription.plan_key === "free" ? FREE_PROJECT_LIMIT : null,
      plan_key: subscription.plan_key,
    },
    subscription,
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
        projectIds.length === 0
          ? { n: 0 }
          : db
              .query(
                `SELECT COUNT(*) AS n FROM issues
                 WHERE severity = 'critical' AND status IN ('open', 'in_progress')
                   AND project_id IN (${projectIds.map(() => "?").join(",")})`,
              )
              .get(...projectIds) as { n: number }
      ).n,
    },
    critical_issues: criticalIssues,
    pending_approvals: pendingApprovals,
    pending_approvals_count: pendingApprovalsCount,
    upcoming_milestones: listUpcomingMilestones(db, projectsById, userId),
  };
}

/**
 * Batch health for all user projects (DEC-030 hardening).
 * Eliminates the N+1 HealthMiniCard API calls by returning a map of
 * projectId → ProjectHealth in a single endpoint.
 */
export function buildDashboardHealth(db: Database, userId: string): Record<string, ProjectHealth> {
  const projectIds = (
    db.query("SELECT id FROM projects WHERE created_by = ?").all(userId) as { id: string }[]
  ).map((r) => r.id);
  const out: Record<string, ProjectHealth> = {};
  for (const id of projectIds) {
    out[id] = computeProjectHealth(db, id);
  }
  return out;
}

/** Registers GET /dashboard/summary and GET /dashboard/health (auth-required). */
export function registerDashboardRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/dashboard/summary", async (request) => {
    const user = requireUser(db, request);
    return { data: buildDashboardSummary(db, user.id) };
  });

  app.get("/dashboard/health", async (request) => {
    const user = requireUser(db, request);
    return { data: buildDashboardHealth(db, user.id) };
  });
}
