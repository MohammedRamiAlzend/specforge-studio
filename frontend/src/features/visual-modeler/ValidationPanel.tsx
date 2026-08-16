import { Button } from "../../shared/ui/Button";
import type { ValidationWarning } from "../../entities/model-graph/types";

const LEVEL_STYLES: Record<ValidationWarning["level"], { chip: string; text: string }> = {
  error: { chip: "bg-rose-100 text-rose-700", text: "text-rose-700" },
  warning: { chip: "bg-amber-100 text-amber-700", text: "text-amber-700" },
  info: { chip: "bg-slate-100 text-slate-600", text: "text-slate-600" },
};

export interface ValidationPanelProps {
  warnings: ValidationWarning[];
  onValidate: () => void;
  validating: boolean;
}

export function ValidationPanel({ warnings, onValidate, validating }: ValidationPanelProps) {
  const errors = warnings.filter((w) => w.level === "error").length;
  const warns = warnings.filter((w) => w.level === "warning").length;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Validation
        </p>
        <div className="flex items-center gap-2">
          {warnings.length > 0 ? (
            <span className="text-[11px] text-slate-500">
              {errors > 0 ? <span className="font-semibold text-rose-600">{errors} error{errors === 1 ? "" : "s"}</span> : null}
              {errors > 0 && warns > 0 ? " · " : null}
              {warns > 0 ? <span className="font-semibold text-amber-600">{warns} warning{warns === 1 ? "" : "s"}</span> : null}
            </span>
          ) : null}
          <Button size="sm" variant="secondary" loading={validating} onClick={() => void onValidate()}>
            Validate
          </Button>
        </div>
      </div>
      <div className="max-h-44 overflow-y-auto px-4 py-2">
        {warnings.length === 0 ? (
          <p className="py-2 text-xs text-slate-400">
            No issues — run Validate after editing to check the graph.
          </p>
        ) : (
          <ul className="space-y-1.5 py-1">
            {warnings.map((warning, index) => {
              const style = LEVEL_STYLES[warning.level];
              return (
                <li key={`${warning.code}-${index}`} className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-px text-[10px] font-semibold uppercase ${style.chip}`}
                  >
                    {warning.level}
                  </span>
                  <p className={`text-[11px] leading-relaxed ${style.text}`}>{warning.message}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
