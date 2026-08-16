/**
 * Node palette tests (Prompt 15).
 * Exercises the DB-backed node categories/node types API: built-in seeds,
 * the modeler catalog reading from the DB palette, custom types with custom
 * fields, re-parenting, disable semantics, delete guards, and the audit trail.
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

describe("built-in node palette seeds", () => {
  it("seeds four categories with the fourteen seeded node types (13 legacy + loop demo)", async () => {
    const res = await request(app, "GET", "/node-palette");
    expect(res.statusCode).toBe(200);
    const categories = res.json().data.categories;
    expect(categories).toHaveLength(4);
    expect(categories.map((c: { key: string }) => c.key)).toEqual(["flow", "system", "governance", "ai"]);
    expect(categories.map((c: { id: string }) => c.id)).toEqual(["NCAT-0001", "NCAT-0002", "NCAT-0003", "NCAT-0004"]);

    const allTypes = categories.flatMap((c: { nodeTypes: unknown[] }) => c.nodeTypes);
    expect(allTypes).toHaveLength(14);
    const keys = allTypes.map((t: { key: string }) => t.key);
    const required = ["start", "end", "step", "decision", "screen", "api_call", "database", "external_system", "event", "wait", "approval", "ai_agent", "workflow_call", "loop"];
    for (const key of required) expect(keys).toContain(key);

    const step = allTypes.find((t: { key: string }) => t.key === "step");
    expect(step.id).toBe("NTYP-0003");
    expect(step.built_in).toBe(1);
    expect(step.enabled).toBe(1);
    expect(step.category_key).toBe("flow");
    expect(step.kinds).toContain("workflow");
    expect(step.fields).toEqual([]);

    const loop = allTypes.find((t: { key: string }) => t.key === "loop");
    expect(loop.id).toBe("NTYP-0014");
    expect(loop.fields).toHaveLength(2);
    expect(loop.fields[0]).toEqual({ key: "iterations", label: "Iterations", type: "number", default: 1 });
  });

  it("exposes the enabled flatten as the legacy modeler catalog", async () => {
    const res = await request(app, "GET", "/modeler/node-types");
    expect(res.statusCode).toBe(200);
    const types = res.json().data;
    expect(types).toHaveLength(14);
    const start = types.find((t: { type: string }) => t.type === "start");
    expect(start).toMatchObject({ category: "flow", color: "#059669", defaultTitle: "Start" });
    expect(Array.isArray(start.fields)).toBe(true);
    expect(start.fields).toHaveLength(0);
  });
});

describe("custom node types with custom fields", () => {
  it("creates a custom type with fields and reflects it in the modeler catalog", async () => {
    const cats = (await request(app, "GET", "/node-palette")).json().data.categories;
    const flow = cats.find((c: { key: string }) => c.key === "flow");

    const res = await request(app, "POST", "/node-palette/types", {
      key: "retry",
      label: "Retry",
      category_id: flow.id,
      color: "#f43f5e",
      kinds: ["workflow"],
      default_title: "New retry step",
      fields: [
        { key: "max_attempts", label: "Max attempts", type: "number", required: true, default: 3 },
        { key: "mode", label: "Mode", type: "select", options: ["fixed", "backoff"], default: "backoff" },
      ],
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.id).toBe("NTYP-0015");

    const catalog = (await request(app, "GET", "/modeler/node-types")).json().data;
    expect(catalog).toHaveLength(15);
    const retry = catalog.find((t: { type: string }) => t.type === "retry");
    expect(retry).toMatchObject({ label: "Retry", defaultTitle: "New retry step" });
    expect(retry.fields[0]).toEqual({ key: "max_attempts", label: "Max attempts", type: "number", required: true, default: 3 });
  });

  it("rejects a duplicate type key", async () => {
    const cats = (await request(app, "GET", "/node-palette")).json().data.categories;
    const res = await request(app, "POST", "/node-palette/types", {
      key: "retry",
      label: "Retry again",
      category_id: cats[0].id,
      kinds: ["workflow"],
    });
    expect(res.statusCode).toBe(409);
  });

  it("saves custom field values inside node metadata", async () => {
    const projectId = await seedProject(app);
    const graph = await request(app, "POST", "/modeler/graphs", { project_id: projectId, kind: "workflow", name: "Retry flow" });
    const graphId = graph.json().data.id;

    const saved = await request(app, "PUT", `/modeler/graphs/${graphId}`, {
      nodes: [
        {
          key: "loop",
          type: "loop",
          title: "Retry loop",
          position: { x: 0, y: 0 },
          metadata: { iterations: 3, mode: "while" },
        },
      ],
      edges: [],
    });
    expect(saved.statusCode).toBe(200);
    const loaded = (await request(app, "GET", `/modeler/graphs/${graphId}`)).json().data;
    expect(loaded.nodes[0].node_type).toBe("loop");
    expect(loaded.nodes[0].metadata).toEqual({ iterations: 3, mode: "while" });
  });
});

describe("palette validation reads the DB", () => {
  it("reports DISABLED_NODE_TYPE for a disabled type", async () => {
    const cats = (await request(app, "GET", "/node-palette")).json().data.categories;
    const step = cats.flatMap((c: { nodeTypes: unknown[] }) => c.nodeTypes).find((t: { key: string }) => t.key === "step");
    const patch = await request(app, "PATCH", `/node-palette/types/${step.id}`, { enabled: false });
    expect(patch.statusCode).toBe(200);

    const res = await request(app, "POST", "/modeler/validate", {
      kind: "workflow",
      nodes: [{ key: "s", type: "step", title: "Do", position: { x: 0, y: 0 } }],
      edges: [],
    });
    const warnings = res.json().data.warnings as { code: string }[];
    expect(warnings.some((w) => w.code === "DISABLED_NODE_TYPE")).toBe(true);
    expect(warnings.some((w) => w.code === "UNKNOWN_NODE_TYPE")).toBe(false);

    await request(app, "PATCH", `/node-palette/types/${step.id}`, { enabled: true });
  });

  it("reports KIND_NOT_SUPPORTED when a type cannot serve the graph kind", async () => {
    const cats = (await request(app, "GET", "/node-palette")).json().data.categories;
    const decision = cats.flatMap((c: { nodeTypes: unknown[] }) => c.nodeTypes).find((t: { key: string }) => t.key === "decision");
    expect(decision.kinds).not.toContain("data");

    const res = await request(app, "POST", "/modeler/validate", {
      kind: "data",
      nodes: [{ key: "d", type: "decision", title: "Check", position: { x: 0, y: 0 } }],
      edges: [],
    });
    const warnings = res.json().data.warnings as { code: string }[];
    expect(warnings.some((w) => w.code === "KIND_NOT_SUPPORTED")).toBe(true);
  });

  it("rejects an unknown type on save even after palette changes", async () => {
    const projectId = await seedProject(app);
    const graph = await request(app, "POST", "/modeler/graphs", { project_id: projectId, kind: "workflow", name: "Bad flow" });
    const res = await request(app, "PUT", `/modeler/graphs/${graph.json().data.id}`, {
      nodes: [{ key: "x", type: "definitely_not_a_type", title: "X", position: { x: 0, y: 0 } }],
      edges: [],
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("node type editing and re-parenting", () => {
  it("edits label/color/kinds and moves a type between categories", async () => {
    const before = (await request(app, "GET", "/node-palette")).json().data.categories;
    const flow = before.find((c: { key: string }) => c.key === "flow");
    const system = before.find((c: { key: string }) => c.key === "system");
    const wait = flow.nodeTypes.find((t: { key: string }) => t.key === "wait");

    const patched = await request(app, "PATCH", `/node-palette/types/${wait.id}`, {
      label: "Wait / Delay",
      color: "#7c3aed",
      kinds: ["workflow", "sequence"],
      category_id: system.id,
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().data).toMatchObject({ label: "Wait / Delay", category_id: system.id });

    const after = (await request(app, "GET", "/node-palette")).json().data.categories;
    expect(after.find((c: { key: string }) => c.key === "flow").nodeTypes.some((t: { key: string }) => t.key === "wait")).toBe(false);
    expect(after.find((c: { key: string }) => c.key === "system").nodeTypes.some((t: { key: string }) => t.key === "wait")).toBe(true);
  });
});

describe("category management", () => {
  it("creates, edits, and deletes a custom category", async () => {
    const res = await request(app, "POST", "/node-palette/categories", {
      key: "compliance",
      label: "Compliance",
      color: "#16a34a",
      sort_order: 50,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.id).toBe("NCAT-0005");

    const patched = await request(app, "PATCH", "/node-palette/categories/NCAT-0005", { label: "Compliance & Audit", sort_order: 51 });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().data).toMatchObject({ label: "Compliance & Audit", sort_order: 51 });

    const deleted = await request(app, "DELETE", "/node-palette/categories/NCAT-0005");
    expect(deleted.statusCode).toBe(204);
  });

  it("rejects a duplicate category key", async () => {
    const res = await request(app, "POST", "/node-palette/categories", { key: "system", label: "System dup" });
    expect(res.statusCode).toBe(409);
  });

  it("blocks deleting built-in rows", async () => {
    const cats = (await request(app, "GET", "/node-palette")).json().data.categories;
    const flow = cats.find((c: { key: string }) => c.key === "flow");
    const delCat = await request(app, "DELETE", `/node-palette/categories/${flow.id}`);
    expect(delCat.statusCode).toBe(400);

    const step = flow.nodeTypes.find((t: { key: string }) => t.key === "step");
    const delType = await request(app, "DELETE", `/node-palette/types/${step.id}`);
    expect(delType.statusCode).toBe(400);
  });

  it("blocks deleting a category that still contains node types", async () => {
    const res = await request(app, "POST", "/node-palette/categories", { key: "tempgroup", label: "Temp" });
    const categoryId = res.json().data.id;
    await request(app, "POST", "/node-palette/types", {
      key: "temp_note",
      label: "Temp note",
      category_id: categoryId,
      kinds: ["workflow"],
    });
    const del = await request(app, "DELETE", `/node-palette/categories/${categoryId}`);
    expect(del.statusCode).toBe(409);
  });

  it("blocks deleting a node type used by saved model nodes", async () => {
    const projectId = await seedProject(app);
    const catRes = await request(app, "POST", "/node-palette/categories", { key: "gated", label: "Gated" });
    const categoryId = catRes.json().data.id;
    const created = await request(app, "POST", "/node-palette/types", {
      key: "gate",
      label: "Gate",
      category_id: categoryId,
      kinds: ["workflow"],
    });
    const typeId = created.json().data.id;

    const graph = await request(app, "POST", "/modeler/graphs", { project_id: projectId, kind: "workflow", name: "Gated flow" });
    await request(app, "PUT", `/modeler/graphs/${graph.json().data.id}`, {
      nodes: [{ key: "gate", type: "gate", title: "Gate", position: { x: 0, y: 0 } }],
      edges: [],
    });

    const del = await request(app, "DELETE", `/node-palette/types/${typeId}`);
    expect(del.statusCode).toBe(409);

    const delCat = await request(app, "DELETE", `/node-palette/categories/${categoryId}`);
    expect(delCat.statusCode).toBe(409);
  });
});

describe("audit trail", () => {
  it("logs category and type changes", async () => {
    const res = await request(app, "POST", "/node-palette/categories", { key: "auditcat", label: "Audit" });
    const categoryId = res.json().data.id;
    const logs = await request(app, "GET", "/audit");
    expect(logs.statusCode).toBe(200);
    const events = logs.json().data as { entity_type: string; entity_id: string; action: string }[];
    expect(events.some((e) => e.entity_type === "node_category" && e.entity_id === categoryId && e.action === "created")).toBe(true);
  });
});