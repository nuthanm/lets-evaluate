import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import {
  DEFAULT_STAGE_TEMPLATE,
  getPipelineStageRows,
  getPipelineWorkflowGraph,
  savePipelineStages,
  savePipelineWorkflowGraph,
} from "@/lib/db/queries";
import {
  stagesToWorkflowGraph,
  workflowGraphToStages,
} from "@/lib/domain/workflow-graph";
import type { WorkflowGraph } from "@/lib/domain/workflow-graph";
import { logEvent } from "@/lib/events";

const stageKinds = ["screening", "technical", "manager", "hr", "final", "custom"] as const;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const rows = await getPipelineStageRows(
    session.user.organizationId,
    projectId || null,
  );

  const generalRows = projectId
    ? await getPipelineStageRows(session.user.organizationId, null)
    : rows;

  const graph =
    (await getPipelineWorkflowGraph(
      session.user.organizationId,
      projectId || null,
    )) ??
    stagesToWorkflowGraph(
      rows.length
        ? rows.map((r) => ({ label: r.label, kind: r.kind }))
        : DEFAULT_STAGE_TEMPLATE,
    );

  return NextResponse.json({
    scope: projectId ? "project" : "general",
    configured: rows.map((r) => ({ label: r.label, kind: r.kind })),
    generalConfigured: generalRows.map((r) => ({ label: r.label, kind: r.kind })),
    defaults: DEFAULT_STAGE_TEMPLATE,
    graph,
  });
}

const saveSchema = z.object({
  projectId: z.string().nullable().optional(),
  stages: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        kind: z.enum(stageKinds),
      }),
    )
    .max(20),
  graph: z
    .object({
      nodes: z.array(z.record(z.string(), z.unknown())),
      edges: z.array(z.record(z.string(), z.unknown())),
    })
    .optional(),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin"]);
  if (forbidden) return forbidden;

  const body = saveSchema.parse(await req.json());

  const stages =
    body.graph && body.graph.nodes.length
      ? workflowGraphToStages(body.graph as WorkflowGraph)
      : body.stages;

  const graph: WorkflowGraph =
    body.graph && body.graph.nodes.length
      ? (body.graph as WorkflowGraph)
      : stagesToWorkflowGraph(stages);

  if (body.graph && body.graph.nodes.length) {
    await savePipelineWorkflowGraph(
      session.user.organizationId,
      body.projectId || null,
      graph,
      stages,
    );
  } else {
    await savePipelineStages(
      session.user.organizationId,
      body.projectId || null,
      stages,
    );
  }

  await logEvent({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    entityType: "pipeline",
    entityId: body.projectId || "general",
    action: "pipeline.updated",
    payload: { count: stages.length, hasGraph: Boolean(body.graph) },
  });

  return NextResponse.json({ ok: true });
}
