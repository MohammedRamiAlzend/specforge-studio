import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildApp } from "../src/app";
import type { Config } from "../src/config/index";
import { openDatabase } from "../src/db/index";

const config: Config = {
  PORT: 0,
  HOST: "127.0.0.1",
  DATABASE_PATH: ":memory:",
  EXPORT_DIR: "data/test-exports",
  LOG_LEVEL: "silent",
  NODE_ENV: "test",
};

const db = openDatabase(":memory:");

// Auth hardening: emails are captured instead of delivered so the OTP flow
// can be exercised end-to-end without network access.
const sentEmails: Array<{ to: string; subject: string }> = [];
const app = await buildApp({
  config,
  db,
  mailer: {
    async send(input) {
      sentEmails.push({ to: input.to, subject: input.subject });
    },
  },
});

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}`, detail ?? "");
  }
}

async function request(method: string, url: string, payload?: unknown) {
  const res = await app.inject({
    method: method as "GET",
    url,
    payload: payload as undefined,
  });
  return res;
}

// 1. health
{
  const res = await request("GET", "/healthz");
  check("GET /healthz -> 200", res.statusCode === 200, res.body);
  check("GET /healthz body ok", res.json().status === "ok");
}

// 2. create project
let projectId = "";
{
  const res = await request("POST", "/projects", {
    name: "Demo web app",
    type: "web",
    created_by: "owner@internal",
  });
  check("POST /projects -> 201", res.statusCode === 201, res.body);
  const body = res.json();
  projectId = body.data?.id ?? "";
  check("POST /projects id PRJ-0001", projectId === "PRJ-0001", body.data?.id);
  check("POST /projects status draft", body.data?.status === "draft");
}

// 3. list projects
{
  const res = await request("GET", "/projects");
  check("GET /projects -> 200", res.statusCode === 200);
  check("GET /projects length 1", res.json().data?.length === 1);
}

// 4. get single project
{
  const res = await request("GET", `/projects/${projectId}`);
  check("GET /projects/:id -> 200", res.statusCode === 200, res.body);
  check("GET /projects/:id name", res.json().data?.name === "Demo web app");
}

// 5. patch project
{
  const res = await request("PATCH", `/projects/${projectId}`, { status: "active" });
  check("PATCH /projects/:id -> 200", res.statusCode === 200, res.body);
  check("PATCH /projects/:id status active", res.json().data?.status === "active");
}

// 6. create dependent artifacts
{
  const res = await request("POST", "/requirements", {
    project_id: projectId,
    title: "Users must be able to log in",
    priority: "must",
    criticality: "critical",
  });
  check("POST /requirements -> 201", res.statusCode === 201, res.body);
  check("POST /requirements id REQ-0001", res.json().data?.id === "REQ-0001");

  const uc = await request("POST", "/use-cases", {
    project_id: projectId,
    title: "User logs in",
    actor: "User",
    main_flow: ["Open login page", "Enter credentials", "Submit"],
  });
  check("POST /use-cases -> 201", uc.statusCode === 201, uc.body);

  const wf = await request("POST", "/workflows", { project_id: projectId, name: "Onboarding" });
  check("POST /workflows -> 201", wf.statusCode === 201, wf.body);

  const ent = await request("POST", "/entities", { project_id: projectId, name: "user_account" });
  check("POST /entities -> 201", ent.statusCode === 201, ent.body);

  const api = await request("POST", "/api-endpoints", {
    project_id: projectId,
    method: "POST",
    path: "/auth/login",
    request_schema: { email: "string" },
    response_schema: { token: "string" },
    error_codes: [{ code: "401", description: "Invalid credentials" }],
  });
  check("POST /api-endpoints -> 201", api.statusCode === 201, api.body);

  const task = await request("POST", "/tasks", {
    project_id: projectId,
    title: "Implement login endpoint",
    type: "backend",
    objective: "Create POST /auth/login",
    definition_of_done: "Endpoint returns token on valid credentials",
    checklist: ["Add route", "Validate with Zod", "Add unit test"],
  });
  check("POST /tasks -> 201", task.statusCode === 201, task.body);
  check("POST /tasks id TASK-0001", task.json().data?.id === "TASK-0001");
}

// 7. artifacts index
{
  const res = await request("GET", "/artifacts");
  check("GET /artifacts -> 200", res.statusCode === 200, res.body);
  const data = res.json().data as { id: string }[];
  check("GET /artifacts contains REQ-0001", data.some((a) => a.id === "REQ-0001"));
}

// 8. validation error
{
  const res = await request("POST", "/projects", { name: "" });
  check("POST /projects invalid -> 400", res.statusCode === 400, res.body);
  check(
    "POST /projects invalid code VALIDATION_ERROR",
    res.json().error?.code === "VALIDATION_ERROR",
  );
}

// 9. not found
{
  const res = await request("GET", "/projects/PRJ-9999");
  check("GET /projects/PRJ-9999 -> 404", res.statusCode === 404, res.body);
  check("GET /projects/PRJ-9999 code NOT_FOUND", res.json().error?.code === "NOT_FOUND");
}

// 10. list endpoints with project filter
{
  const res = await request("GET", `/requirements?project=${projectId}`);
  check("GET /requirements?project -> 200", res.statusCode === 200, res.body);
  const data = res.json().data as { id: string }[];
  check("GET /requirements contains REQ-0001", data.some((r) => r.id === "REQ-0001"));
  const tasks = await request("GET", `/tasks?project=${projectId}`);
  check("GET /tasks?project -> 200", tasks.statusCode === 200, tasks.body);
  const empty = await request("GET", `/entities?project=PRJ-0002`);
  check("GET /entities unknown project -> 200 empty", empty.statusCode === 200 && empty.json().data?.length === 0);
}

// 11. dangling project reference
{
  const res = await request("POST", "/requirements", {
    project_id: "PRJ-4242",
    title: "Orphan",
  });
  check("POST /requirements unknown project -> 404", res.statusCode === 404, res.body);
}

// 12. modeler: node type catalog
{
  const res = await request("GET", "/modeler/node-types");
  check("GET /modeler/node-types -> 200", res.statusCode === 200, res.body);
  const types = res.json().data as { type: string }[];
  check("GET /modeler/node-types 14 types", types.length === 14, types.length);
  const required = ["start", "end", "step", "decision", "screen", "api_call", "database", "external_system", "event", "wait", "approval", "ai_agent", "workflow_call", "loop"];
  check(
    "GET /modeler/node-types covers all required types",
    required.every((t) => types.some((n) => n.type === t)),
  );
  check("GET /modeler/node-types includes fields arrays", types.every((t) => Array.isArray((t as { fields?: unknown[] }).fields)));
}

// 12b. node palette (Prompt 15): seeded categories + custom type + validation
let paletteCategoryId = "";
let retryTypeId = "";
{
  const res = await request("GET", "/node-palette");
  check("GET /node-palette -> 200", res.statusCode === 200, res.body);
  const cats = res.json().data?.categories ?? [];
  check("GET /node-palette 4 seeded categories", cats.length === 4, cats.length);
  const keys = cats.map((c: { key: string }) => c.key);
  check(
    "GET /node-palette has flow/system/governance/ai",
    ["flow", "system", "governance", "ai"].every((k) => keys.includes(k)),
    keys,
  );
  const total = cats.reduce((n: number, c: { nodeTypes: unknown[] }) => n + c.nodeTypes.length, 0);
  check("GET /node-palette 14 seeded node types", total === 14, total);
  paletteCategoryId = cats.find((c: { key: string }) => c.key === "flow")?.id ?? "";
  check("GET /node-palette has category ids", paletteCategoryId.length > 0, paletteCategoryId);
}

// seeded demo loop type carries custom fields
{
  const res = await request("GET", "/modeler/node-types");
  const types = res.json().data as { type: string; fields?: { key: string; type: string }[] }[];
  const loop = types.find((t) => t.type === "loop");
  check("seeded loop carries custom fields", loop?.fields?.length === 2 && loop?.fields?.[0]?.key === "iterations", loop?.fields);
}

// custom node type with custom fields
{
  const res = await request("POST", "/node-palette/types", {
    key: "retry",
    label: "Retry",
    category_id: paletteCategoryId,
    color: "#f43f5e",
    kinds: ["workflow"],
    default_title: "New retry step",
    fields: [
      { key: "max_attempts", label: "Max attempts", type: "number", required: true, default: 3 },
      { key: "mode", label: "Mode", type: "select", options: ["fixed", "backoff"], default: "backoff" },
    ],
    sort_order: 99,
  });
  check("POST /node-palette/types -> 201", res.statusCode === 201, res.body);
  retryTypeId = res.json().data?.id ?? "";
  check("POST /node-palette/types id NTYP-0015", retryTypeId === "NTYP-0015", retryTypeId);
}

{
  const res = await request("GET", "/modeler/node-types");
  const types = res.json().data as { type: string; fields?: { key: string; type: string }[] }[];
  check("GET /modeler/node-types now 15", types.length === 15, types.length);
  const retry = types.find((t) => t.type === "retry");
  check("GET /modeler/node-types includes retry", Boolean(retry));
  check(
    "retry type carries custom fields",
    retry?.fields?.length === 2 && retry?.fields?.[0]?.key === "max_attempts",
    retry?.fields,
  );
}

// duplicate key rejected
{
  const res = await request("POST", "/node-palette/types", {
    key: "retry",
    label: "Retry again",
    category_id: paletteCategoryId,
    kinds: ["workflow"],
  });
  check("POST /node-palette/types duplicate key -> 409", res.statusCode === 409, res.body);
}

// validation: disabled type + wrong-kind type produce warnings
{
  const patch = await request("PATCH", `/node-palette/types/${retryTypeId}`, { enabled: false });
  check("PATCH disable retry -> 200", patch.statusCode === 200, patch.body);
  const disabled = await request("POST", "/modeler/validate", {
    kind: "workflow",
    nodes: [{ key: "r", type: "retry", title: "Retry", position: { x: 0, y: 0 } }],
    edges: [],
  });
  const dw = disabled.json().data?.warnings as { code: string }[];
  check("validate reports DISABLED_NODE_TYPE", dw.some((w) => w.code === "DISABLED_NODE_TYPE"), dw);

  const wrongKind = await request("POST", "/modeler/validate", {
    kind: "data",
    nodes: [{ key: "r", type: "retry", title: "Retry", position: { x: 0, y: 0 } }],
    edges: [],
  });
  const kw = wrongKind.json().data?.warnings as { code: string }[];
  check("validate reports KIND_NOT_SUPPORTED", kw.some((w) => w.code === "KIND_NOT_SUPPORTED"), kw);

  const reenabled = await request("PATCH", `/node-palette/types/${retryTypeId}`, { enabled: true });
  check("PATCH re-enable retry -> 200", reenabled.statusCode === 200, reenabled.body);
}

// 13. modeler: create graph
let graphId = "";
{
  const res = await request("POST", "/modeler/graphs", {
    project_id: projectId,
    kind: "workflow",
    name: "Onboarding flow",
  });
  check("POST /modeler/graphs -> 201", res.statusCode === 201, res.body);
  graphId = res.json().data?.id ?? "";
  check("POST /modeler/graphs id GRPH-0001", graphId === "GRPH-0001", graphId);
}

// 14. modeler: save graph with nodes and edges
{
  const res = await request("PUT", `/modeler/graphs/${graphId}`, {
    nodes: [
      {
        key: "n-start",
        type: "start",
        title: "Start",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
        preconditions: [],
        postconditions: [],
        related_artifacts: [],
      },
      {
        key: "n-approve",
        type: "approval",
        title: "Manager approval",
        description: "Approver reviews the request",
        position: { x: 240, y: 0 },
        inputs: ["request"],
        outputs: ["decision"],
        preconditions: ["request submitted"],
        postconditions: ["decision recorded"],
        related_artifacts: ["REQ-0001"],
      },
      {
        key: "n-end",
        type: "end",
        title: "End",
        position: { x: 480, y: 0 },
        inputs: [],
        outputs: [],
        preconditions: [],
        postconditions: [],
        related_artifacts: [],
      },
    ],
    edges: [
      { key: "e1", source: "n-start", target: "n-approve", type: "next", label: "start" },
      { key: "e2", source: "n-approve", target: "n-end", type: "success", condition: "approved" },
    ],
  });
  check("PUT /modeler/graphs/:id -> 200", res.statusCode === 200, res.body);
  const body = res.json().data;
  check("PUT graph nodes length 3", body?.nodes?.length === 3, body?.nodes?.length);
  check("PUT graph edges length 2", body?.edges?.length === 2, body?.edges?.length);
  check(
    "PUT graph node id GRPH-0001-N01",
    body?.nodes?.[0]?.id === "GRPH-0001-N01",
    body?.nodes?.[0]?.id,
  );
  check(
    "PUT graph preserves client key n-start",
    body?.nodes?.[0]?.key === "n-start",
    body?.nodes?.[0]?.key,
  );
  check(
    "PUT graph edge id GRPH-0001-E01",
    body?.edges?.[0]?.id === "GRPH-0001-E01",
    body?.edges?.[0]?.id,
  );
  check("PUT graph no validation errors", (body?.warnings ?? []).every((w: { level: string }) => w.level !== "error"));
}

// 15. modeler: load graph round-trip
{
  const res = await request("GET", `/modeler/graphs/${graphId}`);
  check("GET /modeler/graphs/:id -> 200", res.statusCode === 200, res.body);
  const body = res.json().data;
  check("GET graph name", body?.graph?.name === "Onboarding flow");
  check("GET graph nodes length 3", body?.nodes?.length === 3);
  check("GET graph edges length 2", body?.edges?.length === 2);
  check(
    "GET graph edge references canonical node ids",
    body?.edges?.[0]?.source === "GRPH-0001-N01" && body?.edges?.[0]?.target === "GRPH-0001-N02",
    body?.edges?.[0],
  );
}

// 16. modeler: graph list with project filter
{
  const res = await request("GET", `/modeler/graphs?project=${projectId}`);
  check("GET /modeler/graphs?project -> 200", res.statusCode === 200, res.body);
  const data = res.json().data as { id: string }[];
  check("GET /modeler/graphs contains GRPH-0001", data.some((g) => g.id === "GRPH-0001"));
}

// 17. modeler: validation endpoint
{
  const res = await request("POST", "/modeler/validate", {
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
  check("POST /modeler/validate -> 200", res.statusCode === 200, res.body);
  const warnings = res.json().data?.warnings as { code: string }[];
  check(
    "POST /modeler/validate reports NO_START",
    warnings.some((w) => w.code === "NO_START"),
    warnings,
  );
  check(
    "POST /modeler/validate reports DECISION_EDGE_NO_CONDITION",
    warnings.some((w) => w.code === "DECISION_EDGE_NO_CONDITION"),
    warnings,
  );
}

// 18. modeler: invalid node type rejected on save
{
  const res = await request("PUT", `/modeler/graphs/${graphId}`, {
    nodes: [{ key: "x", type: "bogus", title: "X", position: { x: 0, y: 0 } }],
    edges: [],
  });
  check("PUT /modeler/graphs/:id unknown node type -> 400", res.statusCode === 400, res.body);
  check(
    "PUT unknown node type code BAD_REQUEST",
    res.json().error?.code === "BAD_REQUEST",
  );
}

// 19. modeler: delete graph (nodes/edges cascade)
{
  const del = await request("DELETE", `/modeler/graphs/${graphId}`);
  check("DELETE /modeler/graphs/:id -> 204", del.statusCode === 204, del.body);
  const get = await request("GET", `/modeler/graphs/${graphId}`);
  check("GET deleted graph -> 404", get.statusCode === 404, get.body);
}

// 19b/19c. palette delete guards + category CRUD are covered at the end of
// the script (see "palette delete guards + category CRUD" below): their
// temporary usage graph would otherwise shift the GRPH id sequence that the
// multi-project links section expects.

// 20. diagrams: create a fresh workflow graph to generate from
let diagramGraphId = "";
{
  const res = await request("POST", "/modeler/graphs", {
    project_id: projectId,
    kind: "workflow",
    name: "Order flow",
  });
  diagramGraphId = res.json().data?.id ?? "";
  const save = await request("PUT", `/modeler/graphs/${diagramGraphId}`, {
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
  });
  check("PUT diagram source graph -> 200", save.statusCode === 200, save.body);
}

// 21. diagrams: generate + store workflow diagram
let diagId = "";
{
  const res = await request("POST", "/diagrams/generate", {
    project_id: projectId,
    diagram_type: "workflow",
    graph_id: diagramGraphId,
  });
  check("POST /diagrams/generate workflow -> 201", res.statusCode === 201, res.body);
  const data = res.json().data;
  diagId = data?.id ?? "";
  check("POST /diagrams/generate id DIAG-0001", diagId === "DIAG-0001", diagId);
  check("POST workflow mermaid is flowchart", typeof data?.mermaid === "string" && data.mermaid.startsWith("flowchart TD"), data?.mermaid);
  check("POST workflow mermaid contains edge condition", data?.mermaid?.includes("(200 OK)"), data?.mermaid);
  check("POST workflow diagram_type stored", data?.diagram_type === "workflow");
  check("POST workflow source_artifacts has graph id", data?.source_artifacts?.includes(diagramGraphId));
  check("POST workflow generated at timestamp", typeof data?.created_at === "string" && data.created_at.length > 0);
}

// 22. diagrams: generate ERD from entities tables (entity created in section 6)
{
  const res = await request("POST", "/diagrams/generate", {
    project_id: projectId,
    diagram_type: "erd",
  });
  check("POST /diagrams/generate erd -> 201", res.statusCode === 201, res.body);
  const data = res.json().data;
  check("POST erd mermaid is erDiagram", data?.mermaid?.startsWith("erDiagram"), data?.mermaid);
  check("POST erd source_artifacts has entity id", data?.source_artifacts?.includes("DB-0001"), data?.source_artifacts);
  check("POST erd warnings for no fields", (data?.warnings ?? []).some((w: { code: string }) => w.code === "ENTITY_NO_FIELDS"));
}

// 23. diagrams: preview (no storage) for all four kinds
{
  const wf = await request("POST", "/diagrams/preview", {
    kind: "workflow",
    nodes: [
      { key: "n1", type: "start", title: "Start", position: { x: 0, y: 0 } },
      { key: "n2", type: "step", title: "Do work", position: { x: 0, y: 100 } },
      { key: "n3", type: "end", title: "End", position: { x: 0, y: 200 } },
    ],
    edges: [{ key: "e1", source: "n1", target: "n2", type: "next" }],
  });
  check("POST /diagrams/preview workflow -> 200", wf.statusCode === 200, wf.body);
  check("POST preview workflow mermaid", wf.json().data?.mermaid?.includes("flowchart TD"), wf.json().data?.mermaid);
  check("POST preview workflow no error warnings", (wf.json().data?.warnings ?? []).every((w: { level: string }) => w.level !== "error"));

  const seq = await request("POST", "/diagrams/preview", {
    kind: "sequence",
    nodes: [
      { key: "p1", type: "api_call", title: "Orders API", position: { x: 0, y: 0 } },
      { key: "p2", type: "database", title: "Orders DB", position: { x: 0, y: 0 } },
    ],
    edges: [{ key: "m1", source: "p1", target: "p2", type: "success", label: "INSERT order" }],
  });
  check("POST preview sequence -> 200", seq.statusCode === 200, seq.body);
  check("POST preview sequence mermaid", seq.json().data?.mermaid?.includes("sequenceDiagram"), seq.json().data?.mermaid);
  check("POST preview sequence has participants", (seq.json().data?.mermaid?.match(/participant/g) ?? []).length === 2, seq.json().data?.mermaid);

  const arch = await request("POST", "/diagrams/preview", {
    kind: "architecture",
    nodes: [
      { key: "c1", type: "screen", title: "Web client", position: { x: 0, y: 0 } },
      { key: "c2", type: "api_call", title: "API gateway", position: { x: 200, y: 0 } },
      { key: "c3", type: "database", title: "Postgres", position: { x: 400, y: 0 } },
    ],
    edges: [{ key: "l1", source: "c1", target: "c2", type: "next", label: "HTTPS" }],
  });
  check("POST preview architecture -> 200", arch.statusCode === 200, arch.body);
  check("POST preview architecture has subgraphs", (arch.json().data?.mermaid?.match(/subgraph/g) ?? []).length >= 2, arch.json().data?.mermaid);

  const erd = await request("POST", "/diagrams/preview", {
    kind: "data",
    nodes: [
      { key: "d1", type: "database", title: "User", position: { x: 0, y: 0 }, metadata: { fields: [{ name: "id", data_type: "string", is_primary_key: true }, { name: "email", data_type: "string", is_unique: true }] } },
      { key: "d2", type: "database", title: "Order", position: { x: 200, y: 0 } },
    ],
    edges: [{ key: "r1", source: "d1", target: "d2", type: "related", condition: "1:N", label: "places" }],
  });
  check("POST preview erd -> 200", erd.statusCode === 200, erd.body);
  check("POST preview erd mermaid", erd.json().data?.mermaid?.includes("erDiagram"), erd.json().data?.mermaid);
  check("POST preview erd PK field", erd.json().data?.mermaid?.includes("string id PK"), erd.json().data?.mermaid);
}

// 24. diagrams: list, get, delete
{
  const list = await request("GET", `/diagrams?project=${projectId}`);
  check("GET /diagrams?project -> 200", list.statusCode === 200, list.body);
  const data = list.json().data as { id: string }[];
  check("GET /diagrams contains DIAG-0001 + DIAG-0002", data.some((d) => d.id === "DIAG-0001") && data.some((d) => d.id === "DIAG-0002"));

  const get = await request("GET", `/diagrams/${diagId}`);
  check("GET /diagrams/:id -> 200", get.statusCode === 200, get.body);
  check("GET /diagrams/:id mermaid present", get.json().data?.mermaid?.length > 0);

  const del = await request("DELETE", `/diagrams/${diagId}`);
  check("DELETE /diagrams/:id -> 204", del.statusCode === 204, del.body);
  const gone = await request("GET", `/diagrams/${diagId}`);
  check("GET deleted diagram -> 404", gone.statusCode === 404, gone.body);
}

// 25. docs: generate workspace export
let docsId = "";
{
  const res = await request("POST", "/docs/generate", { project_id: projectId });
  check("POST /docs/generate -> 201", res.statusCode === 201, res.body);
  const data = res.json().data;
  docsId = data?.id ?? "";
  check("POST /docs/generate id DOCS-0001", docsId === "DOCS-0001", docsId);
  check("POST /docs/generate file_count >= 30", (data?.file_count ?? 0) >= 30, data?.file_count);
  const paths = (data?.files ?? []).map((f: { path: string }) => f.path);
  check("POST docs has README.md", paths.includes("README.md"));
  check("POST docs has AGENTS.md", paths.includes("AGENTS.md"));
  check("POST docs has srs.md", paths.includes("02-requirements/srs.md"));
  check("POST docs has agent-guide.md", paths.includes("09-agent-plans/agent-guide.md"));
  const readme = data?.files?.find((f: { path: string }) => f.path === "README.md")?.content ?? "";
  check("POST docs README has frontmatter", readme.startsWith("---\n"));
  check("POST docs README has stable id", /id: ART-0001/.test(readme), readme.slice(0, 120));
  const srs = data?.files?.find((f: { path: string }) => f.path === "02-requirements/srs.md")?.content ?? "";
  check("POST docs srs contains REQ-0001", srs.includes("REQ-0001"), srs.slice(0, 200));
  const workflows = data?.files?.find((f: { path: string }) => f.path === "03-design/workflows.md")?.content ?? "";
  check("POST docs workflows embeds mermaid flowchart", workflows.includes("flowchart TD"), workflows.slice(0, 200));
}

// 26. docs: list + get
{
  const list = await request("GET", `/docs/exports?project=${projectId}`);
  check("GET /docs/exports?project -> 200", list.statusCode === 200, list.body);
  check("GET /docs/exports contains DOCS-0001", (list.json().data ?? []).some((e: { id: string }) => e.id === "DOCS-0001"));

  const get = await request("GET", `/docs/exports/${docsId}`);
  check("GET /docs/exports/:id -> 200", get.statusCode === 200, get.body);
  const files = get.json().data?.files ?? [];
  check("GET docs/:id files from disk", files.length >= 30, files.length);
}

// 27. docs: protected section preserved on regeneration
let docs2Id = "";
{
  // Mark README.md as protected in export 1 on disk.
  const readmePath = join(config.EXPORT_DIR, docsId, "README.md");
  const original = readFileSync(readmePath, "utf8");
  writeFileSync(readmePath, original + "\n<!-- protected -->\n## Manual note\nThis edit must survive regeneration.\n");

  const res = await request("POST", "/docs/generate", { project_id: projectId });
  check("POST /docs/generate regenerate -> 201", res.statusCode === 201, res.body);
  const data = res.json().data;
  docs2Id = data?.id ?? "";
  check("POST regenerate id DOCS-0002", docs2Id === "DOCS-0002", docs2Id);
  const readme2 = data?.files?.find((f: { path: string }) => f.path === "README.md")?.content ?? "";
  check("POST regenerate preserves protected manual edit", readme2.includes("This edit must survive regeneration."), readme2.slice(-200));

  const list = await request("GET", `/docs/exports?project=${projectId}`);
  const rows = list.json().data as { id: string; status: string }[];
  check("POST regenerate supersedes DOCS-0001", rows.find((e) => e.id === "DOCS-0001")?.status === "superseded", rows);
}

// 28. docs: delete export
{
  const del = await request("DELETE", `/docs/exports/${docs2Id}`);
  check("DELETE /docs/exports/:id -> 204", del.statusCode === 204, del.body);
  const gone = await request("GET", `/docs/exports/${docs2Id}`);
  check("GET deleted docs export -> 404", gone.statusCode === 404, gone.body);
}

// 29. roadmap: seed traceability links, then generate
let roadmapId = "";
{
  // Link REQ-0001 -> API-0001 so the roadmap derives a dependency edge.
  db.query(
    "INSERT INTO artifact_links (project_id, from_type, from_id, to_type, to_id, link_type) VALUES (?, 'requirement', 'REQ-0001', 'api_endpoint', 'API-0001', 'traces')",
  ).run(projectId);

  const res = await request("POST", "/roadmaps/generate", { project_id: projectId });
  check("POST /roadmaps/generate -> 201", res.statusCode === 201, res.body);
  const data = res.json().data;
  roadmapId = data?.roadmap?.id ?? "";
  check("POST /roadmaps/generate id RMP-0001", roadmapId === "RMP-0001", roadmapId);
  check("POST roadmap phases length 5", (data?.phases ?? []).length === 5, data?.phases?.length);
  check("POST roadmap milestones length 5", (data?.milestones ?? []).length === 5, data?.milestones?.length);
  check("POST roadmap epics include Requirements & Scope", (data?.epics ?? []).some((e: { name: string }) => e.name === "Requirements & Scope"));
  const tasks = data?.tasks ?? [];
  check("POST roadmap tasks >= 5 drafts", tasks.length >= 5, tasks.length);
  check("POST roadmap phase 1 approval gate", data?.phases?.[0]?.approval_required === 1 && (data?.phases?.[0]?.gate_criteria ?? "").length > 0);
  const reqTask = tasks.find((t: { source_id: string }) => t.source_id === "REQ-0001");
  check("POST roadmap requirement task high priority", reqTask?.priority === "high", reqTask?.priority);
  check("POST roadmap requirement task references REQ-0001", reqTask?.input_artifacts?.includes("REQ-0001"), reqTask?.input_artifacts);
  check("POST roadmap task checklist has verification hints", (reqTask?.checklist ?? []).every((c: { verification: string }) => Boolean(c.verification)));
  const taskIdBySource = new Map<string, string>();
  for (const t of tasks) taskIdBySource.set(`${t.source_type}:${t.source_id}`, t.id);
  const depPresent = (data?.dependencies ?? []).some(
    (d: { task_id: string; depends_on_task_id: string }) =>
      d.task_id === taskIdBySource.get("requirement:REQ-0001") && d.depends_on_task_id === taskIdBySource.get("api_endpoint:API-0001"),
  );
  check("POST roadmap dependency REQ->API", depPresent, data?.dependencies);
  const apiTask = tasks.find((t: { source_id: string }) => t.source_id === "API-0001");
  check("POST roadmap api task type backend", apiTask?.type === "backend");
}

// 30. roadmap: list + get
{
  const list = await request("GET", `/roadmaps?project=${projectId}`);
  check("GET /roadmaps?project -> 200", list.statusCode === 200, list.body);
  check("GET /roadmaps contains RMP-0001", (list.json().data ?? []).some((r: { id: string }) => r.id === "RMP-0001"));

  const get = await request("GET", `/roadmaps/${roadmapId}`);
  check("GET /roadmaps/:id -> 200", get.statusCode === 200, get.body);
  check("GET roadmap milestone due dates present", (get.json().data?.milestones ?? []).every((m: { due_date: string }) => Boolean(m.due_date)));
}

// 31. agent-tasks: generate task pack from roadmap
let packTaskId = "";
{
  const res = await request("POST", "/agent-tasks/generate", { roadmap_id: roadmapId });
  check("POST /agent-tasks/generate -> 201", res.statusCode === 201, res.body);
  const data = res.json().data;
  check("POST agent-tasks created >= 5", (data?.created ?? 0) >= 5, data?.created);
  check("POST agent-tasks skipped 0", data?.skipped === 0, data?.skipped);
  packTaskId = data?.task_ids?.[0] ?? "";
  check("POST agent-tasks first task TASK-0002", packTaskId === "TASK-0002", packTaskId);
  const firstPack = data?.packs?.[0];
  check("POST agent-tasks pack has objective", Boolean(firstPack?.task?.objective));
  check("POST agent-tasks pack has definition_of_done", Boolean(firstPack?.task?.definition_of_done));
  check("POST agent-tasks pack checklist sequential", (firstPack?.checklist ?? []).every((c: { position: number }, i: number) => c.position === i + 1));
  check("POST agent-tasks pack checklist verification hints", (firstPack?.checklist ?? []).every((c: { verification_hint: string }) => Boolean(c.verification_hint)));

  // idempotent re-run
  const again = await request("POST", "/agent-tasks/generate", { roadmap_id: roadmapId });
  check("POST agent-tasks re-run skips all", again.json().data?.created === 0 && again.json().data?.skipped >= 5, again.json().data);
}

// 32. agent-tasks: list + get packs with dependencies
{
  const list = await request("GET", `/agent-tasks?project=${projectId}`);
  check("GET /agent-tasks?project -> 200", list.statusCode === 200, list.body);
  const packs = list.json().data ?? [];
  check("GET agent-tasks contains generated pack", packs.some((p: { task: { id: string } }) => p.task.id === packTaskId));
  const withDeps = packs.filter((p: { dependencies: unknown[] }) => p.dependencies.length > 0);
  check("GET agent-tasks has dependency edges", withDeps.length >= 1, withDeps.map((p: { task: { id: string }; dependencies: unknown[] }) => [p.task.id, p.dependencies]));
  check("GET agent-tasks packs have checklists", packs.every((p: { checklist: unknown[] }) => p.checklist.length >= 1));

  const get = await request("GET", `/agent-tasks/${packTaskId}`);
  check("GET /agent-tasks/:id -> 200", get.statusCode === 200, get.body);
  check("GET /agent-tasks/:id title", get.json().data?.task?.title?.length > 0);

  const missing = await request("GET", "/agent-tasks/TASK-9999");
  check("GET /agent-tasks/TASK-9999 -> 404", missing.statusCode === 404, missing.body);
}

// 33. roadmap: delete
{
  const del = await request("DELETE", `/roadmaps/${roadmapId}`);
  check("DELETE /roadmaps/:id -> 204", del.statusCode === 204, del.body);
  const gone = await request("GET", `/roadmaps/${roadmapId}`);
  check("GET deleted roadmap -> 404", gone.statusCode === 404, gone.body);
  const tasksStillThere = await request("GET", `/tasks?project=${projectId}`);
  check("deleting roadmap keeps materialized tasks", (tasksStillThere.json().data ?? []).some((t: { id: string }) => t.id === packTaskId));
}

// 34. governance: status lifecycle registry
{
  const res = await request("GET", "/governance/statuses");
  check("GET /governance/statuses -> 200", res.statusCode === 200, res.body);
  const data = res.json().data;
  check("GET statuses has 9 canonical statuses", data?.statuses?.length === 9, data?.statuses);
  const required = ["draft", "auto_generated", "needs_review", "approved", "ready_for_agent", "in_progress", "needs_verification", "done", "rejected"];
  check("GET statuses covers required values", required.every((s) => data?.statuses?.includes(s)));
  check("GET statuses transitions present", data?.transitions?.draft?.includes("auto_generated"));
  check("GET statuses gates requirement", data?.approval_gated_types?.includes("requirement"));
  check("GET statuses gates roadmap", data?.approval_gated_types?.includes("roadmap"));
  check("GET statuses auto_generated allowed", data?.auto_generated_allowed === true);
}

// 35. governance: status transitions + approval gate
{
  const current = await request("GET", "/governance/status?artifact_type=requirement&artifact_id=REQ-0001");
  check("GET /governance/status -> 200", current.statusCode === 200, current.body);
  check("GET status seeds draft from proposed", current.json().data?.status === "draft", current.json().data?.status);
  check("GET status allowed_next includes needs_review", current.json().data?.allowed_next?.includes("needs_review"));

  const toReview = await request("POST", "/governance/status", { artifact_type: "requirement", artifact_id: "REQ-0001", to_status: "needs_review", actor: "eng-lead@internal" });
  check("POST status draft -> needs_review -> 200", toReview.statusCode === 200, toReview.body);

  const blocked = await request("POST", "/governance/status", { artifact_type: "requirement", artifact_id: "REQ-0001", to_status: "approved" });
  check("POST status needs_review -> approved without APR -> 400", blocked.statusCode === 400, blocked.body);
  check("POST blocked approval code GOV_APPROVAL_REQUIRED", blocked.json().error?.details?.code === "GOV_APPROVAL_REQUIRED", blocked.json().error);

  const invalid = await request("POST", "/governance/status", { artifact_type: "task", artifact_id: "TASK-0001", to_status: "done" });
  check("POST status task draft -> done invalid -> 400", invalid.statusCode === 400, invalid.body);

  const auto = await request("POST", "/governance/status", { artifact_type: "entity", artifact_id: "DB-0001", to_status: "auto_generated" });
  check("POST status entity draft -> auto_generated -> 200 (no gate)", auto.statusCode === 200, auto.body);
  const gatedEntity = await request("POST", "/governance/status", { artifact_type: "entity", artifact_id: "DB-0001", to_status: "approved" });
  check("POST status entity auto_generated -> approved without APR -> 400", gatedEntity.statusCode === 400, gatedEntity.body);
}

// 36. governance: approval request + decision (approve + reject reason)
let aprId = "";
{
  const res = await request("POST", "/approvals", {
    project_id: projectId,
    artifact_id: "REQ-0001",
    artifact_type: "requirement",
    approver_role: "product",
  });
  check("POST /approvals -> 201", res.statusCode === 201, res.body);
  aprId = res.json().data?.id ?? "";
  check("POST /approvals id APR-0001", aprId === "APR-0001", aprId);
  check("POST /approvals status pending", res.json().data?.status === "pending");

  const noReason = await request("POST", `/approvals/${aprId}/decide`, { decision: "rejected", approver_role: "product" });
  check("POST decide rejected without reason -> 400", noReason.statusCode === 400, noReason.body);

  const approve = await request("POST", `/approvals/${aprId}/decide`, {
    decision: "approved",
    approver_role: "product",
    approver_name: "Ada Lovelace",
    comments: "Final requirement approved in review.",
  });
  check("POST decide approved -> 200", approve.statusCode === 200, approve.body);
  check("POST decide status approved", approve.json().data?.status === "approved");

  // Now the gated transition succeeds and syncs the domain status.
  const approveReq = await request("POST", "/governance/status", { artifact_type: "requirement", artifact_id: "REQ-0001", to_status: "approved" });
  check("POST status needs_review -> approved with APR -> 200", approveReq.statusCode === 200, approveReq.body);
  check("POST status returns approval id", approveReq.json().data?.approval_id === aprId, approveReq.json().data);
  const req = await request("GET", "/requirements?project=" + projectId);
  const reqRow = (req.json().data ?? []).find((r: { id: string }) => r.id === "REQ-0001");
  check("governance approved syncs requirement status", reqRow?.status === "approved", reqRow?.status);

  const again = await request("POST", `/approvals/${aprId}/decide`, { decision: "rejected", approver_role: "product", comments: "x" });
  check("POST decide on decided approval -> 400", again.statusCode === 400, again.body);

  const rejectReq = await request("POST", "/approvals", {
    project_id: projectId,
    artifact_id: "API-0001",
    artifact_type: "api_endpoint",
    approver_role: "engineering",
  });
  const rejectAprId = rejectReq.json().data?.id ?? "";
  const reject = await request("POST", `/approvals/${rejectAprId}/decide`, {
    decision: "rejected",
    approver_role: "engineering",
    comments: "Contract needs pagination before approval.",
  });
  check("POST decide rejected with reason -> 200", reject.statusCode === 200, reject.body);
  check("POST decide rejected records reason", (reject.json().data?.comments ?? "").includes("pagination"));
}

// 37. governance: approvals list/get + audit + validation + traceability
{
  const list = await request("GET", `/approvals?project=${projectId}`);
  check("GET /approvals?project -> 200", list.statusCode === 200, list.body);
  check("GET /approvals contains APR-0001", (list.json().data ?? []).some((a: { id: string }) => a.id === "APR-0001"));
  const byArtifact = await request("GET", `/approvals?project=${projectId}&artifact_id=REQ-0001`);
  check("GET /approvals filtered by artifact", (byArtifact.json().data ?? []).every((a: { artifact_id: string }) => a.artifact_id === "REQ-0001"));

  const get = await request("GET", `/approvals/${aprId}`);
  check("GET /approvals/:id -> 200", get.statusCode === 200, get.body);
  const missing = await request("GET", "/approvals/APR-9999");
  check("GET /approvals/APR-9999 -> 404", missing.statusCode === 404, missing.body);

  const audit = await request("GET", `/audit?project=${projectId}`);
  check("GET /audit?project -> 200", audit.statusCode === 200, audit.body);
  const events = audit.json().data ?? [];
  check("GET /audit has status_change events", events.some((e: { action: string }) => e.action === "status_change"));
  check("GET /audit has approved event", events.some((e: { action: string }) => e.action === "approved"));

  const validation = await request("GET", `/governance/validation?project=${projectId}`);
  check("GET /governance/validation -> 200", validation.statusCode === 200, validation.body);
  const all = validation.json().data?.all ?? [];
  check("GET validation has TR-01 warning for REQ-0001", all.some((w: { rule: string; violations: string[] }) => w.rule === "TR-01" && w.violations.includes("REQ-0001")));
  check("GET validation has TR-07 error", all.some((w: { rule: string; level: string }) => w.rule === "TR-07" && w.level === "error"));
  check("GET validation has TR-09 pass (no violations)", all.find((w: { rule: string }) => w.rule === "TR-09")?.violations?.length === 0);

  const trace = await request("GET", `/governance/traceability?project=${projectId}`);
  check("GET /governance/traceability -> 200", trace.statusCode === 200, trace.body);
  const data = trace.json().data;
  check("GET traceability has requirement coverage", (data?.requirements_coverage ?? []).some((c: { id: string }) => c.id === "REQ-0001"));
  check("GET traceability reports uncovered requirement", data?.summary?.uncovered_ids?.includes("REQ-0001"));
  check("GET traceability summary totals", data?.summary?.total_requirements >= 1 && data?.summary?.total_links >= 0);
}

// 38. platform-config: built-in seeds
{
  const res = await request("GET", "/platform-config");
  check("GET /platform-config -> 200", res.statusCode === 200, res.body);
  const types = res.json().data ?? [];
  check("GET /platform-config 4 built-in types", types.length === 4, types.length);
  const web = types.find((t: { key: string }) => t.key === "web");
  check("GET platform-config web built_in enabled", web?.built_in === 1 && web?.enabled === 1);
  const react = web?.stacks?.find((s: { name: string }) => s.name === "React");
  check("GET platform-config React stack has libraries", (react?.libraries?.length ?? 0) > 0, react?.libraries?.length);
}

// 39. platform-config: multi-type project creation + validation + delete guards
let configTypeId = "";
{
  const create = await request("POST", "/projects", {
    name: "Full stack platform",
    type: "web",
    created_by: "tester@internal",
    types: [
      { type_id: "PTYPE-0001", stack_id: "STK-0004", library_ids: ["LIB-0011", "LIB-0012"] },
      { type_id: "PTYPE-0003", stack_id: "STK-0003", library_ids: ["LIB-0008"] },
    ],
  });
  check("POST /projects multi-type -> 201", create.statusCode === 201, create.body);
  const data = create.json().data;
  check("POST multi-type id PRJ-0002", data?.id === "PRJ-0002", data?.id);
  check("POST multi-type 2 selections", (data?.types ?? []).length === 2, data?.types?.length);
  const webSel = (data?.types ?? []).find((t: { type_id: string }) => t.type_id === "PTYPE-0001");
  check("POST multi-type web stack React", webSel?.stack_name === "React", webSel?.stack_name);
  check("POST multi-type web libraries", (webSel?.libraries ?? []).map((l: { name: string }) => l.name).includes("Zustand"), webSel?.libraries);

  const mismatch = await request("POST", "/projects", {
    name: "Bad stack",
    type: "web",
    created_by: "tester@internal",
    types: [{ type_id: "PTYPE-0001", stack_id: "STK-0011" }],
  });
  check("POST /projects mismatched stack -> 400", mismatch.statusCode === 400, mismatch.body);

  const custom = await request("POST", "/platform-config/types", {
    key: "desktop",
    label: "Desktop",
    color: "#0ea5e9",
  });
  check("POST /platform-config/types -> 201", custom.statusCode === 201, custom.body);
  configTypeId = custom.json().data?.id ?? "";
  check("POST custom type id PTYPE-0005", configTypeId === "PTYPE-0005", configTypeId);

  const disableBuiltIn = await request("PATCH", "/platform-config/types/PTYPE-0002", { enabled: false });
  check("PATCH built-in disable -> 200 enabled 0", disableBuiltIn.statusCode === 200 && disableBuiltIn.json().data?.enabled === 0, disableBuiltIn.body);
  const deleteBuiltIn = await request("DELETE", "/platform-config/types/PTYPE-0002");
  check("DELETE built-in type -> 400", deleteBuiltIn.statusCode === 400, deleteBuiltIn.body);

  const used = await request("DELETE", `/platform-config/types/${configTypeId}`);
  check("DELETE unused custom type -> 204", used.statusCode === 204, used.body);

  const audit = await request("GET", "/audit");
  const events = audit.json().data ?? [];
  check("audit has project_type created event", events.some((e: { entity_type: string; action: string }) => e.entity_type === "project_type" && e.action === "created"));
  check("audit has project_type updated event", events.some((e: { entity_type: string; action: string }) => e.entity_type === "project_type" && e.action === "updated"));
}

// 40. multi-project links: dependency CRUD + cross-project workflow_call
let depId = "";
{
  // Third project is the target of cross-project calls.
  const createB = await request("POST", "/projects", {
    name: "Orders backend",
    type: "api",
    created_by: "owner@internal",
  });
  check("POST links target project -> 201", createB.statusCode === 201, createB.body);
  const targetProject = createB.json().data?.id ?? "";

  const targetGraph = await request("POST", "/modeler/graphs", {
    project_id: targetProject,
    kind: "workflow",
    name: "Create order",
  });
  const targetGraphId = targetGraph.json().data?.id ?? "";
  check("POST links target graph id GRPH-0003", targetGraphId === "GRPH-0003", targetGraphId);

  const link = await request("POST", `/projects/${projectId}/dependencies`, {
    depends_on_project_id: targetProject,
    kind: "workflow_call",
    note: "Demo calls the orders backend",
  });
  check("POST /projects/:id/dependencies -> 201", link.statusCode === 201, link.body);
  depId = link.json().data?.id ?? "";
  check("POST dependency id PDEP-0001", depId === "PDEP-0001", depId);

  const dup = await request("POST", `/projects/${projectId}/dependencies`, {
    depends_on_project_id: targetProject,
    kind: "workflow_call",
  });
  check("POST duplicate dependency -> 409", dup.statusCode === 409, dup.body);
  const selfLink = await request("POST", `/projects/${projectId}/dependencies`, {
    depends_on_project_id: projectId,
    kind: "other",
  });
  check("POST self dependency -> 400", selfLink.statusCode === 400, selfLink.body);

  const deps = await request("GET", `/projects/${projectId}/dependencies`);
  check("GET /projects/:id/dependencies -> 200", deps.statusCode === 200, deps.body);
  check("GET dependencies length 1", (deps.json().data ?? []).length === 1, deps.body);

  const dependents = await request("GET", `/projects/${targetProject}/dependents`);
  check("GET /projects/:id/dependents -> 200", dependents.statusCode === 200, dependents.body);
  const depList = dependents.json().data ?? [];
  check("GET dependents length 1", depList.length === 1, depList);
  check("GET dependents including project id", depList[0]?.depending_project_id === projectId, depList[0]);

  // Save a cross-project workflow_call on the existing Order flow (GRPH-0002).
  const save = await request("PUT", `/modeler/graphs/${diagramGraphId}`, {
    nodes: [
      { key: "s", type: "start", title: "Start", position: { x: 0, y: 0 } },
      { key: "a", type: "api_call", title: "Submit order", position: { x: 0, y: 120 } },
      {
        key: "wc",
        type: "workflow_call",
        title: "Create order in backend",
        position: { x: 0, y: 240 },
        metadata: { cross_project: { project_id: targetProject, graph_id: targetGraphId } },
      },
      { key: "e", type: "end", title: "End", position: { x: 0, y: 360 } },
    ],
    edges: [
      { key: "e1", source: "s", target: "a", type: "next" },
      { key: "e2", source: "a", target: "wc", type: "success", condition: "200 OK" },
      { key: "e3", source: "wc", target: "e", type: "success" },
    ],
  });
  check("PUT cross-project workflow_call -> 200", save.statusCode === 200, save.body);

  const calls = await request("GET", `/projects/${projectId}/workflow-calls`);
  check("GET /projects/:id/workflow-calls -> 200", calls.statusCode === 200, calls.body);
  const callRows = (calls.json().data ?? []) as {
    workflow_id: string;
    node_id: string;
    node_title: string;
    target_project_id: string;
    target_graph_id: string;
    target_project_name: string;
    target_graph_name: string;
  }[];
  check("GET workflow-calls resolves target", callRows.some(
    (c) =>
      c.target_project_id === targetProject && c.target_graph_id === targetGraphId &&
      c.node_title === "Create order in backend" && c.target_project_name === "Orders backend" &&
      c.target_graph_name === "Create order",
  ), callRows);

  // Diagram render shows the workflow_call inside a named subgraph.
  const gen = await request("POST", "/diagrams/generate", {
    project_id: projectId,
    diagram_type: "workflow",
    graph_id: diagramGraphId,
  });
  check("POST /diagrams/generate with xp call -> 201", gen.statusCode === 201, gen.body);
  const mermaid = gen.json().data?.mermaid ?? "";
  const callNodeId = callRows[0]?.node_id?.replace(/-/g, "_") ?? "";
  check("POST xp mermaid has subgraph xp_", mermaid.includes(`subgraph xp_${callNodeId}`), mermaid);
  check("POST xp mermaid nests target graph", mermaid.includes("Orders backend") && mermaid.includes(targetGraphId), mermaid);

  // Shape-invalid refs are rejected at save time.
  const badSave = await request("PUT", `/modeler/graphs/${diagramGraphId}`, {
    nodes: [
      { key: "wc", type: "workflow_call", title: "Ghost", position: { x: 240, y: 240 }, metadata: { cross_project: { project_id: targetProject } } },
    ],
    edges: [],
  });
  check("PUT xp call missing target graph -> 400", badSave.statusCode === 400, badSave.body);

  const validation = await request("GET", `/governance/validation?project=${projectId}`);
  const all = validation.json().data?.all ?? [];
  check("GET validation has TR-21", all.some((w: { rule: string }) => w.rule === "TR-21"), all);
  check("GET validation TR-21 no violations (call is valid)", all.find((w: { rule: string }) => w.rule === "TR-21")?.violations?.length === 0, all);

  const docs = await request("POST", "/docs/generate", { project_id: projectId });
  const paths = (docs.json().data?.files ?? []).map((f: { path: string }) => f.path);
  check("POST docs includes 00-meta/dependencies.md", paths.includes("00-meta/dependencies.md"), paths);
  const wfDoc = docs.json().data?.files?.find((f: { path: string }) => f.path === "03-design/workflows.md")?.content ?? "";
  check("POST docs workflows has cross-project calls section", wfDoc.includes("Cross-project Calls"), wfDoc.slice(0, 200));

  const del = await request("DELETE", `/projects/${projectId}/dependencies/${depId}`);
  check("DELETE /projects/:id/dependencies/:depId -> 204", del.statusCode === 204, del.body);
  const gone = await request("GET", `/projects/${projectId}/dependencies`);
  check("GET dependencies after delete empty", (gone.json().data ?? []).length === 0, gone.body);
}

// 19b/19c. palette delete guards + category CRUD (Prompt 15). Placed at the
// end so its temporary usage graph cannot shift the GRPH id sequence that
// earlier sections assert on.
{
  // Custom category host — built-in categories are never deletable.
  const catRes = await request("POST", "/node-palette/categories", {
    key: "gatekeep",
    label: "Gatekeeping",
    color: "#16a34a",
    sort_order: 50,
  });
  check("POST /node-palette/categories -> 201", catRes.statusCode === 201, catRes.body);
  const guardCatId = catRes.json().data?.id ?? "";
  check("POST category id NCAT-0005", guardCatId === "NCAT-0005", guardCatId);

  const patchCat = await request("PATCH", `/node-palette/categories/${guardCatId}`, {
    label: "Gatekeeping & Review",
    sort_order: 51,
  });
  check("PATCH /node-palette/categories -> 200", patchCat.statusCode === 200, patchCat.body);
  check("PATCH category label updated", patchCat.json().data?.label === "Gatekeeping & Review", patchCat.body);
  check("PATCH category sort_order updated", patchCat.json().data?.sort_order === 51, patchCat.body);

  const dupCat = await request("POST", "/node-palette/categories", {
    key: "flow",
    label: "Flow duplicate",
  });
  check("POST /node-palette/categories duplicate key -> 409", dupCat.statusCode === 409, dupCat.body);

  // Re-parent retry under the custom category so the delete guards apply.
  const moved = await request("PATCH", `/node-palette/types/${retryTypeId}`, { category_id: guardCatId });
  check("PATCH re-parent retry -> 200", moved.statusCode === 200, moved.body);

  // In-use type + non-empty category delete guards.
  const createGraph = await request("POST", "/modeler/graphs", {
    project_id: projectId,
    kind: "workflow",
    name: "Retry usage",
  });
  const usedGraphId = createGraph.json().data?.id ?? "";
  await request("PUT", `/modeler/graphs/${usedGraphId}`, {
    nodes: [
      { key: "g-start", type: "start", title: "Start", position: { x: 0, y: 0 } },
      {
        key: "g-retry",
        type: "retry",
        title: "Retry step",
        position: { x: 200, y: 0 },
        metadata: { max_attempts: 3, mode: "backoff" },
      },
    ],
    edges: [{ key: "e1", source: "g-start", target: "g-retry", type: "next" }],
  });

  const delType = await request("DELETE", `/node-palette/types/${retryTypeId}`);
  check("DELETE in-use node type -> 409", delType.statusCode === 409, delType.body);
  const delCat = await request("DELETE", `/node-palette/categories/${guardCatId}`);
  check("DELETE non-empty category -> 409", delCat.statusCode === 409, delCat.body);

  const delGraph = await request("DELETE", `/modeler/graphs/${usedGraphId}`);
  check("DELETE usage graph -> 204", delGraph.statusCode === 204);

  const delType2 = await request("DELETE", `/node-palette/types/${retryTypeId}`);
  check("DELETE unused node type -> 204", delType2.statusCode === 204, delType2.body);
  const delCat2 = await request("DELETE", `/node-palette/categories/${guardCatId}`);
  check("DELETE unused category -> 204", delCat2.statusCode === 204, delCat2.body);

  const final = await request("GET", "/modeler/node-types");
  check("GET /modeler/node-types back to 14", (final.json().data as { type: string }[]).length === 14);
}

// 20. skills (Prompt 16)
{
  // Initial list for a fresh project is empty.
  const empty = await request("GET", `/skills?project=${projectId}`);
  check("GET /skills?project empty initially", (empty.json().data ?? []).length === 0, empty.body);

  const capability = await request("POST", "/skills", {
    project_id: projectId,
    kind: "capability",
    name: "Payments engineering",
    description: "PCI-sensitive checkout design.",
    level: "expert",
  });
  check("POST /skills capability -> 201", capability.statusCode === 201, capability.body);
  const capabilityId = capability.json().data?.id ?? "";
  check("POST /skills id SKL-0001", capabilityId === "SKL-0001", capabilityId);
  check("POST /skills capability has level", capability.json().data?.level === "expert");

  const tech = await request("POST", "/skills", {
    project_id: projectId,
    kind: "tech",
    name: "React",
    tag: "frontend",
    sort_order: 5,
  });
  check("POST /skills tech -> 201", tech.statusCode === 201, tech.body);
  const techId = tech.json().data?.id ?? "";
  check("POST /skills id SKL-0002", techId === "SKL-0002", techId);
  check("POST /skills tech stores tag not level", tech.json().data?.tag === "frontend" && tech.json().data?.level === null, tech.body);

  const list = await request("GET", `/skills?project=${projectId}`);
  check("GET /skills?project has both kinds", (list.json().data ?? []).length === 2, list.body);

  const patched = await request("PATCH", `/skills/${capabilityId}`, { level: "advanced" });
  check("PATCH /skills/:id -> 200", patched.statusCode === 200, patched.body);
  check("PATCH /skills/:id level updated", patched.json().data?.level === "advanced", patched.body);

  const badCapability = await request("POST", "/skills", { project_id: projectId, kind: "capability", name: "No level" });
  check("POST /skills capability without level -> 400", badCapability.statusCode === 400, badCapability.body);
  const badTech = await request("POST", "/skills", { project_id: projectId, kind: "tech", name: "React", level: "expert" });
  check("POST /skills tech with level -> 400", badTech.statusCode === 400, badTech.body);
  const badProject = await request("POST", "/skills", { project_id: "PRJ-9999", kind: "tech", name: "X" });
  check("POST /skills unknown project -> 404", badProject.statusCode === 404, badProject.body);

  // Docs integration: skills.md appears inside the generated workspace.
  const docs = await request("POST", "/docs/generate", { project_id: projectId });
  const docPaths = (docs.json().data?.files ?? []).map((f: { path: string }) => f.path);
  check("POST docs includes 07-guides/skills.md", docPaths.includes("07-guides/skills.md"), docPaths);
  const skillsDoc = docs.json().data?.files?.find((f: { path: string }) => f.path === "07-guides/skills.md")?.content ?? "";
  check("POST docs skills.md has Capability + Tech sections", skillsDoc.includes("Capability Skills") && skillsDoc.includes("Tech Skills"), skillsDoc.slice(0, 120));
  check("POST docs skills.md lists seeded skills", skillsDoc.includes("Payments engineering") && skillsDoc.includes("React"), skillsDoc.slice(0, 200));

  const audit = await request("GET", "/audit");
  const events = audit.json().data ?? [];
  check("GET /audit logs skill creation", events.some((e: { entity_type: string; entity_id: string }) =>
    e.entity_type === "skill" && e.entity_id === capabilityId), events.length);

  const delTech = await request("DELETE", `/skills/${techId}`);
  check("DELETE /skills/:id -> 204", delTech.statusCode === 204, delTech.body);
  const delGone = await request("DELETE", `/skills/${techId}`);
  check("DELETE /skills/:id again -> 404", delGone.statusCode === 404, delGone.body);
}

// 21. auth & billing (Prompt 21)
{
  const inject = async (
    method: "GET" | "POST" | "DELETE",
    url: string,
    payload?: unknown,
    cookie?: string,
  ) =>
    app.inject({
      method,
      url,
      payload: payload as undefined,
      headers: cookie ? { cookie } : undefined,
    });

  // Plans seed + public list.
  const plans = await request("GET", "/plans");
  check("GET /plans -> 200 with 3 seeded plans", plans.statusCode === 200 && (plans.json().data ?? []).length === 3, plans.body);
  const plus = (plans.json().data ?? []).find((p: { key: string }) => p.key === "plus");
  check("GET /plans plus pricing $19/$190 popular", plus?.monthlyPriceCents === 1900 && plus?.yearlyPriceCents === 19000 && plus?.popular === true, plans.body);

  // Register (auth hardening: no session yet — verification required first).
  const register = await inject("POST", "/auth/register", {
    name: "Smoke User",
    email: "smoke@example.com",
    password: "smoke-password-1",
  });
  check("POST /auth/register -> 201", register.statusCode === 201, register.body);
  check("register does NOT set a session cookie", register.headers["set-cookie"] === undefined);

  // Duplicate email rejected.
  const dup = await inject("POST", "/auth/register", {
    name: "Dup",
    email: "smoke@example.com",
    password: "smoke-password-1",
  });
  check("POST /auth/register duplicate email -> 409", dup.statusCode === 409, dup.body);

  // Login is blocked until the emailed code is verified.
  const blockedLogin = await inject("POST", "/auth/login", {
    email: "smoke@example.com",
    password: "smoke-password-1",
  });
  check("login before verify -> 403 EMAIL_NOT_VERIFIED", blockedLogin.statusCode === 403 && blockedLogin.json().error?.code === "EMAIL_NOT_VERIFIED", blockedLogin.body);
  const verifyCode = /(\d{6})/.exec(sentEmails[sentEmails.length - 1]?.subject ?? "")?.[1] ?? "";
  const verified = await app.inject({
    method: "POST",
    url: "/auth/verify-email",
    payload: { email: "smoke@example.com", code: verifyCode },
  });
  check("verify-email opens the session", verified.statusCode === 200, verified.body);
  const setCookie = (verified.headers["set-cookie"] as string | undefined) ?? "";
  const token = /sf_session=([^;]+)/.exec(setCookie)?.[1] ?? "";
  check("verify-email sets sf_session cookie", token.length > 0, setCookie);

  // Me with/without session.
  const anonMe = await request("GET", "/auth/me");
  check("GET /auth/me without session -> 401", anonMe.statusCode === 401, anonMe.body);
  const me = await inject("GET", "/auth/me", undefined, `sf_session=${token}`);
  check("GET /auth/me resolves session user", me.statusCode === 200 && me.json().data?.user?.email === "smoke@example.com", me.body);

  // Checkout guards + validation.
  const anonCheckout = await request("POST", "/billing/checkout", { plan_key: "plus", cycle: "monthly", card: {} });
  check("POST /billing/checkout without session -> 401", anonCheckout.statusCode === 401, anonCheckout.body);

  const badCard = await inject(
    "POST",
    "/billing/checkout",
    {
      plan_key: "plus",
      cycle: "yearly",
      card: { name: "S", number: "4242424242424241", exp_month: 12, exp_year: 2099, cvc: "123" },
    },
    `sf_session=${token}`,
  );
  check("checkout Luhn-invalid card -> 400", badCard.statusCode === 400, badCard.body);

  const paidCheckout = await inject(
    "POST",
    "/billing/checkout",
    {
      plan_key: "plus",
      cycle: "yearly",
      card: { name: "Smoke User", number: "4242 4242 4242 4242", exp_month: 12, exp_year: 2099, cvc: "123" },
    },
    `sf_session=${token}`,
  );
  check("checkout valid card -> 200 active subscription", paidCheckout.statusCode === 200 && paidCheckout.json().data?.status === "active", paidCheckout.body);
  check("checkout stores last4 + period end", paidCheckout.json().data?.cardLast4 === "4242" && typeof paidCheckout.json().data?.currentPeriodEnd === "string", paidCheckout.body);

  const sub = await inject("GET", "/billing/subscription/me", undefined, `sf_session=${token}`);
  check("GET /billing/subscription/me returns active plus plan", sub.json().data?.plan?.key === "plus", sub.body);

  // Switch to premium replaces the plus subscription.
  const premium = await inject(
    "POST",
    "/billing/checkout",
    {
      plan_key: "premium",
      cycle: "monthly",
      card: { name: "Smoke User", number: "4242424242424242", exp_month: 1, exp_year: 2099, cvc: "1234" },
    },
    `sf_session=${token}`,
  );
  check("checkout switch to premium -> 200", premium.statusCode === 200 && premium.json().data?.plan?.key === "premium", premium.body);

  // Cancel.
  const cancel = await inject("DELETE", "/billing/subscription/me", undefined, `sf_session=${token}`);
  check("DELETE /billing/subscription/me -> 200", cancel.statusCode === 200, cancel.body);
  const subAfter = await inject("GET", "/billing/subscription/me", undefined, `sf_session=${token}`);
  check("subscription null after cancel", subAfter.statusCode === 200 && subAfter.json().data === null, subAfter.body);

  // Logout invalidates the session server-side.
  const logout = await inject("POST", "/auth/logout", undefined, `sf_session=${token}`);
  check("POST /auth/logout -> 200", logout.statusCode === 200, logout.body);
  const meAfter = await inject("GET", "/auth/me", undefined, `sf_session=${token}`);
  check("GET /auth/me after logout -> 401", meAfter.statusCode === 401, meAfter.body);
}

// 22. skill matching (OPT-004)
{
  const skillRes = await app.inject({
    method: "POST",
    url: "/skills",
    payload: { project_id: projectId, kind: "tech", name: "React", tag: "frontend" },
  });
  check("POST /skills (matching fixture) -> 201", skillRes.statusCode === 201, skillRes.body);
  const opsTask = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: {
      project_id: projectId,
      title: "Write the operations handover runbook",
      objective: "Document ops procedures for the release.",
      type: "ops",
      definition_of_done: "Runbook reviewed by the team.",
    },
  });
  check("POST /tasks (unmatched fixture) -> 201", opsTask.statusCode === 201, opsTask.body);

  const matchRes = await app.inject({ method: "GET", url: `/skill-matches?project=${projectId}` });
  check("GET /skill-matches -> 200", matchRes.statusCode === 200, matchRes.body);
  const report = matchRes.json().data;
  check(
    "skill-matches returns ranked per-task skills",
    Array.isArray(report.matches) &&
      report.matches.every(
        (m: { task_id: string; skills: unknown[] }) => typeof m.task_id === "string" && Array.isArray(m.skills),
      ),
    JSON.stringify(report).slice(0, 200),
  );
  check(
    "coverage gaps list every project skill with open/total counts",
    Array.isArray(report.coverage_gaps) &&
      report.coverage_gaps.every(
        (g: { skill_id: string; open_matches: number; total_matches: number }) =>
          typeof g.skill_id === "string" && Number.isInteger(g.open_matches) && Number.isInteger(g.total_matches),
      ),
    JSON.stringify(report.coverage_gaps ?? []).slice(0, 200),
  );
  const repeat = await app.inject({ method: "GET", url: `/skill-matches?project=${projectId}` });
  check("repeat call identical", JSON.stringify(repeat.json()) === JSON.stringify(matchRes.json()), repeat.body);
}

// 23. auth hardening: email verification OTP + password recovery
{
  const inject = async (method: string, url: string, payload?: unknown, cookie?: string) =>
    app.inject({
      method: method as "GET",
      url,
      payload: payload as undefined,
      ...(cookie ? { headers: { cookie } } : {}),
    });

  const email = "smoke-user@specforge.local";

  const reg = await request("POST", "/auth/register", {
    name: "Smoke User",
    email,
    password: "smoke-password-1",
  });
  check("register -> 201 with otp_sent, no session cookie", reg.statusCode === 201 && reg.json().data?.otp_sent === true && reg.headers["set-cookie"] === undefined, reg.body);

  const blocked = await request("POST", "/auth/login", { email, password: "smoke-password-1" });
  check("login before verify -> 403 EMAIL_NOT_VERIFIED", blocked.statusCode === 403 && blocked.json().error?.code === "EMAIL_NOT_VERIFIED", blocked.body);

  const codeMatch = /(\d{6})/.exec(sentEmails[sentEmails.length - 1]?.subject ?? "");
  const code = codeMatch?.[1] ?? "";
  check("verification email contains a 6-digit code", /^\d{6}$/.test(code), sentEmails.map((m) => m.subject).join(" | "));

  const wrong = await request("POST", "/auth/verify-email", { email, code: "000000" });
  check("verify-email wrong code -> 400", wrong.statusCode === 400, wrong.body);

  const good = await app.inject({ method: "POST", url: "/auth/verify-email", payload: { email, code } });
  const token = /sf_session=([^;]+)/.exec((good.headers["set-cookie"] as string) ?? "")?.[1] ?? "";
  check("verify-email correct code -> 200 + session cookie", good.statusCode === 200 && token !== "", good.body);

  const me = await inject("GET", "/auth/me", undefined, `sf_session=${token}`);
  check("me reports email_verified true", me.statusCode === 200 && me.json().data?.user?.email_verified === true, me.body);

  await request("POST", "/auth/forgot-password", { email });
  const resetCode = /(\d{6})/.exec(sentEmails[sentEmails.length - 1]?.subject ?? "")?.[1] ?? "";
  check("forgot-password emails a reset code", /^\d{6}$/.test(resetCode));

  const reset = await request("POST", "/auth/reset-password", { email, code: resetCode, new_password: "smoke-new-pass-9" });
  check("reset-password -> 200", reset.statusCode === 200, reset.body);
  const staleMe = await inject("GET", "/auth/me", undefined, `sf_session=${token}`);
  check("reset revoked the old session", staleMe.statusCode === 401, staleMe.body);

  const relogin = await request("POST", "/auth/login", { email, password: "smoke-new-pass-9" });
  check("login works with the new password", relogin.statusCode === 200, relogin.body);

  const ghost = await request("POST", "/auth/forgot-password", { email: "ghost@specforge.local" });
  check("forgot-password for unknown address is still 200 (anti-enumeration)", ghost.statusCode === 200, ghost.body);
}

await app.close();
rmSync(config.EXPORT_DIR, { recursive: true, force: true });

console.log(failures === 0 ? "\nSMOKE TEST OK" : `\nSMOKE TEST FAILURES: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
