"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ImportEntity } from "@/lib/import/spreadsheet";

export type ImportTaskView = {
  id: string;
  entity: ImportEntity;
  label: string;
  status: "queued" | "processing" | "completed" | "failed";
  imported: number;
  skipped: number;
  total: number;
  error?: string;
  read: boolean;
  createdAt: number;
  completedAt?: number;
};

type NotificationContextValue = {
  tasks: ImportTaskView[];
  unreadCount: number;
  startImport: (entity: ImportEntity, file: File) => Promise<string>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const STORAGE_KEY = "setup-import-task-ids";

function loadStoredIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveStoredIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, 50)));
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<ImportTaskView[]>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/setup-imports", { cache: "no-store" });
      if (!res.ok) return;
      const serverTasks = (await res.json()) as ImportTaskView[];
      const storedIds = loadStoredIds();
      const merged = new Map<string, ImportTaskView>();
      for (const t of serverTasks) merged.set(t.id, t);
      for (const id of storedIds) {
        if (merged.has(id)) continue;
        const one = await fetch(`/api/setup-imports/${id}`, { cache: "no-store" });
        if (one.ok) merged.set(id, (await one.json()) as ImportTaskView);
      }
      setTasks(Array.from(merged.values()).sort((a, b) => b.createdAt - a.createdAt));
    } catch {
      /* ignore transient network errors */
    }
  }, []);

  useEffect(() => {
    refresh();
    pollingRef.current = setInterval(refresh, 2500);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [refresh]);

  const startImport = useCallback(
    async (entity: ImportEntity, file: File) => {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("entity", entity);
      const res = await fetch("/api/setup-imports", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { taskId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      if (!data.taskId) throw new Error("Upload failed");

      const ids = loadStoredIds();
      if (!ids.includes(data.taskId)) {
        saveStoredIds([data.taskId, ...ids]);
      }
      await refresh();
      return data.taskId;
    },
    [refresh],
  );

  const markRead = useCallback(
    async (id: string) => {
      await fetch(`/api/setup-imports/${id}`, { method: "PATCH" });
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, read: true } : t)));
    },
    [],
  );

  const markAllRead = useCallback(async () => {
    const unread = tasks.filter((t) => !t.read && (t.status === "completed" || t.status === "failed"));
    await Promise.all(unread.map((t) => fetch(`/api/setup-imports/${t.id}`, { method: "PATCH" })));
    setTasks((prev) =>
      prev.map((t) =>
        t.status === "completed" || t.status === "failed" ? { ...t, read: true } : t,
      ),
    );
  }, [tasks]);

  const unreadCount = useMemo(
    () =>
      tasks.filter((t) => !t.read && (t.status === "completed" || t.status === "failed")).length,
    [tasks],
  );

  const value = useMemo(
    () => ({ tasks, unreadCount, startImport, markRead, markAllRead, refresh }),
    [tasks, unreadCount, startImport, markRead, markAllRead, refresh],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
