import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api/helpers";
import { getImportTask, markImportTaskRead } from "@/lib/import/task-store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const { id } = await params;
  const task = getImportTask(id);
  if (!task || task.organizationId !== session.user.organizationId) {
    return apiError("Task not found", 404);
  }
  return NextResponse.json(task);
}

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const { id } = await params;
  const task = markImportTaskRead(id, session.user.organizationId);
  if (!task) return apiError("Task not found", 404);
  return NextResponse.json(task);
}
