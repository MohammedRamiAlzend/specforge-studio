import type { ReactNode } from "react";
import { useProjectHealth } from "../../entities/health/api";
import type { ProjectHealth } from "../../entities/health/types";
import { Card } from "../../shared/ui/Card";

function ProgressBar({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-slate-700">{label}</span>
        <span className="font-mono text-[11px] text-slate-500">{detail}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            value >= 80 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-rose-500"
          }`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

function MetricCard({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-forge-50 text-xs text-forge-700">
          {icon}
        </span>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </Card>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
      {value} {label}
    </span>
  );
}

/** Compact single-row health strip for project cards on the dashboard. */
export function HealthMiniCard({ projectId, health: healthProp }: { projectId: string; health?: ProjectHealth }) {
  const { data: fetchedHealth, isLoading } = useProjectHealth(healthProp ? undefined : projectId);
  const health = healthProp ?? fetchedHealth;
  if (isLoading || !health) {
    return <div className="h-14 animate-pulse rounded-md bg-slate-100" />;
  }
  const bars = [
    { label: "Reqs", value: health.requirements.completion },
    { label: "Tasks", value: health.tasks.completion },
    { label: "Approvals", value: health.approvals.coverage },
    { label: "Trace", value: health.traceability.coverage },
  ];
  return (
    <div className="mt-3 grid grid-cols-4 gap-3">
      {bars.map((bar) => (
        <div key={bar.label}>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-[10px] font-medium text-slate-500">{bar.label}</span>
            <span className="font-mono text-[10px] text-slate-600">{bar.value}%</span>
          </div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${bar.value >= 80 ? "bg-emerald-500" : bar.value >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
              style={{ width: `${Math.min(100, Math.max(0, bar.value))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HealthCards({ projectId }: { projectId: string }) {
  const { data: health, isLoading, error } = useProjectHealth(projectId);

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !health) {
    return (
      <Card className="p-5 text-sm text-slate-500">
        Project health is unavailable right now.{" "}
        <span className="text-xs text-slate-400">{error?.message}</span>
      </Card>
    );
  }

  const healthCards = buildHealthCards(health);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {healthCards.map((card) => (
        <MetricCard key={card.title} title={card.title} icon={card.icon}>
          {card.bars.map((bar) => (
            <ProgressBar key={bar.label} label={bar.label} value={bar.value} detail={bar.detail} />
          ))}
          {card.chips ? (
            <div className="flex flex-wrap gap-1.5">{card.chips.map((chip) => <StatChip key={chip.label} {...chip} />)}</div>
          ) : null}
        </MetricCard>
      ))}
    </div>
  );
}

interface HealthCardSpec {
  title: string;
  icon: string;
  bars: { label: string; value: number; detail: string }[];
  chips?: { label: string; value: number }[];
}

export function buildHealthCards(health: ProjectHealth): HealthCardSpec[] {
  return [
    {
      title: "Definition",
      icon: "📋",
      bars: [
        {
          label: "Requirements approved",
          value: health.requirements.completion,
          detail: `${health.requirements.approved}/${health.requirements.total}`,
        },
        {
          label: "Traceability coverage",
          value: health.traceability.coverage,
          detail: `${health.traceability.covered}/${health.traceability.total_requirements}`,
        },
      ],
      chips: [
        { label: "validation errors", value: health.validation.errors },
        { label: "warnings", value: health.validation.warnings },
      ],
    },
    {
      title: "Execution",
      icon: "⚙️",
      bars: [
        { label: "Tasks complete", value: health.tasks.completion, detail: `${health.tasks.done}/${health.tasks.total}` },
        {
          label: "Milestones reached",
          value: health.milestones.completion,
          detail: `${health.milestones.reached}/${health.milestones.total}`,
        },
      ],
      chips: [
        { label: "in progress", value: health.tasks.in_progress },
        { label: "blocked", value: health.tasks.blocked },
        { label: "open", value: health.tasks.open },
      ],
    },
    {
      title: "Delivery",
      icon: "🚀",
      bars: [
        {
          label: "Approval coverage",
          value: health.approvals.coverage,
          detail: `${health.approvals.approved}/${health.approvals.total}`,
        },
      ],
      chips: [
        { label: "pending approvals", value: health.approvals.pending },
        { label: "open issues", value: health.issues.open },
        { label: "releases", value: health.releases.released },
      ],
    },
  ];
}
