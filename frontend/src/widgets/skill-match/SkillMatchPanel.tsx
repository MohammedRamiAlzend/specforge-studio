import { useSkillMatches } from "../../entities/skill-match/api";
import { Card, CardHeader } from "../../shared/ui/Card";
import { Spinner } from "../../shared/ui/Spinner";
import { StatusBadge } from "../../shared/ui/Badge";

function scoreColor(score: number): string {
  if (score >= 8) return "bg-emerald-100 text-emerald-700";
  if (score >= 5) return "bg-forge-100 text-forge-700";
  return "bg-slate-100 text-slate-600";
}

export function SkillMatchPanel({ projectId }: { projectId: string }) {
  const { data, isLoading, error, refetch } = useSkillMatches(projectId);

  const matched = data?.matches ?? [];
  const gaps = (data?.coverage_gaps ?? []).filter((gap) => gap.open_matches === 0);

  return (
    <Card>
      <CardHeader
        title="Skill matching"
        description="Deterministic keyword scoring that ranks project skills against every task so executing agents can pick work that fits their specialty."
      />
      <div className="px-5 pb-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner />
          </div>
        ) : error ? (
          <div className="py-6 text-center">
            <p className="text-xs text-rose-600">{error.message}</p>
            <button type="button" className="mt-2 text-xs text-forge-600 underline" onClick={() => void refetch()}>
              Retry
            </button>
          </div>
        ) : !data || data.task_count === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">No tasks to match yet.</p>
        ) : matched.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">
            No skill matches found across {data.task_count} task{data.task_count === 1 ? "" : "s"}.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {matched.map((match) => (
              <div key={match.task_id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-400">{match.task_id}</span>
                    <span className="truncate text-sm font-medium text-slate-900">{match.title}</span>
                    <StatusBadge status={match.status} />
                  </div>
                  <p className="mt-1 line-clamp-1 text-[11px] capitalize text-slate-500">{match.type}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:max-w-[55%] sm:justify-end">
                  {match.skills.slice(0, 4).map((skill) => (
                    <span
                      key={skill.skill_id}
                      title={skill.reasons.join(" · ")}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${scoreColor(skill.score)}`}
                    >
                      {skill.name}
                      <span className="font-mono opacity-70">{skill.score}</span>
                    </span>
                  ))}
                  {match.skills.length > 4 ? (
                    <span className="font-mono text-[11px] text-slate-400">+{match.skills.length - 4}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && gaps.length > 0 ? (
          <div className="mt-3 rounded-md border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
              Coverage gaps — required skills with no open matched work
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {gaps.map((gap) => (
                <span
                  key={gap.skill_id}
                  title={`${gap.total_matches} total match${gap.total_matches === 1 ? "" : "es"}`}
                  className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-medium text-amber-700"
                >
                  {gap.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {!isLoading && !error && data && data.unmatched_tasks.length > 0 ? (
          <p className="mt-2 text-[11px] text-slate-500">
            {data.unmatched_tasks.length} task{data.unmatched_tasks.length === 1 ? "" : "s"} match no recorded skill.
          </p>
        ) : null}
      </div>
    </Card>
  );
}
