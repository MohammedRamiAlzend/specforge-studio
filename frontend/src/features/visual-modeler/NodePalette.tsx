import type { DragEvent } from "react";
import type { ModelKind, ModelNodeType } from "../../entities/model-graph/types";
import type { NodeCategory } from "../../entities/palette/types";

const DND_TYPE = "application/specforge-node-type";

export interface NodePaletteProps {
  kind: ModelKind | null;
  categories: NodeCategory[];
  catalog: ModelNodeType[];
  onAdd: (type: ModelNodeType) => void;
}

export function NodePalette({ kind, categories, catalog, onAdd }: NodePaletteProps) {
  const available = catalog.filter((t) => (kind ? t.kinds.includes(kind) : true));
  const grouped = categories
    .map((category) => ({
      category,
      types: available.filter((t) => t.category === category.key),
    }))
    .filter((g) => g.types.length > 0);

  const handleDragStart = (event: DragEvent, type: string) => {
    event.dataTransfer.setData(DND_TYPE, type);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="flex h-full flex-col">
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Node palette
      </p>
      <div className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {grouped.map((group) => (
          <div key={group.category.id}>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: group.category.color }}
              />
              {group.category.label}
            </p>
            <div className="space-y-1.5">
              {group.types.map((type) => (
                <button
                  key={type.type}
                  type="button"
                  draggable
                  onDragStart={(e) => handleDragStart(e, type.type)}
                  onClick={() => onAdd(type)}
                  title={`${type.description}\nDrag onto the canvas or click to add.`}
                  className="flex w-full items-start gap-2.5 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <span
                    className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-slate-800">
                      {type.label}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                      {type.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}