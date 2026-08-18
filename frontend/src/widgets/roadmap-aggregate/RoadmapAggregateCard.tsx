import { Link } from "react-router-dom";
import { useRoadmapAggregate, linkKindLabel } from "../../entities/roadmap-aggregate/api";
import type { RoadmapAggregateProject } from "../../entities/roadmap-aggregate/types";
import { Card, CardHeader } from "../../shared/ui/Card";
import { Spinner } from "../../shared/ui/Spinner";
import { StatusBadge } from "../../shared/ui/Badge";

function barColor(value: number): string {
  if (value >= 80) return "bg-emerald-500";
  if (value >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

function ProjectRow({ project, rootId }: { project: RoadmapAggregateProject; rootId: string }) {
  const isRoot = project.project_id === rootId;
  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {isRoot ? (
            <span className="font-mono text-[10px] text-slate-400">{project.project_id}</span>
          ) : (
            <Link
              to={`/projects/${project.project_id}/roadmap`}
              className="font-mono text-[10px] text-forge-600 underline-offset-2 hover:underline"
            >
              {project.project_id}
            </Link>
          )}
          <Link
            to={`/projects/${project.project_id}`}
            className="truncate text-sm font-medium text-slate-900 hover:text-forge-700"
          >
            {project.project_name}
          </Link>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {linkKindLabel(project.link_kind)}
          </span>
          {project.roadmap_id ? (
            <Link to={`/projects/${project.project_id}/roadmap`}>
              <StatusBadge status={project.roadmap_status ?? "draft"} />
            </Link>
          ) : (
            <span className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[10px] text-slate-400">
              no roadmap
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor(project.completion)}`}
              style={{ width: `${Math.min(100, Math.max(0, project.completion))}%` }}
            />
          </div>
          <span className="w-20 shrink-0 text-right font-mono text-[11px] text-slate-500">
            {project.tasks_done}/{project.tasks_total} done
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5 sm:justify-end">
        <Stat label="phases" value={project.phases} />
        <Stat label="milestones" value={project.milestones} />
        <Stat label="packaged" value={project.tasks_packaged} />
        <Stat label="completion" value={`${project.completion}%`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
      {value} <span className="text-slate-400">{label}</span>
    </span>
  );
}

export function RoadmapAggregateCard({ projectId }: { projectId: string }) {
  const { data, isLoading, error } = useRoadmapAggregate(projectId);

  return (
    <Card>
      <CardHeader
        title="Workspace roadmap"
        description="Roadmap surface across this project and every linked project — phases, milestones, packaged task packs, and execution progress."
      />
      <div className="divide-y divide-slate-100 px-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner />
          </div>
        ) : error ? (
          <p className="py-6 text-center text-xs text-rose-600">{error.message}</p>
        ) : !data ? (
          <p className="py-6 text-center text-xs text-slate-500">No data yet.</p>
        ) : (
          <>
            {data.projects.map((project) => (
              <ProjectRow key={project.project_id} project={project} rootId={data.root_project_id} />
            ))}
            <div className="flex flex-wrap items-center gap-2 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workspace totals</span>
              <Stat label="projects" value={data.totals.projects} />
              <Stat label="roadmaps" value={data.totals.roadmaps} />
              <Stat label="tasks" value={data.totals.tasks_total} />
              <Stat label="done" value={data.totals.tasks_done} />
              <Stat label="completion" value={`${data.totals.completion}%`} />
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
