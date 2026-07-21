"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { CaseCard } from "@/components/CabinetPage";
import { FieldInput, FieldLabel, FieldSelect } from "@/components/FormField";
import { WorkflowDesigner } from "@/components/workflow/WorkflowDesigner";
import type { WorkflowGraph } from "@/lib/domain/workflow-graph";
import { stagesToWorkflowGraph } from "@/lib/domain/workflow-graph";
import { cn } from "@/lib/utils";

type Project = { id: string; name: string };
type StageKind = "screening" | "technical" | "manager" | "hr" | "final" | "custom";
type Stage = { label: string; kind: StageKind };
type ViewMode = "list" | "designer";

const KIND_OPTIONS: { value: StageKind; label: string }[] = [
  { value: "screening", label: "Screening (AI / TA)" },
  { value: "technical", label: "Technical round → Interviewer" },
  { value: "manager", label: "Manager round → Manager" },
  { value: "hr", label: "HR round → HR" },
  { value: "custom", label: "Custom → Interviewer" },
];

function kindVariant(kind: StageKind): "cyan" | "green" | "orange" | "neutral" {
  if (kind === "technical") return "cyan";
  if (kind === "hr") return "green";
  if (kind === "manager") return "orange";
  return "neutral";
}

export function PipelineConfigClient({ projects }: { projects: Project[] }) {
  const [scope, setScope] = useState<string>("");
  const [view, setView] = useState<ViewMode>("list");
  const [stages, setStages] = useState<Stage[]>([]);
  const [graph, setGraph] = useState<WorkflowGraph>({ nodes: [], edges: [] });
  const [inherited, setInherited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (scopeId: string) => {
    setLoading(true);
    setError(null);
    setSavedAt(null);
    try {
      const res = await fetch(
        `/api/pipeline-stages${scopeId ? `?projectId=${scopeId}` : ""}`,
      );
      const data = await res.json();
      let nextStages: Stage[] = data.defaults;
      if (data.configured?.length) {
        nextStages = data.configured;
        setInherited(false);
      } else if (scopeId) {
        nextStages = data.generalConfigured?.length
          ? data.generalConfigured
          : data.defaults;
        setInherited(true);
      } else {
        setInherited(true);
      }
      setStages(nextStages);
      setGraph(
        data.graph?.nodes?.length
          ? data.graph
          : stagesToWorkflowGraph(nextStages),
      );
    } catch {
      setError("Could not load the interview process.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(scope);
  }, [scope, load]);

  function update(i: number, patch: Partial<Stage>) {
    setStages((prev) => {
      const next = prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
      setGraph(stagesToWorkflowGraph(next));
      return next;
    });
  }
  function move(i: number, dir: -1 | 1) {
    setStages((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      setGraph(stagesToWorkflowGraph(next));
      return next;
    });
  }
  function remove(i: number) {
    setStages((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      setGraph(stagesToWorkflowGraph(next));
      return next;
    });
  }
  function add() {
    setStages((prev) => {
      const next = [...prev, { label: "New stage", kind: "custom" as StageKind }];
      setGraph(stagesToWorkflowGraph(next));
      return next;
    });
  }

  async function save() {
    if (stages.some((s) => !s.label.trim())) {
      setError("Every stage needs a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pipeline-stages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: scope || null,
          stages: stages.map((s) => ({ label: s.label.trim(), kind: s.kind })),
          graph,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not save.");
        return;
      }
      setInherited(false);
      setSavedAt(Date.now());
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function clearOverride() {
    setSaving(true);
    setError(null);
    try {
      await fetch("/api/pipeline-stages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: scope || null, stages: [] }),
      });
      await load(scope);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <aside className="case-card h-fit p-4">
        <FieldLabel htmlFor="scope">Editing flow for</FieldLabel>
        <FieldSelect
          id="scope"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="">General default (all projects)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </FieldSelect>
        <p className="mt-3 text-xs text-[var(--ink-faint)]">
          The <strong>general default</strong> applies to every candidate unless
          their project defines its own flow.
        </p>
        {scope && inherited && (
          <p className="mt-3 rounded-lg bg-[var(--cyan-soft)] p-2 text-[11px] text-[var(--cyan-d)]">
            This project currently uses the general default. Edit and save to
            create a custom flow.
          </p>
        )}
        {scope && !inherited && (
          <button
            type="button"
            onClick={clearOverride}
            disabled={saving}
            className="mt-3 text-xs font-semibold text-[var(--orange)] hover:underline"
          >
            Remove custom flow (use general default)
          </button>
        )}

        <div className="mt-4 flex gap-1 rounded-lg border border-[var(--cream-2)] bg-[var(--cream)] p-1">
          {(
            [
              ["designer", "Visual designer"],
              ["list", "List view"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={cn(
                "flex-1 rounded-md px-2 py-1.5 text-[10px] font-bold transition-colors",
                view === id
                  ? "bg-white text-[var(--ink)] shadow-sm"
                  : "text-[var(--ink-faint)] hover:text-[var(--ink-soft)]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </aside>

      <section>
        {loading ? (
          <CaseCard className="p-6 text-sm text-[var(--ink-faint)]">
            Loading…
          </CaseCard>
        ) : view === "designer" ? (
          <>
            <div className="mb-3 rounded-lg border border-[var(--cyan)]/20 bg-[var(--cyan-soft)]/40 px-4 py-3 text-xs leading-relaxed text-[var(--ink-soft)]">
              <strong className="text-[var(--ink)]">Tip:</strong> Use{" "}
              <button
                type="button"
                onClick={() => setView("list")}
                className="font-bold text-[var(--cyan-d)] underline-offset-2 hover:underline"
              >
                List view
              </button>{" "}
              to add stages in order — links are created automatically. Switch here only when you
              need branching or custom transitions.
            </div>
            <WorkflowDesigner
              key={scope || "general"}
              graph={graph}
              onChange={setGraph}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button className="px-5 py-2 text-sm" onClick={save} disabled={saving}>
                {saving ? "Saving…" : savedAt ? "Saved ✓" : "Save workflow"}
              </Button>
              {error && (
                <span className="text-xs font-semibold text-red-600">{error}</span>
              )}
            </div>
          </>
        ) : (
          <>
            <ol className="space-y-2">
              {stages.map((s, i) => (
                <li key={i}>
                  <CaseCard className="flex flex-wrap items-center gap-3 p-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <FieldInput
                      className="min-w-[160px] flex-1"
                      value={s.label}
                      onChange={(e) => update(i, { label: e.target.value })}
                      placeholder="Stage name"
                    />
                    <FieldSelect
                      className="w-[240px]"
                      value={s.kind}
                      onChange={(e) =>
                        update(i, { kind: e.target.value as StageKind })
                      }
                    >
                      {KIND_OPTIONS.map((k) => (
                        <option key={k.value} value={k.value}>
                          {k.label}
                        </option>
                      ))}
                    </FieldSelect>
                    <Pill variant={kindVariant(s.kind)} className="capitalize">
                      {s.kind}
                    </Pill>
                    <div className="flex items-center gap-1">
                      <MiniBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                        ↑
                      </MiniBtn>
                      <MiniBtn
                        label="Move down"
                        onClick={() => move(i, 1)}
                        disabled={i === stages.length - 1}
                      >
                        ↓
                      </MiniBtn>
                      <MiniBtn label="Remove" onClick={() => remove(i)}>
                        ✕
                      </MiniBtn>
                    </div>
                  </CaseCard>
                </li>
              ))}
            </ol>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="ghost" className="px-4 py-2 text-sm" onClick={add}>
                + Add stage
              </Button>
              <Button className="px-5 py-2 text-sm" onClick={save} disabled={saving}>
                {saving ? "Saving…" : savedAt ? "Saved ✓" : "Save flow"}
              </Button>
              {error && (
                <span className="text-xs font-semibold text-red-600">{error}</span>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function MiniBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-lg border border-[var(--cream-2)] bg-white text-sm font-bold text-[var(--ink-soft)] transition-colors hover:border-[var(--cyan)] hover:text-[var(--ink)] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
