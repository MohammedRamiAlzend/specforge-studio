import { useState } from "react";
import { StatusBadge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { DEPENDENCY_KINDS, dependencyKindLabel } from "../../entities/project-link/lib";
import type {
  CreateDependencyInput,
  DependencyKind,
  ProjectDependency,
  ProjectDependent,
  ReferenceTarget,
} from "../../entities/project-link/types";

const fieldClass =
  "rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500";

export interface LinkedProjectsCardProps {
  outgoing: ProjectDependency[];
  incoming: ProjectDependent[];
  targets: ReferenceTarget[];
  adding?: boolean;
  onAdd: (input: CreateDependencyInput) => void;
  onRemove: (depId: string) => void;
}

export function LinkedProjectsCard({
  outgoing,
  incoming,
  targets,
  adding = false,
  onAdd,
  onRemove,
}: LinkedProjectsCardProps) {
  const [projectId, setProjectId] = useState("");
  const [kind, setKind] = useState<DependencyKind>("workflow_call");
  const [note, setNote] = useState("");

  const existing = new Set(outgoing.map((d) => d.depends_on_project_id));
  const selectable = targets.filter((t) => !existing.has(t.project_id));

  const submit = () => {
    if (!projectId) return;
    onAdd({ depends_on_project_id: projectId, kind, note: note.trim() || undefined });
    setNote("");
  };

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-slate-900">Linked projects</h3>
      <p className="mt-1 text-xs text-slate-500">
        Projects this project depends on — for cross-project workflow calls, shared data, deployment,
        or other reasons.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          className={fieldClass}
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          aria-label="Add dependency on project"
        >
          <option value="">Add dependency…</option>
          {selectable.map((t) => (
            <option key={t.project_id} value={t.project_id}>
              {t.project_name} ({t.project_id})
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          value={kind}
          onChange={(e) => setKind(e.target.value as DependencyKind)}
          aria-label="Dependency kind"
        >
          {DEPENDENCY_KINDS.map((k) => (
            <option key={k} value={k}>
              {dependencyKindLabel(k)}
            </option>
          ))}
        </select>
        <input
          className={`${fieldClass} min-w-[140px]`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note"
          aria-label="Dependency note"
        />
        <Button size="sm" onClick={submit} disabled={!projectId || adding}>
          Add
        </Button>
      </div>

      <h4 className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Outgoing dependencies
      </h4>
      <div className="mt-2 space-y-1.5">
        {outgoing.length === 0 ? (
          <p className="text-xs text-slate-400">No dependencies declared yet.</p>
        ) : (
          outgoing.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800">
                  <span className="font-mono">{d.depends_on_project_id}</span> — {d.depends_on_project_name}
                  <span className="ml-2 text-slate-400">{dependencyKindLabel(d.kind)}</span>
                  {d.note ? <span className="ml-2 text-slate-400">· {d.note}</span> : null}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={d.depends_on_project_status} />
                <button
                  type="button"
                  className="text-xs font-medium text-rose-600 hover:text-rose-700"
                  onClick={() => onRemove(d.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <h4 className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Incoming dependents
      </h4>
      <div className="mt-2 space-y-1.5">
        {incoming.length === 0 ? (
          <p className="text-xs text-slate-400">No other project depends on this one.</p>
        ) : (
          incoming.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800">
                  <span className="font-mono">{d.depending_project_id}</span> — {d.depending_project_name}
                  <span className="ml-2 text-slate-400">{dependencyKindLabel(d.kind)}</span>
                </p>
              </div>
              <StatusBadge status={d.depending_project_status} />
            </div>
          ))
        )}
      </div>
    </Card>
  );
}