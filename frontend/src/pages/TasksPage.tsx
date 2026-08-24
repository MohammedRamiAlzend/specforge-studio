import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTasks, useUpdateTask } from "../entities/task/api";
import type { Task, TaskStatus } from "../entities/task/types";
import { useTeamMembers } from "../entities/team-member/api";
import { StatusBadge } from "../shared/ui/Badge";
import { Button } from "../shared/ui/Button";
import { PageHeader } from "../shared/ui/PageHeader";
import { Card } from "../shared/ui/Card";
import { EmptyState } from "../shared/ui/States";
import { DataTable, type Column } from "../widgets/data-table/DataTable";
import { SkillMatchPanel } from "../widgets/skill-match/SkillMatchPanel";
import { formatDate } from "../shared/lib/format";
import { errorMessage } from "../shared/api/client";

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-rose-600",
  medium: "text-amber-600",
  low: "text-slate-500",
};

const BOARD_COLUMNS: TaskStatus[] = ["open", "in_progress", "blocked", "done", "cancelled"];

const fieldClass =
  "rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500";

export function TasksPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [view, setView] = useState<"board" | "table">("board");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const { data: tasks, isLoading, error, refetch } = useTasks(projectId, {
    assignee: assigneeFilter || undefined,
  });
  const { data: members } = useTeamMembers(projectId);
  const updateTask = useUpdateTask(projectId);

  const membersById = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of members ?? []) map.set(member.id, member.name);
    return map;
  }, [members]);

  const columns: Column<NonNullable<typeof tasks>[number]>[] = [
    {
      key: "id",
      header: "ID",
      render: (row) => <span className="font-mono text-xs">{row.id}</span>,
    },
    { key: "title", header: "Title", render: (row) => row.title },
    {
      key: "assignee",
      header: "Assignee",
      render: (row) => (
        <span className="text-xs text-slate-600">{row.assignee_id ? (membersById.get(row.assignee_id) ?? row.assignee_id) : "—"}</span>
      ),
    },
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
        description="Executable work items with checklists and definitions of done. Move work through execution on the board."
        actions={
          <div className="flex items-center gap-2">
            <select
              className={fieldClass}
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              aria-label="Filter by assignee"
            >
              <option value="">All assignees</option>
              {(members ?? []).map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <div className="flex overflow-hidden rounded-md border border-slate-300">
              <Button
                size="sm"
                variant={view === "board" ? "primary" : "secondary"}
                className="rounded-none border-0"
                onClick={() => setView("board")}
              >
                Board
              </Button>
              <Button
                size="sm"
                variant={view === "table" ? "primary" : "secondary"}
                className="rounded-none border-0"
                onClick={() => setView("table")}
              >
                Table
              </Button>
            </div>
          </div>
        }
      />

      {updateTask.isError ? <p className="text-xs text-rose-600">{errorMessage(updateTask.error)}</p> : null}

      {projectId ? <SkillMatchPanel projectId={projectId} /> : null}

      {isLoading || error ? (
        <DataTable
          columns={columns}
          rows={tasks}
          isLoading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          emptyTitle="No tasks yet"
          emptyHint="Task packs are generated from requirements, workflows, and milestones in the Roadmap & Agent Tasks phase."
        />
      ) : view === "table" ? (
        <DataTable
          columns={columns}
          rows={tasks}
          isLoading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          emptyTitle="No tasks yet"
          emptyHint="Task packs are generated from requirements, workflows, and milestones in the Roadmap & Agent Tasks phase."
        />
      ) : !tasks || tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          hint="Task packs are generated from requirements, workflows, and milestones in the Roadmap & Agent Tasks phase."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {BOARD_COLUMNS.map((status) => {
            const group = tasks.filter((task) => task.status === status);
            return (
              <div key={status} className="flex flex-col rounded-lg border border-slate-200 bg-slate-50/80">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2.5">
                  <span className="text-xs font-semibold capitalize text-slate-800">
                    {status.replace(/_/g, " ")}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-500">
                    {group.length}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-2">
                  {group.length === 0 ? (
                    <p className="rounded-md border border-dashed border-slate-200 px-2 py-4 text-center text-[11px] text-slate-400">
                      No tasks
                    </p>
                  ) : (
                    group.map((task) => (
                      <BoardCard
                        key={task.id}
                        task={task}
                        members={members ?? []}
                        onChangeStatus={(status) => updateTask.mutate({ id: task.id, status })}
                        onChangeAssignee={(assigneeId) => updateTask.mutate({ id: task.id, assignee_id: assigneeId })}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BoardCard({
  task,
  members,
  onChangeStatus,
  onChangeAssignee,
}: {
  task: Task;
  members: { id: string; name: string }[];
  onChangeStatus: (status: TaskStatus) => void;
  onChangeAssignee: (assigneeId: string | null) => void;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[10px] text-slate-400">{task.id}</span>
        <span className={`text-[11px] font-medium capitalize ${PRIORITY_COLORS[task.priority] ?? ""}`}>
          {task.priority}
        </span>
      </div>
      <p className="mt-1 text-xs font-medium leading-snug text-slate-900">{task.title}</p>
      <p className="mt-1 text-[11px] capitalize text-slate-500">{task.type}</p>
      <div className="mt-2.5 flex flex-col gap-1.5">
        <select
          className={fieldClass}
          value={task.status}
          onChange={(e) => onChangeStatus(e.target.value as TaskStatus)}
          aria-label={`Move task ${task.id}`}
        >
          {BOARD_COLUMNS.map((status) => (
            <option key={status} value={status}>
              {status.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          value={task.assignee_id ?? ""}
          onChange={(e) => onChangeAssignee(e.target.value || null)}
          aria-label={`Assign task ${task.id}`}
        >
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
