import { Link } from "react-router-dom";
import { Button } from "../../shared/ui/Button";
import type { ModelKind } from "../../entities/model-graph/types";

const KIND_LABELS: Record<ModelKind, string> = {
  workflow: "Workflow",
  data: "Data model",
  architecture: "Architecture",
  sequence: "Sequence",
};

export interface ModelerToolbarProps {
  projectId: string;
  graphName: string;
  kind: ModelKind | null;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReload: () => void;
  onPreview?: () => void;
  previewing?: boolean;
}

export function ModelerToolbar({
  projectId,
  graphName,
  kind,
  dirty,
  saving,
  onSave,
  onReload,
  onPreview,
  previewing = false,
}: ModelerToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          to={`/projects/${projectId}/modeler`}
          className="shrink-0 text-xs font-medium text-slate-500 transition-colors hover:text-forge-700"
        >
          ← Models
        </Link>
        <span className="h-4 w-px bg-slate-200" />
        <h2 className="truncate text-sm font-semibold text-slate-900">{graphName}</h2>
        {kind ? (
          <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {KIND_LABELS[kind]}
          </span>
        ) : null}
        {dirty ? (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            Unsaved changes
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onReload}>
          Discard
        </Button>
        {onPreview ? (
          <Button size="sm" variant="secondary" loading={previewing} onClick={onPreview}>
            Preview diagram
          </Button>
        ) : null}
        <Button size="sm" variant="secondary" loading={saving} onClick={() => void onSave()}>
          Save graph
        </Button>
      </div>
    </div>
  );
}
