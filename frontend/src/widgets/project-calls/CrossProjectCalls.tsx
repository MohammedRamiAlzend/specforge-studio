import type { CrossProjectCall } from "../../entities/project-link/types";

export interface CrossProjectCallsProps {
  calls: CrossProjectCall[];
}

/** Groups resolved cross-project workflow calls by caller workflow. */
export function CrossProjectCalls({ calls }: CrossProjectCallsProps) {
  if (calls.length === 0) return null;

  const byWorkflow = new Map<
    string,
    { name: string; calls: CrossProjectCall[] }
  >();
  for (const call of calls) {
    const existing = byWorkflow.get(call.workflow_id);
    if (existing) {
      existing.calls.push(call);
    } else {
      byWorkflow.set(call.workflow_id, { name: call.workflow_name, calls: [call] });
    }
  }

  return (
    <div className="space-y-4">
      {[...byWorkflow.entries()].map(([workflowId, group]) => (
        <div key={workflowId}>
          <h4 className="text-xs font-semibold text-slate-700">
            <span className="font-mono">{workflowId}</span> — {group.name}
          </h4>
          <ul className="mt-1.5 space-y-1.5">
            {group.calls.map((call) => (
              <li
                key={call.node_id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-violet-100 bg-violet-50 px-3 py-2 text-xs"
              >
                <span className="font-mono text-slate-500">{call.node_id}</span>
                <span className="inline-flex items-center rounded-full border border-violet-200 bg-white px-2 py-0.5 font-medium text-violet-700">
                  {call.target_project_id} · {call.target_project_name}
                </span>
                <span className="text-slate-600">
                  → {call.target_graph_id} — {call.target_graph_name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}