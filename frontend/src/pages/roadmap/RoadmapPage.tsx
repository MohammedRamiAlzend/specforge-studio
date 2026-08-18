import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useDeleteRoadmap,
  useGenerateRoadmap,
  useRoadmap,
  useRoadmaps,
} from "../../entities/roadmap/api";
import type { RoadmapDetail, RoadmapTask } from "../../entities/roadmap/types";
import { useGenerateTaskPack } from "../../entities/agent-task/api";
import { Button } from "../../shared/ui/Button";
import { Card, CardHeader } from "../../shared/ui/Card";
import { PageHeader } from "../../shared/ui/PageHeader";
import { EmptyState, ErrorState } from "../../shared/ui/States";
import { Spinner } from "../../shared/ui/Spinner";
import { formatDate } from "../../shared/lib/format";
import { RoadmapAggregateCard } from "../../widgets/roadmap-aggregate/RoadmapAggregateCard";

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500";

function PriorityBadge({ priority }: { priority: string }) {
  const classes: Record<string, string> = {
    high: "border-rose-200 bg-rose-50 text-rose-700",
    medium: "border-amber-200 bg-amber-50 text-amber-700",
    low: "border-slate-200 bg-slate-50 text-slate-500",
  };
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${classes[priority] ?? classes.low}`}>
      {priority}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      {type}
    </span>
  );
}

function ApprovalBadge({ required }: { required: boolean }) {
  if (!required) return null;
  return (
    <span className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
      approval gate
    </span>
  );
}

function TaskRow({ task, projectId }: { task: RoadmapTask; projectId: string }) {
  return (
    <div className="rounded-md border border-slate-100 bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] text-slate-400">{task.id}</span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-800">{task.title}</span>
        <TypeBadge type={task.type} />
        <PriorityBadge priority={task.priority} />
        <ApprovalBadge required={task.approval_required === 1} />
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
        <span className="font-medium text-slate-600">Objective:</span> {task.objective}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-400">
        <span className="font-medium text-slate-500">Inputs:</span> {task.input_artifacts.join(", ") || "—"}
      </p>
      {task.materialized_task_id ? (
        <p className="mt-0.5 text-[11px] text-emerald-600">
          Packaged as{" "}
          <Link to={`/projects/${projectId}/tasks`} className="font-mono underline">
            {task.materialized_task_id}
          </Link>{" "}
          on the Tasks page.
        </p>
      ) : null}
    </div>
  );
}

function RoadmapDetailView({ detail, projectId }: { detail: RoadmapDetail; projectId: string }) {
  const taskById = new Map(detail.tasks.map((t) => [t.id, t]));

  const metadata = (() => {
    try {
      return JSON.parse(detail.roadmap.metadata ?? "{}") as { input_counts?: Record<string, number>; derived_counts?: Record<string, number> };
    } catch {
      return {};
    }
  })();

  const depsByTask = new Map<string, string[]>();
  for (const dep of detail.dependencies) {
    const target = taskById.get(dep.depends_on_task_id);
    depsByTask.set(dep.task_id, [...(depsByTask.get(dep.task_id) ?? []), target?.title ?? dep.depends_on_task_id]);
  }

  return (
    <div className="space-y-5 border-t border-slate-100 px-5 py-4">
      {metadata.input_counts || metadata.derived_counts ? (
        <div className="flex flex-wrap gap-2">
          {Object.entries(metadata.derived_counts ?? {}).map(([key, value]) => (
            <span key={key} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              {key} {value}
            </span>
          ))}
        </div>
      ) : null}

      {/* Phases + milestones */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {detail.phases.map((phase) => {
          const milestone = detail.milestones.find((m) => m.phase_id === phase.id);
          return (
            <div key={phase.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-slate-400">{phase.id.slice(-4)}</span>
                <span className="text-xs font-semibold text-slate-800">{phase.name}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{phase.description}</p>
              {phase.approval_required === 1 ? (
                <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600">Approval gate</p>
              ) : null}
              <p className="mt-1 text-[10px] italic text-slate-400">{phase.gate_criteria}</p>
              {milestone ? (
                <p className="mt-2 border-t border-slate-200 pt-1.5 text-[10px] text-slate-500">
                  <span className="font-medium text-slate-600">{milestone.name}</span>
                  {milestone.due_date ? ` · ${milestone.due_date}` : ""}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Tasks grouped by phase → epic */}
      {detail.phases.map((phase) => {
        const epics = detail.epics.filter((e) => e.phase_id === phase.id);
        const phaseTasks = detail.tasks.filter((t) => t.phase_id === phase.id);
        if (phaseTasks.length === 0) return null;
        return (
          <div key={phase.id}>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Phase {phase.position} · {phase.name} ({phaseTasks.length} tasks)
            </h4>
            <div className="space-y-3">
              {epics.map((epic) => {
                const epicTasks = phaseTasks.filter((t) => t.epic_id === epic.id);
                if (epicTasks.length === 0) return null;
                return (
                  <div key={epic.id}>
                    <p className="mb-1.5 text-xs font-medium text-slate-700">
                      {epic.name} <span className="font-normal text-slate-400">({epicTasks.length})</span>
                    </p>
                    <div className="grid gap-2 lg:grid-cols-2">
                      {epicTasks.map((task) => (
                        <TaskRow key={task.id} task={task} projectId={projectId} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Dependencies */}
      {detail.dependencies.length > 0 ? (
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Dependencies</h4>
          <ul className="space-y-1">
            {detail.dependencies.map((dep) => {
              const from = taskById.get(dep.task_id);
              const to = taskById.get(dep.depends_on_task_id);
              return (
                <li key={`${dep.task_id}-${dep.depends_on_task_id}`} className="text-[11px] text-slate-500">
                  <span className="font-mono text-slate-400">{from?.id ?? dep.task_id}</span> {from?.title ?? ""} →{" "}
                  <span className="font-mono text-slate-400">{to?.id ?? dep.depends_on_task_id}</span> {to?.title ?? ""}
                  {dep.reason ? <span className="text-slate-400"> · {dep.reason}</span> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function RoadmapPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [name, setName] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [packMessage, setPackMessage] = useState<string | null>(null);

  const { data: roadmaps, isLoading, error, refetch } = useRoadmaps(projectId);
  const { data: detail } = useRoadmap(expanded ?? undefined);
  const generate = useGenerateRoadmap();
  const deleteRoadmap = useDeleteRoadmap();
  const generatePack = useGenerateTaskPack();

  if (!projectId) return <ErrorState message="Missing project id" />;

  const handleGenerate = async () => {
    const result = await generate.mutateAsync({ project_id: projectId, name: name.trim() || undefined });
    setName("");
    setExpanded(result.roadmap.id);
    setPackMessage(null);
  };

  const handleGeneratePack = async (roadmapId: string) => {
    setPackMessage(null);
    const result = await generatePack.mutateAsync({ roadmap_id: roadmapId });
    setPackMessage(
      result.created > 0
        ? `Packaged ${result.created} task(s) into executable task packs — see the Tasks page.`
        : `Nothing new to package (${result.skipped} already packaged).`,
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roadmap"
        description="A roadmap derived automatically from your requirements, models, APIs, screens, and risks — phases, milestones, epics, dependencies, priorities, and approval gates. Nothing is hand-planned."
      />

      <Card>
        <CardHeader
          title="Generate roadmap"
          description="Derives the full plan from the database. Approved roadmaps can be packaged into agent-neutral task packs."
        />
        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          <label className="block w-64">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Name (optional)</span>
            <input
              className={inputClass}
              value={name}
              placeholder="e.g. MVP roadmap"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <Button loading={generate.isPending} onClick={() => void handleGenerate()}>
            Generate roadmap
          </Button>
        </div>
      </Card>

      <RoadmapAggregateCard projectId={projectId} />

      {packMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700">{packMessage}</div>
      ) : null}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Generated roadmaps</h3>
        <Button size="sm" variant="ghost" onClick={() => void refetch()}>
          Refresh
        </Button>
      </div>

      {error ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : null}

      {isLoading || !roadmaps ? (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-14">
          <Spinner className="h-5 w-5 text-slate-400" />
        </div>
      ) : roadmaps.length === 0 ? (
        <EmptyState
          title="No roadmap generated yet"
          hint="Generate a roadmap above. It will derive phases, milestones, epics, tasks with dependencies and priorities, and approval gates from your project data."
        />
      ) : (
        <div className="space-y-3">
          {roadmaps.map((roadmap) => {
            const isOpen = expanded === roadmap.id;
            const roadmapDetail = isOpen ? detail : undefined;
            return (
              <Card key={roadmap.id}>
                <div className="flex items-center justify-between gap-3 px-5 py-3">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setExpanded(isOpen ? null : roadmap.id)}>
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-900 hover:text-forge-700">{roadmap.name}</span>
                      <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {roadmap.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      <span className="font-mono">{roadmap.id}</span>
                      {" · generated "}
                      {formatDate(roadmap.created_at)}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={generatePack.isPending}
                      disabled={Boolean(roadmapDetail?.tasks.every((t) => t.materialized_task_id))}
                      onClick={() => void handleGeneratePack(roadmap.id)}
                    >
                      Generate task pack
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                      loading={deleteRoadmap.isPending}
                      onClick={() => void deleteRoadmap.mutateAsync({ id: roadmap.id, projectId })}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                {isOpen ? (
                  roadmapDetail ? (
                    <RoadmapDetailView detail={roadmapDetail} projectId={projectId} />
                  ) : (
                    <div className="flex justify-center border-t border-slate-100 py-8">
                      <Spinner className="h-5 w-5 text-slate-400" />
                    </div>
                  )
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
