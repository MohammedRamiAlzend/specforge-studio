import { statusClass } from "../lib/status";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusClass(status)}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
