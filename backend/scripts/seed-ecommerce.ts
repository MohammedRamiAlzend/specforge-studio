/**
 * Full-detail e-commerce demo seeder: "StoreSphere E-Commerce Platform".
 *
 * The canonical "most common e-commerce project": an ASP.NET Core (.NET)
 * backend API with a React (TypeScript) frontend storefront, covering catalog,
 * cart, checkout, payments, orders, inventory, customer accounts, and admin
 * analytics. This is a SECOND demo — it never touches the Acme Commerce
 * example or user projects.
 *
 * Used by:
 * - `seed-ecommerce-example` (generate-ecommerce-example.ts) — in-memory DB →
 *   committed workspace docs/workspace/generated-example-ecommerce/ with
 *   PRJ-0004 / GRPH-0004 and child IDs from the 0100+ ranges.
 * - `seed-ecommerce-live` (seed-ecommerce-live.ts) — the live database as
 *   PRJ-0003 / GRPH-0003.
 *
 * ID strategy: child IDs use the 0100+ ranges (MOD-0101, REQ-0101, ...) so the
 * Acme example (MOD-0001+) and user projects never collide. TASK IDs are
 * allocated by the roadmap packager from id_sequences.
 */
import type { Database } from "bun:sqlite";
import { storeRoadmap } from "../src/modules/roadmap/routes";
import { materializeTaskPack } from "../src/modules/agent-tasks/packager";
import { logEvent } from "../src/utils/events";
import { seedPlatformConfiguration } from "../src/modules/platform-config/seed";
import { seedNodePalette } from "../src/modules/palette/seed";
import type { SkillKind, SkillLevel } from "../src/modules/skills";

export interface SeedOptions {
  projectId?: string;
  graphId?: string;
}

export interface SeedResult {
  projectId: string;
  roadmapId: string;
  taskCount: number;
}

export function isEcommerceSeeded(db: Database, projectId = "PRJ-0003"): boolean {
  return Boolean(db.query("SELECT 1 FROM projects WHERE id = ?").get(projectId));
}

function now(): string {
  return new Date().toISOString();
}

/** Seeds the full-detail StoreSphere e-commerce example. */
export function seedEcommerceProject(db: Database, opts: SeedOptions = {}): SeedResult {
  const projectId = opts.projectId ?? "PRJ-0003";
  const graphId = opts.graphId ?? "GRPH-0003";
  const nid = (graph: string, n: number) => `${graph}-N${String(n).padStart(2, "0")}`;
  const eid = (graph: string, n: number) => `${graph}-E${String(n).padStart(2, "0")}`;
  const graphN = (offset: number) => {
    const base = Number(graphId.split("-")[1]);
    return `GRPH-${String(base + offset).padStart(4, "0")}`;
  };
  const graphFulfillment = graphN(1);
  const graphRefunds = graphN(2);
  const graphRestock = graphN(3);

  seedPlatformConfiguration(db);
  seedNodePalette(db);

  // -------------------------------------------------------------------------
  // Project (multi-type: .NET API + React web)
  // -------------------------------------------------------------------------

  db.query(
    `INSERT INTO projects (id, name, type, description, repository_url, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    projectId,
    "StoreSphere E-Commerce Platform",
    "api",
    "A full-detail e-commerce storefront: product catalog, shopping cart, checkout with payments, order management, inventory tracking, customer accounts, and admin analytics. Backend is an ASP.NET Core (.NET) REST API with EF Core; frontend is a React (TypeScript) single-page application.",
    "https://github.com/storesphere/commerce-platform",
    "active",
    "platform@storesphere.internal",
    now(),
    now(),
  );

  // .NET API type + stack + libraries
  db.query("INSERT INTO project_type_assignments (project_id, type_id) VALUES (?, (SELECT id FROM project_types WHERE key = 'api'))").run(projectId);
  db.query(
    `INSERT INTO project_type_config (project_id, type_id, stack_id)
     VALUES (?, (SELECT id FROM project_types WHERE key = 'api'),
               (SELECT st.id FROM stacks st JOIN project_types pt ON pt.id = st.type_id WHERE pt.key = 'api' AND st.name = '.NET'))`,
  ).run(projectId);
  for (const libName of ["MailKit", "Scalar", "EF Core", "Serilog"]) {
    db.query(
      `INSERT INTO project_libraries (project_id, type_id, library_id)
       SELECT ?, pt.id, lib.id FROM project_types pt, libraries lib
         JOIN stacks st ON st.id = lib.stack_id
        WHERE pt.key = 'api' AND lib.name = ? AND st.type_id = pt.id AND st.name = '.NET'`,
    ).run(projectId, libName);
  }

  // React web type + stack + libraries
  db.query("INSERT INTO project_type_assignments (project_id, type_id) VALUES (?, (SELECT id FROM project_types WHERE key = 'web'))").run(projectId);
  db.query(
    `INSERT INTO project_type_config (project_id, type_id, stack_id)
     VALUES (?, (SELECT id FROM project_types WHERE key = 'web'),
               (SELECT st.id FROM stacks st JOIN project_types pt ON pt.id = st.type_id WHERE pt.key = 'web' AND st.name = 'React'))`,
  ).run(projectId);
  for (const libName of ["React Router", "Zustand", "Tailwind CSS"]) {
    db.query(
      `INSERT INTO project_libraries (project_id, type_id, library_id)
       SELECT ?, pt.id, lib.id FROM project_types pt, libraries lib
         JOIN stacks st ON st.id = lib.stack_id
        WHERE pt.key = 'web' AND lib.name = ? AND st.type_id = pt.id AND st.name = 'React'`,
    ).run(projectId, libName);
  }

  // -------------------------------------------------------------------------
  // Modules
  // -------------------------------------------------------------------------

  const modules: [string, string, string, string][] = [
    ["MOD-0101", "Catalog", "Product catalog, search, filtering, and detail views.", "product"],
    ["MOD-0102", "Cart", "Shopping cart management and line-item pricing.", "frontend"],
    ["MOD-0103", "Checkout", "Checkout flow: address, shipping, and payment orchestration.", "backend"],
    ["MOD-0104", "Orders", "Order placement, history, status, and fulfillment.", "backend"],
    ["MOD-0105", "Payments", "Payment capture, refunds, and provider integration.", "backend"],
    ["MOD-0106", "Inventory", "Stock levels, reservation, and restock alerts.", "backend"],
    ["MOD-0107", "Customer Accounts", "Registration, login, profiles, and order history.", "frontend"],
    ["MOD-0108", "Admin & Analytics", "Admin console and sales/stock analytics.", "product"],
  ];
  for (const [id, name, description, ownerRole] of modules) {
    db.query(
      "INSERT INTO modules (id, project_id, name, description, owner_role, sort_order, status) VALUES (?, ?, ?, ?, ?, ?, 'active')",
    ).run(id, projectId, name, description, ownerRole, Number(id.slice(-2)) - 1);
  }

  // -------------------------------------------------------------------------
  // Requirements
  // -------------------------------------------------------------------------

  const requirements: [string, string, string, string, string, string, string][] = [
    ["REQ-0101", "MOD-0101", "Customers can browse, search, and filter the product catalog", "functional", "must", "critical", "List published products with pagination, text search, and category filters."],
    ["REQ-0102", "MOD-0102", "Customers can manage their shopping cart", "functional", "must", "critical", "Add, update quantity, and remove line items; cart totals are derived server-side."],
    ["REQ-0103", "MOD-0103", "Customers can complete checkout with card payment", "functional", "must", "critical", "Collect shipping address, capture payment via the gateway, and confirm the order."],
    ["REQ-0104", "MOD-0104", "Customers can view order history and status", "functional", "must", "critical", "Order list with status transitions and detail pages."],
    ["REQ-0105", "MOD-0105", "Payments can be refunded for cancelled orders", "functional", "should", "normal", "Refund the captured amount and record the refund against the order."],
    ["REQ-0106", "MOD-0106", "Stock levels are tracked and restocked", "functional", "must", "normal", "Inventory ledger with reservation and low-stock alerts."],
    ["REQ-0107", "MOD-0107", "Customers can register and manage an account", "functional", "should", "normal", "Registration, login, profile, and order history under the account."],
    ["REQ-0108", "MOD-0108", "Admins can view sales and stock analytics", "functional", "should", "normal", "Dashboard with revenue, order counts, and low-stock lists."],
    ["REQ-0109", "MOD-0103", "Order totals are computed server-side only", "constraint", "must", "critical", "Prices and totals must never be trusted from the client."],
    ["REQ-0110", "MOD-0105", "Card data never touches the application database", "constraint", "must", "critical", "PCI scope is minimized; the gateway tokenizes card data."],
    ["REQ-0111", "MOD-0101", "Product records carry price, stock, category, and SKU", "data", "must", "normal", "Each product has a unique SKU, a current price, a category, and an inventory link."],
    ["REQ-0112", "MOD-0104", "Order API responds within 300ms p95", "nonfunctional", "should", "normal", "Caching and indexing keep read paths fast."],
    ["REQ-0113", "MOD-0103", "Stock is reserved at checkout to prevent oversell", "functional", "must", "critical", "Reserve inventory atomically when the order is placed."],
    ["REQ-0114", "MOD-0101", "Purchased products can be reviewed by customers", "functional", "should", "normal", "Star rating and comment per product for verified purchases."],
  ];
  for (const [id, moduleId, title, type, priority, criticality, description] of requirements) {
    db.query(
      `INSERT INTO requirements (id, project_id, module_id, title, type, priority, criticality, description, acceptance_criteria, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Acceptance criteria recorded in the test plan.', 'approved')`,
    ).run(id, projectId, moduleId, title, type, priority, criticality, description);
  }

  // -------------------------------------------------------------------------
  // Use cases
  // -------------------------------------------------------------------------

  const useCases: [string, string, string, string, string[], string[], string[], string[]][] = [
    ["UC-0101", "MOD-0103", "Customer completes checkout", "Customer",
      ["Cart contains at least one item", "Customer is signed in"],
      ["Order is created with status pending_payment", "Inventory is reserved", "Confirmation email queued"],
      ["Customer reviews cart", "Customer enters shipping address", "System computes totals server-side", "System captures payment via gateway", "System creates order and sends confirmation"],
      ["Payment declined: order marked failed, cart restored", "Stock shortfall: cart flagged, order blocked"]],
    ["UC-0102", "MOD-0105", "Customer requests a refund", "Customer",
      ["Order exists and is paid", "Order is within the return window"],
      ["Refund is recorded against the order", "Payment gateway processes the refund"],
      ["Customer opens the order", "Customer requests a refund", "System validates eligibility", "System issues the refund"],
      ["Refund rejected: return window closed"]],
    ["UC-0103", "MOD-0106", "Administrator restocks inventory", "Administrator",
      ["Inventory item is below its low-stock threshold"],
      ["Restock order is created", "Stock level is updated on receipt"],
      ["Admin opens inventory dashboard", "Admin selects a low-stock item", "Admin places a restock order", "System updates stock on receipt"],
      ["Restock delayed: alert remains open"]],
    ["UC-0104", "MOD-0104", "Customer views order history", "Customer",
      ["Customer is signed in"],
      ["Order list is rendered with status and totals"],
      ["Customer opens account orders", "System lists past orders", "Customer opens an order detail"],
      ["Empty state shown when no orders exist"]],
    ["UC-0105", "MOD-0108", "Administrator reviews analytics", "Administrator",
      ["Admin is signed in with the admin role"],
      ["Revenue, orders, and low-stock reports render"],
      ["Admin opens the dashboard", "System aggregates sales metrics", "Admin filters by period"],
      ["No data period shows an empty state"]],
  ];
  for (const [id, moduleId, title, actor, pre, post, main, alt] of useCases) {
    db.query(
      `INSERT INTO use_cases (id, project_id, module_id, title, actor, preconditions, postconditions, main_flow, alternate_flows, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
    ).run(id, projectId, moduleId, title, actor, JSON.stringify(pre), JSON.stringify(post), JSON.stringify(main), JSON.stringify(alt));
  }

  // -------------------------------------------------------------------------
  // Workflows + model graphs (kind: workflow)
  // -------------------------------------------------------------------------

  const workflows: [string, string, string, string][] = [
    ["WF-0101", "MOD-0103", "Checkout flow", "Order placement from cart review to payment capture and confirmation."],
    ["WF-0102", "MOD-0104", "Order fulfillment", "Reserve inventory, pick and pack, ship, and track delivery."],
    ["WF-0103", "MOD-0105", "Refund & returns", "Validate a return request and issue a refund through the gateway."],
    ["WF-0104", "MOD-0106", "Inventory restock", "Detect low stock, create a restock order, and update on receipt."],
  ];
  for (const [id, moduleId, name, description] of workflows) {
    db.query("INSERT INTO workflows (id, project_id, module_id, name, description, status) VALUES (?, ?, ?, ?, ?, 'reviewed')").run(
      id, projectId, moduleId, name, description,
    );
  }

  const graphDefs: [string, string, string, [string, string, string, string, number, number][]][] = [
    [
      graphId,
      "Checkout flow",
      "Order placement from cart review to payment capture and confirmation.",
      [
        ["start", "Start", "Start", "[]", 0, 0],
        ["screen", "Cart review", "Customer reviews cart and shipping address", `["SCR-0105"]`, 0, 120],
        ["api_call", "Create order", "POST /api/v1/orders", `["API-0106","REQ-0103"]`, 0, 240],
        ["api_call", "Capture payment", "POST /api/v1/payments/capture", `["API-0109","REQ-0110"]`, 0, 360],
        ["decision", "Payment approved?", "Branches on gateway response", "[]", 0, 480],
        ["api_call", "Payment retry", "POST /api/v1/payments/retry", `["API-0109"]`, 160, 480],
        ["end", "Order confirmed", "Order confirmed and email queued", `["REQ-0103"]`, 0, 600],
      ],
    ],
    [
      graphFulfillment,
      "Order fulfillment",
      "Reserve inventory, pick and pack, ship, and track delivery.",
      [
        ["start", "Start", "Start", "[]", 0, 0],
        ["step", "Reserve inventory", "Reserve stock atomically with the order", `["REQ-0113","DB-0111"]`, 0, 120],
        ["step", "Pick and pack", "Warehouse picks and packs the items", "[]", 0, 240],
        ["api_call", "Create shipment", "POST /api/v1/shipments", `["API-0113"]`, 0, 360],
        ["decision", "In stock?", "Branch on reservation result", "[]", 0, 480],
        ["step", "Backorder", "Place on backorder until restock", `["REQ-0113"]`, 160, 480],
        ["end", "Shipped", "Shipment tracked", `["REQ-0104"]`, 0, 600],
      ],
    ],
    [
      graphRefunds,
      "Refund & returns",
      "Validate a return request and issue a refund through the gateway.",
      [
        ["start", "Start", "Start", "[]", 0, 0],
        ["screen", "Return request", "Customer requests a return", `["SCR-0107","REQ-0105"]`, 0, 120],
        ["step", "Validate eligibility", "Check return window and order status", `["REQ-0105"]`, 0, 240],
        ["decision", "Approved?", "Return policy check", "[]", 0, 360],
        ["api_call", "Issue refund", "POST /api/v1/refunds", `["API-0110","REQ-0105"]`, 0, 480],
        ["end", "Refunded", "Refund recorded", `["REQ-0105"]`, 0, 600],
      ],
    ],
    [
      graphRestock,
      "Inventory restock",
      "Detect low stock, create a restock order, and update on receipt.",
      [
        ["start", "Start", "Start", "[]", 0, 0],
        ["event", "Low stock alert", "Inventory item below threshold", `["DB-0111","REQ-0106"]`, 0, 120],
        ["step", "Create restock order", "PO raised to supplier", `["REQ-0106"]`, 0, 240],
        ["api_call", "Supplier order", "POST /api/v1/inventory/restock", `["API-0111"]`, 0, 360],
        ["end", "Restocked", "Stock updated on receipt", `["REQ-0106"]`, 0, 480],
      ],
    ],
  ];

  // Insert graphs + nodes first so edges can reference canonical node IDs.
  const nodeIdByKey = new Map<string, Map<string, string>>();
  for (const [gid, name, description, nodeDefs] of graphDefs) {
    db.query(
      `INSERT INTO model_graphs (id, project_id, kind, name, description, status)
       VALUES (?, ?, 'workflow', ?, ?, 'reviewed')`,
    ).run(gid, projectId, name, description);
    const byKey = new Map<string, string>();
    nodeDefs.forEach((def, index) => {
      const [type, title, desc, related, x, y] = def;
      const nodeId = nid(gid, index + 1);
      byKey.set(String(index + 1), nodeId);
      db.query(
        `INSERT INTO model_nodes (id, graph_id, client_key, node_type, title, description, inputs, outputs, preconditions, postconditions, related_artifacts, position)
         VALUES (?, ?, ?, ?, ?, ?, '[]', '[]', '[]', '[]', ?, ?)`,
      ).run(nodeId, gid, String(index + 1), type, title, desc, related, JSON.stringify({ x, y }));
    });
    nodeIdByKey.set(gid, byKey);
  }

  // Per-graph edges: [graphId, [fromIndex, toIndex, label, condition, edgeType][]]
  const graphEdges: [string, [string, string, string, string | null, string][]][] = [
    [graphId, [
      ["1", "2", "next", null, "next"],
      ["2", "3", "next", null, "next"],
      ["3", "4", "success", null, "success"],
      ["4", "5", "success", null, "success"],
      ["5", "6", "retry", "declined", "retry"],
      ["6", "4", "retry", "retry capture", "retry"],
      ["5", "7", "success", "approved", "success"],
    ]],
    [graphFulfillment, [
      ["1", "2", "next", null, "next"],
      ["2", "3", "next", null, "next"],
      ["3", "4", "next", null, "next"],
      ["4", "5", "success", null, "success"],
      ["5", "6", "failure", "out of stock", "failure"],
      ["6", "7", "next", "backorder", "next"],
      ["5", "7", "success", "in stock", "success"],
    ]],
    [graphRefunds, [
      ["1", "2", "next", null, "next"],
      ["2", "3", "next", null, "next"],
      ["3", "4", "next", null, "next"],
      ["4", "5", "success", "approved", "success"],
      ["5", "6", "next", null, "next"],
      ["4", "6", "failure", "rejected", "failure"],
    ]],
    [graphRestock, [
      ["1", "2", "next", null, "next"],
      ["2", "3", "next", null, "next"],
      ["3", "4", "next", null, "next"],
      ["4", "5", "next", null, "next"],
    ]],
  ];
  for (const [gid, edges] of graphEdges) {
    const byKey = nodeIdByKey.get(gid)!;
    edges.forEach(([from, to, label, condition, edgeType], index) => {
      const edgeId = eid(gid, index + 1);
      db.query(
        "INSERT INTO model_edges (id, graph_id, from_node, to_node, label, condition, edge_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).run(edgeId, gid, byKey.get(from)!, byKey.get(to)!, label, condition, edgeType);
    });
  }

  // -------------------------------------------------------------------------
  // Data model (entities + fields + relations)
  // -------------------------------------------------------------------------

  const entities: [string, string, string, string][] = [
    ["DB-0101", "customer", "customers", "Registered customer accounts."],
    ["DB-0102", "product", "products", "Catalog products with price and SKU."],
    ["DB-0103", "category", "categories", "Product categories."],
    ["DB-0104", "product_category", "product_categories", "N:M link between products and categories."],
    ["DB-0105", "cart", "carts", "Customer shopping carts."],
    ["DB-0106", "cart_item", "cart_items", "Line items in a cart."],
    ["DB-0107", "order", "orders", "Customer orders with server-computed totals."],
    ["DB-0108", "order_item", "order_items", "Line items in an order."],
    ["DB-0109", "payment", "payments", "Payment captures and refunds via the gateway."],
    ["DB-0110", "shipment", "shipments", "Order shipments and tracking."],
    ["DB-0111", "inventory", "inventory", "Stock levels with reservation state."],
  ];
  for (const [id, name, tableName, description] of entities) {
    db.query("INSERT INTO entities (id, project_id, name, table_name, description, status) VALUES (?, ?, ?, ?, ?, 'approved')").run(
      id, projectId, name, tableName, description,
    );
  }

  const entityFields: [string, string, string, string, number, number, number][] = [
    // customer
    ["DB-0101-F01", "DB-0101", "id", "uuid", 0, 1, 0],
    ["DB-0101-F02", "DB-0101", "email", "string", 0, 0, 1],
    ["DB-0101-F03", "DB-0101", "first_name", "string", 0, 0, 0],
    ["DB-0101-F04", "DB-0101", "last_name", "string", 0, 0, 0],
    ["DB-0101-F05", "DB-0101", "created_at", "datetime", 0, 0, 0],
    // product
    ["DB-0102-F01", "DB-0102", "id", "uuid", 0, 1, 0],
    ["DB-0102-F02", "DB-0102", "sku", "string", 0, 0, 1],
    ["DB-0102-F03", "DB-0102", "name", "string", 0, 0, 0],
    ["DB-0102-F04", "DB-0102", "price_cents", "number", 0, 0, 0],
    ["DB-0102-F05", "DB-0102", "currency", "string", 0, 0, 0],
    ["DB-0102-F06", "DB-0102", "active", "boolean", 0, 0, 0],
    // category
    ["DB-0103-F01", "DB-0103", "id", "uuid", 0, 1, 0],
    ["DB-0103-F02", "DB-0103", "name", "string", 0, 0, 1],
    ["DB-0103-F03", "DB-0103", "slug", "string", 0, 0, 1],
    // product_category
    ["DB-0104-F01", "DB-0104", "id", "uuid", 0, 1, 0],
    ["DB-0104-F02", "DB-0104", "product_id", "reference", 0, 0, 0],
    ["DB-0104-F03", "DB-0104", "category_id", "reference", 0, 0, 0],
    // cart
    ["DB-0105-F01", "DB-0105", "id", "uuid", 0, 1, 0],
    ["DB-0105-F02", "DB-0105", "customer_id", "reference", 0, 0, 0],
    ["DB-0105-F03", "DB-0105", "status", "string", 0, 0, 0],
    ["DB-0105-F04", "DB-0105", "created_at", "datetime", 0, 0, 0],
    // cart_item
    ["DB-0106-F01", "DB-0106", "id", "uuid", 0, 1, 0],
    ["DB-0106-F02", "DB-0106", "cart_id", "reference", 0, 0, 0],
    ["DB-0106-F03", "DB-0106", "product_id", "reference", 0, 0, 0],
    ["DB-0106-F04", "DB-0106", "quantity", "number", 0, 0, 0],
    ["DB-0106-F05", "DB-0106", "unit_price_cents", "number", 0, 0, 0],
    // order
    ["DB-0107-F01", "DB-0107", "id", "uuid", 0, 1, 0],
    ["DB-0107-F02", "DB-0107", "customer_id", "reference", 0, 0, 0],
    ["DB-0107-F03", "DB-0107", "status", "string", 0, 0, 0],
    ["DB-0107-F04", "DB-0107", "total_cents", "number", 0, 0, 0],
    ["DB-0107-F05", "DB-0107", "currency", "string", 0, 0, 0],
    ["DB-0107-F06", "DB-0107", "placed_at", "datetime", 0, 0, 0],
    // order_item
    ["DB-0108-F01", "DB-0108", "id", "uuid", 0, 1, 0],
    ["DB-0108-F02", "DB-0108", "order_id", "reference", 0, 0, 0],
    ["DB-0108-F03", "DB-0108", "product_id", "reference", 0, 0, 0],
    ["DB-0108-F04", "DB-0108", "quantity", "number", 0, 0, 0],
    ["DB-0108-F05", "DB-0108", "unit_price_cents", "number", 0, 0, 0],
    // payment
    ["DB-0109-F01", "DB-0109", "id", "uuid", 0, 1, 0],
    ["DB-0109-F02", "DB-0109", "order_id", "reference", 0, 0, 0],
    ["DB-0109-F03", "DB-0109", "provider", "string", 0, 0, 0],
    ["DB-0109-F04", "DB-0109", "status", "string", 0, 0, 0],
    ["DB-0109-F05", "DB-0109", "amount_cents", "number", 0, 0, 0],
    // shipment
    ["DB-0110-F01", "DB-0110", "id", "uuid", 0, 1, 0],
    ["DB-0110-F02", "DB-0110", "order_id", "reference", 0, 0, 0],
    ["DB-0110-F03", "DB-0110", "carrier", "string", 0, 0, 0],
    ["DB-0110-F04", "DB-0110", "tracking_number", "string", 0, 0, 0],
    ["DB-0110-F05", "DB-0110", "status", "string", 0, 0, 0],
    // inventory
    ["DB-0111-F01", "DB-0111", "id", "uuid", 0, 1, 0],
    ["DB-0111-F02", "DB-0111", "product_id", "reference", 0, 0, 1],
    ["DB-0111-F03", "DB-0111", "quantity", "number", 0, 0, 0],
    ["DB-0111-F04", "DB-0111", "low_stock_threshold", "number", 0, 0, 0],
  ];
  for (const [id, entityId, name, dataType, nullable, isPk, isUnique] of entityFields) {
    db.query(
      "INSERT INTO entity_fields (id, entity_id, name, data_type, nullable, is_primary_key, is_unique) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(id, entityId, name, dataType, nullable, isPk, isUnique);
  }

  const relations: [string, string, string, string, string][] = [
    ["REL-0101", "DB-0101", "DB-0105", "1:N", "A customer owns many carts."],
    ["REL-0102", "DB-0101", "DB-0107", "1:N", "A customer places many orders."],
    ["REL-0103", "DB-0102", "DB-0103", "N:M", "Products belong to many categories (via product_category)."],
    ["REL-0104", "DB-0105", "DB-0106", "1:N", "A cart has many line items."],
    ["REL-0105", "DB-0102", "DB-0106", "1:N", "A product appears in many cart items."],
    ["REL-0106", "DB-0107", "DB-0108", "1:N", "An order has many line items."],
    ["REL-0107", "DB-0102", "DB-0108", "1:N", "A product appears in many order items."],
    ["REL-0108", "DB-0107", "DB-0109", "1:1", "An order has one payment."],
    ["REL-0109", "DB-0107", "DB-0110", "1:N", "An order can have several shipments."],
    ["REL-0110", "DB-0102", "DB-0111", "1:1", "A product has one inventory record."],
  ];
  for (const [id, from, to, type, description] of relations) {
    db.query(
      "INSERT INTO entity_relations (id, project_id, from_entity_id, to_entity_id, relation_type, description, status) VALUES (?, ?, ?, ?, ?, ?, 'approved')",
    ).run(id, projectId, from, to, type, description);
  }

  // -------------------------------------------------------------------------
  // API endpoints (.NET-style)
  // -------------------------------------------------------------------------

  const endpoints: [string, string, string, string, string, string, unknown, unknown, unknown][] = [
    ["API-0101", "MOD-0101", "GET", "/api/v1/products", "List products with pagination, search, and category filters.", "Public", {}, { items: [{ id: "string", sku: "string", name: "string", price_cents: "number" }], page: "number", total: "number" }, [{ code: "400", description: "Invalid filter" }]],
    ["API-0102", "MOD-0101", "GET", "/api/v1/products/{id}", "Get a single product by id.", "Public", {}, { id: "string", sku: "string", name: "string", price_cents: "number", category_ids: ["string"] }, [{ code: "404", description: "Product not found" }]],
    ["API-0103", "MOD-0101", "GET", "/api/v1/categories", "List product categories.", "Public", {}, { items: [{ id: "string", name: "string", slug: "string" }] }, [{ code: "400", description: "Invalid query" }]],
    ["API-0104", "MOD-0102", "POST", "/api/v1/cart/items", "Add a line item to the cart.", "Bearer token", { product_id: "string", quantity: "number" }, { cart_id: "string", item_id: "string", total_cents: "number" }, [{ code: "400", description: "Quantity invalid" }, { code: "401", description: "Unauthenticated" }]],
    ["API-0105", "MOD-0102", "PUT", "/api/v1/cart/items/{id}", "Update a cart line quantity.", "Bearer token", { quantity: "number" }, { item_id: "string", total_cents: "number" }, [{ code: "400", description: "Quantity invalid" }]],
    ["API-0106", "MOD-0103", "POST", "/api/v1/orders", "Place an order (checkout) with server-side totals.", "Bearer token", { shipping_address: { line1: "string", zip: "string" }, payment_token: "string" }, { order_id: "string", status: "string", total_cents: "number" }, [{ code: "400", description: "Cart empty or stock shortfall" }, { code: "401", description: "Unauthenticated" }]],
    ["API-0107", "MOD-0104", "GET", "/api/v1/orders", "List the signed-in customer's orders.", "Bearer token", {}, { items: [{ order_id: "string", status: "string", total_cents: "number", placed_at: "string" }] }, [{ code: "401", description: "Unauthenticated" }]],
    ["API-0108", "MOD-0104", "GET", "/api/v1/orders/{id}", "Get an order detail with line items.", "Bearer token", {}, { order_id: "string", status: "string", items: [{ product_id: "string", quantity: "number" }], total_cents: "number" }, [{ code: "404", description: "Order not found" }]],
    ["API-0109", "MOD-0105", "POST", "/api/v1/payments/capture", "Capture a payment via the gateway (tokenized).", "Bearer token", { payment_token: "string", amount_cents: "number", currency: "string" }, { payment_id: "string", status: "string" }, [{ code: "402", description: "Payment declined" }]],
    ["API-0110", "MOD-0105", "POST", "/api/v1/refunds", "Issue a refund against a captured payment.", "Bearer token", { payment_id: "string", amount_cents: "number" }, { refund_id: "string", status: "string" }, [{ code: "400", description: "Refund exceeds capture" }, { code: "409", description: "Return window closed" }]],
    ["API-0111", "MOD-0106", "GET", "/api/v1/inventory", "List inventory levels and low-stock alerts.", "Bearer token", {}, { items: [{ product_id: "string", quantity: "number", low: "boolean" }] }, [{ code: "401", description: "Unauthenticated" }]],
    ["API-0112", "MOD-0108", "GET", "/api/v1/admin/analytics", "Sales and stock analytics for admins.", "Admin token", { period: "string" }, { revenue_cents: "number", order_count: "number", low_stock: [{ product_id: "string", quantity: "number" }] }, [{ code: "403", description: "Forbidden" }]],
    ["API-0113", "MOD-0104", "POST", "/api/v1/shipments", "Create a shipment for a fulfilled order.", "Bearer token", { order_id: "string", carrier: "string" }, { shipment_id: "string", tracking_number: "string" }, [{ code: "400", description: "Order not shippable" }]],
  ];
  for (const [id, moduleId, method, path, purpose, auth, reqSchema, resSchema, errors] of endpoints) {
    db.query(
      `INSERT INTO api_endpoints (id, project_id, module_id, method, path, purpose, auth, request_schema, response_schema, error_codes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
    ).run(id, projectId, moduleId, method, path, purpose, auth, JSON.stringify(reqSchema), JSON.stringify(resSchema), JSON.stringify(errors));
  }

  // -------------------------------------------------------------------------
  // Screens (React routes)
  // -------------------------------------------------------------------------

  const screens: [string, string, string, string, string][] = [
    ["SCR-0101", "MOD-0101", "Home", "/", "Storefront landing with featured products."],
    ["SCR-0102", "MOD-0101", "Product catalog", "/catalog", "Browse, search, and filter products."],
    ["SCR-0103", "MOD-0101", "Product detail", "/products/:id", "Product info, price, stock, and reviews."],
    ["SCR-0104", "MOD-0102", "Cart", "/cart", "Cart review with editable quantities."],
    ["SCR-0105", "MOD-0103", "Checkout", "/checkout", "Shipping address, payment, and confirmation."],
    ["SCR-0106", "MOD-0104", "Order confirmation", "/orders/:id/confirmation", "Post-checkout order confirmation."],
    ["SCR-0107", "MOD-0107", "Order history", "/account/orders", "List of past orders and details."],
    ["SCR-0108", "MOD-0108", "Admin dashboard", "/admin", "Sales and stock analytics."],
  ];
  for (const [id, moduleId, name, route, description] of screens) {
    db.query("INSERT INTO screens (id, project_id, module_id, name, route, description, status) VALUES (?, ?, ?, ?, ?, ?, 'designed')").run(
      id, projectId, moduleId, name, route, description,
    );
  }

  // -------------------------------------------------------------------------
  // Components (architecture)
  // -------------------------------------------------------------------------

  const components: [string, string, string, string, string[]][] = [
    ["CMP-0101", "Storefront SPA", "presentation", "React storefront: catalog, cart, checkout, account.", ["React", "TypeScript", "Tailwind CSS", "React Router"]],
    ["CMP-0102", "Commerce API", "application", "ASP.NET Core REST API with EF Core and Serilog.", [".NET", "ASP.NET Core", "EF Core", "Serilog"]],
    ["CMP-0103", "Admin console", "presentation", "React admin UI for catalog, inventory, and analytics.", ["React", "TypeScript"]],
    ["CMP-0104", "Commerce database", "infrastructure", "Relational store for customers, orders, and inventory.", ["SQL Server"]],
    ["CMP-0105", "Payment gateway", "integration", "Tokenized card processing and refunds.", ["REST", "PCI-DSS"]],
    ["CMP-0106", "Email service", "integration", "Order confirmation and restock notifications.", ["SMTP", "MailKit"]],
    ["CMP-0107", "Cache", "infrastructure", "Read-path caching for catalog and product detail.", ["Redis"]],
  ];
  for (const [id, name, layer, responsibility, technologies] of components) {
    db.query("INSERT INTO components (id, project_id, name, layer, responsibility, technologies, status) VALUES (?, ?, ?, ?, ?, ?, 'approved')").run(
      id, projectId, name, layer, responsibility, JSON.stringify(technologies),
    );
  }

  // -------------------------------------------------------------------------
  // Skills (.NET + React + e-commerce)
  // -------------------------------------------------------------------------

  const skills: [string, SkillKind, string, SkillLevel | null, string | null, string, number][] = [
    ["SKL-0101", "capability", "Payments engineering", "expert", null, "Tokenized card processing, PCI scope minimization, and refund orchestration.", 1],
    ["SKL-0102", "capability", "E-commerce domain", "advanced", null, "Catalog, cart, checkout, inventory, and order lifecycle modeling.", 2],
    ["SKL-0103", "capability", ".NET backend engineering", "advanced", null, "ASP.NET Core APIs with EF Core, validation, and structured logging.", 3],
    ["SKL-0104", "tech", "ASP.NET Core", null, "backend", "REST API development on the .NET platform.", 4],
    ["SKL-0105", "tech", "EF Core", null, "backend", "Object-relational mapping and migrations.", 5],
    ["SKL-0106", "tech", "React", null, "frontend", "Storefront and admin UI with Tailwind CSS.", 6],
    ["SKL-0107", "tech", "TypeScript", null, "frontend", "Typed client code shared across storefront and admin.", 7],
    ["SKL-0108", "tech", "SQL Server", null, "database", "Transactional data model for orders and inventory.", 8],
  ];
  for (const [id, kind, name, level, tag, description, sortOrder] of skills) {
    db.query(
      "INSERT INTO skills (id, project_id, kind, name, description, level, tag, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(id, projectId, kind, name, description, level, tag, sortOrder);
    logEvent(db, { projectId, entityType: "skill", entityId: id, action: "created", payload: { kind, name } });
  }

  // -------------------------------------------------------------------------
  // Risks, decisions, milestones, test cases
  // -------------------------------------------------------------------------

  const risks: [string, string, string, string, string, string][] = [
    ["RISK-0101", "Payment provider downtime", "medium", "critical", "Retry with exponential backoff; provider failover flag.", "backend"],
    ["RISK-0102", "Inventory oversell", "high", "high", "Atomic reservation at checkout (REQ-0113); low-stock alerts.", "backend"],
    ["RISK-0103", "Cart abandonment", "high", "medium", "Persist carts server-side; recovery email for saved carts.", "product"],
    ["RISK-0104", "PCI scope creep", "medium", "critical", "Never store card data (REQ-0110); gateway tokenization only.", "backend"],
  ];
  for (const [id, title, likelihood, impact, mitigation, owner] of risks) {
    db.query("INSERT INTO risks (id, project_id, title, likelihood, impact, mitigation, owner, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'open')").run(
      id, projectId, title, likelihood, impact, mitigation, owner,
    );
  }

  const decisions: [string, string, string, string, string[]][] = [
    ["ADR-0101", ".NET + React for the store", "ASP.NET Core API with a React SPA.", "The most common e-commerce stack: a typed backend and a component-based frontend.", ["Node/Express", "Next.js"]],
    ["ADR-0102", "Tokenized payments", "Card data is captured by the gateway and never stored.", "PCI scope must be minimized for a small store team.", ["Storing card data"]],
    ["ADR-0103", "Server-side totals", "All order totals are computed by the API.", "Client-side totals are not trustworthy (REQ-0109).", ["Client-computed totals"]],
  ];
  for (const [id, title, decision, context, alternatives] of decisions) {
    db.query(
      `INSERT INTO decisions (id, project_id, title, decision, context, alternatives, consequences, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Recorded in ADRs; documented in 08-governance/adrs.md.', 'approved')`,
    ).run(id, projectId, title, decision, context, JSON.stringify(alternatives));
  }

  const milestones: [string, string, string, string, string][] = [
    ["MS-0101", "MVP launch", "2026-11-30", "Catalog, cart, checkout, and order confirmation for first users.", "All critical requirements approved and verified."],
    ["MS-0102", "Payments + inventory live", "2027-01-31", "Refunds, stock reservation, and restock alerts.", "REQ-0105/0106/0110/0113 verified."],
    ["MS-0103", "Admin analytics", "2027-03-31", "Revenue and stock dashboards.", "REQ-0108 verified."],
  ];
  for (const [id, name, due, description, gate] of milestones) {
    db.query("INSERT INTO milestones (id, project_id, name, due_date, description, gate_criteria, status) VALUES (?, ?, ?, ?, ?, ?, 'in_progress')").run(
      id, projectId, name, due, description, gate,
    );
  }

  const testCases: [string, string, string, string, string[], string[]][] = [
    ["TC-0101", "MOD-0103", "Checkout success path", "Cart with one item; signed-in customer.", ["Place order", "Capture payment", "Confirm order"], ["Order created with status pending_payment", "Inventory reserved"]],
    ["TC-0102", "MOD-0103", "Payment decline path", "Cart with one item; gateway declines.", ["Place order", "Capture payment"], ["Order marked failed", "Cart restored"]],
    ["TC-0103", "MOD-0106", "Inventory reservation", "Stock = 5; order quantity = 2.", ["Place order"], ["Stock now 3", "No oversell"]],
    ["TC-0104", "MOD-0105", "Refund issuance", "Paid order within return window.", ["Request refund", "Issue refund"], ["Refund recorded", "Gateway refund processed"]],
    ["TC-0105", "MOD-0101", "Catalog pagination", "100 products published.", ["List products page 2"], ["Returns page 2 with correct page size"]],
    ["TC-0106", "MOD-0108", "Analytics authorization", "Non-admin token.", ["Request analytics"], ["403 Forbidden"]],
  ];
  for (const [id, moduleId, title, precondition, steps, expected] of testCases) {
    db.query(
      `INSERT INTO test_cases (id, project_id, module_id, title, test_type, precondition, steps, expected_results, status)
       VALUES (?, ?, ?, ?, 'integration', ?, ?, ?, 'approved')`,
    ).run(id, projectId, moduleId, title, precondition, JSON.stringify(steps), JSON.stringify(expected));
  }

  // -------------------------------------------------------------------------
  // Approvals + governance demo + audit
  // -------------------------------------------------------------------------

  db.query(
    `INSERT INTO approvals (id, project_id, artifact_id, artifact_type, approver_role, approver_name, decision, status, comments)
     VALUES (?, ?, 'REQ-0101', 'requirement', 'product', 'Ada Lovelace', 'approved', 'approved', 'Approved in review 2026-08-17.')`,
  ).run("APR-0101", projectId);
  logEvent(db, { projectId, entityType: "approval", entityId: "APR-0101", action: "approved", toStatus: "approved", actor: "Ada Lovelace", actorType: "human", payload: { artifact_id: "REQ-0101" } });

  // Checkout workflow is security-sensitive → request approval, then approve.
  db.query(
    `INSERT INTO approvals (id, project_id, artifact_id, artifact_type, approver_role, status, comments)
     VALUES ('APR-0102', ?, 'WF-0101', 'workflow', 'engineering-lead', 'pending', 'Checkout flow touches payment processing; requires engineering review.')`,
  ).run(projectId);
  db.query(
    `INSERT INTO artifact_governance (artifact_type, artifact_id, project_id, status, needs_approval, updated_at)
     VALUES ('workflow', 'WF-0101', ?, 'needs_review', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
  ).run(projectId);
  logEvent(db, { projectId, entityType: "approval", entityId: "APR-0102", action: "requested", toStatus: "pending", actor: "engineering-lead", payload: { artifact_id: "WF-0101" } });

  db.query(
    `UPDATE approvals SET decision = 'approved', status = 'approved', approver_name = 'Alan Turing',
       comments = 'Approved: checkout flow is secure and complete.',
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = 'APR-0102'`,
  ).run();
  db.query(
    `UPDATE artifact_governance SET status = 'approved', approval_id = 'APR-0102',
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE artifact_type = 'workflow' AND artifact_id = 'WF-0101'`,
  ).run();
  db.query("UPDATE workflows SET status = 'approved', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = 'WF-0101'").run();
  logEvent(db, { projectId, entityType: "workflow", entityId: "WF-0101", action: "approved", fromStatus: "needs_review", toStatus: "approved", actor: "Alan Turing", actorType: "human", payload: { approval_id: "APR-0102" } });

  // -------------------------------------------------------------------------
  // Traceability (artifact_links)
  // -------------------------------------------------------------------------

  const links: [string, string, string, string, string][] = [
    ["requirement", "REQ-0101", "use-case", "UC-0101", "satisfies"],
    ["requirement", "REQ-0103", "use-case", "UC-0101", "satisfies"],
    ["requirement", "REQ-0104", "use-case", "UC-0104", "satisfies"],
    ["requirement", "REQ-0106", "use-case", "UC-0103", "satisfies"],
    ["requirement", "REQ-0108", "use-case", "UC-0105", "satisfies"],
    ["requirement", "REQ-0102", "use-case", "UC-0101", "traces"],
    ["requirement", "REQ-0105", "use-case", "UC-0102", "satisfies"],
    ["use-case", "UC-0101", "api-endpoint", "API-0106", "traces"],
    ["use-case", "UC-0101", "api-endpoint", "API-0109", "traces"],
    ["use-case", "UC-0101", "screen", "SCR-0105", "traces"],
    ["use-case", "UC-0104", "api-endpoint", "API-0107", "traces"],
    ["use-case", "UC-0104", "screen", "SCR-0107", "traces"],
    ["use-case", "UC-0103", "api-endpoint", "API-0111", "traces"],
    ["use-case", "UC-0105", "api-endpoint", "API-0112", "traces"],
    ["use-case", "UC-0105", "screen", "SCR-0108", "traces"],
    ["requirement", "REQ-0113", "api-endpoint", "API-0106", "realizes"],
    ["requirement", "REQ-0109", "api-endpoint", "API-0106", "constrains"],
    ["requirement", "REQ-0110", "api-endpoint", "API-0109", "constrains"],
    ["requirement", "REQ-0105", "api-endpoint", "API-0110", "realizes"],
    ["requirement", "REQ-0101", "api-endpoint", "API-0101", "realizes"],
    ["requirement", "REQ-0102", "api-endpoint", "API-0104", "realizes"],
  ];
  for (const [fromType, fromId, toType, toId, linkType] of links) {
    db.query(
      "INSERT INTO artifact_links (project_id, from_type, from_id, to_type, to_id, link_type) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(projectId, fromType, fromId, toType, toId, linkType);
  }

  // -------------------------------------------------------------------------
  // Roadmap + task pack (derived, not hand-authored)
  // -------------------------------------------------------------------------

  const roadmapId = storeRoadmap(db, projectId, "StoreSphere E-Commerce — MVP roadmap");
  const pack = materializeTaskPack(db, roadmapId);
  console.log(`Roadmap ${roadmapId} generated; packaged ${pack.created} tasks.`);

  // Mid-project lifecycle: roadmap awaiting review + one packaged task in progress.
  db.query(
    `INSERT INTO artifact_governance (artifact_type, artifact_id, project_id, status, needs_approval, updated_at)
     VALUES ('roadmap', ?, ?, 'needs_review', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
  ).run(roadmapId, projectId);
  logEvent(db, { projectId, entityType: "roadmap", entityId: roadmapId, action: "generated", toStatus: "needs_review", actor: "system" });

  const firstTask = pack.task_ids[0];
  if (firstTask) {
    db.query("UPDATE tasks SET status = 'in_progress', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(firstTask);
    db.query(
      `INSERT INTO artifact_governance (artifact_type, artifact_id, project_id, status, needs_approval, updated_at)
       VALUES ('task', ?, ?, 'in_progress', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
    ).run(firstTask, projectId);
    logEvent(db, { projectId, entityType: "task", entityId: firstTask, action: "status_change", fromStatus: "open", toStatus: "in_progress", actor: "agent", actorType: "agent" });
  }

  console.log(
    `StoreSphere seeded (${projectId}): ${modules.length} modules, ${requirements.length} requirements, ` +
      `${useCases.length} use cases, ${graphDefs.length} workflow graphs, ${entities.length} entities, ` +
      `${endpoints.length} api endpoints, ${screens.length} screens, ${components.length} components, ` +
      `${skills.length} skills, ${testCases.length} test cases.`,
  );

  return { projectId, roadmapId, taskCount: pack.created };
}