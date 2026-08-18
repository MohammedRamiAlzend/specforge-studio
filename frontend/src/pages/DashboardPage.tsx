import { useState } from "react";
import { Link } from "react-router-dom";
import { useProjects } from "../entities/project/api";
import { CreateProjectForm } from "../features/create-project/CreateProjectForm";
import { StatusBadge } from "../shared/ui/Badge";
import { Button } from "../shared/ui/Button";
import { Card, CardHeader } from "../shared/ui/Card";
import { PageHeader } from "../shared/ui/PageHeader";
import { EmptyState, ErrorState } from "../shared/ui/States";
import { formatDate } from "../shared/lib/format";
import { PlatformBadges } from "../widgets/platform-badges/PlatformBadges";
import { HealthMiniCard } from "../widgets/health/HealthCards";
import { ActivityFeed } from "../widgets/activity/ActivityFeed";

export function DashboardPage() {
  const { data: projects, isLoading, error } = useProjects();
  const [showForm, setShowForm] = useState(false);

  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Plan, model, and generate engineering artifacts for your products."
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
            <CreateProjectForm onCreated={() => setShowForm(false)} />
          </div>
        </Card>
      ) : null}

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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => (
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
                  <HealthMiniCard projectId={project.id} />
                  <p className="mt-3 font-mono text-slate-400">{project.id}</p>
                  <p>Created {formatDate(project.created_at)}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityFeed title="Recent activity" limit={18} />
        </div>
        <Card className="h-fit p-5">
          <h3 className="text-sm font-semibold text-slate-900">Execution tips</h3>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-500">
            <li>• Open a project and use the <span className="font-medium text-slate-700">Tasks</span> board to move work through execution.</li>
            <li>• Track defects and enhancements in <span className="font-medium text-slate-700">Issues</span>.</li>
            <li>• Plan and ship versions from <span className="font-medium text-slate-700">Releases</span>.</li>
            <li>• Use the search box above to find any artifact across projects.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
