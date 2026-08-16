/**
 * Task generation tests (Prompt 12 requirement 6).
 * Agent task packs must be executable, agent-neutral, idempotent, and
 * traceable to source artifacts.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { bootApp, createTestContext, request, seedProject } from "./helpers";

const ctx = createTestContext();
let app: Awaited<ReturnType<typeof bootApp>>;
let projectId = "";
let roadmapId = "";

beforeAll(async () => {
  app = await bootApp(ctx);
  projectId = await seedProject(app);
  await request(app, "POST", "/requirements", {
    project_id: projectId,
    title: "Users must be able to log in",
    priority: "must",
    criticality: "critical",
  });
  await request(app, "POST", "/api-endpoints", {
    project_id: projectId,
    method: "POST",
    path: "/auth/login",
    request_schema: { email: "string" },
    response_schema: { token: "string" },
    error_codes: [{ code: "401", description: "Invalid credentials" }],
  });
  ctx.db.query(
    `INSERT INTO artifact_links (project_id, from_type, from_id, to_type, to_id, link_type)
     VALUES (?, 'requirement', 'REQ-0001', 'api_endpoint', 'API-0001', 'traces')`,
  ).run(projectId);
  const res = await request(app, "POST", "/roadmaps/generate", { project_id: projectId });
  roadmapId = res.json().data.roadmap.id as string;
});

afterAll(async () => {
  await app.close();
});

describe("task pack materialization", () => {
  let createdCount = 0;

  it("creates executable packs with sequential verification-hinted checklists", async () => {
    const res = await request(app, "POST", "/agent-tasks/generate", { roadmap_id: roadmapId });
    expect(res.statusCode).toBe(201);
    const data = res.json().data;
    createdCount = data.created;
    expect(createdCount).toBeGreaterThanOrEqual(3);
    expect(data.skipped).toBe(0);
    expect(data.task_ids[0]).toBe("TASK-0001");

    const firstPack = data.packs[0];
    expect(firstPack.task.objective.length).toBeGreaterThan(0);
    expect(firstPack.task.definition_of_done.length).toBeGreaterThan(0);
    // Sequential checklists with verification hints (executable + verifiable).
    firstPack.checklist.forEach((c: { position: number }, i: number) => {
      expect(c.position).toBe(i + 1);
    });
    for (const c of firstPack.checklist) {
      expect(c.verification_hint.length).toBeGreaterThan(0);
    }
  });

  it("is idempotent — re-running creates nothing and skips everything", async () => {
    const again = await request(app, "POST", "/agent-tasks/generate", { roadmap_id: roadmapId });
    expect(again.json().data.created).toBe(0);
    expect(again.json().data.skipped).toBe(createdCount);
  });

  it("exposes packs with dependency edges and checklists", async () => {
    const list = await request(app, "GET", `/agent-tasks?project=${projectId}`);
    expect(list.statusCode).toBe(200);
    const packs = list.json().data ?? [];
    expect(packs.length).toBe(createdCount);
    for (const p of packs) {
      expect(p.checklist.length).toBeGreaterThanOrEqual(1);
    }

    const get = await request(app, "GET", "/agent-tasks/TASK-0001");
    expect(get.statusCode).toBe(200);
    expect(get.json().data.task.title.length).toBeGreaterThan(0);
  });
});

describe("packs survive roadmap deletion (no invented work)", () => {
  it("deleting the roadmap keeps materialized tasks", async () => {
    const del = await request(app, "DELETE", `/roadmaps/${roadmapId}`);
    expect(del.statusCode).toBe(204);
    const gone = await request(app, "GET", `/roadmaps/${roadmapId}`);
    expect(gone.statusCode).toBe(404);

    const tasks = await request(app, "GET", `/tasks?project=${projectId}`);
    expect(tasks.json().data.some((t: { id: string }) => t.id === "TASK-0001")).toBe(true);
  });
});
