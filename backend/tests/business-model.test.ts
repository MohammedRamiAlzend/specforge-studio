/**
 * Business Model Canvas tests (DEC-030 Phase A).
 *
 * Mirrors the skills suite: CRUD, validation, project isolation + cascade,
 * docs integration, and audit trail for the bmc_notes table.
 */
import { describe, expect, test } from "bun:test";
import {
  bootApp,
  createTestContext,
  request,
  seedProject,
} from "./helpers";

async function createNote(
  app: Awaited<ReturnType<typeof bootApp>>,
  projectId: string,
  block: string,
  content: string,
): Promise<{ statusCode: number; json: () => any }> {
  const res = await request(app, "POST", "/bmc", { project_id: projectId, block, content });
  return { statusCode: res.statusCode, json: res.json };
}

describe("business model canvas CRUD", () => {
  test("creates notes across blocks, lists in canonical sort, edits, deletes", async () => {
    const ctx = createTestContext();
    const app = await bootApp(ctx);
    const projectId = await seedProject(app);

    const vp = await createNote(app, projectId, "value_propositions", "One workspace from spec to pitch.");
    expect(vp.statusCode).toBe(201);
    expect(vp.json().data.id).toMatch(/^BMC-\d{4,}$/);

    await createNote(app, projectId, "key_partners", "Payment gateway (simulated).");
    await createNote(app, projectId, "revenue_streams", "Plus and Premium subscriptions.");

    const list = await request(app, "GET", `/bmc?project=${projectId}`);
    expect(list.statusCode).toBe(200);
    const rows = list.json().data;
    expect(rows).toHaveLength(3);

    // Edit one note's content.
    const patched = await request(app, "PATCH", `/bmc/${rows[0].id}`, {
      content: "Updated positioning statement.",
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().data.content).toBe("Updated positioning statement.");

    // Delete it.
    const deleted = await request(app, "DELETE", `/bmc/${rows[0].id}`);
    expect(deleted.statusCode).toBe(204);
    const after = await request(app, "GET", `/bmc?project=${projectId}`);
    expect(after.json().data).toHaveLength(2);
  });
});

describe("business model canvas validation", () => {
  test("rejects unknown blocks, empty content, unknown projects", async () => {
    const ctx = createTestContext();
    const app = await bootApp(ctx);
    const projectId = await seedProject(app);

    const badBlock = await createNote(app, projectId, "magic_block", "Nope");
    expect(badBlock.statusCode).toBe(400);

    const emptyContent = await createNote(app, projectId, "channels", "");
    expect(emptyContent.statusCode).toBe(400);

    const unknownProject = await createNote(app, "PRJ-9999", "channels", "Ghost");
    expect(unknownProject.statusCode).toBe(404);

    // Update schema is strict.
    const created = await createNote(app, projectId, "channels", "Newsletter");
    const strict = await request(app, "PATCH", `/bmc/${created.json().data.id}`, { block: "channels" });
    expect(strict.statusCode).toBe(400);
  });

  test("content over 2000 chars is rejected", async () => {
    const ctx = createTestContext();
    const app = await bootApp(ctx);
    const projectId = await seedProject(app);
    const res = await createNote(app, projectId, "cost_structure", "x".repeat(2001));
    expect(res.statusCode).toBe(400);
  });
});

describe("business model canvas isolation + cascade", () => {
  test("notes stay project-scoped and die with their project", async () => {
    const ctx = createTestContext();
    const app = await bootApp(ctx);
    const p1 = await seedProject(app);
    const p2Raw = await request(app, "POST", "/projects", {
      name: "Second app",
      type: "mobile",
      created_by: "tester@internal",
    });
    const p2 = p2Raw.json().data.id as string;

    await createNote(app, p1, "customer_segments", "Indie builders");
    await createNote(app, p2, "customer_segments", "Enterprise teams");

    const list1 = await request(app, "GET", `/bmc?project=${p1}`);
    expect(list1.json().data).toHaveLength(1);
    expect(list1.json().data[0].content).toBe("Indie builders");

    // Cascade: deleting the project removes its notes.
    ctx.db.query("DELETE FROM projects WHERE id = ?").run(p1);
    const orphaned = ctx.db.query("SELECT COUNT(*) AS n FROM bmc_notes WHERE project_id = ?").get(p1) as { n: number };
    expect(orphaned.n).toBe(0);
  });
});

describe("business model canvas docs integration", () => {
  test("07-guides/business-model.md renders all nine blocks", async () => {
    const ctx = createTestContext();
    const app = await bootApp(ctx);
    const projectId = await seedProject(app);

    await createNote(app, projectId, "value_propositions", "Specs to pitch in one place.");
    await createNote(app, projectId, "revenue_streams", "Subscriptions.");

    const gen = await request(app, "POST", "/docs/generate", { project_id: projectId });
    expect(gen.statusCode).toBe(201);
    const exportId = gen.json().data.id as string;

    const detail = await request(app, "GET", `/docs/exports/${exportId}`);
    const files = detail.json().data.files as Array<{ path: string; content: string }>;
    const bmcFile = files.find((file) => file.path === "07-guides/business-model.md");
    expect(bmcFile).toBeDefined();
    expect(bmcFile!.content).toContain("# Business Model Canvas");
    expect(bmcFile!.content).toContain("Value Propositions");
    expect(bmcFile!.content).toContain("Specs to pitch in one place.");
    expect(bmcFile!.content).toContain("Revenue Streams");
    expect(bmcFile!.content).toContain("No notes defined yet."); // untouched blocks render too
  });
});

describe("business model canvas audit trail", () => {
  test("note operations land in the event log as entity_type bmc", async () => {
    const ctx = createTestContext();
    const app = await bootApp(ctx);
    const projectId = await seedProject(app);

    const created = await createNote(app, projectId, "channels", "Developer communities");
    const id = created.json().data.id;
    await request(app, "PATCH", `/bmc/${id}`, { content: "Communities + conferences" });

    const events = ctx.db
      .query("SELECT entity_type, action FROM event_log WHERE entity_id = ? ORDER BY id")
      .all(id) as Array<{ entity_type: string; action: string }>;
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.every((event) => event.entity_type === "bmc")).toBe(true);
    expect(events[0].action).toBe("created");
  });
});
