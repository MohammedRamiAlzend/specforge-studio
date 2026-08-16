import { useParams } from "react-router-dom";
import { useTasks } from "../entities/task/api";
import { StatusBadge } from "../shared/ui/Badge";
import { PageHeader } from "../shared/ui/PageHeader";
import { DataTable, type Column } from "../widgets/data-table/DataTable";
import { formatDate } from "../shared/lib/format";

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-rose-600",
  medium: "text-amber-600",
  low: "text-slate-500",
};

export function TasksPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: tasks, isLoading, error, refetch } = useTasks(projectId);

  const columns: Column<NonNullable<typeof tasks>[number]>[] = [
    {
      key: "id",
      header: "ID",
      render: (row) => <span className="font-mono text-xs">{row.id}</span>,
    },
    { key: "title", header: "Title", render: (row) => row.title },
    { key: "type", header: "Type", render: (row) => <span className="capitalize">{row.type}</span> },
    {
      key: "priority",
      header: "Priority",
      render: (row) => (
        <span className={`text-xs font-medium capitalize ${PRIORITY_COLORS[row.priority] ?? ""}`}>
          {row.priority}
        </span>
      ),
    },
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
        title="Tasks"
        description="Executable work items with checklists and definitions of done."
      />
      <DataTable
        columns={columns}
        rows={tasks}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        emptyTitle="No tasks yet"
        emptyHint="Task packs are generated from requirements, workflows, and milestones in the Roadmap & Agent Tasks phase."
      />
    </div>
  );
}
