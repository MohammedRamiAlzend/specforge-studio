// ---------------------------------------------------------------------------
// Governance routes (Prompt 11).
//
// Exposes the governance surface: artifact status lifecycle (with approval
// gates), approval requests and records (APR), rejection reasons, the audit
// log, validation warnings, and traceability coverage checks. Every status
// transition, approval, and rejection is appended to event_log.
// ---------------------------------------------------------------------------

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../../types";
import { allocateId } from "../../utils/ids";
import { logEvent } from "../../utils/events";
import { assertProjectExists } from "../../utils/exists";
import { badRequest, notFound } from "../../utils/errors";
import { crossProjectRefOf, crossProjectRefStatus } from "../modeler";
import {
  ARTIFACTS,
  APPROVAL_GATED,
  GOVERNANCE_STATUSES,
  TRANSITIONS,
  isArtifactType,
  seedStatusFromDomain,
  type GovernanceStatus,
} from "./lifecycle";

const governanceStatusSchema = z.enum(GOVERNANCE_STATUSES);

const transitionSchema = z.object({
  artifact_type: z.string().min(1),
  artifact_id: z.string().min(1),
  to_status: governanceStatusSchema,
  actor: z.string().max(200).optional(),
  actor_type: z.enum(["human", "agent", "system"]).default("human"),
  reason: z.string().max(2000).optional(),
});

const createApprovalSchema = z.object({
  project_id: z.string().regex(/^PRJ-\d{4,}$/),
  artifact_id: z.string().min(1),
  artifact_type: z.string().min(1),
  approver_role: z.string().min(1).max(200),
  comments: z.string().max(4000).optional(),
});

const decideSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  approver_role: z.string().min(1).max(200),
  approver_name: z.string().max(200).optional(),
  comments: z.string().max(4000).optional(),
});

const approvalIdSchema = /^APR-\d{4,}$/;

interface ApprovalRow {
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

// ---------------------------------------------------------------------------
// Artifact lookup + governance overlay helpers
// ---------------------------------------------------------------------------

function findArtifact(db: Database, artifactType: string, artifactId: string): { project_id: string; status: string } | undefined {
  if (!isArtifactType(artifactType)) return undefined;
  const def = ARTIFACTS[artifactType];
  return db
    .query(`SELECT project_id, status FROM ${def.table} WHERE id = ?`)
    .get(artifactId) as { project_id: string; status: string } | undefined;
}

interface GovernanceRow {
  artifact_type: string;
  artifact_id: string;
  project_id: string;
  status: string;
  needs_approval: number;
  approval_id: string | null;
  created_at: string;
  updated_at: string;
}

function getGovernance(db: Database, artifactType: string, artifactId: string): GovernanceRow | undefined {
  return db
    .query("SELECT * FROM artifact_governance WHERE artifact_type = ? AND artifact_id = ?")
    .get(artifactType, artifactId) as GovernanceRow | undefined;
}

function hasApprovedApproval(db: Database, artifactType: string, artifactId: string): ApprovalRow | undefined {
  return db
    .query("SELECT * FROM approvals WHERE artifact_type = ? AND artifact_id = ? AND status = 'approved' ORDER BY updated_at DESC LIMIT 1")
    .get(artifactType, artifactId) as ApprovalRow | undefined;
}

function syncDomainStatus(db: Database, artifactType: string, artifactId: string, governanceStatus: GovernanceStatus): void {
  if (!isArtifactType(artifactType)) return;
  const def = ARTIFACTS[artifactType];
  db.query(`UPDATE ${def.table} SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`).run(
    def.toDomain[governanceStatus],
    artifactId,
  );
}

// ---------------------------------------------------------------------------
// Validation warnings (traceability rules checked from project data)
// ---------------------------------------------------------------------------

export interface ValidationWarning {
  rule: string;
  level: "error" | "warning" | "info";
  message: string;
  violations: string[];
}

export function collectValidationWarnings(db: Database, projectId: string): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // TR-01: every requirement links to at least one use case or workflow.
  const reqLinks = db
    .query(
      `SELECT r.id FROM requirements r WHERE r.project_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM artifact_links l WHERE l.project_id = r.project_id
           AND ((l.from_type = 'requirement' AND l.from_id = r.id AND l.to_type IN ('use_case','workflow'))
             OR (l.to_type = 'requirement' AND l.to_id = r.id AND l.from_type IN ('use_case','workflow')))
       )`,
    )
    .all(projectId) as { id: string }[];
  warnings.push({
    rule: "TR-01",
    level: reqLinks.length > 0 ? "warning" : "info",
    message: "Requirements without a use-case or workflow link",
    violations: reqLinks.map((r) => r.id),
  });

  // TR-02: every workflow model graph has a start node.
  const noStart = db
    .query(
      `SELECT g.id FROM model_graphs g WHERE g.project_id = ? AND g.kind = 'workflow'
       AND NOT EXISTS (SELECT 1 FROM model_nodes n WHERE n.graph_id = g.id AND n.node_type = 'start')`,
    )
    .all(projectId) as { id: string }[];
  warnings.push({
    rule: "TR-02",
    level: noStart.length > 0 ? "error" : "info",
    message: "Workflow model graphs without a start node",
    violations: noStart.map((g) => g.id),
  });

  // TR-05: every entity has exactly one primary key field.
  const badPk = db
    .query(
      `SELECT e.id FROM entities e WHERE e.project_id = ?
       AND (SELECT COUNT(*) FROM entity_fields f WHERE f.entity_id = e.id AND f.is_primary_key = 1) <> 1`,
    )
    .all(projectId) as { id: string }[];
  warnings.push({
    rule: "TR-05",
    level: badPk.length > 0 ? "error" : "info",
    message: "Entities without exactly one primary-key field",
    violations: badPk.map((e) => e.id),
  });

  // TR-06: every API endpoint defines input, output, and errors.
  const badApi = db
    .query(
      `SELECT id FROM api_endpoints WHERE project_id = ?
       AND (request_schema IS NULL OR response_schema IS NULL OR error_codes IS NULL)`,
    )
    .all(projectId) as { id: string }[];
  warnings.push({
    rule: "TR-06",
    level: badApi.length > 0 ? "warning" : "info",
    message: "API endpoints missing input/output/errors",
    violations: badApi.map((a) => a.id),
  });

  // TR-07: every critical requirement has at least one test case.
  const criticalNoTc = db
    .query(
      `SELECT r.id FROM requirements r WHERE r.project_id = ? AND r.criticality = 'critical'
       AND NOT EXISTS (
         SELECT 1 FROM artifact_links l WHERE l.project_id = r.project_id
           AND ((l.from_type = 'requirement' AND l.from_id = r.id AND l.to_type = 'test_case')
             OR (l.to_type = 'requirement' AND l.to_id = r.id AND l.from_type = 'test_case'))
       )`,
    )
    .all(projectId) as { id: string }[];
  warnings.push({
    rule: "TR-07",
    level: criticalNoTc.length > 0 ? "error" : "info",
    message: "Critical requirements without test coverage",
    violations: criticalNoTc.map((r) => r.id),
  });

  // TR-08: every milestone links to at least one task.
  const emptyMilestones = db
    .query("SELECT id FROM milestones WHERE project_id = ? AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.milestone_id = milestones.id)")
    .all(projectId) as { id: string }[];
  warnings.push({
    rule: "TR-08",
    level: emptyMilestones.length > 0 ? "warning" : "info",
    message: "Milestones without linked tasks",
    violations: emptyMilestones.map((m) => m.id),
  });

  // TR-09: every task has at least one checklist item.
  const noChecklist = db
    .query(
      "SELECT id FROM tasks WHERE project_id = ? AND NOT EXISTS (SELECT 1 FROM task_checklists c WHERE c.task_id = tasks.id)",
    )
    .all(projectId) as { id: string }[];
  warnings.push({
    rule: "TR-09",
    level: noChecklist.length > 0 ? "warning" : "info",
    message: "Tasks without checklist items",
    violations: noChecklist.map((t) => t.id),
  });

  // TR-15: every task traces back to a source artifact (no invented work).
  const unlinkedTasks = db
    .query(
      `SELECT id FROM tasks WHERE project_id = ?
       AND (input_artifacts IS NULL OR input_artifacts = '[]')
       AND NOT EXISTS (SELECT 1 FROM artifact_links l WHERE l.project_id = tasks.project_id AND l.to_id = tasks.id)`,
    )
    .all(projectId) as { id: string }[];
  warnings.push({
    rule: "TR-15",
    level: unlinkedTasks.length > 0 ? "warning" : "info",
    message: "Tasks without a source-artifact link",
    violations: unlinkedTasks.map((t) => t.id),
  });

  // TR-19: every open risk has a mitigation or explicit acceptance.
  const openNoMitigation = db
    .query("SELECT id FROM risks WHERE project_id = ? AND status = 'open' AND (mitigation IS NULL OR mitigation = '')")
    .all(projectId) as { id: string }[];
  warnings.push({
    rule: "TR-19",
    level: openNoMitigation.length > 0 ? "warning" : "info",
    message: "Open risks without mitigation",
    violations: openNoMitigation.map((r) => r.id),
  });

  // TR-20: every approved requirement has at least one task referencing it.
  const approvedNoTask = db
    .query(
      `SELECT r.id FROM requirements r WHERE r.project_id = ? AND r.status = 'approved'
       AND NOT EXISTS (SELECT 1 FROM artifact_links l WHERE l.project_id = r.project_id AND l.to_id = r.id AND l.from_type = 'task')`,
    )
    .all(projectId) as { id: string }[];
  warnings.push({
    rule: "TR-20",
    level: approvedNoTask.length > 0 ? "warning" : "info",
    message: "Approved requirements without a referencing task",
    violations: approvedNoTask.map((r) => r.id),
  });

  // TR-21: every cross-project workflow call (workflow_call) resolves to an
  // existing workflow-kind graph of another project.
  const callRows = db
    .query(
      `SELECT g.id AS graph_id, n.id AS node_id, n.metadata
       FROM model_nodes n
       JOIN model_graphs g ON g.id = n.graph_id
       WHERE g.project_id = ? AND n.node_type = 'workflow_call'`,
    )
    .all(projectId) as { graph_id: string; node_id: string; metadata: string | null }[];
  const brokenCalls: string[] = [];
  for (const call of callRows) {
    let metadata: Record<string, unknown> | null = null;
    try {
      metadata = call.metadata ? (JSON.parse(call.metadata) as Record<string, unknown>) : null;
    } catch {
      metadata = null;
    }
    const ref = crossProjectRefOf({ metadata });
    if (!ref) {
      brokenCalls.push(`${call.graph_id}:${call.node_id} (no cross-project reference)`);
    } else if (crossProjectRefStatus(db, ref) !== "ok") {
      brokenCalls.push(`${call.graph_id}:${call.node_id} → ${ref.projectId}/${ref.graphId}`);
    }
  }
  warnings.push({
    rule: "TR-21",
    level: brokenCalls.length > 0 ? "warning" : "info",
    message: "Cross-project workflow calls with a missing or invalid target",
    violations: brokenCalls,
  });

  return warnings;
}

// ---------------------------------------------------------------------------
// Traceability coverage report
// ---------------------------------------------------------------------------

interface RequirementCoverage {
  id: string;
  title: string;
  priority: string | null;
  criticality: string;
  links: { use_cases: number; workflows: number; test_cases: number; tasks: number; total: number };
}

function coverageFor(db: Database, projectId: string, requirementId: string, kind: string): number {
  const row = db
    .query(
      `SELECT COUNT(*) AS n FROM artifact_links
       WHERE project_id = ? AND
         ((from_type = 'requirement' AND from_id = ? AND to_type = ?) OR
          (to_type = 'requirement' AND to_id = ? AND from_type = ?))`,
    )
    .get(projectId, requirementId, kind, requirementId, kind) as { n: number };
  return row.n;
}

function buildTraceabilityReport(db: Database, projectId: string) {
  const requirements = db
    .query("SELECT id, title, priority, criticality FROM requirements WHERE project_id = ? ORDER BY id")
    .all(projectId) as { id: string; title: string; priority: string | null; criticality: string }[];

  const coverage: RequirementCoverage[] = requirements.map((req) => {
    const use_cases = coverageFor(db, projectId, req.id, "use_case");
    const workflows = coverageFor(db, projectId, req.id, "workflow");
    const test_cases = coverageFor(db, projectId, req.id, "test_case");
    const tasks = coverageFor(db, projectId, req.id, "task");
    return { id: req.id, title: req.title, priority: req.priority, criticality: req.criticality, links: { use_cases, workflows, test_cases, tasks, total: use_cases + workflows + test_cases + tasks } };
  });

  // Orphan references: artifact_links pointing at ids that do not exist.
  const links = db
    .query("SELECT id, from_type, from_id, to_type, to_id, link_type FROM artifact_links WHERE project_id = ?")
    .all(projectId) as { id: number; from_type: string; from_id: string; to_type: string; to_id: string; link_type: string }[];
  const orphans: { id: number; reference: string }[] = [];
  for (const link of links) {
    const exists = (kind: string, id: string): boolean => {
      if (kind === "module") return Boolean(db.query("SELECT 1 FROM modules WHERE id = ?").get(id));
      if (kind === "use_case") return Boolean(db.query("SELECT 1 FROM use_cases WHERE id = ?").get(id));
      if (kind === "workflow") return Boolean(db.query("SELECT 1 FROM workflows WHERE id = ?").get(id));
      if (kind === "test_case") return Boolean(db.query("SELECT 1 FROM test_cases WHERE id = ?").get(id));
      if (kind === "task") return Boolean(db.query("SELECT 1 FROM tasks WHERE id = ?").get(id));
      if (kind === "screen") return Boolean(db.query("SELECT 1 FROM screens WHERE id = ?").get(id));
      if (kind === "api_endpoint") return Boolean(db.query("SELECT 1 FROM api_endpoints WHERE id = ?").get(id));
      if (kind === "entity") return Boolean(db.query("SELECT 1 FROM entities WHERE id = ?").get(id));
      if (kind === "requirement") return Boolean(db.query("SELECT 1 FROM requirements WHERE id = ?").get(id));
      if (kind === "risk") return Boolean(db.query("SELECT 1 FROM risks WHERE id = ?").get(id));
      if (kind === "decision") return Boolean(db.query("SELECT 1 FROM decisions WHERE id = ?").get(id));
      if (kind === "component") return Boolean(db.query("SELECT 1 FROM components WHERE id = ?").get(id));
      if (kind === "milestone") return Boolean(db.query("SELECT 1 FROM milestones WHERE id = ?").get(id));
      return false;
    };
    if (!exists(link.to_type, link.to_id)) {
      orphans.push({ id: link.id, reference: `${link.from_id} → ${link.to_id} (${link.link_type})` });
    }
  }

  const covered = coverage.filter((c) => c.links.total > 0);
  const uncovered = coverage.filter((c) => c.links.total === 0);

  return {
    requirements_coverage: coverage,
    summary: {
      total_requirements: coverage.length,
      covered: covered.length,
      uncovered: uncovered.length,
      uncovered_ids: uncovered.map((c) => c.id),
      total_links: coverage.reduce((sum, c) => sum + c.links.total, 0),
    },
    orphan_references: orphans,
  };
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export function registerGovernanceRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  // --- Status lifecycle ------------------------------------------------------

  app.get("/governance/statuses", async () => {
    return {
      data: {
        statuses: GOVERNANCE_STATUSES,
        transitions: TRANSITIONS,
        approval_gated_types: Object.entries(APPROVAL_GATED)
          .filter(([, gated]) => gated)
          .map(([type]) => type),
        auto_generated_allowed: true,
      },
    };
  });

  app.get("/governance/status", async (request) => {
    const query = z
      .object({ artifact_type: z.string().min(1), artifact_id: z.string().min(1) })
      .parse(request.query);
    const artifact = findArtifact(db, query.artifact_type, query.artifact_id);
    if (!artifact) throw notFound(`${query.artifact_type} ${query.artifact_id} not found`);
    const overlay = getGovernance(db, query.artifact_type, query.artifact_id);
    const status = (overlay?.status ?? seedStatusFromDomain(artifact.status)) as GovernanceStatus;
    return {
      data: {
        artifact_type: query.artifact_type,
        artifact_id: query.artifact_id,
        project_id: artifact.project_id,
        status,
        allowed_next: TRANSITIONS[status] ?? [],
        needs_approval: APPROVAL_GATED[query.artifact_type as keyof typeof APPROVAL_GATED] ? 1 : 0,
        approval_id: overlay?.approval_id ?? null,
        created_at: overlay?.created_at ?? null,
        updated_at: overlay?.updated_at ?? null,
      },
    };
  });

  app.post("/governance/status", async (request, reply) => {
    const body = transitionSchema.parse(request.body);
    const artifact = findArtifact(db, body.artifact_type, body.artifact_id);
    if (!artifact) throw notFound(`${body.artifact_type} ${body.artifact_id} not found`);

    const overlay = getGovernance(db, body.artifact_type, body.artifact_id);
    const current = (overlay?.status ?? seedStatusFromDomain(artifact.status)) as GovernanceStatus;
    const allowed = TRANSITIONS[current] ?? [];
    if (!allowed.includes(body.to_status)) {
      throw badRequest(
        `Invalid transition ${body.artifact_type} ${body.artifact_id}: ${current} → ${body.to_status}. Allowed: ${allowed.join(", ")}`,
      );
    }

    // Approval gate: entering `approved` on gated kinds requires an approved APR.
    const gated = APPROVAL_GATED[body.artifact_type as keyof typeof APPROVAL_GATED] ?? false;
    let approval: ApprovalRow | undefined;
    if (body.to_status === "approved" && gated) {
      approval = hasApprovedApproval(db, body.artifact_type, body.artifact_id);
      if (!approval) {
        throw badRequest(
          `Approval required: ${body.artifact_type} ${body.artifact_id} cannot become approved without an approved approval record (APR).`,
          { code: "GOV_APPROVAL_REQUIRED" },
        );
      }
    }

    const now = new Date().toISOString();
    db.query(
      `INSERT INTO artifact_governance (artifact_type, artifact_id, project_id, status, needs_approval, approval_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(artifact_type, artifact_id) DO UPDATE SET
         status = excluded.status,
         needs_approval = excluded.needs_approval,
         approval_id = excluded.approval_id,
         updated_at = excluded.updated_at`,
    ).run(
      body.artifact_type,
      body.artifact_id,
      artifact.project_id,
      body.to_status,
      gated ? 1 : 0,
      approval?.id ?? overlay?.approval_id ?? null,
      now,
      now,
    );

    // Best-effort sync of the artifact's domain status column.
    syncDomainStatus(db, body.artifact_type, body.artifact_id, body.to_status);

    logEvent(db, {
      projectId: artifact.project_id,
      entityType: body.artifact_type,
      entityId: body.artifact_id,
      action: "status_change",
      fromStatus: current,
      toStatus: body.to_status,
      actor: body.actor ?? "system",
      actorType: body.actor_type,
      payload: body.reason ? { reason: body.reason } : undefined,
    });

    reply.code(200);
    return {
      data: {
        artifact_type: body.artifact_type,
        artifact_id: body.artifact_id,
        project_id: artifact.project_id,
        from_status: current,
        to_status: body.to_status,
        approval_id: approval?.id ?? overlay?.approval_id ?? null,
      },
    };
  });

  // --- Approvals -------------------------------------------------------------

  app.post("/approvals", async (request, reply) => {
    const body = createApprovalSchema.parse(request.body);
    assertProjectExists(db, body.project_id);
    const artifact = findArtifact(db, body.artifact_type, body.artifact_id);
    if (!artifact) throw notFound(`${body.artifact_type} ${body.artifact_id} not found`);
    if (artifact.project_id !== body.project_id) {
      throw badRequest(`${body.artifact_id} belongs to project ${artifact.project_id}, not ${body.project_id}`);
    }

    const id = allocateId(db, "APR", body.project_id);
    db.query(
      `INSERT INTO approvals (id, project_id, artifact_id, artifact_type, approver_role, status, comments)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    ).run(id, body.project_id, body.artifact_id, body.artifact_type, body.approver_role, body.comments ?? null);

    const gated = APPROVAL_GATED[body.artifact_type as keyof typeof APPROVAL_GATED] ?? false;
    if (gated) {
      db.query(
        `INSERT INTO artifact_governance (artifact_type, artifact_id, project_id, status, needs_approval, updated_at)
         VALUES (?, ?, ?, 'needs_review', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
         ON CONFLICT(artifact_type, artifact_id) DO UPDATE SET needs_approval = 1, updated_at = excluded.updated_at`,
      ).run(body.artifact_type, body.artifact_id, body.project_id);
    }

    logEvent(db, {
      projectId: body.project_id,
      entityType: "approval",
      entityId: id,
      action: "requested",
      toStatus: "pending",
      actor: body.approver_role,
      payload: { artifact_id: body.artifact_id, artifact_type: body.artifact_type },
    });

    reply.code(201);
    const row = db.query("SELECT * FROM approvals WHERE id = ?").get(id) as ApprovalRow;
    return { data: row };
  });

  app.post("/approvals/:id/decide", async (request) => {
    const { id } = z.object({ id: z.string().regex(approvalIdSchema) }).parse(request.params);
    const body = decideSchema.parse(request.body);
    const existing = db.query("SELECT * FROM approvals WHERE id = ?").get(id) as ApprovalRow | undefined;
    if (!existing) throw notFound(`Approval ${id} not found`);
    if (existing.status !== "pending") throw badRequest(`Approval ${id} is already ${existing.status}`);

    if (body.decision === "rejected" && !(body.comments ?? "").trim()) {
      throw badRequest("Rejection requires a reason in comments.");
    }

    db.query(
      `UPDATE approvals SET decision = ?, status = ?, approver_role = ?, approver_name = ?, comments = ?,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ?`,
    ).run(body.decision, body.decision, body.approver_role, body.approver_name ?? null, body.comments ?? null, id);

    if (body.decision === "approved") {
      // Record the approval against a gated task if the approval targets one.
      if (existing.artifact_type === "task") {
        db.query("UPDATE tasks SET approval_id = ? WHERE id = ?").run(id, existing.artifact_id);
      }
      db.query(
        `UPDATE artifact_governance SET approval_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE artifact_type = ? AND artifact_id = ?`,
      ).run(id, existing.artifact_type, existing.artifact_id);
    }

    logEvent(db, {
      projectId: existing.project_id,
      entityType: existing.artifact_type,
      entityId: existing.artifact_id,
      action: body.decision, // approved | rejected
      fromStatus: "pending",
      toStatus: body.decision,
      actor: body.approver_name ?? body.approver_role,
      actorType: "human",
      payload: { approval_id: id, comments: body.comments ?? null },
    });

    const updated = db.query("SELECT * FROM approvals WHERE id = ?").get(id) as ApprovalRow;
    return { data: updated };
  });

  app.get("/approvals", async (request) => {
    const query = z
      .object({
        project: z.string().regex(/^PRJ-\d{4,}$/),
        artifact_id: z.string().optional(),
      })
      .parse(request.query);
    let rows: ApprovalRow[];
    if (query.artifact_id) {
      rows = db
        .query("SELECT * FROM approvals WHERE project_id = ? AND artifact_id = ? ORDER BY created_at DESC")
        .all(query.project, query.artifact_id) as ApprovalRow[];
    } else {
      rows = db.query("SELECT * FROM approvals WHERE project_id = ? ORDER BY created_at DESC").all(query.project) as ApprovalRow[];
    }
    return { data: rows };
  });

  app.get("/approvals/:id", async (request) => {
    const { id } = z.object({ id: z.string().regex(approvalIdSchema) }).parse(request.params);
    const row = db.query("SELECT * FROM approvals WHERE id = ?").get(id) as ApprovalRow | undefined;
    if (!row) throw notFound(`Approval ${id} not found`);
    return { data: row };
  });

  // --- Audit log -------------------------------------------------------------

  app.get("/audit", async (request) => {
    const query = z
      .object({
        project: z.string().regex(/^PRJ-\d{4,}$/).optional(),
        entity_type: z.string().optional(),
        entity_id: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(500).default(200),
      })
      .parse(request.query);

    const conditions: string[] = [];
    const values: (string | number)[] = [];
    if (query.project) {
      conditions.push("project_id = ?");
      values.push(query.project);
    }
    if (query.entity_type) {
      conditions.push("entity_type = ?");
      values.push(query.entity_type);
    }
    if (query.entity_id) {
      conditions.push("entity_id = ?");
      values.push(query.entity_id);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    values.push(query.limit);
    const rows = db
      .query(`SELECT id, project_id, entity_type, entity_id, action, from_status, to_status, actor, actor_type, payload, created_at
              FROM event_log ${where} ORDER BY id DESC LIMIT ?`)
      .all(...values) as {
      id: number;
      project_id: string | null;
      entity_type: string;
      entity_id: string;
      action: string;
      from_status: string | null;
      to_status: string | null;
      actor: string | null;
      actor_type: string;
      payload: string | null;
      created_at: string;
    }[];
    return {
      data: rows.map((row) => ({
        ...row,
        payload: row.payload ? (JSON.parse(row.payload) as unknown) : null,
      })),
    };
  });

  // --- Validation warnings + traceability coverage ----------------------------

  app.get("/governance/validation", async (request) => {
    const query = z.object({ project: z.string().regex(/^PRJ-\d{4,}$/) }).parse(request.query);
    const warnings = collectValidationWarnings(db, query.project);
    return {
      data: {
        errors: warnings.filter((w) => w.level === "error"),
        warnings: warnings.filter((w) => w.level === "warning"),
        infos: warnings.filter((w) => w.level === "info"),
        all: warnings,
      },
    };
  });

  app.get("/governance/traceability", async (request) => {
    const query = z.object({ project: z.string().regex(/^PRJ-\d{4,}$/) }).parse(request.query);
    return { data: buildTraceabilityReport(db, query.project) };
  });
}
