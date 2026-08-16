/**
 * Document generation tests (Prompt 12 requirement 4).
 * The Markdown workspace must be regenerable, carry stable frontmatter,
 * embed generated Mermaid, and preserve protected manual sections.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bootApp, createTestContext, request, seedProject } from "./helpers";

const ctx = createTestContext();
let app: Awaited<ReturnType<typeof bootApp>>;
let projectId = "";

beforeAll(async () => {
  app = await bootApp(ctx);
  projectId = await seedProject(app);
  // Seed a workflow graph so 03-design/workflows.md embeds generated Mermaid.
  const created = await request(app, "POST", "/modeler/graphs", {
    project_id: projectId,
    kind: "workflow",
    name: "Checkout flow",
  });
  const graphId = created.json().data.id as string;
  await request(app, "PUT", `/modeler/graphs/${graphId}`, {
    nodes: [
      { key: "s", type: "start", title: "Start", position: { x: 0, y: 0 } },
      { key: "e", type: "end", title: "End", position: { x: 0, y: 100 } },
    ],
    edges: [{ key: "e1", source: "s", target: "e", type: "next" }],
  });
});

afterAll(async () => {
  await app.close();
  rmSync(ctx.config.EXPORT_DIR, { recursive: true, force: true });
});

interface DocsFile {
  path: string;
  content: string;
}

describe("workspace generation", () => {
  it("generates the full workspace with stable frontmatter and embedded diagrams", async () => {
    const res = await request(app, "POST", "/docs/generate", { project_id: projectId });
    expect(res.statusCode).toBe(201);
    const data = res.json().data;
    expect(data.id).toBe("DOCS-0001");
    expect(data.file_count).toBeGreaterThanOrEqual(30);

    const files = data.files as DocsFile[];
    const paths = files.map((f) => f.path);
    for (const expected of ["README.md", "AGENTS.md", "02-requirements/srs.md", "09-agent-plans/agent-guide.md"]) {
      expect(paths).toContain(expected);
    }

    const readme = files.find((f) => f.path === "README.md")?.content ?? "";
    expect(readme.startsWith("---\n")).toBe(true);
    expect(/id: ART-\d{4}/.test(readme)).toBe(true);

    const workflows = files.find((f) => f.path === "03-design/workflows.md")?.content ?? "";
    expect(workflows).toContain("flowchart TD");
  });
});

describe("regeneration + protected sections", () => {
  it("preserves <!-- protected --> manual edits and supersedes the old export", async () => {
    // Add a protected manual edit to export 1's README on disk.
    const readmePath = join(ctx.config.EXPORT_DIR, "DOCS-0001", "README.md");
    const original = readFileSync(readmePath, "utf8");
    writeFileSync(readmePath, original + "\n<!-- protected -->\n## Manual note\nThis edit must survive regeneration.\n");

    const res = await request(app, "POST", "/docs/generate", { project_id: projectId });
    expect(res.statusCode).toBe(201);
    const data = res.json().data;
    expect(data.id).toBe("DOCS-0002");
    const readme2 = (data.files as DocsFile[]).find((f) => f.path === "README.md")?.content ?? "";
    expect(readme2).toContain("This edit must survive regeneration.");

    const list = await request(app, "GET", `/docs/exports?project=${projectId}`);
    const rows = list.json().data as { id: string; status: string }[];
    expect(rows.find((e) => e.id === "DOCS-0001")?.status).toBe("superseded");
  });
});

describe("export CRUD", () => {
  it("lists, reads files from disk, and deletes", async () => {
    const list = await request(app, "GET", `/docs/exports?project=${projectId}`);
    expect(list.statusCode).toBe(200);
    expect((list.json().data ?? []).some((e: { id: string }) => e.id === "DOCS-0002")).toBe(true);

    const get = await request(app, "GET", "/docs/exports/DOCS-0002");
    expect(get.statusCode).toBe(200);
    expect((get.json().data.files ?? []).length).toBeGreaterThanOrEqual(30);

    const del = await request(app, "DELETE", "/docs/exports/DOCS-0002");
    expect(del.statusCode).toBe(204);
    const gone = await request(app, "GET", "/docs/exports/DOCS-0002");
    expect(gone.statusCode).toBe(404);
  });
});
