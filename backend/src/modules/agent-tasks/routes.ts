// ---------------------------------------------------------------------------
// Agent task pack routes (Prompt 10). Serve the materialized task packs
// (task + checklist + dependencies) and generate packs from a roadmap.
// ---------------------------------------------------------------------------

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../../types";
import { notFound } from "../../utils/errors";
import { materializeTaskPack } from "./packager";

const taskIdSchema = /^TASK-\d{4,}$/;
const roadmapIdSchema = /^RMP-\d{4,}$/;

const generateSchema = z.object({ roadmap_id: z.string().regex(roadmapIdSchema) });

interface TaskRow {
  id: string;
  project_id: string;
  module_id: string | null;
  milestone_id: string | null;
  title: string;
  type: string;
  priority: string;
  objective: string;
  context: string | null;
  constraints: string | null;
  input_artifacts: string | null;
  approval_required: number;
  approval_id: string | null;
  status: string;
  definition_of_done: string;
  created_at: string;
  updated_at: string;
}

interface ChecklistRow {
  task_id: string;
  position: number;
  description: string;
  verification_hint: string | null;
  status: string;
}

interface DepRow {
  task_id: string;
  depends_on_task_id: string;
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

type PackTask = Omit<TaskRow, "constraints" | "input_artifacts"> & {
  constraints: string[];
  input_artifacts: string[];
};

interface TaskPack {
  task: PackTask;
  checklist: ChecklistRow[];
  dependencies: { depends_on_task_id: string }[];
}

function getPacks(db: Database, taskIds: string[]): TaskPack[] {
  if (taskIds.length === 0) return [];
  const placeholders = taskIds.map(() => "?").join(",");
  const tasks = (db.query(`SELECT * FROM tasks WHERE id IN (${placeholders}) ORDER BY id`).all(...taskIds) as TaskRow[]).map((row) => ({
    ...row,
    constraints: parseJsonArray(row.constraints),
    input_artifacts: parseJsonArray(row.input_artifacts),
  }));
  const checklists = db
    .query(`SELECT task_id, position, description, verification_hint, status FROM task_checklists WHERE task_id IN (${placeholders}) ORDER BY task_id, position`)
    .all(...taskIds) as ChecklistRow[];
  const deps = db
    .query(`SELECT task_id, depends_on_task_id FROM task_dependencies WHERE task_id IN (${placeholders}) ORDER BY task_id`)
    .all(...taskIds) as DepRow[];
  const checklistByTask = new Map<string, ChecklistRow[]>();
  for (const item of checklists) checklistByTask.set(item.task_id, [...(checklistByTask.get(item.task_id) ?? []), item]);
  const depsByTask = new Map<string, { depends_on_task_id: string }[]>();
  for (const dep of deps) depsByTask.set(dep.task_id, [...(depsByTask.get(dep.task_id) ?? []), { depends_on_task_id: dep.depends_on_task_id }]);
  return tasks.map((task) => ({
    task,
    checklist: checklistByTask.get(task.id) ?? [],
    dependencies: depsByTask.get(task.id) ?? [],
  }));
}

export function registerAgentTaskRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.post("/agent-tasks/generate", async (request, reply) => {
    const body = generateSchema.parse(request.body);
    const result = materializeTaskPack(db, body.roadmap_id);
    reply.code(201);
    return { data: { ...result, packs: getPacks(db, result.task_ids) } };
  });

  app.get("/agent-tasks", async (request) => {
    const query = z.object({ project: z.string().regex(/^PRJ-\d{4,}$/) }).parse(request.query);
    const tasks = db
      .query("SELECT id FROM tasks WHERE project_id = ? ORDER BY created_at DESC")
      .all(query.project) as { id: string }[];
    return { data: getPacks(db, tasks.map((t) => t.id)) };
  });

  app.get("/agent-tasks/:id", async (request) => {
    const { id } = z.object({ id: z.string().regex(taskIdSchema) }).parse(request.params);
    const packs = getPacks(db, [id]);
    const pack = packs[0];
    if (!pack) throw notFound(`Task ${id} not found`);
    return { data: pack };
  });
}
