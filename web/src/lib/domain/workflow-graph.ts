import type { StageKind, StageTemplateItem } from "@/lib/db/queries";

export type WorkflowLane = "recruiter" | "hiring_manager" | "hr" | "panel";

export type WorkflowNodeType = "stage" | "decision" | "end";

export type WorkflowGraphNode = {
  id: string;
  type: WorkflowNodeType;
  label: string;
  kind?: StageKind;
  lane?: WorkflowLane;
  position: { x: number; y: number };
};

export type WorkflowGraphEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type WorkflowGraph = {
  nodes: WorkflowGraphNode[];
  edges: WorkflowGraphEdge[];
};

const LANE_BY_KIND: Record<StageKind, WorkflowLane> = {
  screening: "recruiter",
  technical: "panel",
  manager: "hiring_manager",
  hr: "hr",
  final: "hr",
  custom: "panel",
};

export function laneForStageKind(kind: StageKind): WorkflowLane {
  return LANE_BY_KIND[kind];
}

export function laneLabel(lane: WorkflowLane): string {
  const labels: Record<WorkflowLane, string> = {
    recruiter: "Recruiter",
    hiring_manager: "Hiring Manager",
    hr: "HR",
    panel: "Panel / Interviewer",
  };
  return labels[lane];
}

/** Build a left-to-right linear graph from ordered stage templates. */
export function stagesToWorkflowGraph(stages: StageTemplateItem[]): WorkflowGraph {
  const nodes: WorkflowGraphNode[] = [];
  const edges: WorkflowGraphEdge[] = [];
  const xGap = 220;
  const yBase = 80;

  stages.forEach((stage, index) => {
    const id = `stage-${index}`;
    nodes.push({
      id,
      type: "stage",
      label: stage.label,
      kind: stage.kind,
      lane: laneForStageKind(stage.kind),
      position: { x: 40 + index * xGap, y: yBase + laneYOffset(stage.kind) },
    });
    if (index > 0) {
      edges.push({
        id: `edge-${index - 1}-${index}`,
        source: `stage-${index - 1}`,
        target: id,
      });
    }
  });

  if (stages.length > 0) {
    const endId = "end-offer";
    nodes.push({
      id: endId,
      type: "end",
      label: "Decision",
      lane: "hr",
      position: {
        x: 40 + stages.length * xGap,
        y: yBase + laneYOffset("hr"),
      },
    });
    edges.push({
      id: `edge-end`,
      source: `stage-${stages.length - 1}`,
      target: endId,
    });
  }

  return { nodes, edges };
}

function laneYOffset(kind: StageKind): number {
  const lane = laneForStageKind(kind);
  const offsets: Record<WorkflowLane, number> = {
    recruiter: 0,
    panel: 70,
    hiring_manager: 140,
    hr: 210,
  };
  return offsets[lane];
}

/** Extract ordered stage templates from a workflow graph (stage nodes only). */
export function workflowGraphToStages(graph: WorkflowGraph): StageTemplateItem[] {
  const stageNodes = graph.nodes.filter(
    (n): n is WorkflowGraphNode & { kind: StageKind } =>
      n.type === "stage" && Boolean(n.kind),
  );
  if (!stageNodes.length) return [];

  const outgoing = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const list = outgoing.get(edge.source) ?? [];
    list.push(edge.target);
    outgoing.set(edge.source, list);
  }

  const targets = new Set(graph.edges.map((e) => e.target));
  const starts = stageNodes.filter((n) => !targets.has(n.id));
  const start = starts[0] ?? stageNodes.sort((a, b) => a.position.x - b.position.x)[0]!;

  const ordered: WorkflowGraphNode[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined = start.id;

  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const node = stageNodes.find((n) => n.id === cursor);
    if (node) ordered.push(node);
    const next: string | undefined = (outgoing.get(cursor) ?? []).find((id) =>
      stageNodes.some((n) => n.id === id),
    );
    cursor = next;
  }

  const remainder = stageNodes
    .filter((n) => !seen.has(n.id))
    .sort((a, b) => a.position.x - b.position.x);
  for (const node of remainder) ordered.push(node);

  return ordered.map((n) => ({
    label: n.label,
    kind: n.kind!,
  }));
}

/** Swimlane layout metadata for approval view. */
export type SwimlaneStep = {
  id: string;
  label: string;
  lane: WorkflowLane;
  status: "done" | "active" | "pending" | "failed" | "skipped";
  assigneeName: string | null;
  decision: string | null;
};

export function stagesToSwimlaneSteps(
  stages: {
    id: string;
    label: string;
    kind: StageKind;
    status: string;
    assigneeName: string | null;
    decision: string | null;
  }[],
): SwimlaneStep[] {
  return stages.map((stage) => ({
    id: stage.id,
    label: stage.label,
    lane: laneForStageKind(stage.kind),
    status: swimlaneStatus(stage.status),
    assigneeName: stage.assigneeName,
    decision: stage.decision,
  }));
}

function swimlaneStatus(
  status: string,
): SwimlaneStep["status"] {
  if (status === "passed") return "done";
  if (status === "active") return "active";
  if (status === "failed") return "failed";
  if (status === "skipped") return "skipped";
  return "pending";
}

export const SWIMLANE_ORDER: WorkflowLane[] = [
  "recruiter",
  "hiring_manager",
  "panel",
  "hr",
];

export function emptyWorkflowGraph(): WorkflowGraph {
  return stagesToWorkflowGraph([]);
}
