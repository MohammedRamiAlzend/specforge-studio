// ---------------------------------------------------------------------------
// Roadmap routes (Prompt 10). Generates a roadmap snapshot from project
// artifacts, stores it with deterministic child IDs (RMP-0001-P01/EP01/M01/T01),
// and serves list/detail/delete. The agent task packager materializes the
// stored task drafts into the canonical tasks tables.
// ---------------------------------------------------------------------------

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../../types";
import { allocateId } from "../../utils/ids";
import { logEvent } from "../../utils/events";
import { assertProjectExists } from "../../utils/exists";
import { notFound } from "../../utils/errors";
import { deriveRoadmapPlan, type ChecklistItem } from "./engine";

const roadmapIdSchema = /^RMP-\d{4,}$/;

const generateSchema = z.object({
  project_id: z.string().regex(/^PRJ-\d{4,}$/),
  name: z.string().min(1).max(200).optional(),
});

const projectQuerySchema = z.object({ project: z.string().regex(/^PRJ-\d{4,}$/) });

const pad = (n: number) => String(n).padStart(2, "0");

function weeksFromNow(weeks: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

interface RoadmapRow {
  id: string;
  project_id: string;
  name: string;
  status: string;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

interface PhaseRow {
  id: string;
  roadmap_id: string;
  position: number;
  name: string;
  description: string | null;
  approval_required: number;
  gate_criteria: string | null;
}

interface EpicRow {
  id: string;
  roadmap_id: string;
  phase_id: string | null;
  module_id: string | null;
  name: string;
  description: string | null;
  position: number;
}

interface MilestoneRow {
  id: string;
  roadmap_id: string;
  phase_id: string | null;
  position: number;
  name: string;
  due_date: string | null;
  gate_criteria: string | null;
  status: string;
}

interface TaskRow {
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
  constraints: string | null;
  input_artifacts: string | null;
  checklist: string;
  definition_of_done: string;
  approval_required: number;
  status: string;
  materialized_task_id: string | null;
}

interface DepRow {
  task_id: string;
  depends_on_task_id: string;
  reason: string | null;
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function parseChecklist(value: string): ChecklistItem[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as ChecklistItem[]) : [];
  } catch {
    return [];
  }
}

export function storeRoadmap(db: Database, projectId: string, name: string) {
  const plan = deriveRoadmapPlan(db, projectId);

  return db.transaction(() => {
    const roadmapId = allocateId(db, "RMP", projectId);
    const derivedCounts = {
      phases: plan.phases.length,
      milestones: plan.milestones.length,
      epics: plan.epics.length,
      tasks: plan.tasks.length,
      dependencies: plan.dependencies.length,
    };
    db.query(
      `INSERT INTO roadmaps (id, project_id, name, status, metadata)
       VALUES (?, ?, ?, 'draft', ?)`,
    ).run(
      roadmapId,
      projectId,
      name,
      JSON.stringify({ input_counts: plan.inputCounts, derived_counts: derivedCounts, generated_at: new Date().toISOString() }),
    );

    // Phases (position 1..n)
    const phaseIdByName = new Map<string, string>();
    plan.phases.forEach((phase, index) => {
      const id = `${roadmapId}-P${pad(index + 1)}`;
      phaseIdByName.set(phase.name, id);
      db.query(
        `INSERT INTO roadmap_phases (id, roadmap_id, position, name, description, approval_required, gate_criteria)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, roadmapId, index + 1, phase.name, phase.description, phase.approvalRequired ? 1 : 0, phase.gateCriteria);
    });

    // Milestones (1:1 with phases)
    plan.milestones.forEach((milestone, index) => {
      const id = `${roadmapId}-M${pad(index + 1)}`;
      db.query(
        `INSERT INTO roadmap_milestones (id, roadmap_id, phase_id, position, name, due_date, gate_criteria, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'planned')`,
      ).run(id, roadmapId, phaseIdByName.get(milestone.phaseName) ?? null, index + 1, milestone.name, weeksFromNow(milestone.weeks), milestone.gateCriteria);
    });

    // Epics
    const epicIdByName = new Map<string, string>();
    plan.epics.forEach((epic, index) => {
      const id = `${roadmapId}-EP${pad(index + 1)}`;
      epicIdByName.set(epic.name, id);
      db.query(
        `INSERT INTO roadmap_epics (id, roadmap_id, phase_id, module_id, name, description, position)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, roadmapId, phaseIdByName.get(epic.phaseName) ?? null, epic.moduleId, epic.name, epic.description, index + 1);
    });

    // Task drafts
    const taskIdBySource = new Map<string, string>();
    plan.tasks.forEach((task, index) => {
      const id = `${roadmapId}-T${pad(index + 1)}`;
      taskIdBySource.set(`${task.sourceType}:${task.sourceId}`, id);
      db.query(
        `INSERT INTO roadmap_tasks
           (id, roadmap_id, epic_id, phase_id, module_id, source_type, source_id, title, type, priority,
            objective, context, constraints, input_artifacts, checklist, definition_of_done, approval_required, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'proposed')`,
      ).run(
        id,
        roadmapId,
        epicIdByName.get(task.epicName) ?? null,
        phaseIdByName.get(plan.epics.find((e) => e.name === task.epicName)?.phaseName ?? "") ?? null,
        task.moduleId,
        task.sourceType,
        task.sourceId,
        task.title,
        task.type,
        task.priority,
        task.objective,
        task.context,
        JSON.stringify(task.constraints),
        JSON.stringify(task.inputArtifacts),
        JSON.stringify(task.checklist),
        task.definitionOfDone,
        task.approvalRequired ? 1 : 0,
      );
    });

    // Dependencies
    for (const dep of plan.dependencies) {
      const from = taskIdBySource.get(`${dep.fromSourceType}:${dep.fromSourceId}`);
      const to = taskIdBySource.get(`${dep.toSourceType}:${dep.toSourceId}`);
      if (!from || !to) continue;
      db.query(
        `INSERT OR IGNORE INTO roadmap_task_dependencies (roadmap_id, task_id, depends_on_task_id, reason)
         VALUES (?, ?, ?, ?)`,
      ).run(roadmapId, from, to, dep.reason);
    }

    logEvent(db, {
      projectId,
      entityType: "roadmap",
      entityId: roadmapId,
      action: "generated",
      toStatus: "draft",
      payload: { derived_counts: derivedCounts },
    });

    return roadmapId;
  })();
}

function listRoadmaps(db: Database, projectId: string): RoadmapRow[] {
  return db
    .query("SELECT * FROM roadmaps WHERE project_id = ? ORDER BY created_at DESC")
    .all(projectId) as RoadmapRow[];
}

function getRoadmapRow(db: Database, id: string): RoadmapRow {
  const row = db.query("SELECT * FROM roadmaps WHERE id = ?").get(id) as RoadmapRow | undefined;
  if (!row) throw notFound(`Roadmap ${id} not found`);
  return row;
}

function getRoadmapDetail(db: Database, id: string) {
  getRoadmapRow(db, id);
  const phases = db.query("SELECT * FROM roadmap_phases WHERE roadmap_id = ? ORDER BY position").all(id) as PhaseRow[];
  const epics = db.query("SELECT * FROM roadmap_epics WHERE roadmap_id = ? ORDER BY position").all(id) as EpicRow[];
  const milestones = db.query("SELECT * FROM roadmap_milestones WHERE roadmap_id = ? ORDER BY position").all(id) as MilestoneRow[];
  const tasks = (db.query("SELECT * FROM roadmap_tasks WHERE roadmap_id = ? ORDER BY id").all(id) as TaskRow[]).map((row) => ({
    ...row,
    constraints: parseJsonArray(row.constraints),
    input_artifacts: parseJsonArray(row.input_artifacts),
    checklist: parseChecklist(row.checklist),
  }));
  const dependencies = db
    .query("SELECT task_id, depends_on_task_id, reason FROM roadmap_task_dependencies WHERE roadmap_id = ? ORDER BY id")
    .all(id) as DepRow[];
  return { roadmap: getRoadmapRow(db, id), phases, epics, milestones, tasks, dependencies };
}

export function registerRoadmapRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.post("/roadmaps/generate", async (request, reply) => {
    const body = generateSchema.parse(request.body);
    assertProjectExists(db, body.project_id);
    const id = storeRoadmap(db, body.project_id, body.name ?? `Roadmap for ${body.project_id}`);
    reply.code(201);
    return { data: getRoadmapDetail(db, id) };
  });

  app.get("/roadmaps", async (request) => {
    const query = projectQuerySchema.parse(request.query);
    return { data: listRoadmaps(db, query.project) };
  });

  app.get("/roadmaps/:id", async (request) => {
    const { id } = z.object({ id: z.string().regex(roadmapIdSchema) }).parse(request.params);
    return { data: getRoadmapDetail(db, id) };
  });

  app.delete("/roadmaps/:id", async (request, reply) => {
    const { id } = z.object({ id: z.string().regex(roadmapIdSchema) }).parse(request.params);
    const roadmap = getRoadmapRow(db, id);
    db.query("DELETE FROM roadmaps WHERE id = ?").run(id);
    logEvent(db, {
      projectId: roadmap.project_id,
      entityType: "roadmap",
      entityId: id,
      action: "deleted",
    });
    reply.code(204);
    return {};
  });
}
