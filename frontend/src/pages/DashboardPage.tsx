import { useState } from "react";
import { Link } from "react-router-dom";
import { useMe } from "../entities/user/api";
import { useProjects } from "../entities/project/api";
import { useDashboardSummary, useDashboardHealth } from "../entities/dashboard/api";
import type { Project } from "../entities/project/types";
import { CreateProjectForm } from "../features/create-project/CreateProjectForm";
import { PlanStrip } from "../features/dashboard/PlanStrip";
import { KpiRow } from "../features/dashboard/KpiRow";
import { AttentionPanel, UpcomingMilestones } from "../features/dashboard/AttentionPanel";
import { StatusBadge } from "../shared/ui/Badge";
import { Button } from "../shared/ui/Button";
import { Card, CardHeader } from "../shared/ui/Card";
import { PageHeader } from "../shared/ui/PageHeader";
import { EmptyState, ErrorState } from "../shared/ui/States";
import { formatRelative } from "../shared/lib/format";
import { PlatformBadges } from "../widgets/platform-badges/PlatformBadges";
import { HealthMiniCard } from "../widgets/health/HealthCards";
import { ActivityFeed } from "../widgets/activity/ActivityFeed";

const STATUS_FILTERS = ["all", "active", "draft", "completed", "archived"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];
type SortMode = "updated" | "created" | "name";

function filterAndSort(projects: Project[], filter: StatusFilter, sort: SortMode): Project[] {
  const filtered = filter === "all" ? projects : projects.filter((p) => p.status === filter);
  const sorted = [...filtered];
  if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "created") sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
  else sorted.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
  return sorted;
}

export function DashboardPage() {
  const { data: me } = useMe();
  const { data: summary } = useDashboardSummary();
  const { data: healthMap } = useDashboardHealth();
  const { data: projects, isLoading, error } = useProjects();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortMode>("updated");

  if (error) return <ErrorState message={error.message} />;

  const firstName = me?.name?.trim().split(/\s+/)[0];
  const visibleProjects = projects ? filterAndSort(projects, filter, sort) : [];
  const availableFilters = STATUS_FILTERS.filter(
    (status) => status === "all" || (projects ?? []).some((p) => p.status === status),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        description="Your portfolio at a glance — plan, model, and generate engineering artifacts."
        actions={
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "New project"}
          </Button>
        }
      />

      {showForm ? (
        <Card>
          <CardHeader title="Create a project" description="Starts a new SpecForge workspace." />
          <div className="px-5 py-4">
            <CreateProjectForm defaultCreator={me?.id ?? "owner@internal"} onCreated={() => setShowForm(false)} />
          </div>
        </Card>
      ) : null}

      {summary ? <PlanStrip summary={summary} /> : null}

      <KpiRow summary={summary} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Projects</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
              {availableFilters.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilter(status)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                    filter === status ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-600 focus:border-forge-400 focus:outline-none"
              aria-label="Sort projects"
            >
              <option value="updated">Recently updated</option>
              <option value="created">Newest first</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>

        {isLoading || !projects ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="h-40 animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            hint="Create your first project to open a workspace where you can define requirements, model workflows and data, and generate documentation and task packs."
            actionLabel="Create a project"
            onAction={() => setShowForm(true)}
          />
        ) : visibleProjects.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
            No projects match this filter.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProjects.map((project, i) => (
              <Link key={project.id} to={`/projects/${project.id}`} className="sf-rise group" style={{ animationDelay: `${i * 40}ms` }}>
                <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:border-slate-300">
                  <CardHeader
                    title={project.name}
                    description={project.types && project.types.length > 0 ? undefined : `${project.type.toUpperCase()} project`}
                    actions={<StatusBadge status={project.status} />}
                  />
                  <div className="px-5 py-4 text-xs text-slate-500">
                    {project.types && project.types.length > 0 ? <PlatformBadges types={project.types} /> : null}
                    <p className={`line-clamp-2 text-sm text-slate-600 ${project.types && project.types.length > 0 ? "mt-2" : ""}`}>
                      {project.description ?? "No description yet."}
                    </p>
                    <HealthMiniCard projectId={project.id} health={healthMap?.[project.id]} />
                    <p className="mt-3 flex items-baseline justify-between gap-2">
                      <span>Updated {formatRelative(project.updated_at)}</span>
                      <span className="font-mono text-[10px] text-slate-300">{project.id}</span>
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AttentionPanel summary={summary} />
        </div>
        <UpcomingMilestones summary={summary} />
      </div>

      <ActivityFeed title="Recent activity" limit={18} />
    </div>
  );
}
