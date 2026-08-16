import { useCallback, useEffect, useRef, type DragEvent } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type EdgeChange,
  type NodeChange,
  type OnConnect,
  type OnSelectionChangeParams,
  type XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ModelNodeType } from "../../entities/model-graph/types";
import { modelerNodeTypes } from "./nodeTypes";
import type { ModelerEdge, ModelerNode, ModelerNodeData } from "./types";

const DND_TYPE = "application/specforge-node-type";

export interface ModelerCanvasProps {
  nodes: ModelerNode[];
  edges: ModelerEdge[];
  catalog: ModelNodeType[];
  onNodesChange: (changes: NodeChange<ModelerNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<ModelerEdge>[]) => void;
  onConnect: OnConnect;
  onSelectionChange: (params: OnSelectionChangeParams<ModelerNode, ModelerEdge>) => void;
  onAddNodeType: (type: ModelNodeType, position?: XYPosition) => void;
}

export function ModelerCanvas({
  nodes,
  edges,
  catalog,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectionChange,
  onAddNodeType,
}: ModelerCanvasProps) {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const hadNodesRef = useRef(false);

  // Fit the viewport once the first nodes arrive (React Flow mounts before
  // the graph data is seeded into local state).
  useEffect(() => {
    if (nodes.length > 0 && !hadNodesRef.current) {
      hadNodesRef.current = true;
      void fitView({ padding: 0.25, duration: 300 });
    }
  }, [nodes.length, fitView]);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(DND_TYPE);
      if (!type) return;
      const nodeType = catalog.find((t) => t.type === type);
      if (!nodeType) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      onAddNodeType(nodeType, position);
    },
    [catalog, onAddNodeType, screenToFlowPosition],
  );

  return (
    <div className="h-full w-full">
      <ReactFlow<ModelerNode, ModelerEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={modelerNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onDrop={onDrop}
        onDragOver={onDragOver}
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{ type: "default", style: { stroke: "#94a3b8", strokeWidth: 1.5 } }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#cbd5e1" />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => {
            const meta = (node.data as ModelerNodeData | undefined)?.meta;
            return meta?.color ?? "#94a3b8";
          }}
          maskColor="rgb(241 245 249 / 0.75)"
        />
      </ReactFlow>
    </div>
  );
}
