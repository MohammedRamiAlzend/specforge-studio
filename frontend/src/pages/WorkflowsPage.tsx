import { Link, useParams } from "react-router-dom";
import { useWorkflows } from "../entities/workflow/api";
import { useWorkflowCalls } from "../entities/project-link/api";
import { StatusBadge } from "../shared/ui/Badge";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";
import { PageHeader } from "../shared/ui/PageHeader";
import { DataTable, type Column } from "../widgets/data-table/DataTable";
import { formatDate } from "../shared/lib/format";
import { CrossProjectCalls } from "../widgets/project-calls/CrossProjectCalls";

export function WorkflowsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: workflows, isLoading, error, refetch } = useWorkflows(projectId);
  const { data: calls } = useWorkflowCalls(projectId);

  const columns: Column<NonNullable<typeof workflows>[number]>[] = [
    {
      key: "id",
      header: "ID",
      render: (row) => <span className="font-mono text-xs">{row.id}</span>,
    },
    { key: "name", header: "Name", render: (row) => row.name },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "created",
      header: "Created",
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.created_at)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflows"
        description="Processes with a start, an end, and decision branches."
        actions={
          <Link to={`/projects/${projectId}/modeler?kind=workflow`}>
            <Button size="sm">Visual modeler</Button>
          </Link>
        }
      />
      <DataTable
        columns={columns}
        rows={workflows}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        emptyTitle="No workflows yet"
        emptyHint="Model workflows visually on the canvas: drag Start, Step, Decision, Approval, and End nodes, connect them, and save. Generated Mermaid and docs follow automatically."
      />

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-900">Cross-project calls</h3>
        <p className="mt-1 text-xs text-slate-500">
          Workflow-call nodes that invoke workflows from other projects (Prompt 14).
        </p>
        <div className="mt-3">
          {calls && calls.length > 0 ? (
            <CrossProjectCalls calls={calls} />
          ) : (
            <p className="text-xs text-slate-400">No cross-project workflow calls yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
