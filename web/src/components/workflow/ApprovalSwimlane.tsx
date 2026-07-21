"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./workflow-flow.css";
import {
  SWIMLANE_ORDER,
  laneLabel,
  stagesToSwimlaneSteps,
  type SwimlaneStep,
  type WorkflowLane,
} from "@/lib/domain/workflow-graph";
import type { StageKind } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

type StageInput = {
  id: string;
  label: string;
  kind: StageKind;
  status: string;
  assigneeName: string | null;
  decision: string | null;
};

type LaneData = { lane: WorkflowLane; label: string };
type StepData = SwimlaneStep & { laneIndex: number };

const LANE_HEIGHT = 96;
const STEP_WIDTH = 160;

function LaneNode({ data }: NodeProps<Node<LaneData>>) {
  return (
    <div
      className="workflow-flow-lane"
      style={{ width: 720, height: LANE_HEIGHT - 12 }}
    >
      <span className="workflow-flow-lane-label">{data.label}</span>
    </div>
  );
}

function StepNode({ data }: NodeProps<Node<StepData>>) {
  return (
    <div
      className={cn(
        "workflow-flow-node workflow-flow-node-stage",
        data.status === "pending" && "workflow-flow-node-pending",
        data.status === "active" && "workflow-flow-node-active",
        data.status === "done" && "workflow-flow-node-done",
        data.status === "failed" && "workflow-flow-node-failed",
      )}
      style={{ width: STEP_WIDTH - 20 }}
    >
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <div className="workflow-flow-node-label">{data.label}</div>
      <div className="workflow-flow-node-meta">
        {data.status === "active"
          ? "In progress"
          : data.status === "done"
            ? "Complete"
            : data.status === "failed"
              ? "Rejected"
              : "Pending"}
        {data.assigneeName ? ` · ${data.assigneeName}` : ""}
      </div>
      <Handle type="source" position={Position.Right} className="!opacity-0" />
    </div>
  );
}

const nodeTypes = { lane: LaneNode, step: StepNode };

function buildSwimlaneFlow(stages: StageInput[]): { nodes: Node[]; edges: Edge[] } {
  const steps = stagesToSwimlaneSteps(stages);
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  SWIMLANE_ORDER.forEach((lane, laneIndex) => {
    nodes.push({
      id: `lane-${lane}`,
      type: "lane",
      position: { x: 0, y: laneIndex * LANE_HEIGHT },
      data: { lane, label: laneLabel(lane) },
      draggable: false,
      selectable: false,
      connectable: false,
    });
  });

  const laneCounters: Record<WorkflowLane, number> = {
    recruiter: 0,
    hiring_manager: 0,
    panel: 0,
    hr: 0,
  };

  steps.forEach((step, index) => {
    const laneIndex = SWIMLANE_ORDER.indexOf(step.lane);
    const slot = laneCounters[step.lane]++;
    nodes.push({
      id: step.id,
      type: "step",
      position: {
        x: 150 + slot * (STEP_WIDTH + 24),
        y: laneIndex * LANE_HEIGHT + 28,
      },
      data: { ...step, laneIndex },
      draggable: false,
      selectable: false,
    });
    if (index > 0) {
      edges.push({
        id: `edge-${steps[index - 1]!.id}-${step.id}`,
        source: steps[index - 1]!.id,
        target: step.id,
        animated: step.status === "active",
      });
    }
  });

  return { nodes, edges };
}

export function ApprovalSwimlane({ stages }: { stages: StageInput[] }) {
  const { nodes, edges } = useMemo(() => buildSwimlaneFlow(stages), [stages]);

  if (!stages.length) {
    return (
      <div className="case-card p-6 text-sm text-[var(--ink-faint)]">
        Interview stages will appear here once the candidate enters the pipeline.
      </div>
    );
  }

  return (
    <section className="case-card overflow-hidden p-0">
      <div className="border-b border-[var(--cream-2)] bg-[var(--cream)] px-4 py-3">
        <h2 className="font-serif text-lg font-bold">Approval swimlanes</h2>
        <p className="mt-0.5 text-[12px] text-[var(--ink-faint)]">
          Multi-role path — Recruiter, Hiring Manager, Panel, and HR.
        </p>
      </div>
      <div className="workflow-flow h-[420px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll
          zoomOnScroll={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={18} size={1} color="var(--cream-2)" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </section>
  );
}
