import { useUpdateProject } from "../../entities/project/api";
import type { ProjectStatus } from "../../entities/project/types";

const STATUSES: ProjectStatus[] = ["draft", "active", "completed", "archived"];

export function StatusSelect({ projectId, status }: { projectId: string; status: ProjectStatus }) {
  const update = useUpdateProject(projectId);

  return (
    <select
      value={status}
      disabled={update.isPending}
      onChange={(e) => {
        void update.mutate({ status: e.target.value as ProjectStatus });
      }}
      className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500 disabled:opacity-60"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
