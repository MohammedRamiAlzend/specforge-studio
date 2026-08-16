import { useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useParams } from "react-router-dom";
import { useModelNodeTypes } from "../../entities/model-graph/api";
import { usePreviewDiagram } from "../../entities/diagram/api";
import type { DiagramPreview } from "../../entities/diagram/types";
import { DiagramPreviewDialog } from "../../features/diagram-preview/DiagramPreviewDialog";
import { InspectorPanel } from "../../features/visual-modeler/InspectorPanel";
import { ModelerCanvas } from "../../features/visual-modeler/ModelerCanvas";
import { ModelerToolbar } from "../../features/visual-modeler/ModelerToolbar";
import { NodePalette } from "../../features/visual-modeler/NodePalette";
import { ValidationPanel } from "../../features/visual-modeler/ValidationPanel";
import { useModelerGraph } from "../../features/visual-modeler/useModelerGraph";
import { errorMessage } from "../../shared/api/client";
import { ErrorState } from "../../shared/ui/States";
import { Spinner } from "../../shared/ui/Spinner";

export function CanvasPage() {
  const { projectId, graphId } = useParams<{ projectId: string; graphId: string }>();
  const { data: catalog, isLoading: catalogLoading } = useModelNodeTypes();
  const modeler = useModelerGraph({ graphId, catalog: catalog ?? [] });
  const preview = usePreviewDiagram();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<DiagramPreview | null>(null);

  const handlePreview = async () => {
    if (!modeler.kind || !modeler.graph) return;
    const drafts = modeler.getDrafts();
    const result = await preview.mutateAsync({
      kind: modeler.kind,
      nodes: drafts.nodes,
      edges: drafts.edges,
    });
    setPreviewData(result);
    setPreviewOpen(true);
  };

  if (!projectId || !graphId) {
    return <ErrorState message="Missing project or graph id." />;
  }

  if (catalogLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-6 w-6 text-slate-400" />
      </div>
    );
  }

  if (modeler.loadError) {
    return <ErrorState message={modeler.loadError.message} onRetry={modeler.reload} />;
  }

  if (!modeler.graph) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-6 w-6 text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <ModelerToolbar
        projectId={projectId}
        graphName={modeler.graph.name}
        kind={modeler.kind}
        dirty={modeler.dirty}
        saving={modeler.saving}
        onSave={() => void modeler.save()}
        onReload={modeler.reload}
        onPreview={() => void handlePreview()}
        previewing={preview.isPending}
      />

      <div className="flex min-h-0 flex-1">
        <aside className="w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
          <NodePalette kind={modeler.kind} catalog={catalog ?? []} onAdd={modeler.addNode} />
        </aside>

        <main className="min-w-0 flex-1">
          <ReactFlowProvider>
            <ModelerCanvas
              nodes={modeler.nodes}
              edges={modeler.edges}
              catalog={catalog ?? []}
              onNodesChange={modeler.onNodesChange}
              onEdgesChange={modeler.onEdgesChange}
              onConnect={modeler.onConnect}
              onSelectionChange={modeler.onSelectionChange}
              onAddNodeType={modeler.addNode}
            />
          </ReactFlowProvider>
        </main>

        <aside className="w-80 shrink-0 overflow-hidden border-l border-slate-200 bg-white">
          <InspectorPanel
            node={modeler.selectedNode}
            edge={modeler.selectedEdge}
            kind={modeler.kind}
            catalog={catalog ?? []}
            projectId={projectId}
            onUpdateNode={modeler.updateNode}
            onUpdateEdge={modeler.updateEdge}
            onDeleteNode={modeler.deleteNode}
            onDeleteEdge={modeler.deleteEdge}
          />
        </aside>
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white">
        <ValidationPanel
          warnings={modeler.warnings}
          onValidate={() => void modeler.validate()}
          validating={modeler.validating}
        />
      </div>

      <DiagramPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`Diagram preview — ${modeler.graph.name}`}
        mermaid={previewData?.mermaid ?? null}
        warnings={previewData?.warnings ?? []}
        loading={preview.isPending}
        error={preview.isError ? errorMessage(preview.error) : null}
      />
    </div>
  );
}
