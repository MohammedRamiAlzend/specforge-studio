import type { ReactNode } from "react";
import { Spinner } from "../../shared/ui/Spinner";
import { EmptyState, ErrorState } from "../../shared/ui/States";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  isLoading: boolean;
  error: Error | null;
  emptyTitle: string;
  emptyHint?: string;
  onRetry?: () => void;
}

export function DataTable<T>({
  columns,
  rows,
  isLoading,
  error,
  emptyTitle,
  emptyHint,
  onRetry,
}: DataTableProps<T>) {
  if (error) return <ErrorState message={error.message} onRetry={onRetry} />;

  if (isLoading || !rows) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-14">
        <Spinner className="h-5 w-5 text-slate-400" />
      </div>
    );
  }

  if (rows.length === 0) return <EmptyState title={emptyTitle} hint={emptyHint} />;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-left">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={index} className="hover:bg-slate-50/70">
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-2.5 text-sm text-slate-700 ${c.className ?? ""}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
