import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  type EdgeChange,
  type NodeChange,
  type OnConnect,
  type OnSelectionChangeParams,
  type XYPosition,
} from "@xyflow/react";
import {
  useModelGraph,
  useSaveModelGraph,
  useValidateGraph,
} from "../../entities/model-graph/api";
import type {
  ModelKind,
  ModelNodeType,
  ValidationWarning,
} from "../../entities/model-graph/types";
import {
  edgeDisplayText,
  serverEdgeToRf,
  serverNodeToRf,
  type ModelerEdge,
  type ModelerEdgeData,
  type ModelerNode,
} from "./types";

function randomKey(prefix: string): string {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}-${id}`;
}

// Only these change types alter the persisted graph; RF also fires
// dimensions/select changes during normal use (measuring, clicking).
const DIRTY_CHANGE_TYPES = new Set(["position", "remove", "add", "replace"]);

function cascadePosition(index: number): XYPosition {
  return { x: 100 + (index % 6) * 28, y: 100 + Math.floor(index / 6) * 28 };
}

interface Selection {
  nodeKey: string | null;
  edgeId: string | null;
}

export interface UseModelerGraphOptions {
  graphId: string | undefined;
  catalog: ModelNodeType[];
}

/**
 * Owns the local React Flow graph for one model canvas:
 * - seeds from the server payload (once),
 * - tracks dirty state,
 * - saves by sending drafts to the backend and reconciling canonical IDs,
 * - runs server-side validation and stores warnings.
 */
export function useModelerGraph({ graphId, catalog }: UseModelerGraphOptions) {
  const { data: payload, isLoading, error, refetch } = useModelGraph(graphId);
  const saveMutation = useSaveModelGraph(graphId);
  const validateMutation = useValidateGraph();

  const [nodes, setNodes] = useState<ModelerNode[]>([]);
  const [edges, setEdges] = useState<ModelerEdge[]>([]);
  const [selection, setSelection] = useState<Selection>({ nodeKey: null, edgeId: null });
  const [dirty, setDirty] = useState(false);
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);
  const seededRef = useRef(false);

  // Seed local state from the server payload exactly once per load.
  useEffect(() => {
    if (!payload || seededRef.current || catalog.length === 0) return;
    const idToKey = new Map(payload.nodes.map((n) => [n.id, n.key]));
    setNodes(payload.nodes.map((n) => serverNodeToRf(n, catalog)));
    setEdges(payload.edges.map((e) => serverEdgeToRf(e, idToKey)));
    setWarnings(payload.warnings);
    setDirty(false);
    seededRef.current = true;
  }, [payload, catalog]);

  const graph = payload?.graph ?? null;
  const kind: ModelKind | null = graph?.kind ?? null;

  const toDrafts = useCallback(() => {
    return {
      nodes: nodes.map((n) => ({
        key: n.id,
        type: n.data.type,
        title: n.data.title,
        description: n.data.description || undefined,
        inputs: n.data.inputs,
        outputs: n.data.outputs,
        preconditions: n.data.preconditions,
        postconditions: n.data.postconditions,
        related_artifacts: n.data.relatedArtifacts,
        metadata: n.data.metadata ?? undefined,
        position: n.position,
      })),
      edges: edges.map((e) => ({
        key: e.id,
        source: e.source,
        target: e.target,
        label: e.data?.label || undefined,
        condition: e.data?.condition || undefined,
        type: e.data?.edgeType ?? "next",
      })),
    };
  }, [nodes, edges]);

  const addNode = useCallback(
    (type: ModelNodeType, position?: XYPosition) => {
      const id = randomKey("node");
      const newNode: ModelerNode = {
        id,
        type: "model",
        position: position ?? cascadePosition(nodes.length),
        data: {
          type: type.type,
          title: type.defaultTitle,
          description: "",
          inputs: [],
          outputs: [],
          preconditions: [],
          postconditions: [],
          relatedArtifacts: [],
          meta: {
            label: type.label,
            category: type.category,
            description: type.description,
            color: type.color,
          },
          serverId: null,
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setSelection({ nodeKey: id, edgeId: null });
      setDirty(true);
    },
    [nodes.length],
  );

  const updateNode = useCallback((key: string, patch: Partial<ModelerNode["data"]>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === key ? { ...n, data: { ...n.data, ...patch } } : n)),
    );
    setDirty(true);
  }, []);

  const deleteNode = useCallback((key: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== key));
    setEdges((eds) => eds.filter((e) => e.source !== key && e.target !== key));
    setSelection({ nodeKey: null, edgeId: null });
    setDirty(true);
  }, []);

  const updateEdge = useCallback(
    (id: string, patch: Partial<ModelerEdgeData>) => {
      setEdges((eds) =>
        eds.map((e) => {
          if (e.id !== id) return e;
          const data = {
            label: patch.label ?? e.data?.label ?? "",
            condition: patch.condition ?? e.data?.condition ?? "",
            edgeType: patch.edgeType ?? e.data?.edgeType ?? "next",
          };
          return { ...e, data, label: edgeDisplayText(data.label, data.condition) };
        }),
      );
      setDirty(true);
    },
    [],
  );

  const deleteEdge = useCallback((id: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== id));
    setSelection({ nodeKey: null, edgeId: null });
    setDirty(true);
  }, []);

  const deleteSelection = useCallback(() => {
    if (selection.nodeKey) {
      deleteNode(selection.nodeKey);
    } else if (selection.edgeId) {
      deleteEdge(selection.edgeId);
    }
  }, [selection, deleteNode, deleteEdge]);

  const onConnect = useCallback<OnConnect>((connection) => {
    if (!connection.source || !connection.target) return;
    const id = randomKey("edge");
    setEdges((eds) => [
      ...eds,
      {
        id,
        source: connection.source,
        target: connection.target,
        label: "",
        data: { label: "", condition: "", edgeType: "next" },
      },
    ]);
    setDirty(true);
  }, []);

  const onNodesChange = useCallback((changes: NodeChange<ModelerNode>[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    if (changes.some((c) => DIRTY_CHANGE_TYPES.has(c.type))) setDirty(true);
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<ModelerEdge>[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    if (changes.some((c) => DIRTY_CHANGE_TYPES.has(c.type))) setDirty(true);
  }, []);

  const onSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams<ModelerNode, ModelerEdge>) => {
      setSelection({ nodeKey: selNodes[0]?.id ?? null, edgeId: selEdges[0]?.id ?? null });
    },
    [],
  );

  const save = useCallback(async () => {
    if (!graphId || !graph) return;
    const result = await saveMutation.mutateAsync({
      name: graph.name,
      description: graph.description,
      ...toDrafts(),
    });
    const keyToId = new Map(result.nodes.map((n) => [n.key, n.id]));
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, serverId: keyToId.get(n.id) ?? null },
      })),
    );
    setWarnings(result.warnings);
    setDirty(false);
  }, [graphId, graph, toDrafts, saveMutation]);

  const validate = useCallback(async () => {
    if (!kind) return;
    const drafts = toDrafts();
    const result = await validateMutation.mutateAsync({ kind, nodes: drafts.nodes, edges: drafts.edges });
    setWarnings(result.warnings);
  }, [kind, toDrafts, validateMutation]);

  const reload = useCallback(() => {
    seededRef.current = false;
    void refetch();
  }, [refetch]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selection.nodeKey) ?? null,
    [nodes, selection.nodeKey],
  );
  const selectedEdge = useMemo(
    () => edges.find((e) => e.id === selection.edgeId) ?? null,
    [edges, selection.edgeId],
  );

  return {
    // data
    nodes,
    edges,
    graph,
    kind,
    loading: isLoading,
    loadError: error,
    dirty,
    warnings,
    selection,
    selectedNode,
    selectedEdge,
    // actions
    addNode,
    updateNode,
    deleteNode,
    updateEdge,
    deleteEdge,
    deleteSelection,
    onConnect,
    onNodesChange,
    onEdgesChange,
    onSelectionChange,
    save,
    validate,
    reload,
    getDrafts: toDrafts,
    saving: saveMutation.isPending,
    validating: validateMutation.isPending,
  };
}
