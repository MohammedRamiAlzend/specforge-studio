/**
 * Shared demo seed: the Acme Commerce Platform example.
 *
 * Used by:
 * - `seed-example` (generate-example.ts) — in-memory DB → committed workspace
 *   (default IDs: PRJ-0001 / GRPH-0001).
 * - `seed-live` (seed-live.ts) — the live database, seeded as PRJ-0002 /
 *   GRPH-0002 so it never collides with existing projects (e.g. one created
 *   through the preview UI).
 *
 * All other IDs (MOD-0001, REQ-0001, DB-0001, TASK-0001, APR-0001, ...) are
 * intentionally fixed: they are free as long as the demo project id does not
 * exist, and keeping them stable matches the committed example workspace.
 */
import type { Database } from "bun:sqlite";
import { storeRoadmap } from "../src/modules/roadmap/routes";
import { materializeTaskPack } from "../src/modules/agent-tasks/packager";
import { logEvent } from "../src/utils/events";
import { seedPlatformConfiguration } from "../src/modules/platform-config/seed";

export interface SeedOptions {
  projectId?: string;
  graphId?: string;
}

export interface SeedResult {
  projectId: string;
  roadmapId: string;
  taskCount: number;
}

export function isDemoProjectSeeded(db: Database, projectId = "PRJ-0001"): boolean {
  return Boolean(db.query("SELECT 1 FROM projects WHERE id = ?").get(projectId));
}

function now(): string {
  return new Date().toISOString();
}

/** Seeds the full Acme Commerce example (model + roadmap + task pack + governance). */
export function seedDemoProject(db: Database, opts: SeedOptions = {}): SeedResult {
  const projectId = opts.projectId ?? "PRJ-0001";
  const graphId = opts.graphId ?? "GRPH-0001";
  const nid = (n: number) => `${graphId}-N${String(n).padStart(2, "0")}`;
  const eid = (n: number) => `${graphId}-E${String(n).padStart(2, "0")}`;

  // Prompt 13: the demo project carries a full platform configuration
  // (types + stack + libraries). Seeds the built-in defaults first so the
  // selection tables can reference them deterministically.
  seedPlatformConfiguration(db);

  db.query(
    `INSERT INTO projects (id, name, type, description, repository_url, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    projectId,
    "Acme Commerce Platform",
    "web",
    "A modern e-commerce platform: catalog browsing, shopping cart, checkout, order management, and admin analytics. Built with an engineering-first process — visual models drive documentation, diagrams, and executable task packs.",
    "https://github.com/acme/commerce-platform",
    "active",
    "product@acme.internal",
    now(),
    now(),
  );

  db.query(
    `INSERT INTO project_type_assignments (project_id, type_id)
     VALUES (?, (SELECT id FROM project_types WHERE key = 'web'))`,
  ).run(projectId);
  db.query(
    `INSERT INTO project_type_config (project_id, type_id, stack_id)
     VALUES (?, (SELECT id FROM project_types WHERE key = 'web'),
               (SELECT st.id FROM stacks st
                  JOIN project_types pt ON pt.id = st.type_id
                 WHERE pt.key = 'web' AND st.name = 'React'))`,
  ).run(projectId);
  for (const libName of ["React Router", "Zustand", "Tailwind CSS"]) {
    db.query(
      `INSERT INTO project_libraries (project_id, type_id, library_id)
       SELECT ?, pt.id, lib.id
         FROM project_types pt, libraries lib
         JOIN stacks st ON st.id = lib.stack_id
        WHERE pt.key = 'web' AND lib.name = ?
          AND st.type_id = pt.id AND st.name = 'React'`,
    ).run(projectId, libName);
  }

  db.query("INSERT INTO modules (id, project_id, name, description, owner_role, sort_order, status) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    "MOD-0001", projectId, "Catalog", "Product catalog, search, and detail views.", "product", 1, "active",
  );
  db.query("INSERT INTO modules (id, project_id, name, description, owner_role, sort_order, status) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    "MOD-0002", projectId, "Checkout", "Cart, checkout, and payment orchestration.", "backend", 2, "active",
  );

  const requirements: [string, string, string, string, string, string, string][] = [
    ["REQ-0001", "MOD-0001", "Customers can browse the product catalog", "functional", "must", "critical", "Browse, search, and filter published products with pagination."],
    ["REQ-0002", "MOD-0002", "Customers can complete checkout", "functional", "must", "critical", "Checkout with cart review, shipping address, and order confirmation."],
    ["REQ-0003", "MOD-0002", "Order totals are calculated server-side", "constraint", "must", "critical", "Prices and totals must never be trusted from the client."],
  ];
  for (const [id, moduleId, title, type, priority, criticality, description] of requirements) {
    db.query(
      `INSERT INTO requirements (id, project_id, module_id, title, type, priority, criticality, description, acceptance_criteria, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Acceptance criteria recorded in the test plan.', 'approved')`,
    ).run(id, projectId, moduleId, title, type, priority, criticality, description);
  }

  db.query(
    `INSERT INTO use_cases (id, project_id, module_id, title, actor, preconditions, postconditions, main_flow, alternate_flows, status)
     VALUES (?, ?, 'MOD-0002', ?, ?, ?, ?, ?, ?, 'approved')`,
  ).run(
    "UC-0001",
    projectId,
    "Customer checks out",
    "Customer",
    JSON.stringify(["Cart contains at least one item", "Customer is signed in"]),
    JSON.stringify(["Order is created with status pending_payment", "Inventory is reserved"]),
    JSON.stringify([
      "Customer reviews cart",
      "Customer enters shipping address",
      "System calculates totals",
      "Customer confirms order",
      "System creates order and sends confirmation",
    ]),
    JSON.stringify(["Payment failure: order marked failed, cart restored"]),
  );

  db.query("INSERT INTO workflows (id, project_id, module_id, name, description, status) VALUES (?, ?, 'MOD-0002', ?, ?, 'reviewed')").run(
    "WF-0001", projectId, "Checkout flow", "Order placement from cart review to confirmation.",
  );

  db.query(
    `INSERT INTO model_graphs (id, project_id, kind, name, description, status)
     VALUES (?, ?, 'workflow', 'Checkout flow', 'Order placement from cart review to confirmation.', 'reviewed')`,
  ).run(graphId, projectId);
  const workflowNodes: [string, string, string, string, number, number][] = [
    [nid(1), "start", "Start", "Start", 0, 0],
    [nid(2), "screen", "Cart review", "Customer reviews cart and shipping address", 0, 120],
    [nid(3), "api_call", "Create order", "POST /api/orders", 0, 240],
    [nid(4), "decision", "Payment success?", "Branches on payment provider response", 0, 360],
    [nid(5), "end", "End", "Order confirmed", 0, 480],
  ];
  for (const [id, type, title, description, x, y] of workflowNodes) {
    db.query(
      `INSERT INTO model_nodes (id, graph_id, client_key, node_type, title, description, inputs, outputs, preconditions, postconditions, related_artifacts, position)
       VALUES (?, ?, ?, ?, ?, ?, '[]', '[]', '[]', '[]', ?, ?)`,
    ).run(id, graphId, id, type, title, description, JSON.stringify(["REQ-0002"]), JSON.stringify({ x, y }));
  }
  const workflowEdges: [string, string, string, string, string, string][] = [
    [eid(1), nid(1), nid(2), "next", null, "next"],
    [eid(2), nid(2), nid(3), "next", null, "next"],
    [eid(3), nid(3), nid(4), "success", "200 OK", "success"],
    [eid(4), nid(4), nid(5), "success", "approved", "success"],
  ];
  for (const [id, from, to, label, condition, type] of workflowEdges) {
    db.query("INSERT INTO model_edges (id, graph_id, from_node, to_node, label, condition, edge_type) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      id, graphId, from, to, label, condition, type,
    );
  }

  db.query("INSERT INTO entities (id, project_id, name, table_name, description, status) VALUES (?, ?, ?, ?, ?, 'approved')").run(
    "DB-0001", projectId, "user_account", "user_accounts", "Registered customer accounts.",
  );
  db.query("INSERT INTO entities (id, project_id, name, table_name, description, status) VALUES (?, ?, ?, ?, ?, 'approved')").run(
    "DB-0002", projectId, "order", "orders", "Customer orders.",
  );
  db.query("INSERT INTO entity_fields (id, entity_id, name, data_type, nullable, is_primary_key, is_unique) VALUES (?, 'DB-0001', ?, ?, ?, ?, ?)").run(
    "DB-0001-F01", "id", "uuid", 0, 1, 0,
  );
  db.query("INSERT INTO entity_fields (id, entity_id, name, data_type, nullable, is_primary_key, is_unique) VALUES (?, 'DB-0001', ?, ?, ?, ?, ?)").run(
    "DB-0001-F02", "email", "string", 0, 0, 1,
  );
  db.query("INSERT INTO entity_fields (id, entity_id, name, data_type, nullable, is_primary_key, is_unique) VALUES (?, 'DB-0001', ?, ?, ?, ?, ?)").run(
    "DB-0001-F03", "created_at", "datetime", 0, 0, 0,
  );
  db.query("INSERT INTO entity_fields (id, entity_id, name, data_type, nullable, is_primary_key, is_unique) VALUES (?, 'DB-0002', ?, ?, ?, ?, ?)").run(
    "DB-0002-F01", "id", "uuid", 0, 1, 0,
  );
  db.query("INSERT INTO entity_fields (id, entity_id, name, data_type, nullable, is_primary_key, is_unique) VALUES (?, 'DB-0002', ?, ?, ?, ?, ?)").run(
    "DB-0002-F02", "user_account_id", "reference", 0, 0, 0,
  );
  db.query("INSERT INTO entity_fields (id, entity_id, name, data_type, nullable, is_primary_key, is_unique) VALUES (?, 'DB-0002', ?, ?, ?, ?, ?)").run(
    "DB-0002-F03", "total_cents", "number", 0, 0, 0,
  );
  db.query("INSERT INTO entity_relations (id, project_id, from_entity_id, to_entity_id, relation_type, description, status) VALUES (?, ?, ?, ?, ?, ?, 'approved')").run(
    "REL-0001", projectId, "DB-0001", "DB-0002", "1:N", "A customer places many orders.",
  );

  db.query(
    `INSERT INTO api_endpoints (id, project_id, module_id, method, path, purpose, auth, request_schema, response_schema, error_codes, status)
     VALUES (?, ?, 'MOD-0002', ?, ?, ?, ?, ?, ?, ?, 'approved')`,
  ).run(
    "API-0001",
    projectId,
    "POST",
    "/api/orders",
    "Create an order from the current cart.",
    "Bearer token",
    JSON.stringify({ items: [{ product_id: "string", quantity: "number" }], shipping_address: { line1: "string", zip: "string" } }),
    JSON.stringify({ order_id: "string", status: "string", total_cents: "number" }),
    JSON.stringify([{ code: "400", description: "Cart is empty" }, { code: "401", description: "Unauthenticated" }]),
  );

  db.query("INSERT INTO screens (id, project_id, module_id, name, route, description, status) VALUES (?, ?, 'MOD-0002', ?, ?, ?, 'designed')").run(
    "SCR-0001", projectId, "Checkout page", "/checkout", "Cart review, shipping form, order confirmation.",
  );

  db.query("INSERT INTO milestones (id, project_id, name, due_date, description, gate_criteria, status) VALUES (?, ?, ?, ?, ?, ?, 'in_progress')").run(
    "MS-0001", projectId, "Launch MVP", "2026-10-31", "Checkout + catalog for initial users.", "All must-have requirements approved and verified.",
  );

  db.query(
    `INSERT INTO tasks (id, project_id, module_id, milestone_id, title, type, priority, objective, context, constraints, input_artifacts, approval_required, status, definition_of_done)
     VALUES (?, ?, 'MOD-0002', 'MS-0001', ?, 'backend', 'high', ?, ?, ?, ?, ?, 'open', ?)`,
  ).run(
    "TASK-0001",
    projectId,
    "Implement POST /api/orders",
    "Create the order endpoint with server-side totals and payment provider integration.",
    "Checkout module only; totals must be computed server-side (REQ-0003).",
    JSON.stringify(["Server-side totals only", "Zod validation"]),
    JSON.stringify(["REQ-0002", "API-0001", "UC-0001"]),
    1,
    "Endpoint returns an order with server-computed totals; smoke tests pass.",
  );
  db.query("INSERT INTO task_checklists (id, task_id, position, description, verification_hint, status) VALUES (?, 'TASK-0001', ?, ?, ?, 'pending')").run(
    "TASK-0001-C01", 1, "Add POST /api/orders route", "Route exists and is registered.",
  );
  db.query("INSERT INTO task_checklists (id, task_id, position, description, verification_hint, status) VALUES (?, 'TASK-0001', ?, ?, ?, 'pending')").run(
    "TASK-0001-C02", 2, "Validate request with Zod", "Invalid payload returns 400 VALIDATION_ERROR.",
  );
  db.query("INSERT INTO task_checklists (id, task_id, position, description, verification_hint, status) VALUES (?, 'TASK-0001', ?, ?, ?, 'pending')").run(
    "TASK-0001-C03", 3, "Compute totals server-side", "Total matches line-item sum in unit test.",
  );

  // TASK-0001 was inserted manually above — advance the TASK id counter so the
  // roadmap packager allocates TASK-0002+ (id_sequences is the source of truth).
  db.query(
    "INSERT INTO id_sequences (prefix, next_value, project_id) VALUES ('TASK', 2, ?) ON CONFLICT(prefix) DO UPDATE SET next_value = excluded.next_value, project_id = excluded.project_id",
  ).run(projectId);

  db.query("INSERT INTO risks (id, project_id, title, likelihood, impact, mitigation, owner, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'open')").run(
    "RISK-0001", projectId, "Payment provider downtime", "medium", "high", "Retry with exponential backoff; provider failover flag.", "backend",
  );
  db.query("INSERT INTO risks (id, project_id, title, likelihood, impact, mitigation, owner, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'open')").run(
    "RISK-0002", projectId, "Scope creep on admin analytics", "high", "medium", "Track against milestones; require approval for new must-have scope.", "product",
  );

  db.query(
    `INSERT INTO decisions (id, project_id, title, decision, context, alternatives, consequences, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'approved')`,
  ).run(
    "ADR-0001",
    projectId,
    "Use SQLite as the source of truth",
    "SQLite is the canonical store; Markdown is generated output.",
    "The platform needs a simple, portable database with full traceability.",
    JSON.stringify(["PostgreSQL", "MongoDB"]),
    "Keeps ops simple; the repository layer isolates the driver for later swaps.",
  );

  db.query(
    `INSERT INTO approvals (id, project_id, artifact_id, artifact_type, approver_role, approver_name, decision, status, comments)
     VALUES (?, ?, 'REQ-0001', 'requirement', 'product', 'Ada Lovelace', 'approved', 'approved', 'Approved in review 2026-08-16.')`,
  ).run("APR-0001", projectId);

  db.query("INSERT INTO components (id, project_id, name, layer, responsibility, technologies, status) VALUES (?, ?, ?, ?, ?, ?, 'approved')").run(
    "CMP-0001", projectId, "Web client", "presentation", "React storefront and admin UI.", JSON.stringify(["React", "TypeScript", "Vite"]),
  );
  db.query("INSERT INTO components (id, project_id, name, layer, responsibility, technologies, status) VALUES (?, ?, ?, ?, ?, ?, 'approved')").run(
    "CMP-0002", projectId, "Order API", "application", "Checkout, order, and payment orchestration.", JSON.stringify(["Fastify", "Zod"]),
  );
  db.query("INSERT INTO components (id, project_id, name, layer, responsibility, technologies, status) VALUES (?, ?, ?, ?, ?, ?, 'approved')").run(
    "CMP-0003", projectId, "Orders DB", "infrastructure", "Orders and customer accounts.", JSON.stringify(["SQLite"]),
  );
  db.query("INSERT INTO components (id, project_id, name, layer, responsibility, technologies, status) VALUES (?, ?, ?, ?, ?, ?, 'approved')").run(
    "CMP-0004", projectId, "Payments gateway", "integration", "Card processing provider integration.", JSON.stringify(["REST"]),
  );

  const links: [string, string, string, string, string][] = [
    ["requirement", "REQ-0001", "use-case", "UC-0001", "traces"],
    ["requirement", "REQ-0002", "use-case", "UC-0001", "satisfies"],
    ["requirement", "REQ-0002", "task", "TASK-0001", "realizes"],
    ["requirement", "REQ-0003", "task", "TASK-0001", "constrains"],
    ["use-case", "UC-0001", "api-endpoint", "API-0001", "traces"],
    ["use-case", "UC-0001", "screen", "SCR-0001", "traces"],
  ];
  for (const [fromType, fromId, toType, toId, linkType] of links) {
    db.query(
      "INSERT INTO artifact_links (project_id, from_type, from_id, to_type, to_id, link_type) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(projectId, fromType, fromId, toType, toId, linkType);
  }

  // -------------------------------------------------------------------------
  // Roadmap + agent task pack (Prompt 10) — derived from the seeded model
  // -------------------------------------------------------------------------

  const roadmapId = storeRoadmap(db, projectId, "Acme Commerce Platform — MVP roadmap");
  const pack = materializeTaskPack(db, roadmapId);
  console.log(`Roadmap ${roadmapId} generated; packaged ${pack.created} tasks.`);

  // -------------------------------------------------------------------------
  // Governance demo (Prompt 11) — approval flow + audit trail
  // -------------------------------------------------------------------------

  // 1. Request approval for the checkout workflow (security-sensitive, gated).
  db.query(
    `INSERT INTO approvals (id, project_id, artifact_id, artifact_type, approver_role, status, comments)
     VALUES ('APR-0002', ?, 'WF-0001', 'workflow', 'engineering-lead', 'pending', 'Checkout flow touches payment processing; requires engineering review.')`,
  ).run(projectId);
  db.query(
    `INSERT INTO artifact_governance (artifact_type, artifact_id, project_id, status, needs_approval, updated_at)
     VALUES ('workflow', 'WF-0001', ?, 'needs_review', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
  ).run(projectId);
  logEvent(db, {
    projectId,
    entityType: "approval",
    entityId: "APR-0002",
    action: "requested",
    toStatus: "pending",
    actor: "engineering-lead",
    payload: { artifact_id: "WF-0001", artifact_type: "workflow" },
  });

  // 2. Approve it and sync the workflow domain status to approved.
  db.query(
    `UPDATE approvals SET decision = 'approved', status = 'approved', approver_name = 'Alan Turing',
       comments = 'Approved: checkout flow is secure and complete.',
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = 'APR-0002'`,
  ).run();
  db.query(
    `UPDATE artifact_governance SET status = 'approved', approval_id = 'APR-0002',
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE artifact_type = 'workflow' AND artifact_id = 'WF-0001'`,
  ).run();
  db.query("UPDATE workflows SET status = 'approved', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = 'WF-0001'").run();
  logEvent(db, {
    projectId,
    entityType: "workflow",
    entityId: "WF-0001",
    action: "status_change",
    fromStatus: "needs_review",
    toStatus: "approved",
    actor: "Alan Turing",
    actorType: "human",
    payload: { approval_id: "APR-0002" },
  });
  logEvent(db, {
    projectId,
    entityType: "workflow",
    entityId: "WF-0001",
    action: "approved",
    fromStatus: "pending",
    toStatus: "approved",
    actor: "Alan Turing",
    actorType: "human",
    payload: { approval_id: "APR-0002" },
  });

  // 3. Mid-project lifecycle states: roadmap awaiting review (gate), task in progress.
  db.query(
    `INSERT INTO artifact_governance (artifact_type, artifact_id, project_id, status, needs_approval, updated_at)
     VALUES ('roadmap', ?, ?, 'needs_review', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
  ).run(roadmapId, projectId);
  db.query(
    `INSERT INTO artifact_governance (artifact_type, artifact_id, project_id, status, needs_approval, updated_at)
     VALUES ('task', 'TASK-0001', ?, 'in_progress', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
  ).run(projectId);
  logEvent(db, {
    projectId,
    entityType: "roadmap",
    entityId: roadmapId,
    action: "generated",
    toStatus: "needs_review",
    actor: "system",
  });
  logEvent(db, {
    projectId,
    entityType: "task",
    entityId: "TASK-0001",
    action: "status_change",
    fromStatus: "open",
    toStatus: "in_progress",
    actor: "agent",
    actorType: "agent",
  });
  console.log("Governance demo seeded: APR-0002 approved (WF-0001), roadmap awaiting review, audit trail written.");

  return { projectId, roadmapId, taskCount: pack.created };
}
