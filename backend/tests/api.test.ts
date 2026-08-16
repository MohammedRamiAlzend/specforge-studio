/**
 * Backend API tests (Prompt 12 requirement 1).
 * Exercises the HTTP surface through fastify.inject against an in-memory DB.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { bootApp, createTestContext, request, seedProject, seedRequirement } from "./helpers";

const ctx = createTestContext();
let app: Awaited<ReturnType<typeof bootApp>>;

beforeAll(async () => {
  app = await bootApp(ctx);
});

afterAll(async () => {
  await app.close();
});

describe("GET /healthz", () => {
  it("returns 200 and status ok", async () => {
    const res = await request(app, "GET", "/healthz");
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("ok");
  });
});

describe("projects CRUD", () => {
  let projectId = "";

  it("creates a project with sequential ID", async () => {
    const res = await request(app, "POST", "/projects", {
      name: "Demo web app",
      type: "web",
      created_by: "owner@internal",
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.id).toBe("PRJ-0001");
    expect(res.json().data.status).toBe("draft");
    projectId = res.json().data.id;
  });

  it("lists projects", async () => {
    const res = await request(app, "GET", "/projects");
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(1);
  });

  it("gets a single project", async () => {
    const res = await request(app, "GET", `/projects/${projectId}`);
    expect(res.statusCode).toBe(200);
    expect(res.json().data.name).toBe("Demo web app");
  });

  it("patches a project", async () => {
    const res = await request(app, "PATCH", `/projects/${projectId}`, { status: "active" });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe("active");
  });

  it("rejects invalid payloads with VALIDATION_ERROR", async () => {
    const res = await request(app, "POST", "/projects", { name: "" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 for unknown ids", async () => {
    const res = await request(app, "GET", "/projects/PRJ-9999");
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });
});

describe("dependent artifact APIs", () => {
  let projectId = "";

  beforeAll(async () => {
    projectId = await seedProject(app);
    await seedRequirement(app, projectId);
  });

  it("creates requirements, use cases, workflows, entities, api endpoints, tasks", async () => {
    const uc = await request(app, "POST", "/use-cases", {
      project_id: projectId,
      title: "User logs in",
      actor: "User",
      main_flow: ["Open login", "Enter credentials", "Submit"],
    });
    expect(uc.statusCode).toBe(201);
    expect(uc.json().data.id).toBe("UC-0001");

    const wf = await request(app, "POST", "/workflows", { project_id: projectId, name: "Onboarding" });
    expect(wf.statusCode).toBe(201);

    const ent = await request(app, "POST", "/entities", { project_id: projectId, name: "user_account" });
    expect(ent.statusCode).toBe(201);
    expect(ent.json().data.id).toBe("DB-0001");

    const api = await request(app, "POST", "/api-endpoints", {
      project_id: projectId,
      method: "POST",
      path: "/auth/login",
      request_schema: { email: "string" },
      response_schema: { token: "string" },
      error_codes: [{ code: "401", description: "Invalid credentials" }],
    });
    expect(api.statusCode).toBe(201);
    expect(api.json().data.id).toBe("API-0001");

    const task = await request(app, "POST", "/tasks", {
      project_id: projectId,
      title: "Implement login endpoint",
      type: "backend",
      objective: "Create POST /auth/login",
      definition_of_done: "Endpoint returns token on valid credentials",
      checklist: ["Add route", "Validate with Zod", "Add unit test"],
    });
    expect(task.statusCode).toBe(201);
    expect(task.json().data.id).toBe("TASK-0001");
  });

  it("lists artifacts with project filter", async () => {
    const res = await request(app, "GET", `/requirements?project=${projectId}`);
    expect(res.statusCode).toBe(200);
    expect(res.json().data.some((r: { id: string }) => r.id === "REQ-0001")).toBe(true);
  });

  it("returns empty lists for unknown projects", async () => {
    const res = await request(app, "GET", "/entities?project=PRJ-4242");
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(0);
  });

  it("rejects artifacts referencing unknown projects", async () => {
    const res = await request(app, "POST", "/requirements", {
      project_id: "PRJ-4242",
      title: "Orphan",
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /artifacts index", () => {
  it("returns every artifact id including seeded requirements", async () => {
    const res = await request(app, "GET", "/artifacts");
    expect(res.statusCode).toBe(200);
    const ids = (res.json().data as { id: string }[]).map((a) => a.id);
    expect(ids).toContain("REQ-0001");
  });
});
