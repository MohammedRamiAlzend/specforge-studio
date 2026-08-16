/**
 * Platform configuration tests (Prompt 13).
 * Exercises the DB-backed project types/stacks/libraries API: built-in seeds,
 * multi-type project creation with per-type stack + library selection,
 * validation failures, back-compat single-type creation, Settings CRUD with
 * in-use deletion guards, and the audit trail for settings changes.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { bootApp, createTestContext, request } from "./helpers";

const ctx = createTestContext();
let app: Awaited<ReturnType<typeof bootApp>>;

beforeAll(async () => {
  app = await bootApp(ctx);
});

afterAll(async () => {
  await app.close();
});

describe("built-in platform configuration seeds", () => {
  it("seeds four built-in enabled project types with nested stacks and libraries", async () => {
    const res = await request(app, "GET", "/platform-config");
    expect(res.statusCode).toBe(200);
    const types = res.json().data;
    expect(types).toHaveLength(4);
    expect(types.map((t: { key: string }) => t.key)).toEqual(["web", "mobile", "api", "ai"]);

    const web = types.find((t: { key: string }) => t.key === "web");
    expect(web.built_in).toBe(1);
    expect(web.enabled).toBe(1);
    expect(web.stacks.length).toBeGreaterThan(0);
    expect(web.id).toBe("PTYPE-0001");

    const react = web.stacks.find((s: { name: string }) => s.name === "React");
    expect(react).toBeDefined();
    expect(react.id).toBe("STK-0004");
    expect(react.libraries.length).toBeGreaterThan(0);
    expect(react.libraries.map((l: { name: string }) => l.name)).toContain("React Router");

    const api = types.find((t: { key: string }) => t.key === "api");
    const dotnet = api.stacks.find((s: { name: string }) => s.name === ".NET");
    expect(dotnet.libraries.map((l: { name: string }) => l.name)).toEqual(
      expect.arrayContaining(["MailKit", "EF Core", "Serilog"]),
    );
  });
});

describe("multi-type project creation with stack + libraries", () => {
  let projectId = "";

  it("creates a project with two types, per-type stacks, and libraries", async () => {
    const res = await request(app, "POST", "/projects", {
      name: "Full stack platform",
      type: "web",
      created_by: "tester@internal",
      types: [
        { type_id: "PTYPE-0001", stack_id: "STK-0004", library_ids: ["LIB-0011", "LIB-0012"] },
        { type_id: "PTYPE-0003", stack_id: "STK-0003", library_ids: ["LIB-0008"] },
      ],
    });
    expect(res.statusCode).toBe(201);
    const data = res.json().data;
    projectId = data.id;
    expect(data.id).toBe("PRJ-0001");
    const types = data.types as { type_id: string; stack_name: string | null; libraries: { name: string; id: string }[] }[];
    expect(types).toHaveLength(2);
    const web = types.find((t) => t.type_id === "PTYPE-0001");
    expect(web?.stack_name).toBe("React");
    expect((web?.libraries ?? []).map((l: { name: string }) => l.name)).toEqual(
      expect.arrayContaining(["React Router", "Zustand"]),
    );
    const apiSel = types.find((t) => t.type_id === "PTYPE-0003");
    expect(apiSel?.stack_name).toBe("Node / Express");
    expect((apiSel?.libraries ?? []).map((l: { name: string }) => l.name)).toContain("Express Validator");
  });

  it("returns the enriched selection on GET /projects/:id and in the list", async () => {
    const get = await request(app, "GET", `/projects/${projectId}`);
    expect(get.statusCode).toBe(200);
    expect(get.json().data.types).toHaveLength(2);
    const list = await request(app, "GET", "/projects");
    const row = list.json().data.find((p: { id: string }) => p.id === projectId);
    expect(row.types).toHaveLength(2);
    expect(row.types[0].label).toBeDefined();
  });

  it("patches the project to a different type selection", async () => {
    const res = await request(app, "PATCH", `/projects/${projectId}`, {
      types: [{ type_id: "PTYPE-0002", stack_id: "STK-0007", library_ids: ["LIB-0019"] }],
    });
    expect(res.statusCode).toBe(200);
    const types = res.json().data.types as { type_id: string; stack_name: string | null }[];
    expect(types).toHaveLength(1);
    const firstType = types[0]!;
    expect(firstType.type_id).toBe("PTYPE-0002");
    expect(firstType.stack_name).toBe("Flutter");
  });
});

describe("validation failures on creation", () => {
  it("rejects an unknown type_id", async () => {
    const res = await request(app, "POST", "/projects", {
      name: "Bad type",
      type: "web",
      created_by: "tester@internal",
      types: [{ type_id: "PTYPE-9999" }],
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toContain("not found");
  });

  it("rejects a disabled type", async () => {
    // Disable the built-in mobile type for this validation, then restore it.
    await request(app, "PATCH", "/platform-config/types/PTYPE-0002", { enabled: false });
    const res = await request(app, "POST", "/projects", {
      name: "Disabled type",
      type: "web",
      created_by: "tester@internal",
      types: [{ type_id: "PTYPE-0002" }],
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toContain("disabled");
    await request(app, "PATCH", "/platform-config/types/PTYPE-0002", { enabled: true });
  });

  it("rejects a stack that does not belong to the type", async () => {
    const res = await request(app, "POST", "/projects", {
      name: "Mismatched stack",
      type: "web",
      created_by: "tester@internal",
      types: [{ type_id: "PTYPE-0001", stack_id: "STK-0011" }],
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toContain("does not belong");
  });

  it("rejects a library that does not belong to the chosen stack", async () => {
    const res = await request(app, "POST", "/projects", {
      name: "Mismatched library",
      type: "web",
      created_by: "tester@internal",
      types: [{ type_id: "PTYPE-0001", stack_id: "STK-0004", library_ids: ["LIB-0001"] }],
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toContain("does not belong");
  });

  it("rejects libraries without a chosen stack", async () => {
    const res = await request(app, "POST", "/projects", {
      name: "Libraries without stack",
      type: "web",
      created_by: "tester@internal",
      types: [{ type_id: "PTYPE-0001", library_ids: ["LIB-0011"] }],
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toContain("require a chosen stack");
  });
});

describe("back-compat single-type creation", () => {
  it("maps the legacy type key to a project type assignment", async () => {
    const res = await request(app, "POST", "/projects", {
      name: "Legacy web app",
      type: "web",
      created_by: "tester@internal",
    });
    expect(res.statusCode).toBe(201);
    const data = res.json().data;
    expect(data.types).toHaveLength(1);
    expect(data.types[0].type_id).toBe("PTYPE-0001");
    expect(data.types[0].key).toBe("web");
    expect(data.types[0].stack_id).toBeNull();
  });
});

describe("settings CRUD with delete guards", () => {
  let customTypeId = "";
  let electronStackId = "";
  let electronLibraryId = "";

  it("creates a custom project type (PTYPE-0005)", async () => {
    const res = await request(app, "POST", "/platform-config/types", {
      key: "desktop",
      label: "Desktop",
      description: "Native desktop application",
      color: "#0ea5e9",
    });
    expect(res.statusCode).toBe(201);
    const type = res.json().data;
    customTypeId = type.id;
    expect(customTypeId).toBe("PTYPE-0005");
    expect(type.built_in).toBe(0);
    expect(type.enabled).toBe(1);
  });

  it("creates a stack and library for the custom type", async () => {
    const stack = await request(app, "POST", "/platform-config/stacks", {
      type_id: customTypeId,
      name: "Electron",
      language: "TypeScript",
    });
    expect(stack.statusCode).toBe(201);
    electronStackId = stack.json().data.id;
    expect(electronStackId).toBe("STK-0013");

    const library = await request(app, "POST", "/platform-config/libraries", {
      stack_id: electronStackId,
      name: "electron-builder",
      purpose: "Package desktop installers.",
      category: "packaging",
    });
    expect(library.statusCode).toBe(201);
    electronLibraryId = library.json().data.id;
  });

  it("edits a project type label and sort order", async () => {
    const res = await request(app, "PATCH", `/platform-config/types/${customTypeId}`, {
      label: "Desktop App",
      sort_order: 9,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.label).toBe("Desktop App");
    expect(res.json().data.sort_order).toBe(9);
  });

  it("allows disabling (not deleting) a built-in type", async () => {
    const disabled = await request(app, "PATCH", "/platform-config/types/PTYPE-0004", { enabled: false });
    expect(disabled.statusCode).toBe(200);
    expect(disabled.json().data.enabled).toBe(0);
    const deletion = await request(app, "DELETE", "/platform-config/types/PTYPE-0004");
    expect(deletion.statusCode).toBe(400);
    expect(deletion.json().error.message).toContain("Built-in");
    await request(app, "PATCH", "/platform-config/types/PTYPE-0004", { enabled: true });
  });

  it("blocks deleting a type that is used by a project", async () => {
    // Use the custom desktop type from a project.
    const create = await request(app, "POST", "/projects", {
      name: "Desktop client",
      type: "web",
      created_by: "tester@internal",
      types: [{ type_id: customTypeId }],
    });
    expect(create.statusCode).toBe(201);

    const res = await request(app, "DELETE", `/platform-config/types/${customTypeId}`);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("CONFLICT");
  });

  it("blocks deleting a stack referenced by a project", async () => {
    // Attach the custom Electron stack to a project first.
    const create = await request(app, "POST", "/projects", {
      name: "Electron bridge",
      type: "web",
      created_by: "tester@internal",
      types: [{ type_id: customTypeId, stack_id: electronStackId, library_ids: [electronLibraryId] }],
    });
    expect(create.statusCode).toBe(201);
    expect(create.json().data.types[0].stack_id).toBe(electronStackId);

    const res = await request(app, "DELETE", `/platform-config/stacks/${electronStackId}`);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.message).toContain("used by projects");
  });

  it("blocks deleting a library referenced by a project", async () => {
    const res = await request(app, "DELETE", `/platform-config/libraries/${electronLibraryId}`);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.message).toContain("used by projects");
  });

  it("never hard-deletes built-in stacks or libraries", async () => {
    const stack = await request(app, "DELETE", "/platform-config/stacks/STK-0004");
    expect(stack.statusCode).toBe(400);
    expect(stack.json().error.message).toContain("Built-in");
    const library = await request(app, "DELETE", "/platform-config/libraries/LIB-0011");
    expect(library.statusCode).toBe(400);
    expect(library.json().error.message).toContain("Built-in");
  });

  it("deletes an unused custom type", async () => {
    const unused = await request(app, "POST", "/platform-config/types", {
      key: "cli",
      label: "CLI",
    });
    const unusedId = unused.json().data.id;
    const res = await request(app, "DELETE", `/platform-config/types/${unusedId}`);
    expect(res.statusCode).toBe(204);
    const gone = await request(app, "GET", "/platform-config");
    expect(gone.json().data.some((t: { id: string }) => t.id === unusedId)).toBe(false);
  });
});

describe("audit trail for settings changes", () => {
  it("records project_type / stack / library events in the audit log", async () => {
    const res = await request(app, "GET", "/audit");
    expect(res.statusCode).toBe(200);
    const events = res.json().data as { entity_type: string; action: string; entity_id: string }[];
    expect(events.some((e) => e.entity_type === "project_type" && e.action === "created")).toBe(true);
    expect(events.some((e) => e.entity_type === "stack" && e.action === "created")).toBe(true);
    expect(events.some((e) => e.entity_type === "library" && e.action === "created")).toBe(true);
    expect(events.some((e) => e.entity_type === "project_type" && e.action === "updated")).toBe(true);
  });
});