import { Link } from "react-router-dom";
import type { DashboardSummary } from "../../entities/dashboard/types";
import { Card, CardHeader } from "../../shared/ui/Card";
import { formatDate } from "../../shared/lib/format";

function Section({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: string;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${tone}`} />
        {title}
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">{count}</span>
      </p>
      <ul className="mt-2 space-y-1">{children}</ul>
    </div>
  );
}

function Row({ to, title, meta }: { to: string; title: string; meta: string }) {
  return (
    <li>
      <Link
        to={to}
        className="group flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-slate-50"
      >
        <span className="min-w-0 truncate text-xs font-medium text-slate-800 group-hover:text-forge-600">
          {title}
        </span>
        <span className="shrink-0 text-[11px] text-slate-400 group-hover:text-slate-600">{meta}</span>
      </Link>
    </li>
  );
}

/**
 * Everything that needs action, in one place (DEC-030): blocked tasks,
 * critical issues and pending approvals with deep links into each project.
 */
export function AttentionPanel({ summary }: { summary: DashboardSummary | undefined }) {
  const empty =
    !summary ||
    (summary.blocked_tasks.length === 0 &&
      summary.critical_issues.length === 0 &&
      summary.pending_approvals.length === 0);

  return (
    <Card>
      <CardHeader
        title="Needs attention"
        description="Blocked work, critical defects and approvals waiting on you."
      />
      <div className="space-y-4 px-5 pb-5 pt-1">
        {empty ? (
          <p className="py-4 text-center text-xs text-slate-400">
            Nothing blocked — no critical issues or pending approvals.
          </p>
        ) : (
          <>
            <Section title="Blocked tasks" count={summary?.blocked_tasks.length ?? 0} tone="bg-amber-400">
              {summary?.blocked_tasks.map((task) => (
                <Row
                  key={task.id}
                  to={`/projects/${task.project_id}/tasks`}
                  title={task.title}
                  meta={`${task.project_name} · ${task.priority}`}
                />
              ))}
            </Section>
            <Section title="Critical issues" count={summary?.critical_issues.length ?? 0} tone="bg-rose-500">
              {summary?.critical_issues.map((issue) => (
                <Row
                  key={issue.id}
                  to={`/projects/${issue.project_id}/issues`}
                  title={issue.title}
                  meta={`${issue.project_name} · ${issue.id}`}
                />
              ))}
            </Section>
            <Section title="Pending approvals" count={summary?.pending_approvals.length ?? 0} tone="bg-forge-400">
              {summary?.pending_approvals.map((approval) => (
                <Row
                  key={approval.id}
                  to={`/projects/${approval.project_id}/governance`}
                  title={`${approval.artifact_type} ${approval.artifact_id}`}
                  meta={`${approval.project_name}${approval.approver_role ? ` · ${approval.approver_role.replace(/_/g, " ")}` : ""}`}
                />
              ))}
            </Section>
          </>
        )}
      </div>
    </Card>
  );
}

/** Next milestone due dates across all projects, from both milestone stores. */
export function UpcomingMilestones({ summary }: { summary: DashboardSummary | undefined }) {
  return (
    <Card>
      <CardHeader title="Upcoming milestones" description="Next gate dates across every roadmap." />
      <div className="px-5 pb-5 pt-1">
        {!summary || summary.upcoming_milestones.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">No scheduled milestones yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {summary.upcoming_milestones.map((milestone) => (
              <li key={milestone.id}>
                <Link
                  to={`/projects/${milestone.project_id}/roadmap`}
                  className="group flex items-baseline justify-between gap-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-slate-800 group-hover:text-forge-600">
                      {milestone.name}
                    </span>
                    <span className="text-[11px] text-slate-400">{milestone.project_name}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-500">
                    {formatDate(milestone.due_date)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
