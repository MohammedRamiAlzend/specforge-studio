import type { DashboardSummary } from "../../entities/dashboard/types";

interface Kpi {
  label: string;
  value: number;
  tone: "neutral" | "warn" | "alert";
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const toneClass =
    kpi.tone === "alert"
      ? "bg-rose-50 text-rose-700"
      : kpi.tone === "warn"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-50 text-slate-700";
  return (
    <div className={`rounded-lg px-4 py-3 ${toneClass}`}>
      <p className="text-2xl font-semibold tabular-nums">{kpi.value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide opacity-80">{kpi.label}</p>
    </div>
  );
}

/** Five at-a-glance counters backing the redesigned dashboard (DEC-030). */
export function KpiRow({ summary }: { summary: DashboardSummary | undefined }) {
  if (!summary) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[68px] animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }
  const kpis: Kpi[] = [
    { label: "Active projects", value: summary.projects.by_status.active ?? 0, tone: "neutral" },
    { label: "Open tasks", value: summary.tasks.open + summary.tasks.in_progress, tone: "neutral" },
    { label: "Blocked tasks", value: summary.tasks.blocked, tone: summary.tasks.blocked > 0 ? "warn" : "neutral" },
    { label: "Critical issues", value: summary.issues.critical_open, tone: summary.issues.critical_open > 0 ? "alert" : "neutral" },
    { label: "Pending approvals", value: summary.pending_approvals_count, tone: summary.pending_approvals_count > 0 ? "warn" : "neutral" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} kpi={kpi} />
      ))}
    </div>
  );
}
