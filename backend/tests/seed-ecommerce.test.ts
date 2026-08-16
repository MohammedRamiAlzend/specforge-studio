/**
 * E-commerce full-detail seeder tests (Prompt 18).
 *
 * Verifies the StoreSphere demo is complete and self-consistent: every
 * artifact surface is populated, type/library assignments resolve to real
 * platform config, skills follow the rules, diagrams and docs generate, the
 * roadmap derives task packs, and the demo coexists with the Acme example in
 * one database.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createTestContext, bootApp, request } from "./helpers";
import { seedEcommerceProject } from "../scripts/seed-ecommerce";
import { seedDemoProject } from "../scripts/seed-data";

const ctx = createTestContext();
let app: Awaited<ReturnType<typeof bootApp>>;
let db: ReturnType<typeof createTestContext>["db"];

const PROJECT_ID = "PRJ-0003";
const GRAPH_ID = "GRPH-0003";

const count = (table: string, where = "1=1"): number => {
  const row = db.query(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`).get() as { n: number };
  return Number(row.n);
};

beforeAll(async () => {
  app = await bootApp(ctx);
  db = ctx.db;
  seedDemoProject(db, { projectId: "PRJ-0002", graphId: "GRPH-0002" });
  seedEcommerceProject(db, { projectId: PROJECT_ID, graphId: GRAPH_ID });
});

afterAll(async () => {
  await app.close();
});

describe("e-commerce seeder content", () => {
  it("seeds the project with .NET API + React web type assignments", () => {
    expect(count("projects", `id = '${PROJECT_ID}'`)).toBe(1);
    const stacks = db
      .query(
        `SELECT st.name AS name FROM project_type_config ptc
         JOIN stacks st ON st.id = ptc.stack_id WHERE ptc.project_id = ? ORDER BY st.name`,
      )
      .all(PROJECT_ID) as { name: string }[];
    expect(stacks.map((s) => s.name)).toEqual([".NET", "React"]);
    expect(count("project_libraries", `project_id = '${PROJECT_ID}'`)).toBe(7);
  });

  it("seeds full artifact surfaces with stable counts", () => {
    expect(count("modules", `project_id = '${PROJECT_ID}'`)).toBe(8);
    expect(count("requirements", `project_id = '${PROJECT_ID}'`)).toBe(14);
    expect(count("use_cases", `project_id = '${PROJECT_ID}'`)).toBe(5);
    expect(count("workflows", `project_id = '${PROJECT_ID}'`)).toBe(4);
    expect(count("model_graphs", `project_id = '${PROJECT_ID}'`)).toBe(4);
    expect(count("model_nodes", `graph_id IN (SELECT id FROM model_graphs WHERE project_id = '${PROJECT_ID}')`)).toBe(25);
    expect(count("model_edges", `graph_id IN (SELECT id FROM model_graphs WHERE project_id = '${PROJECT_ID}')`)).toBe(24);
    expect(count("entities", `project_id = '${PROJECT_ID}'`)).toBe(11);
    expect(count("entity_fields", `entity_id IN (SELECT id FROM entities WHERE project_id = '${PROJECT_ID}')`)).toBe(51);
    expect(count("entity_relations", `project_id = '${PROJECT_ID}'`)).toBe(10);
    expect(count("api_endpoints", `project_id = '${PROJECT_ID}'`)).toBe(13);
    expect(count("screens", `project_id = '${PROJECT_ID}'`)).toBe(8);
    expect(count("components", `project_id = '${PROJECT_ID}'`)).toBe(7);
    expect(count("skills", `project_id = '${PROJECT_ID}'`)).toBe(8);
    expect(count("risks", `project_id = '${PROJECT_ID}'`)).toBe(4);
    expect(count("decisions", `project_id = '${PROJECT_ID}'`)).toBe(3);
    expect(count("milestones", `project_id = '${PROJECT_ID}'`)).toBe(3);
    expect(count("test_cases", `project_id = '${PROJECT_ID}'`)).toBe(6);
  });

  it("seeds approvals, governance, and traceability", () => {
    expect(count("approvals", `project_id = '${PROJECT_ID}'`)).toBe(2);
    expect(count("artifact_links", `project_id = '${PROJECT_ID}'`)).toBe(21);
    expect(count("artifact_governance", `project_id = '${PROJECT_ID}'`)).toBe(3);
    const wf = db.query("SELECT status FROM workflows WHERE id = 'WF-0101'").get() as { status: string };
    expect(wf.status).toBe("approved");
  });

  it("follows the skill rules: capability has level, tech has tag", () => {
    const rows = db.query("SELECT kind, level, tag FROM skills WHERE project_id = ?").all(PROJECT_ID) as {
      kind: string;
      level: string | null;
      tag: string | null;
    }[];
    for (const row of rows) {
      if (row.kind === "capability") {
        expect(row.level).toBeTruthy();
        expect(row.tag).toBeNull();
      } else {
        expect(row.tag).toBeTruthy();
        expect(row.level).toBeNull();
      }
    }
  });

  it("derives a roadmap with a packaged task pack", () => {
    expect(count("roadmaps", `project_id = '${PROJECT_ID}'`)).toBe(1);
    expect(count("tasks", `project_id = '${PROJECT_ID}'`)).toBeGreaterThan(10);
    const inProgress = db.query("SELECT COUNT(*) AS n FROM tasks WHERE project_id = ? AND status = 'in_progress'").get(PROJECT_ID) as { n: number };
    expect(Number(inProgress.n)).toBe(1);
  });
});

describe("e-commerce diagrams + docs", () => {
  it("generates workflow, ERD, and architecture diagrams", async () => {
    for (const diagramType of ["workflow", "erd", "architecture"] as const) {
      const payload: Record<string, unknown> = { project_id: PROJECT_ID, diagram_type: diagramType };
      if (diagramType === "workflow") payload.graph_id = GRAPH_ID;
      const res = await request(app, "POST", "/diagrams/generate", payload);
      expect(res.statusCode).toBe(201);
      expect(res.json().data.mermaid).toBeTruthy();
    }
  });

  it("generates the Markdown workspace", async () => {
    const res = await request(app, "POST", "/docs/generate", { project_id: PROJECT_ID });
    expect(res.statusCode).toBe(201);
    const data = res.json().data;
    expect(data.file_count).toBeGreaterThanOrEqual(30);
    const paths = (data.files as { path: string }[]).map((f) => f.path);
    for (const expected of ["README.md", "02-requirements/srs.md", "03-design/hld.md", "03-design/erd.md", "08-governance/adrs.md"]) {
      expect(paths).toContain(expected);
    }
  });
});

describe("coexistence with the Acme demo", () => {
  it("seeds both demos in one database without collisions", () => {
    expect(count("projects", `id = 'PRJ-0002'`)).toBe(1);
    expect(count("projects", `id = '${PROJECT_ID}'`)).toBe(1);
    expect(count("modules", `id LIKE 'MOD-0%' AND project_id = 'PRJ-0002'`)).toBe(2);
    expect(count("modules", `id LIKE 'MOD-01%' AND project_id = '${PROJECT_ID}'`)).toBe(8);
    const dupes = db
      .query("SELECT id, COUNT(*) AS n FROM modules GROUP BY id HAVING COUNT(*) > 1")
      .all() as { id: string; n: number }[];
    expect(dupes.length).toBe(0);
  });
});