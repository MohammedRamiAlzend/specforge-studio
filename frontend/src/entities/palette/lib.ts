import type { ModelNodeType } from "../model-graph/types";
import type { NodePalette } from "./types";

function toModelNodeType(type: NodePalette["categories"][number]["nodeTypes"][number]): ModelNodeType {
  return {
    type: type.key,
    label: type.label,
    category: type.category_key,
    description: type.description,
    color: type.color,
    kinds: type.kinds,
    defaultTitle: type.default_title,
    fields: type.fields,
  };
}

/** All node types (enabled and disabled) flattened to catalog shape. */
export function allNodeTypes(palette?: NodePalette): ModelNodeType[] {
  if (!palette) return [];
  return palette.categories.flatMap((category) =>
    category.nodeTypes.map((t) => toModelNodeType(t)),
  );
}

/** Enabled node types only — the nodes users can actually add. */
export function enabledNodeTypes(palette?: NodePalette): ModelNodeType[] {
  if (!palette) return [];
  return palette.categories.flatMap((category) =>
    category.nodeTypes.filter((t) => t.enabled).map((t) => toModelNodeType(t)),
  );
}