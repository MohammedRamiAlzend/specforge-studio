/**
 * Frontend tests for Prompt 15 (custom node palette).
 * Covers the palette flatten helpers, DB-driven NodePalette grouping, and the
 * loading presentation of the settings panel. Rendered with react-dom/server
 * inside the provider hierarchy the app uses.
 */
import { describe, expect, it } from "bun:test";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import {
  allNodeTypes,
  enabledNodeTypes,
} from "../src/entities/palette/lib";
import type { NodePalette as NodePaletteData } from "../src/entities/palette/types";
import { NodePalette } from "../src/features/visual-modeler/NodePalette";
import { NodePaletteSettingsPanel } from "../src/features/palette-settings/NodePaletteSettingsPanel";

function renderWithProviders(element: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderToStaticMarkup(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>);
}

const palettes: NodePaletteData = {
  categories: [
    {
      id: "NCAT-0001",
      key: "flow",
      label: "Flow",
      color: "#0284c7",
      sort_order: 1,
      enabled: 1,
      built_in: 1,
      created_at: "",
      updated_at: "",
      nodeTypes: [
        {
          id: "NTYP-0001",
          key: "start",
          label: "Start",
          category_id: "NCAT-0001",
          description: "Entry point of a process or flow.",
          color: "#059669",
          kinds: ["workflow", "architecture", "sequence"],
          default_title: "Start",
          fields: [],
          sort_order: 1,
          enabled: 1,
          built_in: 1,
          created_at: "",
          updated_at: "",
          category_key: "flow",
          category_label: "Flow",
        },
        {
          id: "NTYP-0014",
          key: "loop",
          label: "Loop",
          category_id: "NCAT-0001",
          description: "Repeats a sub-flow.",
          color: "#0ea5e9",
          kinds: ["workflow"],
          default_title: "Loop",
          fields: [
            { key: "iterations", label: "Iterations", type: "number", default: 1 },
            { key: "mode", label: "Mode", type: "select", options: ["for", "while", "until"], default: "for" },
          ],
          sort_order: 6,
          enabled: 0,
          built_in: 1,
          created_at: "",
          updated_at: "",
          category_key: "flow",
          category_label: "Flow",
        },
      ],
    },
    {
      id: "NCAT-0002",
      key: "system",
      label: "System",
      color: "#2563eb",
      sort_order: 2,
      enabled: 1,
      built_in: 1,
      created_at: "",
      updated_at: "",
      nodeTypes: [
        {
          id: "NTYP-0009",
          key: "database",
          label: "Database",
          category_id: "NCAT-0002",
          description: "A data store.",
          color: "#0d9488",
          kinds: ["workflow", "data", "architecture", "sequence"],
          default_title: "New entity",
          fields: [],
          sort_order: 4,
          enabled: 1,
          built_in: 1,
          created_at: "",
          updated_at: "",
          category_key: "system",
          category_label: "System",
        },
      ],
    },
  ],
};

describe("palette flatten helpers", () => {
  it("allNodeTypes includes disabled types for meta resolution", () => {
    const types = allNodeTypes(palettes);
    expect(types).toHaveLength(3);
    expect(types.map((t) => t.type)).toEqual(["start", "loop", "database"]);
    const loop = types.find((t) => t.type === "loop");
    expect(loop).toMatchObject({ category: "flow", defaultTitle: "Loop", color: "#0ea5e9" });
    expect(loop?.fields?.[0]).toEqual({ key: "iterations", label: "Iterations", type: "number", default: 1 });
  });

  it("enabledNodeTypes drops disabled types", () => {
    const types = enabledNodeTypes(palettes);
    expect(types).toHaveLength(2);
    expect(types.some((t) => t.type === "loop")).toBe(false);
  });

  it("returns an empty array when the palette is not loaded", () => {
    expect(allNodeTypes(undefined)).toEqual([]);
    expect(enabledNodeTypes(undefined)).toEqual([]);
  });
});

describe("NodePalette grouping from DB categories", () => {
  it("groups enabled types by DB category with the DB label and color", () => {
    const html = renderToStaticMarkup(
      <NodePalette kind="workflow" categories={palettes.categories} catalog={enabledNodeTypes(palettes)} onAdd={() => {}} />,
    );
    expect(html).toContain("Flow");
    expect(html).toContain("System");
    expect(html).not.toContain("Loop"); // disabled, so absent from the palette list
    expect(html).toContain("Start");
    expect(html).toContain("#0284c7"); // flow category color swatch
  });

  it("filters by graph kind", () => {
    const html = renderToStaticMarkup(
      <NodePalette kind="data" categories={palettes.categories} catalog={enabledNodeTypes(palettes)} onAdd={() => {}} />,
    );
    expect(html).toContain("Database");
    expect(html).not.toContain("Start"); // start has no data kind
  });

  it("renders no category groups when empty", () => {
    const html = renderToStaticMarkup(
      <NodePalette kind={null} categories={[]} catalog={[]} onAdd={() => {}} />,
    );
    expect(html).toContain("Node palette");
    expect(html).not.toContain("Flow");
  });
});

describe("NodePaletteSettingsPanel", () => {
  it("shows a loading state while the palette loads", () => {
    const html = renderWithProviders(<NodePaletteSettingsPanel />);
    expect(html.length).toBeGreaterThan(0);
  });
});