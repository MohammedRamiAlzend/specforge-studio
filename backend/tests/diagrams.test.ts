/**
 * Diagram generation tests (Prompt 12 requirement 3).
 * Determinism is a hard quality rule: identical input must produce identical
 * Mermaid output.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { bootApp, createTestContext, request, seedProject } from "./helpers";

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

const workflowGraph = {
  kind: "workflow",
  nodes: [
    { key: "s", type: "start", title: "Start", position: { x: 0, y: 0 } },
    { key: "a", type: "api_call", title: "Submit order", position: { x: 0, y: 120 } },
    { key: "d", type: "decision", title: "Stock check", position: { x: 0, y: 240 } },
    { key: "e", type: "end", title: "End", position: { x: 0, y: 360 } },
  ],
  edges: [
    { key: "e1", source: "s", target: "a", type: "next" },
    { key: "e2", source: "a", target: "d", type: "success", condition: "200 OK" },
    { key: "e3", source: "d", target: "e", type: "success", label: "Yes", condition: "in stock" },
  ],
};

describe("determinism (quality rule)", () => {
  it("produces identical Mermaid for identical input", async () => {
    const first = await request(app, "POST", "/diagrams/preview", workflowGraph);
    const second = await request(app, "POST", "/diagrams/preview", workflowGraph);
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(first.json().data.mermaid).toBe(second.json().data.mermaid);
    // Preview uses sanitized client keys, never canonical graph ids.
    expect(first.json().data.mermaid).not.toContain("GRPH_");
  });

  it("warnings are deterministic too", async () => {
    const a = await request(app, "POST", "/diagrams/preview", workflowGraph);
    const b = await request(app, "POST", "/diagrams/preview", workflowGraph);
    expect(JSON.stringify(a.json().data.warnings)).toBe(JSON.stringify(b.json().data.warnings));
  });
});

describe("workflow diagram", () => {
  it("renders a flowchart with edge conditions", async () => {
    const res = await request(app, "POST", "/diagrams/preview", workflowGraph);
    expect(res.statusCode).toBe(200);
    const mermaid = res.json().data.mermaid as string;
    expect(mermaid.startsWith("flowchart TD")).toBe(true);
    expect(mermaid).toContain("(200 OK)");
    expect(mermaid).toContain("in stock");
  });
});

describe("sequence diagram", () => {
  it("derives participants from nodes and renders messages", async () => {
    const res = await request(app, "POST", "/diagrams/preview", {
      kind: "sequence",
      nodes: [
        { key: "p1", type: "api_call", title: "Orders API", position: { x: 0, y: 0 } },
        { key: "p2", type: "database", title: "Orders DB", position: { x: 0, y: 0 } },
      ],
      edges: [{ key: "m1", source: "p1", target: "p2", type: "success", label: "INSERT order" }],
    });
    expect(res.statusCode).toBe(200);
    const mermaid = res.json().data.mermaid as string;
    expect(mermaid.startsWith("sequenceDiagram")).toBe(true);
    expect(mermaid.match(/participant/g)?.length).toBe(2);
    expect(mermaid).toContain("INSERT order");
  });
});

describe("architecture diagram", () => {
  it("groups nodes into layer subgraphs", async () => {
    const res = await request(app, "POST", "/diagrams/preview", {
      kind: "architecture",
      nodes: [
        { key: "c1", type: "screen", title: "Web client", position: { x: 0, y: 0 } },
        { key: "c2", type: "api_call", title: "API gateway", position: { x: 200, y: 0 } },
        { key: "c3", type: "database", title: "Postgres", position: { x: 400, y: 0 } },
      ],
      edges: [{ key: "l1", source: "c1", target: "c2", type: "next", label: "HTTPS" }],
    });
    expect(res.statusCode).toBe(200);
    const mermaid = res.json().data.mermaid as string;
    expect(mermaid.match(/subgraph/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(mermaid).toContain("HTTPS");
  });
});

describe("ERD diagram", () => {
  it("renders PK fields from metadata", async () => {
    const res = await request(app, "POST", "/diagrams/preview", {
      kind: "data",
      nodes: [
        {
          key: "d1",
          type: "database",
          title: "User",
          position: { x: 0, y: 0 },
          metadata: { fields: [{ name: "id", data_type: "string", is_primary_key: true }, { name: "email", data_type: "string", is_unique: true }] },
        },
        { key: "d2", type: "database", title: "Order", position: { x: 200, y: 0 } },
      ],
      edges: [{ key: "r1", source: "d1", target: "d2", type: "related", condition: "1:N", label: "places" }],
    });
    expect(res.statusCode).toBe(200);
    const mermaid = res.json().data.mermaid as string;
    expect(mermaid.startsWith("erDiagram")).toBe(true);
    expect(mermaid).toContain("string id PK");
  });
});

describe("generate + store + delete round-trip", () => {
  it("stores a generated diagram with provenance and deletes it", async () => {
    // Create a real workflow graph first so generation reads from the DB.
    const created = await request(app, "POST", "/modeler/graphs", {
      project_id: projectId,
      kind: "workflow",
      name: "Order flow",
    });
    const graphId = created.json().data.id as string;
    await request(app, "PUT", `/modeler/graphs/${graphId}`, {
      nodes: workflowGraph.nodes,
      edges: workflowGraph.edges,
    });

    const res = await request(app, "POST", "/diagrams/generate", {
      project_id: projectId,
      diagram_type: "workflow",
      graph_id: graphId,
    });
    expect(res.statusCode).toBe(201);
    const data = res.json().data;
    expect(data.id).toBe("DIAG-0001");
    expect(typeof data.mermaid).toBe("string");
    expect(data.mermaid.startsWith("flowchart TD")).toBe(true);
    expect(data.source_artifacts).toContain(graphId);

    const list = await request(app, "GET", `/diagrams?project=${projectId}`);
    expect(list.json().data.some((d: { id: string }) => d.id === "DIAG-0001")).toBe(true);

    const del = await request(app, "DELETE", `/diagrams/${data.id}`);
    expect(del.statusCode).toBe(204);
    const gone = await request(app, "GET", `/diagrams/${data.id}`);
    expect(gone.statusCode).toBe(404);
  });

  it("generates an ERD from the entities tables (provenance)", async () => {
    await request(app, "POST", "/entities", { project_id: projectId, name: "order" });
    const res = await request(app, "POST", "/diagrams/generate", {
      project_id: projectId,
      diagram_type: "erd",
    });
    expect(res.statusCode).toBe(201);
    const data = res.json().data;
    expect(data.mermaid.startsWith("erDiagram")).toBe(true);
    expect(data.source_artifacts.some((id: string) => id.startsWith("DB-"))).toBe(true);
    // Field-less entities are skipped with a warning, never crash.
    expect(Array.isArray(data.warnings)).toBe(true);
  });
});
