import { Link, useParams } from "react-router-dom";
import { useDataEntities } from "../entities/data-entity/api";
import { StatusBadge } from "../shared/ui/Badge";
import { Button } from "../shared/ui/Button";
import { PageHeader } from "../shared/ui/PageHeader";
import { DataTable, type Column } from "../widgets/data-table/DataTable";
import { formatDate } from "../shared/lib/format";

export function DataModelPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: entities, isLoading, error, refetch } = useDataEntities(projectId);

  const columns: Column<NonNullable<typeof entities>[number]>[] = [
    {
      key: "id",
      header: "ID",
      render: (row) => <span className="font-mono text-xs">{row.id}</span>,
    },
    { key: "name", header: "Entity", render: (row) => row.name },
    {
      key: "table",
      header: "Table",
      render: (row) => (
        <span className="font-mono text-xs text-slate-500">{row.table_name ?? "—"}</span>
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
        title="Data Model"
        description="Entities, fields, and relations behind the product."
        actions={
          <Link to={`/projects/${projectId}/modeler?kind=data`}>
            <Button size="sm">Visual modeler</Button>
          </Link>
        }
      />
      <DataTable
        columns={columns}
        rows={entities}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        emptyTitle="No data entities yet"
        emptyHint="Define your data model visually on the canvas with Database nodes; relations and generated ERD diagrams follow automatically."
      />
    </div>
  );
}
