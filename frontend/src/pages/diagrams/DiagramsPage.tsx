import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useDeleteDiagram,
  useGenerateDiagram,
  useGeneratedDiagrams,
} from "../../entities/diagram/api";
import type { DiagramType } from "../../entities/diagram/types";
import { useModelGraphs } from "../../entities/model-graph/api";
import { Button } from "../../shared/ui/Button";
import { Card, CardHeader } from "../../shared/ui/Card";
import { PageHeader } from "../../shared/ui/PageHeader";
import { EmptyState, ErrorState } from "../../shared/ui/States";
import { Spinner } from "../../shared/ui/Spinner";
import { MermaidBlock } from "../../features/diagram-preview/MermaidBlock";
import { formatDate } from "../../shared/lib/format";

const DIAGRAM_TYPES: { value: DiagramType; label: string; hint: string }[] = [
  { value: "workflow", label: "Workflow", hint: "Flowchart from a workflow model." },
  { value: "sequence", label: "Sequence", hint: "Interactions between roles, screens, APIs, and data." },
  { value: "erd", label: "ERD", hint: "Entities, fields, and cardinalities." },
  { value: "architecture", label: "Architecture", hint: "Components grouped into layers with links." },
];

const KIND_FOR_TYPE: Record<DiagramType, "workflow" | "sequence" | "data" | "architecture"> = {
  workflow: "workflow",
  sequence: "sequence",
  erd: "data",
  architecture: "architecture",
};

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500";

export function DiagramsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [diagramType, setDiagramType] = useState<DiagramType>("workflow");
  const [graphId, setGraphId] = useState<string>("");
  const [name, setName] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: diagrams, isLoading, error, refetch } = useGeneratedDiagrams(projectId);
  const { data: graphs } = useModelGraphs(projectId ?? "");
  const generate = useGenerateDiagram();
  const deleteDiagram = useDeleteDiagram();

  if (!projectId) return <ErrorState message="Missing project id" />;

  const kind = KIND_FOR_TYPE[diagramType];
  const availableGraphs = (graphs ?? []).filter((g) => g.kind === kind);

  const handleGenerate = async () => {
    await generate.mutateAsync({
      project_id: projectId,
      diagram_type: diagramType,
      graph_id: graphId || undefined,
      name: name.trim() || undefined,
    });
    setName("");
  };

  const canGenerate = diagramType === "erd" || Boolean(graphId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diagrams"
        description="Mermaid diagrams generated automatically from your models — nothing is written by hand."
      />

      <Card>
        <CardHeader
          title="Generate a diagram"
          description="Pick a type and a model; the diagram is derived from structured data and stored with provenance."
        />
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Diagram type
            </span>
            <select
              className={inputClass}
              value={diagramType}
              onChange={(e) => {
                setDiagramType(e.target.value as DiagramType);
                setGraphId("");
              }}
            >
              {DIAGRAM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-slate-400">
              {DIAGRAM_TYPES.find((t) => t.value === diagramType)?.hint}
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Source model {diagramType === "erd" ? "(optional)" : ""}
            </span>
            <select
              className={inputClass}
              value={graphId}
              onChange={(e) => setGraphId(e.target.value)}
            >
              <option value="">{diagramType === "erd" ? "Use entities in database" : "Select a model…"}</option>
              {availableGraphs.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.id})
                </option>
              ))}
            </select>
            {availableGraphs.length === 0 ? (
              <span className="mt-1 block text-[11px] text-slate-400">
                No {kind} models yet — model one in the Visual Modeler.
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Name (optional)
            </span>
            <input
              className={inputClass}
              value={name}
              placeholder="e.g. Login flow v1"
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <div className="flex items-end">
            <Button
              className="w-full"
              loading={generate.isPending}
              disabled={!canGenerate}
              onClick={() => void handleGenerate()}
            >
              Generate
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Generated diagrams</h3>
        <Button size="sm" variant="ghost" onClick={() => void refetch()}>
          Refresh
        </Button>
      </div>

      {error ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : null}

      {isLoading || !diagrams ? (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-14">
          <Spinner className="h-5 w-5 text-slate-400" />
        </div>
      ) : diagrams.length === 0 ? (
        <EmptyState
          title="No diagrams generated yet"
          hint="Generate a workflow, sequence, ERD, or architecture diagram above. Every diagram is stored with its source artifact IDs and validation warnings."
        />
      ) : (
        <div className="space-y-3">
          {diagrams.map((diagram) => {
            const isOpen = expanded === diagram.id;
            return (
              <Card key={diagram.id}>
                <div className="flex items-center justify-between gap-3 px-5 py-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setExpanded(isOpen ? null : diagram.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-900 hover:text-forge-700">
                        {diagram.name}
                      </span>
                      <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {diagram.diagram_type}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      <span className="font-mono">{diagram.id}</span>
                      {" · generated "}
                      {formatDate(diagram.created_at)}
                      {diagram.graph_id ? ` · from ${diagram.graph_id}` : ""}
                      {diagram.source_artifacts.length > 0
                        ? ` · sources ${diagram.source_artifacts.join(", ")}`
                        : ""}
                    </p>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                    loading={deleteDiagram.isPending}
                    onClick={() =>
                      void deleteDiagram.mutateAsync({ id: diagram.id, projectId })
                    }
                  >
                    Delete
                  </Button>
                </div>
                {isOpen ? (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <MermaidBlock mermaid={diagram.mermaid} warnings={diagram.warnings} maxHeight="50vh" />
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
