import { Link, useParams } from "react-router-dom";
import { useProject } from "../entities/project/api";
import {
  useCreateProjectDependency,
  useDeleteProjectDependency,
  useProjectDependencies,
  useProjectDependents,
  useReferenceTargets,
} from "../entities/project-link/api";
import { StatusSelect } from "../features/project-status/StatusSelect";
import { Card } from "../shared/ui/Card";
import { PageHeader } from "../shared/ui/PageHeader";
import { ErrorState } from "../shared/ui/States";
import { formatDate } from "../shared/lib/format";
import { PlatformBadges } from "../widgets/platform-badges/PlatformBadges";
import { LinkedProjectsCard } from "../widgets/linked-projects/LinkedProjectsCard";
import { errorMessage } from "../shared/api/client";

const SECTIONS = [
  { to: "workflows", title: "Workflows", blurb: "Business processes with start, end, and decision branches." },
  { to: "data-model", title: "Data Model", blurb: "Entities, fields, and relations behind the product." },
  { to: "architecture", title: "Architecture", blurb: "Components, layers, and system boundaries." },
  { to: "docs", title: "Docs Export", blurb: "Generated Markdown workspace for the project." },
  { to: "tasks", title: "Tasks", blurb: "Executable work items with checklists and definitions of done." },
  { to: "skills", title: "Skills", blurb: "Capabilities and technologies this project relies on." },
] as const;

export function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading, error } = useProject(projectId);
  const { data: outgoing } = useProjectDependencies(projectId);
  const { data: incoming } = useProjectDependents(projectId);
  const { data: targets } = useReferenceTargets(projectId);
  const createDependency = useCreateProjectDependency(projectId);
  const deleteDependency = useDeleteProjectDependency(projectId);

  if (error) return <ErrorState message={error.message} />;
  if (isLoading || !project) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-md bg-slate-200" />
        <Card className="h-48 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={`${project.id}${project.types && project.types.length > 0 ? ` · ${project.types.map((t) => t.label).join(" + ")}` : ` · ${project.type.toUpperCase()} project`}`}
        actions={<StatusSelect projectId={project.id} status={project.status} />}
      />

      <Card className="p-5">
        {project.types && project.types.length > 0 ? <PlatformBadges types={project.types} /> : null}
        <p className={`text-sm text-slate-600 ${project.types && project.types.length > 0 ? "mt-3" : ""}`}>
          {project.description ?? "No description provided yet."}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-slate-500">Created by</dt>
            <dd className="mt-0.5 text-slate-700">{project.created_by}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Created</dt>
            <dd className="mt-0.5 text-slate-700">{formatDate(project.created_at)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Updated</dt>
            <dd className="mt-0.5 text-slate-700">{formatDate(project.updated_at)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd className="mt-0.5 capitalize text-slate-700">{project.status}</dd>
          </div>
        </dl>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section, i) => (
          <Link key={section.to} to={section.to} className="sf-rise group" style={{ animationDelay: `${i * 40}ms` }}>
            <Card className="h-full p-5 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:border-slate-300">
              <h3 className="text-sm font-semibold text-slate-900 transition-colors group-hover:text-forge-700">
                {section.title} →
              </h3>
              <p className="mt-1 text-xs text-slate-500">{section.blurb}</p>
            </Card>
          </Link>
        ))}
      </div>

      <LinkedProjectsCard
        outgoing={outgoing ?? []}
        incoming={incoming ?? []}
        targets={targets ?? []}
        adding={createDependency.isPending}
        onAdd={(input) => createDependency.mutate(input)}
        onRemove={(depId) => deleteDependency.mutate(depId)}
      />

      {createDependency.isError ? (
        <p className="text-xs text-rose-600">{errorMessage(createDependency.error)}</p>
      ) : null}
      {deleteDependency.isError ? (
        <p className="text-xs text-rose-600">{errorMessage(deleteDependency.error)}</p>
      ) : null}
    </div>
  );
}
