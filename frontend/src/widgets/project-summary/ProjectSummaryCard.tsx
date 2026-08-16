import { Link } from "react-router-dom";
import { useProject } from "../../entities/project/api";
import { StatusBadge } from "../../shared/ui/Badge";
import { Card, CardHeader } from "../../shared/ui/Card";
import { ErrorState } from "../../shared/ui/States";
import { formatDate } from "../../shared/lib/format";

export function ProjectSummaryCard({ projectId }: { projectId: string }) {
  const { data: project, isLoading, error } = useProject(projectId);

  if (error) return <ErrorState message={error.message} />;
  if (isLoading || !project) {
    return <Card className="h-40 animate-pulse" />;
  }

  return (
    <Card>
      <CardHeader
        title={project.name}
        description={`${project.type.toUpperCase()} project`}
        actions={<StatusBadge status={project.status} />}
      />
      <div className="space-y-3 px-5 py-4">
        <p className="text-sm text-slate-600">
          {project.description ?? "No description provided yet."}
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <div>
            <dt className="text-slate-500">ID</dt>
            <dd className="mt-0.5 font-mono text-slate-700">{project.id}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Created</dt>
            <dd className="mt-0.5 text-slate-700">{formatDate(project.created_at)}</dd>
          </div>
        </dl>
        <Link
          to={`/projects/${project.id}`}
          className="inline-block rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Open workspace →
        </Link>
      </div>
    </Card>
  );
}
