import type { ImportEntity } from "@/lib/import/spreadsheet";

export type ImportTaskStatus = "queued" | "processing" | "completed" | "failed";

export type ImportTask = {
  id: string;
  organizationId: string;
  userId: string;
  entity: ImportEntity;
  label: string;
  status: ImportTaskStatus;
  imported: number;
  skipped: number;
  total: number;
  error?: string;
  read: boolean;
  createdAt: number;
  completedAt?: number;
};

const tasks = new Map<string, ImportTask>();
const TTL_MS = 24 * 60 * 60 * 1000;

function prune() {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, task] of tasks) {
    if (task.createdAt < cutoff) tasks.delete(id);
  }
}

export function createImportTask(input: Omit<ImportTask, "status" | "imported" | "skipped" | "read" | "createdAt"> & { total: number }) {
  prune();
  const task: ImportTask = {
    ...input,
    status: "queued",
    imported: 0,
    skipped: 0,
    read: false,
    createdAt: Date.now(),
  };
  tasks.set(task.id, task);
  return task;
}

export function getImportTask(id: string) {
  return tasks.get(id);
}

export function listImportTasks(organizationId: string, userId?: string) {
  prune();
  return Array.from(tasks.values())
    .filter((t) => t.organizationId === organizationId && (!userId || t.userId === userId))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function updateImportTask(id: string, patch: Partial<ImportTask>) {
  const current = tasks.get(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  tasks.set(id, next);
  return next;
}

export function markImportTaskRead(id: string, organizationId: string) {
  const task = tasks.get(id);
  if (!task || task.organizationId !== organizationId) return null;
  task.read = true;
  return task;
}

export function unreadImportCount(organizationId: string, userId?: string) {
  return listImportTasks(organizationId, userId).filter(
    (t) => !t.read && (t.status === "completed" || t.status === "failed"),
  ).length;
}
