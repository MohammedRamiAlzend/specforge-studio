/**
 * Visual modeler tests (Prompt 12: modeler interactions).
 * The canvas interaction layer (drag-drop, connects, edits) funnels through
 * these pure mapping builders — testing them pins down the contract between
 * the server model and the React Flow canvas.
 */
import { describe, expect, it } from "bun:test";
import type { ModelNodeType } from "../src/entities/model-graph/types";
import {
  edgeDisplayText,
  metaForType,
  serverEdgeToRf,
  serverNodeToRf,
} from "../src/features/visual-modeler/types";

const catalog: ModelNodeType[] = [
  {
    type: "decision",
    label: "Decision",
    category: "flow",
    description: "Branches on a condition",
    color: "#f59e0b",
    kinds: ["workflow"],
    defaultTitle: "Decision",
  },
  {
    type: "api_call",
    label: "API call",
    category: "system",
    description: "Calls a backend endpoint",
    color: "#3b82f6",
    kinds: ["workflow", "sequence", "architecture"],
    defaultTitle: "API call",
  },
];

describe("metaForType", () => {
  it("resolves catalog metadata for known types", () => {
    const meta = metaForType("decision", catalog);
    expect(meta.label).toBe("Decision");
    expect(meta.category).toBe("flow");
    expect(meta.color).toBe("#f59e0b");
  });

  it("falls back to safe defaults for unknown types", () => {
    const meta = metaForType("nope", catalog);
    expect(meta.label).toBe("nope");
    expect(meta.category).toBe("flow");
    expect(meta.color).toBe("#64748b");
  });
});

describe("edgeDisplayText", () => {
  it("prefers label, falls back to condition, combines both", () => {
    expect(edgeDisplayText("", "")).toBe("");
    expect(edgeDisplayText("Yes", "")).toBe("Yes");
    expect(edgeDisplayText("", "approved")).toBe("approved");
    expect(edgeDisplayText("Yes", "in stock")).toBe("Yes: in stock");
  });
});

describe("serverNodeToRf", () => {
  it("maps a server node to a React Flow node keyed by client key", () => {
    const rf = serverNodeToRf(
      {
        id: "GRPH-0001-N01",
        key: "n-start",
        graph_id: "GRPH-0001",
        node_type: "api_call",
        title: "Create order",
        description: "POST /api/orders",
        inputs: ["cart"],
        outputs: ["order_id"],
        preconditions: ["cart non-empty"],
        postconditions: ["order created"],
        related_artifacts: ["REQ-0002"],
        metadata: null,
        position: { x: 10, y: 20 },
        created_at: "",
        updated_at: "",
      },
      catalog,
    );
    expect(rf.id).toBe("n-start");
    expect(rf.type).toBe("model");
    expect(rf.position).toEqual({ x: 10, y: 20 });
    expect(rf.data.title).toBe("Create order");
    expect(rf.data.type).toBe("api_call");
    expect(rf.data.serverId).toBe("GRPH-0001-N01");
    expect(rf.data.meta.color).toBe("#3b82f6");
    expect(rf.data.relatedArtifacts).toEqual(["REQ-0002"]);
  });
});

describe("serverEdgeToRf", () => {
  it("maps canonical endpoints back to client keys and builds display text", () => {
    const rf = serverEdgeToRf(
      {
        id: "GRPH-0001-E02",
        graph_id: "GRPH-0001",
        source: "GRPH-0001-N01",
        target: "GRPH-0001-N02",
        label: "Yes",
        condition: "in stock",
        type: "success",
      },
      new Map([
        ["GRPH-0001-N01", "n-a"],
        ["GRPH-0001-N02", "n-b"],
      ]),
    );
    expect(rf.id).toBe("GRPH-0001-E02");
    expect(rf.source).toBe("n-a");
    expect(rf.target).toBe("n-b");
    expect(rf.label).toBe("Yes: in stock");
    expect(rf.data).toEqual({ label: "Yes", condition: "in stock", edgeType: "success" });
  });
});
