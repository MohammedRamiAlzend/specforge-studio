// ---------------------------------------------------------------------------
// Agent task packager (Prompt 10).
//
// Materializes roadmap task drafts (backend/src/modules/roadmap/) into the
// canonical tasks / task_checklists / task_dependencies tables as executable,
// agent-neutral task packs. Every task carries: ID, title, type, module,
// priority, status, objective, context, input artifacts, constraints, a
// concrete sequential checklist with verification hints, definition of done,
// related artifacts, and the approval requirement. Running the packager again
// is idempotent: drafts that were already materialized are skipped.
// ---------------------------------------------------------------------------

import type { Database } from "bun:sqlite";
import { allocateId } from "../../utils/ids";
import { logEvent } from "../../utils/events";
import { notFound } from "../../utils/errors";
import type { ChecklistItem } from "../roadmap/engine";

interface RoadmapRow {
  id: string;
  project_id: string;
  name: string;
  status: string;
}

interface DraftRow {
  id: string;
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
  materialized_task_id: string | null;
}

interface DepRow {
  task_id: string;
  depends_on_task_id: string;
}

export interface PackResult {
  roadmap_id: string;
  project_id: string;
  created: number;
  skipped: number;
  task_ids: string[];
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

export function materializeTaskPack(db: Database, roadmapId: string): PackResult {
  const roadmap = db.query("SELECT * FROM roadmaps WHERE id = ?").get(roadmapId) as RoadmapRow | undefined;
  if (!roadmap) throw notFound(`Roadmap ${roadmapId} not found`);

  const drafts = db.query("SELECT * FROM roadmap_tasks WHERE roadmap_id = ? ORDER BY id").all(roadmapId) as DraftRow[];
  const dependencies = db
    .query("SELECT task_id, depends_on_task_id FROM roadmap_task_dependencies WHERE roadmap_id = ? ORDER BY id")
    .all(roadmapId) as DepRow[];

  const created: string[] = [];

  db.transaction(() => {
    const materializedByDraft = new Map<string, string>();
    for (const draft of drafts) {
      if (draft.materialized_task_id) {
        materializedByDraft.set(draft.id, draft.materialized_task_id);
        continue;
      }
      const taskId = allocateId(db, "TASK", roadmap.project_id);
      db.query(
        `INSERT INTO tasks
           (id, project_id, module_id, title, type, priority, objective, context,
            constraints, input_artifacts, approval_required, status, definition_of_done)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
      ).run(
        taskId,
        roadmap.project_id,
        draft.module_id,
        draft.title,
        draft.type,
        draft.priority,
        draft.objective,
        `${draft.context ?? ""}\nRoadmap: ${roadmap.id} (${roadmap.name}). Draft: ${draft.id}.`,
        JSON.stringify(draft.constraints ? [...parseJsonArray(draft.constraints), "Task pack generated from roadmap " + roadmap.id + " — do not invent requirements."] : ["Task pack generated from roadmap " + roadmap.id + " — do not invent requirements."]),
        JSON.stringify([...new Set([...parseJsonArray(draft.input_artifacts), draft.source_id])]),
        draft.approval_required ? 1 : 0,
        draft.definition_of_done,
      );
      // Sequential, verifiable checklist with verification hints.
      const checklist = parseChecklist(draft.checklist);
      checklist.forEach((item, index) => {
        const itemId = `${taskId}-C${String(index + 1).padStart(2, "0")}`;
        db.query(
          `INSERT INTO task_checklists (id, task_id, position, description, verification_hint, status)
           VALUES (?, ?, ?, ?, ?, 'pending')`,
        ).run(itemId, taskId, index + 1, item.description, item.verification);
      });
      db.query("UPDATE roadmap_tasks SET materialized_task_id = ?, status = 'approved' WHERE id = ?").run(taskId, draft.id);
      materializedByDraft.set(draft.id, taskId);
      created.push(taskId);
      logEvent(db, {
        projectId: roadmap.project_id,
        entityType: "task",
        entityId: taskId,
        action: "generated",
        toStatus: "open",
        payload: { roadmap_id: roadmap.id, source: `${draft.source_type}:${draft.source_id}` },
      });
    }

    // Dependencies: map draft ids to materialized TASK ids.
    for (const dep of dependencies) {
      const from = materializedByDraft.get(dep.task_id);
      const to = materializedByDraft.get(dep.depends_on_task_id);
      if (!from || !to) continue;
      db.query(
        `INSERT OR IGNORE INTO task_dependencies (project_id, task_id, depends_on_task_id)
         VALUES (?, ?, ?)`,
      ).run(roadmap.project_id, from, to);
    }
  })();

  const skipped = drafts.length - created.length;
  return { roadmap_id: roadmap.id, project_id: roadmap.project_id, created: created.length, skipped, task_ids: created };
}
