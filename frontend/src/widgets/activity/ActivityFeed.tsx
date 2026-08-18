import { useActivity, describeAction } from "../../entities/activity/api";
import type { ActivityItem } from "../../entities/activity/types";
import { Card, CardHeader } from "../../shared/ui/Card";
import { Spinner } from "../../shared/ui/Spinner";
import { formatDateTime } from "../../shared/lib/format";

const ENTITY_LABELS: Record<string, string> = {
  approval: "Approval",
  task: "Task",
  issue: "Issue",
  release: "Release",
  team_member: "Team member",
  skill: "Skill",
  workflow: "Workflow",
  roadmap: "Roadmap",
  requirement: "Requirement",
  project: "Project",
};

function entityLabel(type: string): string {
  return ENTITY_LABELS[type] ?? type.replace(/_/g, " ");
}

export function ActivityFeed({
  projectId,
  limit = 15,
  title = "Activity",
}: {
  projectId?: string;
  limit?: number;
  title?: string;
}) {
  const { data: items, isLoading, error } = useActivity(projectId, limit);

  return (
    <Card>
      <CardHeader
        title={title}
        description={projectId ? "Recent changes and pending approvals for this project." : "Recent changes across all projects."}
      />
      <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto px-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner />
          </div>
        ) : error ? (
          <p className="py-6 text-center text-xs text-rose-600">{error.message}</p>
        ) : !items || items.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">No activity yet.</p>
        ) : (
          items.map((item) => <ActivityRow key={itemKey(item)} item={item} />)
        )}
      </div>
    </Card>
  );
}

function itemKey(item: ActivityItem): string {
  // Pending approvals are merged in with id 0; key by entity to avoid collisions.
  return `${item.entity_type}:${item.entity_id}:${item.created_at}:${item.pending ? "pending" : item.id}`;
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const label = entityLabel(item.entity_type);
  const verb = describeAction(item);
  return (
    <div className="flex items-start gap-3 py-3">
      {item.pending ? (
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px]">
          ⏳
        </span>
      ) : (
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px]">
          {item.actor_type === "agent" ? "🤖" : item.actor_type === "system" ? "⚙️" : "👤"}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs leading-relaxed text-slate-600">
          <span className="font-medium text-slate-900">{label}</span>{" "}
          <span className="font-mono text-[11px] text-slate-400">{item.entity_id}</span> {verb}
          {item.actor ? (
            <>
              {" "}by <span className="font-medium text-slate-800">{item.actor}</span>
            </>
          ) : null}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">{formatDateTime(item.created_at)}</p>
      </div>
    </div>
  );
}
