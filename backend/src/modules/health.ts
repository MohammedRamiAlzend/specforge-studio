/**
 * Project health analytics (Prompt 20).
 *
 * Computes a stable set of project health metrics from the database so the UI
 * can render progress bars and at-a-glance status without duplicating the
 * metric logic. Database stays the source of truth — these are read-only
 * aggregations, never stored.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";
import { notFound } from "../utils/errors";
import { collectValidationWarnings } from "./governance/routes";

export interface ProjectHealth {
  project_id: string;
  requirements: { total: number; approved: number; completion: number };
  tasks: { total: number; open: number; in_progress: number; blocked: number; done: number; cancelled: number; completion: number };
  approvals: { total: number; approved: number; pending: number; coverage: number };
  validation: { errors: number; warnings: number; infos: number };
  traceability: { total_requirements: number; covered: number; coverage: number };
  milestones: { total: number; reached: number; in_progress: number; completion: number };
  issues: { total: number; open: number; resolved: number };
  releases: { total: number; released: number };
}

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function computeProjectHealth(db: Database, projectId: string): ProjectHealth {
  const project = db.query("SELECT id FROM projects WHERE id = ?").get(projectId);
  if (!project) throw notFound(`Project ${projectId} not found`);

  const req = db
    .query("SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved FROM requirements WHERE project_id = ?")
    .get(projectId) as { total: number; approved: number | null };

  const tasks = db
    .query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open,
         SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
         SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) AS blocked,
         SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
       FROM tasks WHERE project_id = ?`,
    )
    .get(projectId) as {
    total: number;
    open: number | null;
    in_progress: number | null;
    blocked: number | null;
    done: number | null;
    cancelled: number | null;
  };

  const apr = db
    .query(
      `SELECT COUNT(*) AS total,
         SUM(CASE WHEN decision = 'approved' THEN 1 ELSE 0 END) AS approved,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
       FROM approvals WHERE project_id = ?`,
    )
    .get(projectId) as { total: number; approved: number | null; pending: number | null };

  const warnings = collectValidationWarnings(db, projectId);
  const validation = {
    errors: warnings.filter((w) => w.level === "error").length,
    warnings: warnings.filter((w) => w.level === "warning").length,
    infos: warnings.filter((w) => w.level === "info").length,
  };

  const milestone = db
    .query(
      `SELECT COUNT(*) AS total,
         SUM(CASE WHEN status = 'reached' THEN 1 ELSE 0 END) AS reached,
         SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress
       FROM milestones WHERE project_id = ?`,
    )
    .get(projectId) as { total: number; reached: number | null; in_progress: number | null };

  const issue = db
    .query(
      `SELECT COUNT(*) AS total,
         SUM(CASE WHEN status IN ('open','in_progress') THEN 1 ELSE 0 END) AS open,
         SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved
       FROM issues WHERE project_id = ?`,
    )
    .get(projectId) as { total: number; open: number | null; resolved: number | null };

  const release = db
    .query(
      `SELECT COUNT(*) AS total,
         SUM(CASE WHEN status = 'released' THEN 1 ELSE 0 END) AS released
       FROM releases WHERE project_id = ?`,
    )
    .get(projectId) as { total: number; released: number | null };

  // Traceability coverage: requirements that have >=1 artifact_link.
  const trace = db
    .query(
      `SELECT COUNT(*) AS total,
         SUM(CASE WHEN (SELECT COUNT(*) FROM artifact_links l WHERE l.project_id = r.project_id AND l.from_type = 'requirement' AND l.from_id = r.id) > 0 THEN 1 ELSE 0 END) AS covered
       FROM requirements r WHERE r.project_id = ?`,
    )
    .get(projectId) as { total: number; covered: number | null };

  const num = (v: number | null | undefined): number => v ?? 0;

  return {
    project_id: projectId,
    requirements: {
      total: num(req.total),
      approved: num(req.approved),
      completion: pct(num(req.approved), num(req.total)),
    },
    tasks: {
      total: num(tasks.total),
      open: num(tasks.open),
      in_progress: num(tasks.in_progress),
      blocked: num(tasks.blocked),
      done: num(tasks.done),
      cancelled: num(tasks.cancelled),
      completion: pct(num(tasks.done), num(tasks.total)),
    },
    approvals: {
      total: num(apr.total),
      approved: num(apr.approved),
      pending: num(apr.pending),
      coverage: pct(num(apr.approved), num(apr.total)),
    },
    validation: {
      errors: validation.errors,
      warnings: validation.warnings,
      infos: validation.infos,
    },
    traceability: {
      total_requirements: num(trace.total),
      covered: num(trace.covered),
      coverage: pct(num(trace.covered), num(trace.total)),
    },
    milestones: {
      total: num(milestone.total),
      reached: num(milestone.reached),
      in_progress: num(milestone.in_progress),
      completion: pct(num(milestone.reached), num(milestone.total)),
    },
    issues: {
      total: num(issue.total),
      open: num(issue.open),
      resolved: num(issue.resolved),
    },
    releases: {
      total: num(release.total),
      released: num(release.released),
    },
  };
}

export function registerHealthRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/projects/:id/health", async (request) => {
    const { id } = z.object({ id: z.string().regex(/^PRJ-\d{4,}$/) }).parse(request.params);
    return { data: computeProjectHealth(db, id) };
  });
}