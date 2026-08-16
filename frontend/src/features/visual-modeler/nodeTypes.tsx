import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ModelerNode } from "./types";

/**
 * Single custom node component for every catalog type. The type's visual
 * identity (color, label) comes from the node's `data.meta`, which is resolved
 * from the backend catalog when nodes are created or loaded.
 *
 * Semantics-aware handles:
 *  - start: source only (no incoming edges allowed)
 *  - end:   target only (no outgoing edges allowed)
 *  - all others: source + target
 */
export function ModelNodeComponent({ data, selected }: NodeProps<ModelerNode>) {
  const isStart = data.type === "start";
  const isEnd = data.type === "end";
  const meta = data.meta;

  const badge = (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
      style={{ backgroundColor: meta.color }}
    >
      {meta.label}
    </span>
  );

  const body = data.description ? (
    <p className="line-clamp-3 px-3 pb-2.5 text-[11px] leading-relaxed text-slate-500">
      {data.description}
    </p>
  ) : null;

  return (
    <div
      className={`rounded-lg border bg-white shadow-card transition-shadow ${
        selected ? "ring-2 ring-forge-500 border-forge-400" : "border-slate-200 hover:shadow-md"
      }`}
      style={{ width: 224 }}
    >
      {!isStart ? <Handle type="target" position={Position.Left} /> : null}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="truncate text-xs font-semibold text-slate-800" title={data.title}>
          {data.title}
        </span>
        {badge}
      </div>
      {body}
      {!isEnd ? <Handle type="source" position={Position.Right} /> : null}
    </div>
  );
}

export const modelerNodeTypes = { model: ModelNodeComponent };
