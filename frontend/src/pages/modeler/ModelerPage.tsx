import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  useCreateModelGraph,
  useDeleteModelGraph,
  useModelGraphs,
} from "../../entities/model-graph/api";
import type { ModelKind } from "../../entities/model-graph/types";
import { Button } from "../../shared/ui/Button";
import { Card, CardHeader } from "../../shared/ui/Card";
import { PageHeader } from "../../shared/ui/PageHeader";
import { EmptyState, ErrorState } from "../../shared/ui/States";
import { Spinner } from "../../shared/ui/Spinner";
import { formatDate } from "../../shared/lib/format";

const KINDS: { value: ModelKind; label: string; hint: string }[] = [
  { value: "workflow", label: "Workflow", hint: "Processes with start, end, and decision branches." },
  { value: "data", label: "Data model", hint: "Entities, fields, and relations (ERD source)." },
  { value: "architecture", label: "Architecture", hint: "Components, layers, and system boundaries." },
  { value: "sequence", label: "Sequence", hint: "Interactions between actors, screens, APIs, and data." },
];

const KIND_LABELS: Record<ModelKind, string> = {
  workflow: "Workflow",
  data: "Data model",
  architecture: "Architecture",
  sequence: "Sequence",
};

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500";

export function ModelerPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const presetKind = (searchParams.get("kind") as ModelKind | null) ?? "workflow";

  const [kind, setKind] = useState<ModelKind>(KINDS.some((k) => k.value === presetKind) ? presetKind : "workflow");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: graphs, isLoading, error, refetch } = useModelGraphs(projectId ?? "");
  const createGraph = useCreateModelGraph();
  const deleteGraph = useDeleteModelGraph();

  const canCreate = Boolean(projectId) && name.trim().length > 0;

  const handleCreate = async () => {
    if (!projectId || !canCreate) return;
    const graph = await createGraph.mutateAsync({
      project_id: projectId,
      kind,
      name: name.trim(),
      description: description.trim() || undefined,
    });
    navigate(`/projects/${projectId}/modeler/${graph.id}`);
  };

  if (!projectId) return <ErrorState message="Missing project id" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visual Modeler"
        description="Model workflows, data, architecture, and sequences on a canvas — no Mermaid required. The graph is saved as structured data and drives generated diagrams, docs, and task packs."
      />

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader
            title="New model"
            description="Create a canvas for one modeled artifact."
          />
          <div className="space-y-4 px-5 py-4">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Model kind
              </span>
              <select
                className={inputClass}
                value={kind}
                onChange={(e) => setKind(e.target.value as ModelKind)}
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-slate-400">
                {KINDS.find((k) => k.value === kind)?.hint}
              </span>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Name
              </span>
              <input
                className={inputClass}
                value={name}
                placeholder="e.g. User onboarding"
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Description (optional)
              </span>
              <textarea
                className={`${inputClass} min-h-[64px] resize-y leading-relaxed`}
                value={description}
                placeholder="What does this model describe?"
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <Button
              className="w-full"
              loading={createGraph.isPending}
              disabled={!canCreate}
              onClick={() => void handleCreate()}
            >
              Create model
            </Button>
          </div>
        </Card>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Your models</h3>
            <Button size="sm" variant="ghost" onClick={() => void refetch()}>
              Refresh
            </Button>
          </div>

          {error ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : null}

          {isLoading || !graphs ? (
            <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-14">
              <Spinner className="h-5 w-5 text-slate-400" />
            </div>
          ) : graphs.length === 0 ? (
            <EmptyState
              title="No models yet"
              hint="Create a workflow, data model, architecture, or sequence canvas and start dragging node types onto it."
            />
          ) : (
            <div className="space-y-2.5">
              {graphs.map((graph) => (
                <div
                  key={graph.id}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-shadow hover:shadow-md"
                >
                  <Link to={`/projects/${projectId}/modeler/${graph.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-900 group-hover:text-forge-700">
                        {graph.name}
                      </span>
                      <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {KIND_LABELS[graph.kind]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      <span className="font-mono">{graph.id}</span>
                      {" · updated "}
                      {formatDate(graph.updated_at)}
                    </p>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                    loading={deleteGraph.isPending}
                    onClick={() =>
                      void deleteGraph.mutateAsync({ graphId: graph.id, projectId })
                    }
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
