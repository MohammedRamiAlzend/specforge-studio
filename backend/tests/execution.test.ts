/**
 * Prompt 20: execution + delivery feature tests.
 * Covers team members, issues, releases, health analytics, global search,
 * activity feed, and the extended task API (PATCH status/assignee, filters).
 * Each test seeds its own project so IDs restart deterministically per test.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { bootApp, createTestContext, request, seedProject } from "./helpers";

const ctx = createTestContext();
let app: Awaited<ReturnType<typeof bootApp>>;

beforeAll(async () => {
  app = await bootApp(ctx);
});

afterAll(async () => {
  await app.close();
});

async function createMember(projectId: string, name: string, extra: Record<string, unknown> = {}) {
  const res = await request(app, "POST", "/team", { project_id: projectId, name, ...extra });
  return { id: res.json().data.id as string, statusCode: res.statusCode };
}

async function createIssue(projectId: string, title: string, extra: Record<string, unknown> = {}) {
  const res = await request(app, "POST", "/issues", { project_id: projectId, title, kind: "bug", ...extra });
  return { id: res.json().data.id as string, statusCode: res.statusCode };
}

async function createRelease(projectId: string, version: string, name: string, extra: Record<string, unknown> = {}) {
  const res = await request(app, "POST", "/releases", { project_id: projectId, version, name, ...extra });
  return { id: res.json().data.id as string, statusCode: res.statusCode };
}

async function createTask(projectId: string, title: string, extra: Record<string, unknown> = {}) {
  const res = await request(app, "POST", "/tasks", {
    project_id: projectId,
    title,
    objective: "Objective",
    definition_of_done: "Done",
    ...extra,
  });
  return { id: res.json().data.id as string, statusCode: res.statusCode };
}

describe("team members", () => {
  it("creates, lists, and updates a member", async () => {
    const projectId = await seedProject(app);
    const member = await createMember(projectId, "Alice", { email: "alice@acme.dev", role: "backend" });
    expect(member.statusCode).toBe(201);
    expect(member.id).toMatch(/^MEM-\d{4}$/);

    const list = await request(app, "GET", `/team?project=${projectId}`);
    expect(list.statusCode).toBe(200);
    expect(list.json().data).toHaveLength(1);
    expect(list.json().data[0]).toMatchObject({ name: "Alice", role: "backend" });

    const patched = await request(app, "PATCH", `/team/${member.id}`, { role: "frontend" });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().data.role).toBe("frontend");
  });

  it("rejects an invalid email and a missing project", async () => {
    const projectId = await seedProject(app);
    const badEmail = await request(app, "POST", "/team", { project_id: projectId, name: "Bob", email: "nope" });
    expect(badEmail.statusCode).toBe(400);
    const noProject = await request(app, "POST", "/team", { project_id: "PRJ-9999", name: "C" });
    expect(noProject.statusCode).toBe(404);
  });
});

describe("issues", () => {
  it("creates and lists issues with filters", async () => {
    const projectId = await seedProject(app);
    await createIssue(projectId, "Login is slow", { kind: "bug", severity: "high" });
    await createIssue(projectId, "Add dark mode", { kind: "enhancement", severity: "low" });

    const all = await request(app, "GET", `/issues?project=${projectId}`);
    expect(all.statusCode).toBe(200);
    expect(all.json().data).toHaveLength(2);

    const bugs = await request(app, "GET", `/issues?project=${projectId}&status=open&kind=bug`);
    expect(bugs.json().data).toHaveLength(1);
    expect(bugs.json().data[0]).toMatchObject({ kind: "bug", severity: "high" });
  });

  it("transitions an issue status and logs the event", async () => {
    const projectId = await seedProject(app);
    const { id } = await createIssue(projectId, "Crash on submit");
    const moved = await request(app, "PATCH", `/issues/${id}`, { status: "in_progress" });
    expect(moved.statusCode).toBe(200);
    expect(moved.json().data.status).toBe("in_progress");

    const audit = await request(app, "GET", "/audit");
    const events = audit.json().data as { entity_type: string; entity_id: string; action: string }[];
    expect(events.some((e) => e.entity_type === "issue" && e.entity_id === id && e.action === "status_change")).toBe(true);
  });

  it("validates referenced artifacts", async () => {
    const projectId = await seedProject(app);
    const bad = await request(app, "POST", "/issues", {
      project_id: projectId,
      title: "X",
      requirement_id: "REQ-9999",
    });
    expect(bad.statusCode).toBe(400);
  });
});

describe("releases", () => {
  it("creates, lists, and releases a version", async () => {
    const projectId = await seedProject(app);
    const release = await createRelease(projectId, "1.0.0", "MVP", { status: "planned" });
    expect(release.statusCode).toBe(201);
    expect(release.id).toMatch(/^RLS-\d{4}$/);

    const list = await request(app, "GET", `/releases?project=${projectId}`);
    expect(list.json().data).toHaveLength(1);

    const shipped = await request(app, "PATCH", `/releases/${release.id}`, {
      status: "released",
      released_at: "2026-08-17T00:00:00Z",
    });
    expect(shipped.statusCode).toBe(200);
    expect(shipped.json().data).toMatchObject({ status: "released" });
  });
});

describe("task execution API (Prompt 20)", () => {
  it("assigns a member and moves status via PATCH", async () => {
    const projectId = await seedProject(app);
    const member = await createMember(projectId, "Alice");
    const task = await createTask(projectId, "Build login API", { assignee_id: member.id });

    const moved = await request(app, "PATCH", `/tasks/${task.id}`, { status: "in_progress" });
    expect(moved.statusCode).toBe(200);
    expect(moved.json().data).toMatchObject({ status: "in_progress", assignee_id: member.id });

    const filtered = await request(app, "GET", `/tasks?project=${projectId}&assignee=${member.id}&status=in_progress`);
    expect(filtered.json().data).toHaveLength(1);
    expect(filtered.json().data[0].id).toBe(task.id);
  });

  it("rejects assigning a non-existent member", async () => {
    const projectId = await seedProject(app);
    const task = await createTask(projectId, "Write docs");
    const bad = await request(app, "PATCH", `/tasks/${task.id}`, { assignee_id: "MEM-9999" });
    expect(bad.statusCode).toBe(404);
  });

  it("exposes a single task via GET /tasks/:id", async () => {
    const projectId = await seedProject(app);
    const task = await createTask(projectId, "Setup CI");
    const got = await request(app, "GET", `/tasks/${task.id}`);
    expect(got.statusCode).toBe(200);
    expect(got.json().data.title).toBe("Setup CI");
  });
});

describe("project health", () => {
  it("returns computed health metrics for a seeded project", async () => {
    const projectId = await seedProject(app);
    await request(app, "POST", "/requirements", {
      project_id: projectId,
      title: "R1",
      priority: "must",
      status: "approved",
    });
    await createTask(projectId, "T1");
    await createTask(projectId, "T2");
    const t1 = await request(app, "GET", "/tasks?project=" + projectId);
    const first = t1.json().data[0] as { id: string };
    await request(app, "PATCH", `/tasks/${first.id}`, { status: "done" });

    const res = await request(app, "GET", `/projects/${projectId}/health`);
    expect(res.statusCode).toBe(200);
    const health = res.json().data;
    expect(health.requirements.total).toBeGreaterThanOrEqual(1);
    expect(health.tasks).toMatchObject({ done: 1, open: 1, completion: 50 });
    expect(typeof health.validation.errors).toBe("number");
    expect(typeof health.traceability.coverage).toBe("number");
  });

  it("404s for an unknown project", async () => {
    const res = await request(app, "GET", "/projects/PRJ-9999/health");
    expect(res.statusCode).toBe(404);
  });
});

describe("global search", () => {
  it("finds artifacts across tables by text", async () => {
    const projectId = await seedProject(app);
    await request(app, "POST", "/requirements", { project_id: projectId, title: "Handle refunds in checkout" });
    await createIssue(projectId, "Refund flow times out");
    await createMember(projectId, "Refund specialist");

    const res = await request(app, "GET", "/search?q=refund");
    expect(res.statusCode).toBe(200);
    const results = res.json().data as { type: string }[];
    const types = new Set(results.map((r) => r.type));
    expect(types.has("requirement")).toBe(true);
    expect(types.has("issue")).toBe(true);
    expect(types.has("team_member")).toBe(true);
  });

  it("scopes search to a project when requested", async () => {
    const p1 = await seedProject(app);
    const p2 = await seedProject(app);
    await createIssue(p1, "Alpha bug");
    await createIssue(p2, "Alpha enhancement");

    const scoped = await request(app, "GET", `/search?q=alpha&project=${p1}`);
    const ids = (scoped.json().data as { id: string }[]).map((r) => r.id);
    expect(ids.length).toBeGreaterThan(0);
    const unscoped = await request(app, "GET", "/search?q=alpha");
    expect((unscoped.json().data as { id: string }[]).length).toBeGreaterThan(ids.length);
  });
});

describe("activity feed", () => {
  it("returns recent events with pending approvals merged in", async () => {
    const projectId = await seedProject(app);
    await createIssue(projectId, "Activity target");
    await createTask(projectId, "Task activity");

    const res = await request(app, "GET", `/activity?project=${projectId}`);
    expect(res.statusCode).toBe(200);
    const items = res.json().data as { entity_type: string; entity_id: string }[];
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((i) => i.entity_type === "issue")).toBe(true);
  });

  it("returns cross-project activity when no project is given", async () => {
    const projectId = await seedProject(app);
    await createRelease(projectId, "0.1.0", "Beta");
    const res = await request(app, "GET", "/activity?limit=20");
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBeGreaterThan(0);
  });
});

describe("docs integration (Prompt 20)", () => {
  it("appends issues.md and releases.md at the end of the workspace", async () => {
    const projectId = await seedProject(app);
    await createIssue(projectId, "Bug: pagination");
    await createRelease(projectId, "1.0.0", "MVP", { status: "released", notes: "First release." });

    const docs = await request(app, "POST", "/docs/generate", { project_id: projectId });
    expect(docs.statusCode).toBe(201);
    const files = docs.json().data.files as { path: string; content: string }[];
    const issuesDoc = files.find((f) => f.path === "05-testing/issues.md");
    const releasesDoc = files.find((f) => f.path === "06-ops/releases.md");
    expect(issuesDoc).toBeDefined();
    expect(issuesDoc!.content).toContain("# Issues");
    expect(issuesDoc!.content).toContain("Bug: pagination");
    expect(releasesDoc).toBeDefined();
    expect(releasesDoc!.content).toContain("# Releases");
    expect(releasesDoc!.content).toContain("First release.");

    const idx = files.map((f) => f.path);
    expect(idx.indexOf("05-testing/issues.md")).toBeGreaterThan(idx.indexOf("07-guides/skills.md"));
  });
});