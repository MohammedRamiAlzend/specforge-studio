/**
 * Backend tests for OPT-004 (skills-to-task matching): deterministic
 * keyword scoring between project skills and tasks, ranked per-task
 * matches, unmatched tasks, and coverage gaps computed from open work.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { bootApp, createTestContext } from "./helpers";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

async function createProject(name: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/projects",
    payload: { name, type: "web", created_by: "owner@internal" },
  });
  return res.json().data.id as string;
}

async function createSkill(projectId: string, body: Record<string, unknown>): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/skills",
    payload: { project_id: projectId, ...body },
  });
  if (res.statusCode !== 201) throw new Error(`skill create failed: ${res.body}`);
  return res.json().data.id as string;
}

async function createTask(projectId: string, body: Record<string, unknown>): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: {
      project_id: projectId,
      title: "Untitled task",
      objective: "Do the thing.",
      definition_of_done: "Thing is done.",
      ...body,
    },
  });
  if (res.statusCode !== 201) throw new Error(`task create failed: ${res.body}`);
  return res.json().data.id as string;
}

beforeAll(async () => {
  app = await bootApp(createTestContext());
});

afterAll(async () => {
  if (app) await app.close();
});

describe("GET /skill-matches", () => {
  it("404s for an unknown project", async () => {
    const res = await app.inject({ method: "GET", url: "/skill-matches?project=PRJ-9999" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });

  it("returns empty report for a fresh project (no skills/tasks)", async () => {
    const projectId = await createProject("SkillMatch Empty");
    const res = await app.inject({ method: "GET", url: `/skill-matches?project=${projectId}` });
    expect(res.statusCode).toBe(200);
    const report = res.json().data;
    expect(report.project_id).toBe(projectId);
    expect(report.task_count).toBe(0);
    expect(report.skill_count).toBe(0);
    expect(report.matches).toEqual([]);
    expect(report.unmatched_tasks).toEqual([]);
    expect(report.coverage_gaps).toEqual([]);
  });

  it("ranks a task by title hit and reports coverage gaps for idle skills", async () => {
    const projectId = await createProject("SkillMatch Ranked");
    const reactSkill = await createSkill(projectId, { kind: "tech", name: "React", tag: "frontend" });
    const paymentsSkill = await createSkill(projectId, {
      kind: "tech",
      name: "Payments integration",
      tag: "payments",
    });

    const frontendTask = await createTask(projectId, {
      title: "Build the checkout screen with React components",
      objective: "Implement the checkout flow in the frontend.",
      type: "frontend",
      priority: "high",
      definition_of_done: "Checkout renders and passes tests.",
    });
    const opsTask = await createTask(projectId, {
      title: "Prepare staging deployment runbook",
      objective: "Document the release steps for ops.",
      type: "ops",
      definition_of_done: "Runbook reviewed.",
    });

    const res = await app.inject({ method: "GET", url: `/skill-matches?project=${projectId}` });
    expect(res.statusCode).toBe(200);
    const report = res.json().data;
    expect(report.task_count).toBe(2);
    expect(report.skill_count).toBe(2);

    // The checkout/React task matches the React skill (title + type hits),
    // not the payments skill.
    const match = report.matches.find((m: { task_id: string }) => m.task_id === frontendTask);
    expect(match).toBeDefined();
    expect(match.skills.length).toBeGreaterThanOrEqual(1);
    expect(match.skills[0].skill_id).toBe(reactSkill);
    expect(match.skills[0].score).toBeGreaterThanOrEqual(3);
    expect(match.skills.map((s: { skill_id: string }) => s.skill_id)).not.toContain(paymentsSkill);

    // The ops runbook task matches neither skill.
    expect(report.unmatched_tasks).toContain(opsTask);

    // Coverage gaps: both skills have zero OPEN matches? No — React has an
    // open match. Payments has none on either axis.
    const reactGap = report.coverage_gaps.find((g: { skill_id: string }) => g.skill_id === reactSkill);
    const payGap = report.coverage_gaps.find((g: { skill_id: string }) => g.skill_id === paymentsSkill);
    expect(reactGap.open_matches).toBe(1);
    expect(reactGap.total_matches).toBe(1);
    expect(payGap.open_matches).toBe(0);
    expect(payGap.total_matches).toBe(0);
    // Gaps sorted with zero-open skills first.
    expect(report.coverage_gaps[0].skill_id).toBe(paymentsSkill);
  });

  it("counts done tasks toward total but not open matches", async () => {
    const projectId = await createProject("SkillMatch Done");
    const backendSkill = await createSkill(projectId, {
      kind: "capability",
      name: "Backend architecture",
      level: "advanced",
    });
    const taskId = await createTask(projectId, {
      title: "Design the backend module layout",
      objective: "Define the backend folder structure.",
      status: undefined,
      definition_of_done: "Layout agreed.",
    });
    await app.inject({ method: "PATCH", url: `/tasks/${taskId}`, payload: { status: "done" } });

    const res = await app.inject({ method: "GET", url: `/skill-matches?project=${projectId}` });
    const report = res.json().data;
    const gap = report.coverage_gaps.find((g: { skill_id: string }) => g.skill_id === backendSkill);
    expect(gap.total_matches).toBe(1);
    expect(gap.open_matches).toBe(0);
  });

  it("is deterministic across repeated calls", async () => {
    const projectId = await createProject("SkillMatch Determinism");
    await createSkill(projectId, { kind: "tech", name: "SQLite tuning", tag: "database" });
    await createTask(projectId, {
      title: "Tune SQLite pragmas for the database layer",
      objective: "Speed up database queries.",
      definition_of_done: "Benchmarks recorded.",
    });
    const first = await app.inject({ method: "GET", url: `/skill-matches?project=${projectId}` });
    const second = await app.inject({ method: "GET", url: `/skill-matches?project=${projectId}` });
    expect(first.json()).toEqual(second.json());
  });
});
