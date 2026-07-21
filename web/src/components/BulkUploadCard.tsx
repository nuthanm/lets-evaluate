"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import {
  ACCEPTED_IMPORT_EXTENSIONS,
  IMPORT_FORMAT_NOTES,
  isAcceptedImportFile,
  friendlyFormatError,
  type ImportEntity,
} from "@/lib/import/spreadsheet";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import { cn } from "@/lib/utils";

export function BulkUploadCard({
  entity,
  title,
  description,
  icon,
  onComplete,
  className,
}: {
  entity: ImportEntity;
  title: string;
  description: string;
  icon?: React.ReactNode;
  onComplete?: () => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { startImport, tasks } = useNotifications();
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const format = IMPORT_FORMAT_NOTES[entity];
  const activeTask = tasks.find(
    (t) => t.entity === entity && (t.status === "queued" || t.status === "processing"),
  );

  async function handleFile(file: File | null) {
    if (!file) return;
    setError(null);
    if (!isAcceptedImportFile(file)) {
      setError(friendlyFormatError(file.name));
      setFileName(null);
      return;
    }
    setFileName(file.name);
    try {
      await startImport(entity, file);
      setFileName(null);
      if (inputRef.current) inputRef.current.value = "";
      onComplete?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  }

  return (
    <div className={cn("rounded-xl border border-[var(--cream-2)] bg-white p-5 shadow-sm", className)}>
      <div className="mb-4 flex items-start gap-3">
        {icon ? (
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--green)]/15 text-[var(--green)]">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-[var(--ink)]">{title}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--ink-faint)]">{description}</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMPORT_EXTENSIONS.join(",")}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      <div
        className={cn(
          "rounded-lg border border-dashed border-[var(--cream-2)] bg-[var(--cream)]/40 px-4 py-5 text-center transition-colors",
          "hover:border-[var(--cyan)] hover:bg-[var(--cyan-soft)]/30",
        )}
      >
        <p className="text-xs font-semibold text-[var(--ink-soft)]">
          Drop a file here or choose from your computer
        </p>
        <p className="mt-1 text-[11px] text-[var(--ink-faint)]">
          Supports {ACCEPTED_IMPORT_EXTENSIONS.join(" and ")} only
        </p>
        <Button
          type="button"
          variant="ghost"
          className="mt-3 px-4 py-2 text-xs"
          disabled={Boolean(activeTask)}
          onClick={() => inputRef.current?.click()}
        >
          {activeTask ? "Import in progress…" : "Choose file"}
        </Button>
        {fileName && !activeTask ? (
          <p className="mt-2 text-[11px] font-medium text-[var(--cyan-d)]">{fileName}</p>
        ) : null}
      </div>

      <div className="mt-4 rounded-lg bg-[var(--cream)] px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--ink-faint)]">
          File format
        </p>
        <p className="mt-1 font-mono text-[11px] text-[var(--ink-soft)]">{format.columns}</p>
        <p className="mt-1.5 text-[11px] text-[var(--ink-faint)]">
          Example: <span className="font-mono text-[var(--ink-soft)]">{format.example}</span>
        </p>
        <p className="mt-1.5 text-[11px] text-[var(--ink-faint)]">Note: {format.hint}</p>
      </div>

      {error ? <p className="mt-3 text-xs font-semibold text-[var(--orange)]">{error}</p> : null}
      <p className="mt-3 text-[11px] text-[var(--ink-faint)]">
        Upload runs in the background — you can navigate away. Check the notification bell for status.
      </p>
    </div>
  );
}

export function SetupCreateRow({
  manual,
  upload,
}: {
  manual: React.ReactNode;
  upload: React.ReactNode;
}) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_auto_1fr]">
      <div>{manual}</div>
      <div className="hidden place-self-center px-1 lg:block">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]">or</span>
      </div>
      <div className="relative lg:block">
        <div className="mb-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)] lg:hidden">
          or upload
        </div>
        {upload}
      </div>
    </div>
  );
}
