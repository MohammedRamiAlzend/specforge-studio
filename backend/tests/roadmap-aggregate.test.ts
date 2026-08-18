/**
 * Workspace roadmap aggregation tests (OPT-003).
 * GET /roadmaps/aggregate?project=:id returns the root project plus every
 * directly linked project (PDEP dependencies + dependents) with per-project
 * roadmap summaries (phases/milestones/task stats + execution progress).
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { bootApp, createTestContext, request, seedProject } from "./helpers";

const ctx = createTestContext();
let app: Awaited<ReturnType<typeof bootApp>>;
let rootId = "";
let depId = ""; // depends on root (root -> dep)
let depOnRootId = ""; // depends on root's dependency... actually a dependent of root
let unrelatedId = "";

async function seedArtifacts(projectId: string): Promise<void> {
  await request(app, "POST", "/requirements", {
    project_id: projectId,
    title: "Customers can complete checkout",
    priority: "must",
    criticality: "critical",
  });
}

beforeAll(async () => {
  app = await bootApp(ctx);
  rootId = await seedProject(app);
  depId = (await request(app, "POST", "/projects", { name: "Order API", type: "api", created_by: "t@t" })).json().data.id;
  depOnRootId = (await request(app, "POST", "/projects", { name: "Storefront", type: "web", created_by: "t@t" })).json().data.id;
  unrelatedId = (await request(app, "POST", "/projects", { name: "Unrelated", type: "ai", created_by: "t@t" })).json().data.id;

  // root -> dep (data), depOnRoot -> root (so depOnRoot is a dependent of root).
  await request(app, "POST", `/projects/${rootId}/dependencies`, { depends_on_project_id: depId, kind: "data" });
  await request(app, "POST", `/projects/${depOnRootId}/dependencies`, { depends_on_project_id: rootId, kind: "workflow_call" });

  // Roadmaps for root + dep; depOnRoot and unrelated have none.
  await seedArtifacts(rootId);
  await seedArtifacts(depId);
  await request(app, "POST", "/roadmaps/generate", { project_id: rootId });
  await request(app, "POST", "/roadmaps/generate", { project_id: depId });
});

afterAll(async () => {
  await app.close();
});

describe("workspace roadmap aggregation", () => {
  it("includes the root, linked projects, and excludes unrelated projects", async () => {
    const res = await request(app, "GET", `/roadmaps/aggregate?project=${rootId}`);
    expect(res.statusCode).toBe(200);
    const data = res.json().data;

    expect(data.root_project_id).toBe(rootId);
    expect(data.projects).toHaveLength(3);
    expect(data.projects.map((p: { project_id: string }) => p.project_id)).not.toContain(unrelatedId);

    // Root first (deterministic ordering).
    expect(data.projects[0].project_id).toBe(rootId);
    expect(data.projects[0].link_kind).toBe("self");

    const byId = new Map<string, { project_id: string; link_kind: string }>(
      data.projects.map(
        (p: { project_id: string; link_kind: string }) => [p.project_id, p] as [string, { project_id: string; link_kind: string }],
      ),
    );
    expect(byId.get(depId)?.link_kind).toBe("data");
    expect(byId.get(depOnRootId)?.link_kind).toBe("dependent");
  });

  it("computes per-project roadmap metrics and workspace totals", async () => {
    const res = await request(app, "GET", `/roadmaps/aggregate?project=${rootId}`);
    const data = res.json().data;

    const root = data.projects.find((p: { project_id: string }) => p.project_id === rootId);
    const dep = data.projects.find((p: { project_id: string }) => p.project_id === depId);
    const noRoadmap = data.projects.find((p: { project_id: string }) => p.project_id === depOnRootId);

    // Projects with roadmaps carry the generated RMP id + phase/milestone counts.
    expect(root.roadmap_id).toBe("RMP-0001");
    expect(dep.roadmap_id).toBe("RMP-0002");
    expect(root.phases).toBe(5);
    expect(root.milestones).toBe(5);
    expect(root.epics).toBeGreaterThanOrEqual(5);
    expect(root.tasks_total).toBeGreaterThanOrEqual(2);

    // Projects without a roadmap report zeros and null roadmap fields.
    expect(noRoadmap.roadmap_id).toBeNull();
    expect(noRoadmap.tasks_total).toBe(0);
    expect(noRoadmap.completion).toBe(0);

    // Workspace totals aggregate across the included projects only.
    expect(data.totals.projects).toBe(3);
    expect(data.totals.roadmaps).toBe(2);
    expect(data.totals.phases).toBe(10);
    expect(data.totals.milestones).toBe(10);
    expect(data.totals.tasks_total).toBe(root.tasks_total + dep.tasks_total);
    expect(data.totals.tasks_done).toBe(0);
    expect(data.totals.completion).toBe(0);
  });

  it("reflects packaged task packs and executed (done) tasks", async () => {
    // Package dep's roadmap into canonical task packs, then mark one done.
    const packed = await request(app, "POST", "/agent-tasks/generate", { roadmap_id: "RMP-0002" });
    expect(packed.statusCode).toBe(201);
    const tasks = await request(app, "GET", `/tasks?project=${depId}`);
    const first = tasks.json().data[0] as { id: string };
    const patch = await request(app, "PATCH", `/tasks/${first.id}`, { status: "done" });
    expect(patch.statusCode).toBe(200);

    const res = await request(app, "GET", `/roadmaps/aggregate?project=${rootId}`);
    const dep = res.json().data.projects.find((p: { project_id: string }) => p.project_id === depId);
    expect(dep.tasks_packaged).toBeGreaterThan(0);
    expect(dep.tasks_done).toBeGreaterThanOrEqual(1);
    expect(dep.completion).toBe(Math.round((dep.tasks_done / dep.tasks_total) * 100));

    const totals = res.json().data.totals;
    expect(totals.tasks_packaged).toBeGreaterThan(0);
    expect(totals.tasks_done).toBeGreaterThanOrEqual(1);
    expect(totals.completion).toBe(Math.round((totals.tasks_done / totals.tasks_total) * 100));
  });

  it("returns 404 for an unknown project", async () => {
    const res = await request(app, "GET", "/roadmaps/aggregate?project=PRJ-9999");
    expect(res.statusCode).toBe(404);
  });

  it("aggregates a single project with no links", async () => {
    const res = await request(app, "GET", `/roadmaps/aggregate?project=${unrelatedId}`);
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data.projects).toHaveLength(1);
    expect(data.projects[0].project_id).toBe(unrelatedId);
    expect(data.projects[0].link_kind).toBe("self");
    expect(data.totals.projects).toBe(1);
    expect(data.totals.roadmaps).toBe(0);
  });
});
