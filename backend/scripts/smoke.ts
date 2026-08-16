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
const app = await buildApp({ config, db });

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
  check("GET /modeler/node-types 12 types", types.length === 12, types.length);
  const required = ["start", "end", "step", "decision", "screen", "api_call", "database", "external_system", "event", "wait", "approval", "ai_agent"];
  check(
    "GET /modeler/node-types covers all required types",
    required.every((t) => types.some((n) => n.type === t)),
  );
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

await app.close();
rmSync(config.EXPORT_DIR, { recursive: true, force: true });

console.log(failures === 0 ? "\nSMOKE TEST OK" : `\nSMOKE TEST FAILURES: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
