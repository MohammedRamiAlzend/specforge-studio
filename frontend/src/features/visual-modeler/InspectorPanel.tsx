import type { ReactNode } from "react";
import { Button } from "../../shared/ui/Button";
import type { ModelKind, ModelNodeType } from "../../entities/model-graph/types";
import {
  EDGE_TYPES,
  metaForType,
  type ModelerEdge,
  type ModelerEdgeData,
  type ModelerNode,
} from "./types";

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function LinesTextarea({
  value,
  placeholder,
  onChange,
}: {
  value: string[];
  placeholder?: string;
  onChange: (lines: string[]) => void;
}) {
  return (
    <textarea
      className={`${inputClass} min-h-[64px] resize-y leading-relaxed`}
      value={value.join("\n")}
      placeholder={placeholder ?? "One item per line"}
      onChange={(e) => onChange(e.target.value.split("\n"))}
    />
  );
}

export interface InspectorPanelProps {
  node: ModelerNode | null;
  edge: ModelerEdge | null;
  kind: ModelKind | null;
  catalog: ModelNodeType[];
  onUpdateNode: (key: string, patch: Partial<ModelerNode["data"]>) => void;
  onUpdateEdge: (id: string, patch: Partial<ModelerEdgeData>) => void;
  onDeleteNode: (key: string) => void;
  onDeleteEdge: (id: string) => void;
}

export function InspectorPanel({
  node,
  edge,
  kind,
  catalog,
  onUpdateNode,
  onUpdateEdge,
  onDeleteNode,
  onDeleteEdge,
}: InspectorPanelProps) {
  if (!node && !edge) {
    return (
      <div className="flex h-full flex-col px-4 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Inspector
        </p>
        <div className="mt-6 text-center">
          <p className="text-xs font-medium text-slate-500">Nothing selected</p>
          <p className="mx-auto mt-1 max-w-[180px] text-[11px] leading-relaxed text-slate-400">
            Select a node or an edge on the canvas to edit its properties.
          </p>
        </div>
      </div>
    );
  }

  if (edge) {
    const data = edge.data ?? { label: "", condition: "", edgeType: "next" };
    return (
      <div className="flex h-full flex-col gap-4 overflow-y-auto px-4 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Inspector · Edge
          </p>
          <p className="mt-1 font-mono text-[10px] text-slate-400">{edge.id}</p>
        </div>

        <Field label="Label">
          <input
            className={inputClass}
            value={data.label}
            placeholder="e.g. Yes / Approved"
            onChange={(e) => onUpdateEdge(edge.id, { label: e.target.value })}
          />
        </Field>

        <Field label="Condition">
          <input
            className={inputClass}
            value={data.condition}
            placeholder="e.g. amount > 1000"
            onChange={(e) => onUpdateEdge(edge.id, { condition: e.target.value })}
          />
        </Field>

        <Field label="Edge type">
          <select
            className={inputClass}
            value={data.edgeType}
            onChange={(e) => onUpdateEdge(edge.id, { edgeType: e.target.value })}
          >
            {EDGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>

        <p className="text-[11px] leading-relaxed text-slate-400">
          Decision branches should carry a condition (TR-04).
        </p>

        <Button variant="danger" size="sm" onClick={() => onDeleteEdge(edge.id)}>
          Delete edge
        </Button>
      </div>
    );
  }

  if (node) {
    const data = node.data;
    const typeOptions = catalog.filter((t) => (kind ? t.kinds.includes(kind) : true));
    return (
      <div className="flex h-full flex-col gap-4 overflow-y-auto px-4 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Inspector · Node
          </p>
          <p className="mt-1 font-mono text-[10px] text-slate-400">
            {data.serverId ?? node.id}
            {data.serverId ? " (saved)" : " (unsaved)"}
          </p>
        </div>

        <Field label="Type">
          <select
            className={inputClass}
            value={data.type}
            onChange={(e) => {
              const next = e.target.value;
              onUpdateNode(node.id, { type: next, meta: metaForType(next, catalog) });
            }}
          >
            {typeOptions.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Title">
          <input
            className={inputClass}
            value={data.title}
            onChange={(e) => onUpdateNode(node.id, { title: e.target.value })}
          />
        </Field>

        <Field label="Description">
          <textarea
            className={`${inputClass} min-h-[64px] resize-y leading-relaxed`}
            value={data.description}
            placeholder="What happens in this node?"
            onChange={(e) => onUpdateNode(node.id, { description: e.target.value })}
          />
        </Field>

        <Field label="Inputs">
          <LinesTextarea
            value={data.inputs}
            onChange={(lines) => onUpdateNode(node.id, { inputs: lines })}
            placeholder="One input per line"
          />
        </Field>

        <Field label="Outputs">
          <LinesTextarea
            value={data.outputs}
            onChange={(lines) => onUpdateNode(node.id, { outputs: lines })}
            placeholder="One output per line"
          />
        </Field>

        <Field label="Preconditions">
          <LinesTextarea
            value={data.preconditions}
            onChange={(lines) => onUpdateNode(node.id, { preconditions: lines })}
            placeholder="Must be true before this node runs"
          />
        </Field>

        <Field label="Postconditions">
          <LinesTextarea
            value={data.postconditions}
            onChange={(lines) => onUpdateNode(node.id, { postconditions: lines })}
            placeholder="Guaranteed after this node completes"
          />
        </Field>

        <Field label="Related artifacts">
          <LinesTextarea
            value={data.relatedArtifacts}
            onChange={(lines) => onUpdateNode(node.id, { relatedArtifacts: lines })}
            placeholder="Canonical IDs, e.g. REQ-0001"
          />
        </Field>

        <Button variant="danger" size="sm" onClick={() => onDeleteNode(node.id)}>
          Delete node
        </Button>
      </div>
    );
  }

  return null;
}
