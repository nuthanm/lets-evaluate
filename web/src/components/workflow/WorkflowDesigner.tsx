"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Node,
  type Edge,
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./workflow-flow.css";
import type { StageKind } from "@/lib/db/queries";
import type { WorkflowGraph, WorkflowGraphNode } from "@/lib/domain/workflow-graph";
import { laneForStageKind, laneLabel } from "@/lib/domain/workflow-graph";
import { cn } from "@/lib/utils";

type StageKindOption = StageKind;

const KIND_OPTIONS: { value: StageKindOption; label: string }[] = [
  { value: "screening", label: "Screening (TA / AI)" },
  { value: "technical", label: "Technical" },
  { value: "manager", label: "Manager" },
  { value: "hr", label: "HR" },
  { value: "final", label: "Final confirmation" },
  { value: "custom", label: "Custom" },
];

type FlowData = {
  label: string;
  kind?: StageKindOption;
  nodeType: "stage" | "decision" | "end";
};

function FlowNode({ data, selected }: NodeProps<Node<FlowData>>) {
  return (
    <div
      className={cn(
        "workflow-flow-node",
        data.nodeType === "stage" && "workflow-flow-node-stage",
        data.nodeType === "decision" && "workflow-flow-node-decision",
        data.nodeType === "end" && "workflow-flow-node-end",
        selected && "ring-2 ring-[var(--cyan)]",
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-[var(--cyan)]" />
      <div className="workflow-flow-node-label">{data.label}</div>
      {data.kind && (
        <div className="workflow-flow-node-meta">{data.kind.replace(/_/g, " ")}</div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-[var(--cyan)]" />
    </div>
  );
}

const nodeTypes = { workflow: FlowNode };

function toFlowNodes(graph: WorkflowGraph): Node<FlowData>[] {
  return graph.nodes.map((node) => ({
    id: node.id,
    type: "workflow",
    position: node.position,
    data: {
      label: node.label,
      kind: node.kind,
      nodeType: node.type,
    },
  }));
}

function toFlowEdges(graph: WorkflowGraph): Edge[] {
  return graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: true,
  }));
}

function fromFlow(nodes: Node<FlowData>[], edges: Edge[]): WorkflowGraph {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.data.nodeType,
      label: node.data.label,
      kind: node.data.kind,
      lane: node.data.kind ? laneForStageKind(node.data.kind) : undefined,
      position: node.position,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: typeof edge.label === "string" ? edge.label : undefined,
    })),
  };
}

export function WorkflowDesigner({
  graph,
  onChange,
  readOnly = false,
}: {
  graph: WorkflowGraph;
  onChange?: (graph: WorkflowGraph) => void;
  readOnly?: boolean;
}) {
  const initialNodes = useMemo(() => toFlowNodes(graph), [graph]);
  const initialEdges = useMemo(() => toFlowEdges(graph), [graph]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const emit = useCallback(
    (nextNodes: Node<FlowData>[], nextEdges: Edge[]) => {
      onChange?.(fromFlow(nextNodes, nextEdges));
    },
    [onChange],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      setEdges((eds) => {
        const next = addEdge({ ...connection, animated: true }, eds);
        emit(nodes, next);
        return next;
      });
    },
    [emit, nodes, readOnly, setEdges],
  );

  const onNodeDragStop = useCallback(() => {
    if (readOnly) return;
    emit(nodes, edges);
  }, [emit, edges, nodes, readOnly]);

  function addStage() {
    const id = `stage-${Date.now()}`;
    const nextNodes: Node<FlowData>[] = [
      ...nodes,
      {
        id,
        type: "workflow",
        position: { x: 60 + nodes.length * 40, y: 120 },
        data: { label: "New stage", kind: "custom", nodeType: "stage" },
      },
    ];
    setNodes(nextNodes);
    emit(nextNodes, edges);
  }

  function addDecision() {
    const id = `decision-${Date.now()}`;
    const nextNodes: Node<FlowData>[] = [
      ...nodes,
      {
        id,
        type: "workflow",
        position: { x: 120 + nodes.length * 30, y: 200 },
        data: { label: "Proceed?", nodeType: "decision" },
      },
    ];
    setNodes(nextNodes);
    emit(nextNodes, edges);
  }

  return (
    <div className="grid gap-3">
      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <ToolbarBtn onClick={addStage}>+ Stage</ToolbarBtn>
          <ToolbarBtn onClick={addDecision}>+ Decision</ToolbarBtn>
        </div>
      )}
      <div className="workflow-flow h-[420px] overflow-hidden rounded-xl border border-[var(--cream-2)] bg-[var(--white)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          fitView
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={18} size={1} color="var(--cream-2)" />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={() => "var(--cyan-soft)"}
            maskColor="color-mix(in srgb, var(--cream) 55%, transparent)"
          />
        </ReactFlow>
      </div>
      {!readOnly && (
        <p className="text-[11px] text-[var(--ink-faint)]">
          Drag nodes to arrange lanes · connect handles to define transitions ·
          saving syncs stage order for recruiters
        </p>
      )}
    </div>
  );
}

function ToolbarBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-[var(--cream-2)] bg-white px-3 py-1.5 text-[11px] font-bold text-[var(--ink-soft)] transition-colors hover:border-[var(--cyan)] hover:text-[var(--ink)]"
    >
      {children}
    </button>
  );
}

export { laneLabel };
