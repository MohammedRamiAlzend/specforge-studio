/**
 * Validation rules tests (Prompt 12 requirement 8).
 * Automatic checks: workflow start/end, decision branches, requirement test
 * coverage, API input/output/errors, entity primary keys, task checklists,
 * no orphan artifacts, no broken traceability links.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { bootApp, createTestContext, request, seedProject, seedRequirement } from "./helpers";

const ctx = createTestContext();
let app: Awaited<ReturnType<typeof bootApp>>;
let projectId = "";

beforeAll(async () => {
  app = await bootApp(ctx);
  projectId = await seedProject(app);
});

afterAll(async () => {
  await app.close();
});

describe("modeler validation rules", () => {
  it("flags workflows without a start node", async () => {
    const res = await request(app, "POST", "/modeler/validate", {
      kind: "workflow",
      nodes: [
        { key: "a", type: "step", title: "Do work", position: { x: 0, y: 0 } },
        { key: "b", type: "decision", title: "Check", position: { x: 200, y: 0 } },
        { key: "c", type: "end", title: "End", position: { x: 400, y: 0 } },
      ],
      edges: [
        { key: "e1", source: "a", target: "b", type: "next" },
        { key: "e2", source: "b", target: "c", type: "success" },
      ],
    });
    expect(res.statusCode).toBe(200);
    const codes = res.json().data.warnings.map((w: { code: string }) => w.code);
    expect(codes).toContain("NO_START");
    // Decision edge without a condition (TR-04) is also reported.
    expect(codes).toContain("DECISION_EDGE_NO_CONDITION");
  });

  it("flags multiple start/end nodes", async () => {
    const res = await request(app, "POST", "/modeler/validate", {
      kind: "workflow",
      nodes: [
        { key: "s1", type: "start", title: "Start 1", position: { x: 0, y: 0 } },
        { key: "s2", type: "start", title: "Start 2", position: { x: 0, y: 100 } },
        { key: "e1", type: "end", title: "End 1", position: { x: 0, y: 200 } },
        { key: "e2", type: "end", title: "End 2", position: { x: 0, y: 300 } },
      ],
      edges: [],
    });
    const codes = res.json().data.warnings.map((w: { code: string }) => w.code);
    expect(codes).toContain("MULTIPLE_START");
    expect(codes).toContain("MULTIPLE_END");
  });

  it("surfaces unknown node types as clear errors and rejects them on save", async () => {
    const res = await request(app, "POST", "/modeler/validate", {
      kind: "workflow",
      nodes: [{ key: "x", type: "bogus", title: "X", position: { x: 0, y: 0 } }],
      edges: [],
    });
    expect(res.statusCode).toBe(200);
    const warning = res.json().data.warnings.find((w: { code: string }) => w.code === "UNKNOWN_NODE_TYPE");
    expect(warning.level).toBe("error");
    expect(warning.message).toContain("bogus");

    // Persisting an invalid type is rejected outright (clear validation error).
    const created = await request(app, "POST", "/modeler/graphs", {
      project_id: projectId,
      kind: "workflow",
      name: "Bad graph",
    });
    const graphId = created.json().data.id as string;
    const save = await request(app, "PUT", `/modeler/graphs/${graphId}`, {
      nodes: [{ key: "x", type: "bogus", title: "X", position: { x: 0, y: 0 } }],
      edges: [],
    });
    expect(save.statusCode).toBe(400);
  });
});

describe("governance validation rules (TR)", () => {
  it("reports TR-01 when a requirement has no use-case/workflow link", async () => {
    await seedRequirement(app, projectId);
    const res = await request(app, "GET", `/governance/validation?project=${projectId}`);
    expect(res.statusCode).toBe(200);
    const all = res.json().data.all;
    const tr01 = all.find((w: { rule: string }) => w.rule === "TR-01");
    expect(tr01.violations).toContain("REQ-0001");
  });

  it("reports TR-07 as an error when a critical requirement has no test coverage", async () => {
    const res = await request(app, "GET", `/governance/validation?project=${projectId}`);
    const tr07 = res.json().data.all.find((w: { rule: string }) => w.rule === "TR-07");
    expect(tr07.level).toBe("error");
    expect(tr07.violations).toContain("REQ-0001");
  });

  it("reports TR-05 when an entity lacks exactly one primary key", async () => {
    await request(app, "POST", "/entities", { project_id: projectId, name: "user_account" });
    const res = await request(app, "GET", `/governance/validation?project=${projectId}`);
    const tr05 = res.json().data.all.find((w: { rule: string }) => w.rule === "TR-05");
    expect(tr05.violations).toContain("DB-0001");
  });

  it("reports TR-06 when an API endpoint lacks input/output/errors", async () => {
    await request(app, "POST", "/api-endpoints", {
      project_id: projectId,
      method: "GET",
      path: "/incomplete",
    });
    const res = await request(app, "GET", `/governance/validation?project=${projectId}`);
    const tr06 = res.json().data.all.find((w: { rule: string }) => w.rule === "TR-06");
    expect(tr06.violations).toContain("API-0001");
  });
});

describe("traceability coverage + orphan detection", () => {
  it("reports uncovered requirements and broken links", async () => {
    // REQ-0002 has no links at all -> uncovered.
    await seedRequirement(app, projectId, "Requirement without any links");
    // A link pointing at a non-existent task = broken traceability link.
    ctx.db.query(
      `INSERT INTO artifact_links (project_id, from_type, from_id, to_type, to_id, link_type)
       VALUES (?, 'requirement', 'REQ-0001', 'task', 'TASK-9999', 'realizes')`,
    ).run(projectId);

    const res = await request(app, "GET", `/governance/traceability?project=${projectId}`);
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data.requirements_coverage.some((c: { id: string }) => c.id === "REQ-0001")).toBe(true);
    expect(data.summary.uncovered_ids).toContain("REQ-0002");
    const orphan = data.orphan_references.find((o: { reference: string }) => o.reference.includes("TASK-9999"));
    expect(orphan).toBeDefined();
  });
});
