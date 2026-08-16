import { Button } from "../../shared/ui/Button";
import { Spinner } from "../../shared/ui/Spinner";
import type { DiagramWarning } from "../../entities/diagram/types";
import { MermaidBlock } from "./MermaidBlock";

export interface DiagramPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  mermaid: string | null;
  warnings: DiagramWarning[];
  loading: boolean;
  error: string | null;
}

export function DiagramPreviewDialog({
  open,
  onClose,
  title,
  mermaid,
  warnings,
  loading,
  error,
}: DiagramPreviewDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Generated automatically from the model — no Mermaid required.
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="h-6 w-6 text-slate-400" />
            </div>
          ) : error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          ) : mermaid !== null ? (
            <MermaidBlock mermaid={mermaid} warnings={warnings} maxHeight="55vh" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
