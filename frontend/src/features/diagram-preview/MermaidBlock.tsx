import { useState } from "react";
import { Button } from "../../shared/ui/Button";
import type { DiagramWarning } from "../../entities/diagram/types";

const LEVEL_STYLES: Record<DiagramWarning["level"], string> = {
  error: "bg-rose-100 text-rose-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-slate-100 text-slate-600",
};

export interface MermaidBlockProps {
  mermaid: string;
  warnings: DiagramWarning[];
  maxHeight?: string;
}

/** Renders generated Mermaid source (never hand-written by users). */
export function MermaidBlock({ mermaid, warnings, maxHeight = "60vh" }: MermaidBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(mermaid);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-3">
      {warnings.length > 0 ? (
        <ul className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          {warnings.map((warning, index) => (
            <li key={`${warning.code}-${index}`} className="flex items-start gap-2">
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-px text-[10px] font-semibold uppercase ${LEVEL_STYLES[warning.level]}`}
              >
                {warning.level}
              </span>
              <span className="text-[11px] leading-relaxed text-slate-700">{warning.message}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative overflow-hidden rounded-lg border border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Mermaid
          </span>
          <Button size="sm" variant="ghost" className="text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => void copy()}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <pre
          className="overflow-auto bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200"
          style={{ maxHeight }}
        >
          {mermaid}
        </pre>
      </div>
    </div>
  );
}
