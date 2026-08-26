import { Link } from "react-router-dom";
import type { ReactNode } from "react";

type ScenarioTone = "info" | "success" | "warning" | "danger";

const TONE_STYLES: Record<ScenarioTone, { shell: string; icon: string; title: string; body: string; action: string }> = {
  info: { shell: "border-sky-200 bg-sky-50", icon: "bg-sky-100 text-sky-700", title: "text-sky-950", body: "text-sky-800", action: "border-sky-300 bg-white text-sky-800 hover:bg-sky-100" },
  success: { shell: "border-emerald-200 bg-emerald-50", icon: "bg-emerald-100 text-emerald-700", title: "text-emerald-950", body: "text-emerald-800", action: "border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100" },
  warning: { shell: "border-amber-200 bg-amber-50", icon: "bg-amber-100 text-amber-700", title: "text-amber-950", body: "text-amber-800", action: "border-amber-300 bg-white text-amber-900 hover:bg-amber-100" },
  danger: { shell: "border-rose-200 bg-rose-50", icon: "bg-rose-100 text-rose-700", title: "text-rose-950", body: "text-rose-800", action: "border-rose-300 bg-white text-rose-800 hover:bg-rose-100" },
};

export function ScenarioBanner({
  tone,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  secondaryLabel,
  secondaryTo,
  children,
}: {
  tone: ScenarioTone;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  secondaryTo?: string;
  children?: ReactNode;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <section className={`rounded-2xl border px-4 py-4 ${styles.shell}`} role={tone === "danger" || tone === "warning" ? "alert" : "status"}>
      <div className="flex items-start gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${styles.icon}`} aria-hidden="true">
          {tone === "success" ? "✓" : tone === "danger" ? "!" : tone === "warning" ? "!" : "i"}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={`text-sm font-semibold ${styles.title}`}>{title}</h3>
          <p className={`mt-1 text-xs leading-relaxed ${styles.body}`}>{description}</p>
          {children}
          {actionLabel || secondaryLabel ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {actionLabel && actionTo ? <Link to={actionTo} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${styles.action}`}>{actionLabel}</Link> : null}
              {actionLabel && onAction ? <button type="button" onClick={onAction} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${styles.action}`}>{actionLabel}</button> : null}
              {secondaryLabel && secondaryTo ? <Link to={secondaryTo} className={`px-1 py-1.5 text-xs font-medium transition-colors ${styles.body}`}>{secondaryLabel} <span aria-hidden="true">→</span></Link> : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
