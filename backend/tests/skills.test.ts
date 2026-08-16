/**
 * Per-project skills tests (Prompt 16).
 * Exercises the skills CRUD API: capability vs tech validation, project
 * isolation, sorting, cascade on project delete, and the audit trail.
 * Each test seeds its own project; skill IDs are captured from responses so
 * the shared in-memory DB (one app per file) never breaks ID assumptions.
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

async function createSkill(
  projectId: string,
  body: Record<string, unknown>,
): Promise<{ id: string; statusCode: number }> {
  const res = await request(app, "POST", "/skills", { project_id: projectId, ...body });
  return { id: res.json().data?.id ?? "", statusCode: res.statusCode };
}

describe("skills CRUD", () => {
  it("creates capability and tech skills", async () => {
    const projectId = await seedProject(app);

    const capability = await request(app, "POST", "/skills", {
      project_id: projectId,
      kind: "capability",
      name: "Payments engineering",
      description: "PCI-sensitive payment integration.",
      level: "expert",
    });
    expect(capability.statusCode).toBe(201);
    expect(capability.json().data.id).toMatch(/^SKL-\d{4}$/);
    expect(capability.json().data).toMatchObject({
      project_id: projectId,
      kind: "capability",
      level: "expert",
      tag: null,
    });

    const tech = await request(app, "POST", "/skills", {
      project_id: projectId,
      kind: "tech",
      name: "React",
      tag: "frontend",
      sort_order: 2,
    });
    expect(tech.statusCode).toBe(201);
    expect(tech.json().data).toMatchObject({ kind: "tech", tag: "frontend", level: null, sort_order: 2 });
  });

  it("lists skills filtered by project, ordered by sort_order", async () => {
    const projectId = await seedProject(app);
    await createSkill(projectId, { kind: "tech", name: "Zustand", tag: "frontend", sort_order: 5 });
    await createSkill(projectId, { kind: "capability", name: "API design", level: "advanced", sort_order: 1 });
    const res = await request(app, "GET", `/skills?project=${projectId}`);
    expect(res.statusCode).toBe(200);
    const skills = res.json().data;
    expect(skills).toHaveLength(2);
    expect(skills[0].name).toBe("API design"); // sort_order 1 first
    expect(skills[1].name).toBe("Zustand");   // sort_order 5 second
  });

  it("edits a skill", async () => {
    const projectId = await seedProject(app);
    const { id } = await createSkill(projectId, { kind: "capability", name: "UX", level: "beginner" });
    const patched = await request(app, "PATCH", `/skills/${id}`, {
      name: "UX research",
      level: "intermediate",
      description: "User research and flows.",
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().data).toMatchObject({ name: "UX research", level: "intermediate" });
  });

  it("deletes a skill", async () => {
    const projectId = await seedProject(app);
    const { id } = await createSkill(projectId, { kind: "tech", name: "Docker", tag: "ops" });
    const del = await request(app, "DELETE", `/skills/${id}`);
    expect(del.statusCode).toBe(204);
    const gone = await request(app, "DELETE", `/skills/${id}`);
    expect(gone.statusCode).toBe(404);
  });
});

describe("skills validation", () => {
  it("requires a level for capability skills", async () => {
    const projectId = await seedProject(app);
    const res = await request(app, "POST", "/skills", { project_id: projectId, kind: "capability", name: "Payments" });
    expect(res.statusCode).toBe(400);
  });

  it("rejects a level on tech skills", async () => {
    const projectId = await seedProject(app);
    const res = await request(app, "POST", "/skills", { project_id: projectId, kind: "tech", name: "React", level: "expert" });
    expect(res.statusCode).toBe(400);
  });

  it("rejects an empty tag on tech skills", async () => {
    const projectId = await seedProject(app);
    const res = await request(app, "POST", "/skills", { project_id: projectId, kind: "tech", name: "React", tag: "   " });
    expect(res.statusCode).toBe(400);
  });

  it("rejects an invalid kind and a missing name", async () => {
    const projectId = await seedProject(app);
    const badKind = await request(app, "POST", "/skills", { project_id: projectId, kind: "other", name: "X" });
    expect(badKind.statusCode).toBe(400);
    const noName = await request(app, "POST", "/skills", { project_id: projectId, kind: "tech", name: "" });
    expect(noName.statusCode).toBe(400);
  });

  it("requires the project to exist", async () => {
    const res = await request(app, "POST", "/skills", {
      project_id: "PRJ-9999",
      kind: "tech",
      name: "React",
      tag: "frontend",
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("skills project isolation + cascade", () => {
  it("only returns the requested project's skills", async () => {
    const p1 = await seedProject(app);
    const p2 = await seedProject(app);
    await createSkill(p1, { kind: "tech", name: "React", tag: "frontend" });
    await createSkill(p2, { kind: "tech", name: "Vue", tag: "frontend" });

    const list1 = (await request(app, "GET", `/skills?project=${p1}`)).json().data;
    expect(list1).toHaveLength(1);
    expect(list1[0].name).toBe("React");

    const list2 = (await request(app, "GET", `/skills?project=${p2}`)).json().data;
    expect(list2).toHaveLength(1);
    expect(list2[0].name).toBe("Vue");
  });

  it("cascades skills when the project is deleted", async () => {
    const projectId = await seedProject(app);
    await createSkill(projectId, { kind: "capability", name: "SRE", level: "expert" });
    ctx.db.query("DELETE FROM projects WHERE id = ?").run(projectId);
    const list = (await request(app, "GET", `/skills?project=${projectId}`)).json().data;
    expect(list).toHaveLength(0);
  });
});

describe("skills docs integration", () => {
  it("renders skills.md in the workspace with both sections", async () => {
    const projectId = await seedProject(app);
    await createSkill(projectId, { kind: "capability", name: "Payments engineering", level: "expert" });
    await createSkill(projectId, { kind: "tech", name: "React", tag: "frontend" });

    const docs = await request(app, "POST", "/docs/generate", { project_id: projectId });
    expect(docs.statusCode).toBe(201);
    const files = docs.json().data.files as { path: string; content: string }[];
    const skillsDoc = files.find((f) => f.path === "07-guides/skills.md");
    expect(skillsDoc).toBeDefined();
    expect(skillsDoc!.content).toContain("# Skills");
    expect(skillsDoc!.content).toContain("Capability Skills");
    expect(skillsDoc!.content).toContain("Payments engineering");
    expect(skillsDoc!.content).toContain("Tech Skills");
    expect(skillsDoc!.content).toContain("React");
  });

  it("still renders skills.md with empty states when there are no skills", async () => {
    const projectId = await seedProject(app);
    const docs = await request(app, "POST", "/docs/generate", { project_id: projectId });
    const files = docs.json().data.files as { path: string; content: string }[];
    const skillsDoc = files.find((f) => f.path === "07-guides/skills.md");
    expect(skillsDoc!.content).toContain("No capability skills defined yet.");
    expect(skillsDoc!.content).toContain("No tech skills defined yet.");
  });
});

describe("skills audit trail", () => {
  it("logs skill changes with entity_type skill", async () => {
    const projectId = await seedProject(app);
    const { id } = await createSkill(projectId, { kind: "tech", name: "React", tag: "frontend" });
    const logs = await request(app, "GET", "/audit");
    const events = logs.json().data as { entity_type: string; entity_id: string; action: string }[];
    expect(events.some((e) => e.entity_type === "skill" && e.entity_id === id && e.action === "created")).toBe(true);
  });
});