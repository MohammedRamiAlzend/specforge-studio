/**
 * Skills-to-task matching (OPT-004).
 *
 * Deterministic keyword-overlap scoring that ranks every project skill
 * against every task in the same project so executing agents can pick up
 * work that fits their specialty, and planners can see which required
 * skills currently have no open work (coverage gaps).
 *
 * Purely derived data: nothing is persisted and no engine module is
 * touched. The score sums weighted term hits between a skill's searchable
 * vocabulary (name + tech tag + description) and a task's text fields:
 *   * title hit            -> +3 per term
 *   * objective hit        -> +2 per term
 *   * context/constraints/DoD hit -> +1 per term
 *   * task.type equals a skill term -> +3 flat
 * A skill qualifies as a match when its score reaches MATCH_THRESHOLD.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";
import { notFound } from "../utils/errors";

export const MATCH_THRESHOLD = 3;

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "onto",
  "are", "was", "were", "has", "have", "had", "its", "their", "them",
  "all", "any", "can", "will", "shall", "must", "should", "may", "might",
  "per", "via", "use", "used", "using", "when", "then", "than", "also",
  "each", "both", "but", "not", "you", "your", "our", "out", "new",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

export interface SkillMatchSkill {
  id: string;
  kind: string;
  name: string;
  description: string;
  tag: string | null;
}

export interface SkillMatchTask {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  objective: string;
  context: string | null;
  constraints: string | null;
  definition_of_done: string;
}

export interface ScoredSkill {
  skill_id: string;
  name: string;
  kind: string;
  tag: string | null;
  score: number;
  reasons: string[];
}

function skillTerms(skill: SkillMatchSkill): string[] {
  const raw = [skill.name, skill.tag ?? "", skill.description];
  return [...new Set(raw.flatMap((text) => tokenize(text)))];
}

/** Deterministic score of one skill against one task. */
export function scoreTaskAgainstSkill(task: SkillMatchTask, skill: SkillMatchSkill): ScoredSkill {
  let score = 0;
  const reasons: string[] = [];
  const haystacks: Array<{ field: string; weight: number; text: string }> = [
    { field: "title", weight: 3, text: task.title },
    { field: "objective", weight: 2, text: task.objective },
    {
      field: "context",
      weight: 1,
      text: [task.context ?? "", task.constraints ?? "", task.definition_of_done].join(" "),
    },
  ];
  for (const term of skillTerms(skill)) {
    for (const { field, weight, text } of haystacks) {
      if (tokenize(text).includes(term)) {
        score += weight;
        reasons.push(`${field} mentions "${term}"`);
        break;
      }
    }
  }
  if (skillTerms(skill).includes(task.type)) {
    score += 3;
    reasons.push(`task type "${task.type}" matches skill`);
  }
  return {
    skill_id: skill.id,
    name: skill.name,
    kind: skill.kind,
    tag: skill.tag,
    score,
    reasons,
  };
}

export interface TaskSkillMatch {
  task_id: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  skills: ScoredSkill[];
}

export interface SkillCoverageGap {
  skill_id: string;
  name: string;
  kind: string;
  open_matches: number;
  total_matches: number;
}

export interface SkillMatchReport {
  project_id: string;
  task_count: number;
  skill_count: number;
  matches: TaskSkillMatch[];
  unmatched_tasks: string[];
  coverage_gaps: SkillCoverageGap[];
}

export function buildSkillMatchReport(db: Database, projectId: string): SkillMatchReport {
  const project = db.query("SELECT id FROM projects WHERE id = ?").get(projectId) as
    | { id: string }
    | undefined;
  if (!project) throw notFound(`Project ${projectId} not found`);

  const skills = db
    .query("SELECT id, kind, name, description, tag FROM skills WHERE project_id = ? ORDER BY sort_order, id")
    .all(projectId) as SkillMatchSkill[];
  const tasks = db
    .query(
      `SELECT id, title, type, priority, status, objective, context, constraints, definition_of_done
       FROM tasks WHERE project_id = ? ORDER BY created_at DESC, id`,
    )
    .all(projectId) as SkillMatchTask[];

  const matches: TaskSkillMatch[] = [];
  const unmatchedTasks: string[] = [];
  const openHits = new Map<string, number>();
  const totalHits = new Map<string, number>();

  for (const task of tasks) {
    const scored = skills
      .map((skill) => scoreTaskAgainstSkill(task, skill))
      .filter((entry) => entry.score >= MATCH_THRESHOLD)
      .sort((a, b) => b.score - a.score || a.skill_id.localeCompare(b.skill_id));
    if (scored.length === 0) {
      unmatchedTasks.push(task.id);
      continue;
    }
    for (const entry of scored) {
      totalHits.set(entry.skill_id, (totalHits.get(entry.skill_id) ?? 0) + 1);
      if (task.status === "open") {
        openHits.set(entry.skill_id, (openHits.get(entry.skill_id) ?? 0) + 1);
      }
    }
    matches.push({
      task_id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      type: task.type,
      skills: scored,
    });
  }

  const coverageGaps: SkillCoverageGap[] = skills.map((skill) => ({
    skill_id: skill.id,
    name: skill.name,
    kind: skill.kind,
    open_matches: openHits.get(skill.id) ?? 0,
    total_matches: totalHits.get(skill.id) ?? 0,
  }));
  coverageGaps.sort((a, b) => a.open_matches - b.open_matches || a.skill_id.localeCompare(b.skill_id));

  return {
    project_id: projectId,
    task_count: tasks.length,
    skill_count: skills.length,
    matches,
    unmatched_tasks: unmatchedTasks,
    coverage_gaps: coverageGaps,
  };
}

export function registerSkillMatchRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/skill-matches", async (request) => {
    const query = z.object({ project: z.string().regex(/^PRJ-\d{4,}$/) }).parse(request.query);
    return { data: buildSkillMatchReport(db, query.project) };
  });
}
