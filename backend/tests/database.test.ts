/**
 * Database operation tests (Prompt 12 requirement 2).
 * Direct bun:sqlite assertions: schema completeness, ID allocation,
 * CRUD round-trips, and cascade deletes.
 */
import { describe, expect, it } from "bun:test";
import { openDatabase } from "../src/db/index";

function freshDb() {
  return openDatabase(":memory:");
}

describe("schema", () => {
  it("creates all required canonical tables", () => {
    const db = freshDb();
    const rows = db.query("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[];
    const names = new Set(rows.map((r) => r.name));
    const required = [
      "projects",
      "modules",
      "requirements",
      "use_cases",
      "workflows",
      "entities",
      "entity_fields",
      "entity_relations",
      "api_endpoints",
      "screens",
      "tasks",
      "task_checklists",
      "task_dependencies",
      "milestones",
      "risks",
      "decisions",
      "components",
      "test_cases",
      "artifact_links",
      "id_sequences",
      "event_log",
      "approvals",
      "model_graphs",
      "model_nodes",
      "model_edges",
      "generated_diagrams",
      "docs_exports",
      "roadmaps",
      "roadmap_phases",
      "roadmap_epics",
      "roadmap_milestones",
      "roadmap_tasks",
      "roadmap_task_dependencies",
      "artifact_governance",
      "project_types",
      "stacks",
      "libraries",
      "project_type_assignments",
      "project_type_config",
      "project_libraries",
    ];
    for (const table of required) {
      expect(names.has(table), `missing table ${table}`).toBe(true);
    }
  });

  it("enables foreign keys", () => {
    const db = freshDb();
    const row = db.query("PRAGMA foreign_keys").get() as { foreign_keys: number };
    expect(row.foreign_keys).toBe(1);
  });
});

describe("id_sequences allocation", () => {
  it("allocates unique sequential public IDs per prefix (never reused)", () => {
    const db = freshDb();
    // id_sequences is app-managed (allocateId); simulate its rows directly.
    db.query("INSERT INTO id_sequences (prefix, next_value, project_id) VALUES ('PRJ', 1, NULL)").run();
    const allocate = (): string => {
      const row = db.query("SELECT next_value FROM id_sequences WHERE prefix = 'PRJ'").get() as { next_value: number };
      const id = `PRJ-${String(row.next_value).padStart(4, "0")}`;
      db.query("UPDATE id_sequences SET next_value = next_value + 1 WHERE prefix = 'PRJ'").run();
      db.query("INSERT INTO projects (id, name, type, status, created_by) VALUES (?, 'A', 'web', 'draft', 'x')").run(id);
      return id;
    };
    expect(allocate()).toBe("PRJ-0001");
    expect(allocate()).toBe("PRJ-0002");
    // Deleting an id does not lower the counter: ids are never reused.
    db.query("DELETE FROM projects WHERE id = 'PRJ-0002'").run();
    const next = db.query("SELECT next_value FROM id_sequences WHERE prefix = 'PRJ'").get() as { next_value: number };
    expect(next.next_value).toBe(3);
  });
});

describe("CRUD round-trip", () => {
  it("inserts, updates, and reads a requirement", () => {
    const db = freshDb();
    db.query(
      `INSERT INTO projects (id, name, type, status, created_by) VALUES ('PRJ-0001', 'P', 'web', 'active', 'x')`,
    ).run();
    db.query(
      `INSERT INTO requirements (id, project_id, title, type, priority, criticality, description, status)
       VALUES ('REQ-0001', 'PRJ-0001', 'Browse catalog', 'functional', 'must', 'critical', 'desc', 'proposed')`,
    ).run();

    const row = db.query("SELECT title, status FROM requirements WHERE id = 'REQ-0001'").get() as {
      title: string;
      status: string;
    };
    expect(row.title).toBe("Browse catalog");
    expect(row.status).toBe("proposed");

    db.query("UPDATE requirements SET status = 'approved' WHERE id = 'REQ-0001'").run();
    const updated = db.query("SELECT status FROM requirements WHERE id = 'REQ-0001'").get() as { status: string };
    expect(updated.status).toBe("approved");
  });

  it("stores JSON columns and parses them back", () => {
    const db = freshDb();
    db.query(
      `INSERT INTO projects (id, name, type, status, created_by) VALUES ('PRJ-0001', 'P', 'web', 'active', 'x')`,
    ).run();
    db.query(
      `INSERT INTO use_cases (id, project_id, title, actor, main_flow, alternate_flows, status)
       VALUES ('UC-0001', 'PRJ-0001', 'Checkout', 'Customer', ?, '[]', 'approved')`,
    ).run(JSON.stringify(["Review cart", "Confirm order"]));
    const row = db.query("SELECT main_flow FROM use_cases WHERE id = 'UC-0001'").get() as { main_flow: string };
    expect(JSON.parse(row.main_flow)).toEqual(["Review cart", "Confirm order"]);
  });
});

describe("cascade deletes", () => {
  it("deleting a project removes dependent artifacts", () => {
    const db = freshDb();
    db.query("INSERT INTO projects (id, name, type, status, created_by) VALUES ('PRJ-0001', 'P', 'web', 'active', 'x')").run();
    db.query(
      `INSERT INTO requirements (id, project_id, title, type, priority, criticality, status)
       VALUES ('REQ-0001', 'PRJ-0001', 'R', 'functional', 'must', 'critical', 'proposed')`,
    ).run();
    db.query(
      `INSERT INTO tasks (id, project_id, title, type, objective, definition_of_done, status)
       VALUES ('TASK-0001', 'PRJ-0001', 'T', 'backend', 'Objective', 'Definition of done', 'open')`,
    ).run();
    db.query(
      `INSERT INTO artifact_links (project_id, from_type, from_id, to_type, to_id, link_type)
       VALUES ('PRJ-0001', 'requirement', 'REQ-0001', 'task', 'TASK-0001', 'realizes')`,
    ).run();

    db.query("DELETE FROM projects WHERE id = 'PRJ-0001'").run();
    expect(db.query("SELECT 1 FROM requirements WHERE id = 'REQ-0001'").get()).toBeNull();
    expect(db.query("SELECT 1 FROM tasks WHERE id = 'TASK-0001'").get()).toBeNull();
    expect(db.query("SELECT 1 FROM artifact_links WHERE project_id = 'PRJ-0001'").get()).toBeNull();
  });

  it("deleting a model graph cascades nodes and edges", () => {
    const db = freshDb();
    db.query("INSERT INTO projects (id, name, type, status, created_by) VALUES ('PRJ-0001', 'P', 'web', 'active', 'x')").run();
    db.query("INSERT INTO model_graphs (id, project_id, kind, name, status) VALUES ('GRPH-0001', 'PRJ-0001', 'workflow', 'W', 'draft')").run();
    db.query(
      `INSERT INTO model_nodes (id, graph_id, client_key, node_type, title, position)
       VALUES ('GRPH-0001-N01', 'GRPH-0001', 'k1', 'start', 'Start', '{"x":0,"y":0}')`,
    ).run();
    db.query(
      `INSERT INTO model_edges (id, graph_id, from_node, to_node, edge_type)
       VALUES ('GRPH-0001-E01', 'GRPH-0001', 'GRPH-0001-N01', 'GRPH-0001-N01', 'next')`,
    ).run();

    db.query("DELETE FROM model_graphs WHERE id = 'GRPH-0001'").run();
    expect(db.query("SELECT 1 FROM model_nodes WHERE graph_id = 'GRPH-0001'").get()).toBeNull();
    expect(db.query("SELECT 1 FROM model_edges WHERE graph_id = 'GRPH-0001'").get()).toBeNull();
  });
});
