"use client";

import { useEffect, useRef, useState } from "react";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import { cn } from "@/lib/utils";

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M8.5 17a1.5 1.5 0 003 0M4 6.5a6.5 6.5 0 0113 0c0 5.25 2 6.75 2 6.75H2S4 11.75 4 6.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function statusLabel(status: string) {
  if (status === "queued") return "Queued";
  if (status === "processing") return "Processing";
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  return status;
}

export function NotificationMenu() {
  const { tasks, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative grid size-9 place-items-center rounded-lg border border-[var(--cream-2)] bg-white text-[var(--ink-soft)] transition-colors hover:border-[var(--cyan)] hover:text-[var(--ink)]"
      >
        <BellIcon className="size-[18px]" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,320px)] overflow-hidden rounded-xl border border-[var(--cream-2)] bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--cream-2)] px-4 py-3">
            <span className="text-sm font-bold text-[var(--ink)]">Notifications</span>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="text-[11px] font-semibold text-[var(--cyan-d)] hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {tasks.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-[var(--ink-faint)]">
                No background tasks yet.
              </p>
            ) : (
              tasks.slice(0, 20).map((task) => {
                const done = task.status === "completed" || task.status === "failed";
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => {
                      if (done && !task.read) markRead(task.id);
                    }}
                    className={cn(
                      "flex w-full flex-col gap-1 border-b border-[var(--cream-2)] px-4 py-3 text-left transition-colors last:border-b-0",
                      !task.read && done ? "bg-[var(--cyan-soft)]/40" : "hover:bg-[var(--cream)]/60",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[var(--ink)]">{task.label}</span>
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase",
                          task.status === "failed"
                            ? "text-red-600"
                            : task.status === "completed"
                              ? "text-[var(--green)]"
                              : "text-[var(--ink-faint)]",
                        )}
                      >
                        {statusLabel(task.status)}
                      </span>
                    </div>
                    {task.status === "completed" ? (
                      <span className="text-[11px] text-[var(--ink-faint)]">
                        Imported {task.imported}
                        {task.skipped ? ` · skipped ${task.skipped}` : ""} of {task.total}
                      </span>
                    ) : null}
                    {task.status === "failed" ? (
                      <span className="text-[11px] text-red-600">{task.error ?? "Import failed"}</span>
                    ) : null}
                    {task.status === "queued" || task.status === "processing" ? (
                      <span className="text-[11px] text-[var(--ink-faint)]">
                        Processing {task.total} row{task.total !== 1 ? "s" : ""}…
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
