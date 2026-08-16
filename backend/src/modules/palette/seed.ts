/**
 * Customizable node palette seeds (Prompt 15).
 *
 * Idempotent built-in defaults: the four original node categories (flow,
 * system, governance, ai) and every existing node type (the 12 Prompt-07
 * types plus workflow_call from Prompt 14) seeded with their exact current
 * properties so existing behavior is unchanged until edited — plus a `loop`
 * demo type carrying custom fields. Rows use stable fixed IDs (NCAT-0001 …,
 * NTYP-0001 …) and id_sequences is advanced past the seeded ranges.
 */
import type { Database } from "bun:sqlite";
import type { ModelKind } from "../modeler";

type SeedCategory = {
  id: string;
  key: string;
  label: string;
  color: string;
  sortOrder: number;
};

type SeedType = {
  id: string;
  key: string;
  label: string;
  categoryKey: string;
  description: string;
  color: string;
  kinds: ModelKind[];
  defaultTitle: string;
  fields?: { key: string; label: string; type: string; options?: string[]; default?: unknown }[];
  sortOrder: number;
};

const CATEGORY_SEEDS: SeedCategory[] = [
  { id: "NCAT-0001", key: "flow", label: "Flow", color: "#0284c7", sortOrder: 1 },
  { id: "NCAT-0002", key: "system", label: "System", color: "#2563eb", sortOrder: 2 },
  { id: "NCAT-0003", key: "governance", label: "Governance", color: "#e11d48", sortOrder: 3 },
  { id: "NCAT-0004", key: "ai", label: "AI & Agents", color: "#c026d3", sortOrder: 4 },
];

const TYPE_SEEDS: SeedType[] = [
  { id: "NTYP-0001", key: "start", label: "Start", categoryKey: "flow", description: "Entry point of a process or flow.", color: "#059669", kinds: ["workflow", "architecture", "sequence"], defaultTitle: "Start", sortOrder: 1 },
  { id: "NTYP-0002", key: "end", label: "End", categoryKey: "flow", description: "Terminal state of a process or flow.", color: "#64748b", kinds: ["workflow", "architecture", "sequence"], defaultTitle: "End", sortOrder: 2 },
  { id: "NTYP-0003", key: "step", label: "Step", categoryKey: "flow", description: "A single action or activity performed by a role or system.", color: "#0284c7", kinds: ["workflow", "architecture", "sequence"], defaultTitle: "New step", sortOrder: 3 },
  { id: "NTYP-0004", key: "decision", label: "Decision", categoryKey: "flow", description: "A branch point; outgoing edges must carry conditions.", color: "#d97706", kinds: ["workflow"], defaultTitle: "Decision", sortOrder: 4 },
  { id: "NTYP-0005", key: "wait", label: "Wait", categoryKey: "flow", description: "A delay, queue, or scheduled pause before continuing.", color: "#7c3aed", kinds: ["workflow", "sequence"], defaultTitle: "Wait", sortOrder: 5 },
  { id: "NTYP-0006", key: "event", label: "Event", categoryKey: "system", description: "An external or internal event that triggers or interrupts a flow.", color: "#0891b2", kinds: ["workflow", "architecture", "sequence"], defaultTitle: "New event", sortOrder: 1 },
  { id: "NTYP-0007", key: "screen", label: "Screen", categoryKey: "system", description: "A user-facing screen or page in the product.", color: "#4f46e5", kinds: ["workflow", "architecture", "sequence"], defaultTitle: "New screen", sortOrder: 2 },
  { id: "NTYP-0008", key: "api_call", label: "API Call", categoryKey: "system", description: "A request to an API endpoint.", color: "#2563eb", kinds: ["workflow", "architecture", "sequence"], defaultTitle: "New API call", sortOrder: 3 },
  { id: "NTYP-0009", key: "database", label: "Database", categoryKey: "system", description: "A data store, table, or entity in the data model.", color: "#0d9488", kinds: ["workflow", "data", "architecture", "sequence"], defaultTitle: "New entity", sortOrder: 4 },
  { id: "NTYP-0010", key: "external_system", label: "External System", categoryKey: "system", description: "A third-party or legacy system outside the product boundary.", color: "#ea580c", kinds: ["workflow", "architecture", "sequence"], defaultTitle: "External system", sortOrder: 5 },
  { id: "NTYP-0011", key: "workflow_call", label: "Workflow Call", categoryKey: "system", description: "Calls a workflow from another project (multi-project workspace).", color: "#7c3aed", kinds: ["workflow"], defaultTitle: "Workflow call", sortOrder: 6 },
  { id: "NTYP-0012", key: "approval", label: "Approval", categoryKey: "governance", description: "A human approval gate; progress pauses until decided.", color: "#e11d48", kinds: ["workflow", "sequence"], defaultTitle: "Approval", sortOrder: 1 },
  { id: "NTYP-0013", key: "ai_agent", label: "AI Agent", categoryKey: "ai", description: "An AI/agent step that produces output or makes a decision.", color: "#c026d3", kinds: ["workflow", "architecture", "sequence"], defaultTitle: "AI agent", sortOrder: 1 },
  // Demo custom type with custom fields (Prompt 15 example).
  {
    id: "NTYP-0014",
    key: "loop",
    label: "Loop",
    categoryKey: "flow",
    description: "Repeats a sub-flow a fixed number of times or while a condition holds.",
    color: "#0ea5e9",
    kinds: ["workflow"],
    defaultTitle: "Loop",
    sortOrder: 6,
    fields: [
      { key: "iterations", label: "Iterations", type: "number", default: 1 },
      { key: "mode", label: "Mode", type: "select", options: ["for", "while", "until"], default: "for" },
    ],
  },
];

/** Inserts the built-in palette defaults idempotently and bumps ID counters. */
export function seedNodePalette(db: Database): void {
  const insertCategory = db.query(
    `INSERT OR IGNORE INTO node_categories (id, key, label, color, sort_order, enabled, built_in)
     VALUES (?, ?, ?, ?, ?, 1, 1)`,
  );
  for (const c of CATEGORY_SEEDS) {
    insertCategory.run(c.id, c.key, c.label, c.color, c.sortOrder);
  }

  const insertType = db.query(
    `INSERT OR IGNORE INTO node_types
       (id, key, label, category_id, description, color, kinds, default_title, fields, sort_order, enabled, built_in)
     VALUES (?, ?, ?, (SELECT id FROM node_categories WHERE key = ?), ?, ?, ?, ?, ?, ?, 1, 1)`,
  );
  for (const t of TYPE_SEEDS) {
    insertType.run(
      t.id,
      t.key,
      t.label,
      t.categoryKey,
      t.description,
      t.color,
      JSON.stringify(t.kinds),
      t.defaultTitle,
      JSON.stringify(t.fields ?? []),
      t.sortOrder,
    );
  }

  const bump = (prefix: string, next: number): void => {
    db.query(
      `INSERT INTO id_sequences (prefix, next_value, project_id)
       VALUES (?, ?, NULL)
       ON CONFLICT(prefix) DO UPDATE SET
         next_value = MAX(id_sequences.next_value, excluded.next_value),
         project_id = excluded.project_id`,
    ).run(prefix, next);
  };
  bump("NCAT", CATEGORY_SEEDS.length + 1);
  bump("NTYP", TYPE_SEEDS.length + 1);
}