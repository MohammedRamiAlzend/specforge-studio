/**
 * Tests for Prompt 14 (multi-project workspace): project dependencies
 * (PDEP) CRUD, reference targets for the modeler picker, cross-project
 * workflow_call nodes (validation + 400 on structurally-invalid refs),
 * deterministic diagram rendering, and governance TR-21.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { bootApp, createTestContext, request, seedProject } from "./helpers";

const ctx = createTestContext();
let app: Awaited<ReturnType<typeof bootApp>>;
let projectA = "";
let projectB = "";

beforeAll(async () => {
  app = await bootApp(ctx);
  projectA = await seedProject(app);
  const b = await request(app, "POST", "/projects", {
    name: "Acme API Platform",
    type: "api",
    created_by: "tester@internal",
  });
  projectB = b.json().data.id as string;
  expect(projectA).not.toBe(projectB);
});

afterAll(async () => {
  await app.close();
});

describe("project dependencies (explicit linked projects)", () => {
  it("creates a dependency and lists outgoing + incoming views", async () => {
    const created = await request(app, "POST", `/projects/${projectA}/dependencies`, {
      depends_on_project_id: projectB,
      kind: "workflow_call",
      note: "Checkout calls the orders API",
    });
    expect(created.statusCode).toBe(201);
    const dep = created.json().data;
    expect(dep.id).toMatch(/^PDEP-\d{4,}$/);
    expect(dep.depends_on_project_id).toBe(projectB);
    expect(dep.depends_on_project_name).toBe("Acme API Platform");
    expect(dep.kind).toBe("workflow_call");

    const outgoing = await request(app, "GET", `/projects/${projectA}/dependencies`);
    expect(outgoing.statusCode).toBe(200);
    expect(outgoing.json().data).toHaveLength(1);
    expect(outgoing.json().data[0].depends_on_project_id).toBe(projectB);
    expect(outgoing.json().data[0].depends_on_project_status).toMatch(/^(draft|active)$/);

    const incoming = await request(app, "GET", `/projects/${projectB}/dependents`);
    expect(incoming.statusCode).toBe(200);
    expect(incoming.json().data).toHaveLength(1);
    expect(incoming.json().data[0].depending_project_id).toBe(projectA);
  });

  it("rejects self-links with 400", async () => {
    const res = await request(app, "POST", `/projects/${projectA}/dependencies`, {
      depends_on_project_id: projectA,
      kind: "data",
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects duplicate (project, target, kind) with 409", async () => {
    const res = await request(app, "POST", `/projects/${projectA}/dependencies`, {
      depends_on_project_id: projectB,
      kind: "workflow_call",
    });
    expect(res.statusCode).toBe(409);
    // A different kind is allowed.
    const other = await request(app, "POST", `/projects/${projectA}/dependencies`, {
      depends_on_project_id: projectB,
      kind: "data",
      note: "Shared data model",
    });
    expect(other.statusCode).toBe(201);
  });

  it("deletes a dependency (204) and 404s unknown ones", async () => {
    const list = await request(app, "GET", `/projects/${projectA}/dependencies`);
    const depId = list.json().data[0].id as string;
    const del = await request(app, "DELETE", `/projects/${projectA}/dependencies/${depId}`);
    expect(del.statusCode).toBe(204);

    const outgoing = await request(app, "GET", `/projects/${projectA}/dependencies`);
    expect(outgoing.json().data).toHaveLength(1); // data-kind link remains

    const gone = await request(app, "DELETE", `/projects/${projectA}/dependencies/${depId}`);
    expect(gone.statusCode).toBe(404);
  });
});

describe("reference targets", () => {
  it("returns linked projects first with their workflow graphs, plus all projects", async () => {
    // A fully unlinked third project must still be offered as a target.
    const third = await request(app, "POST", "/projects", {
      name: "Ambition Mobile",
      type: "mobile",
      created_by: "tester@internal",
    });
    thirdProjectId = third.json().data.id as string;

    // Give project B a workflow-kind graph so the picker has real data.
    const graph = await request(app, "POST", "/modeler/graphs", {
      project_id: projectB,
      kind: "workflow",
      name: "Orders API",
    });
    expect(graph.statusCode).toBe(201);
    graphJson = graph.json().data.id;
    await request(app, "POST", "/modeler/graphs", {
      project_id: projectA,
      kind: "data",
      name: "Checkout schema",
    });

    const res = await request(app, "GET", `/projects/${projectA}/reference-targets`);
    expect(res.statusCode).toBe(200);
    const data = res.json().data as {
      project_id: string;
      is_linked: boolean;
      workflows: { graph_id: string }[];
    }[];
    // Linked (B) comes first.
    const first = data[0]!;
    expect(first.project_id).toBe(projectB);
    expect(first.is_linked).toBe(true);
    expect(first.workflows.some((w) => w.graph_id === graphJson)).toBe(true);
    // Every other project is offered too (own project excluded, unlinked included).
    expect(data.some((t) => t.project_id === projectA)).toBe(false);
    expect(data.some((t) => t.project_id === thirdProjectId)).toBe(true);
    expect(data.length).toBeGreaterThan(1);
  });
});

let graphJson = "";
let thirdProjectId = "";

describe("workflow_call nodes", () => {
  function workflowCallNode(ref?: unknown) {
    return {
      key: "wc",
      type: "workflow_call",
      title: "Call Orders API",
      metadata: ref === undefined ? { cross_project: { project_id: projectB, graph_id: graphJson } } : { cross_project: ref as Record<string, unknown> },
      position: { x: 0, y: 0 },
    };
  }

  it("saves a valid cross-project workflow call without CROSS_PROJECT_REF_MISSING", async () => {
    const graph = await request(app, "POST", "/modeler/graphs", {
      project_id: projectA,
      kind: "workflow",
      name: "Checkout flow",
    });
    webGraphId = graph.json().data.id as string;
    const saved = await request(app, "PUT", `/modeler/graphs/${webGraphId}`, {
      nodes: [
        { key: "s", type: "start", title: "Start", position: { x: 0, y: 0 } },
        workflowCallNode(),
        { key: "e", type: "end", title: "End", position: { x: 0, y: 240 } },
      ],
      edges: [
        { key: "e1", source: "s", target: "wc", type: "next" },
        { key: "e2", source: "wc", target: "e", type: "next" },
      ],
    });
    expect(saved.statusCode).toBe(200);
    const warnings = saved.json().data.warnings as { code: string }[];
    expect(warnings.some((w) => w.code === "CROSS_PROJECT_REF_MISSING")).toBe(false);

    const calls = await request(app, "GET", `/projects/${projectA}/workflow-calls`);
    expect(calls.statusCode).toBe(200);
    expect(calls.json().data).toHaveLength(1);
    expect(calls.json().data[0].target_project_id).toBe(projectB);
    expect(calls.json().data[0].target_graph_id).toBe(graphJson);
    expect(calls.json().data[0].workflow_id).toBe(webGraphId);
  });

  it("rejects structurally invalid references with 400", async () => {
    const notAGraph = await request(app, "PUT", `/modeler/graphs/${webGraphId}`, {
      nodes: [
        { key: "w1", type: "workflow_call", title: "Bad", metadata: {}, position: { x: 0, y: 0 } },
      ],
      edges: [],
    });
    expect(notAGraph.statusCode).toBe(400);

    const badId = await request(app, "PUT", `/modeler/graphs/${webGraphId}`, {
      nodes: [
        {
          key: "w2",
          type: "workflow_call",
          title: "Bad id",
          metadata: { cross_project: { project_id: projectB, graph_id: "nope-123" } },
          position: { x: 0, y: 0 },
        },
      ],
      edges: [],
    });
    expect(badId.statusCode).toBe(400);
  });

  it("surfaces a broken target as CROSS_PROJECT_REF_MISSING warning", async () => {
    const broken = await request(app, "PUT", `/modeler/graphs/${webGraphId}`, {
      nodes: [
        { key: "s", type: "start", title: "Start", position: { x: 0, y: 0 } },
        {
          key: "wc",
          type: "workflow_call",
          title: "Call missing",
          metadata: { cross_project: { project_id: projectB, graph_id: "GRPH-9999" } },
          position: { x: 0, y: 120 },
        },
        { key: "e", type: "end", title: "End", position: { x: 0, y: 240 } },
      ],
      edges: [
        { key: "e1", source: "s", target: "wc", type: "next" },
        { key: "e2", source: "wc", target: "e", type: "next" },
      ],
    });
    expect(broken.statusCode).toBe(200);
    const warnings = broken.json().data.warnings as { code: string; level: string }[];
    const cross = warnings.find((w) => w.code === "CROSS_PROJECT_REF_MISSING");
    expect(cross).toBeDefined();
    expect(cross!.level).toBe("warning");
  });

  it("validates a draft via /modeler/validate", async () => {
    const res = await request(app, "POST", "/modeler/validate", {
      kind: "workflow",
      nodes: [workflowCallNode()],
      edges: [],
    });
    expect(res.statusCode).toBe(200);
    const warnings = res.json().data.warnings as { code: string }[];
    expect(warnings.some((w) => w.code === "CROSS_PROJECT_REF_MISSING")).toBe(false);

    const bad = await request(app, "POST", "/modeler/validate", {
      kind: "workflow",
      nodes: [
        {
          key: "w",
          type: "workflow_call",
          title: "Bad",
          metadata: { cross_project: { project_id: projectB, graph_id: "GRPH-9999" } },
          position: { x: 0, y: 0 },
        },
      ],
      edges: [],
    });
    expect(bad.statusCode).toBe(200);
    expect(bad.json().data.warnings.some((w: { code: string }) => w.code === "CROSS_PROJECT_REF_MISSING")).toBe(true);
  });
});

let webGraphId = "";

describe("diagram rendering of cross-project calls", () => {
  it("renders the call as a subgraph and stores + preview are byte-identical", async () => {
    // Restore the graph to a valid cross-project call.
    await request(app, "PUT", `/modeler/graphs/${webGraphId}`, {
      nodes: [
        { key: "s", type: "start", title: "Start", position: { x: 0, y: 0 } },
        {
          key: "wc",
          type: "workflow_call",
          title: "Call Orders API",
          metadata: { cross_project: { project_id: projectB, graph_id: graphJson } },
          position: { x: 0, y: 120 },
        },
        { key: "e", type: "end", title: "End", position: { x: 0, y: 240 } },
      ],
      edges: [
        { key: "e1", source: "s", target: "wc", type: "next" },
        { key: "e2", source: "wc", target: "e", type: "next" },
      ],
    });

    const stored = await request(app, "POST", "/diagrams/generate", {
      project_id: projectA,
      diagram_type: "workflow",
      graph_id: webGraphId,
    });
    expect(stored.statusCode).toBe(201);
    const mermaid = stored.json().data.mermaid as string;
    expect(mermaid).toContain("subgraph xp_");
    expect(mermaid).toContain(`"Acme API Platform`);
    expect(mermaid).toContain(graphJson);

    // Same input through the stateless preview must match stored output.
    const loaded = await request(app, "GET", `/modeler/graphs/${webGraphId}`);
    const payload = loaded.json().data as {
      nodes: { id: string; node_type: string; title: string; position: unknown; metadata: unknown }[];
      edges: { id: string; source: string; target: string; type: string; label: string | null; condition: string | null }[];
    };
    const preview = await request(app, "POST", "/diagrams/preview", {
      kind: "workflow",
      nodes: payload.nodes.map((n) => ({
        key: n.id,
        type: n.node_type,
        title: n.title,
        position: n.position,
        metadata: n.metadata ?? undefined,
      })),
      edges: payload.edges.map((e) => ({
        key: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        label: e.label ?? undefined,
        condition: e.condition ?? undefined,
      })),
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().data.mermaid).toBe(mermaid);
  });
});

describe("governance TR-21", () => {
  it("reports broken cross-project references in validation warnings", async () => {
    // Add a persistent broken call on its own graph so the assertion is stable.
    const brokenGraph = await request(app, "POST", "/modeler/graphs", {
      project_id: projectA,
      kind: "workflow",
      name: "Broken ref workflow",
    });
    brokenGraphId = brokenGraph.json().data.id as string;
    const save = await request(app, "PUT", `/modeler/graphs/${brokenGraphId}`, {
      nodes: [
        {
          key: "wc",
          type: "workflow_call",
          title: "Call ghost",
          metadata: { cross_project: { project_id: projectB, graph_id: "GRPH-9999" } },
          position: { x: 0, y: 0 },
        },
      ],
      edges: [],
    });
    expect(save.statusCode).toBe(200);

    const res = await request(app, "GET", `/governance/validation?project=${projectA}`);
    expect(res.statusCode).toBe(200);
    const all = (res.json().data as { all: { rule: string; violations: string[] }[] }).all;
    const tr21 = all.find((w) => w.rule === "TR-21");
    expect(tr21).toBeDefined();
    expect(tr21!.violations.some((v) => v.includes("GRPH-9999"))).toBe(true);
  });
});

let brokenGraphId = "";