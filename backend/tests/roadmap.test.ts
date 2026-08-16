/**
 * Roadmap generation tests (Prompt 12 requirement 5).
 * The roadmap is derived deterministically from project artifacts.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { bootApp, createTestContext, request, seedProject } from "./helpers";

const ctx = createTestContext();
let app: Awaited<ReturnType<typeof bootApp>>;
let projectId = "";

beforeAll(async () => {
  app = await bootApp(ctx);
  projectId = await seedProject(app);
  // Seed the artifact surface the roadmap derives from.
  await request(app, "POST", "/requirements", {
    project_id: projectId,
    title: "Customers can complete checkout",
    priority: "must",
    criticality: "critical",
  });
  await request(app, "POST", "/api-endpoints", {
    project_id: projectId,
    method: "POST",
    path: "/api/orders",
    request_schema: { items: "array" },
    response_schema: { order_id: "string" },
    error_codes: [{ code: "400", description: "Cart is empty" }],
  });
  // Link REQ -> API so the roadmap derives a dependency edge.
  ctx.db.query(
    `INSERT INTO artifact_links (project_id, from_type, from_id, to_type, to_id, link_type)
     VALUES (?, 'requirement', 'REQ-0001', 'api_endpoint', 'API-0001', 'traces')`,
  ).run(projectId);
});

afterAll(async () => {
  await app.close();
});

describe("roadmap generation", () => {
  it("derives phases, milestones, epics, task drafts, and dependencies", async () => {
    const res = await request(app, "POST", "/roadmaps/generate", { project_id: projectId });
    expect(res.statusCode).toBe(201);
    const data = res.json().data;
    expect(data.roadmap.id).toBe("RMP-0001");

    // 5 phases; gated phases carry gate criteria (Definition + Validation gated).
    expect(data.phases).toHaveLength(5);
    const gated = data.phases.filter((p: { approval_required: number }) => p.approval_required === 1);
    expect(gated.length).toBeGreaterThanOrEqual(2);
    for (const phase of gated) {
      expect(phase.gate_criteria.length).toBeGreaterThan(0);
    }
    expect(data.phases[0].name).toBe("Definition");
    expect(data.phases[0].approval_required).toBe(1);

    // 5 milestones with relative due dates.
    expect(data.milestones).toHaveLength(5);
    for (const milestone of data.milestones) {
      expect(milestone.due_date.length).toBeGreaterThan(0);
    }

    // Epics: per-module + cross-cutting.
    expect(data.epics.some((e: { name: string }) => e.name === "Requirements & Scope")).toBe(true);

    // Task drafts: concrete, prioritized, with verification-hinted checklists.
    const tasks = data.tasks ?? [];
    expect(tasks.length).toBeGreaterThanOrEqual(3);
    for (const t of tasks) {
      expect(t.checklist.length).toBeGreaterThan(0);
      expect(t.checklist.every((c: { verification: string }) => Boolean(c.verification))).toBe(true);
    }

    // REQ task is high priority; API task is backend-typed; dependency REQ -> API.
    const bySource = new Map<string, string>();
    for (const t of tasks) bySource.set(`${t.source_type}:${t.source_id}`, t.id);
    const reqTask = tasks.find((t: { source_id: string }) => t.source_id === "REQ-0001");
    expect(reqTask.priority).toBe("high");
    expect(reqTask.input_artifacts).toContain("REQ-0001");
    expect(data.dependencies.some(
      (d: { task_id: string; depends_on_task_id: string }) =>
        d.task_id === bySource.get("requirement:REQ-0001") &&
        d.depends_on_task_id === bySource.get("api_endpoint:API-0001"),
    )).toBe(true);
    const apiTask = tasks.find((t: { source_id: string }) => t.source_id === "API-0001");
    expect(apiTask.type).toBe("backend");
  });
});

describe("roadmap list + detail", () => {
  it("lists roadmaps and returns milestone due dates in detail", async () => {
    const list = await request(app, "GET", `/roadmaps?project=${projectId}`);
    expect(list.statusCode).toBe(200);
    expect(list.json().data.some((r: { id: string }) => r.id === "RMP-0001")).toBe(true);

    const get = await request(app, "GET", "/roadmaps/RMP-0001");
    expect(get.statusCode).toBe(200);
    for (const m of get.json().data.milestones) {
      expect(m.due_date.length).toBeGreaterThan(0);
    }
  });
});
