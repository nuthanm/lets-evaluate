import { auth } from "@/lib/auth";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import {
  getBulkJob,
  getBulkJobItems,
} from "@/lib/db/repositories/bulk-job-repository";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const job = await getBulkJob(session.user.organizationId, id);
  if (!job) return apiError("Not found", 404);

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "connected", jobId: id });

      while (!closed) {
        const currentJob = await getBulkJob(session.user!.organizationId, id);
        const items = await getBulkJobItems(id);
        send({
          type: "progress",
          job: currentJob,
          items: items.map((i) => ({
            id: i.id,
            candidateName: i.candidateName,
            candidateEmail: i.candidateEmail,
            currentStep: i.currentStep,
            status: i.status,
            error: i.error,
            candidateId: i.candidateId,
          })),
        });

        if (
          currentJob?.status === "completed" ||
          currentJob?.status === "failed"
        ) {
          send({ type: "done" });
          break;
        }

        await new Promise((r) => setTimeout(r, 2000));
      }

      controller.close();
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
