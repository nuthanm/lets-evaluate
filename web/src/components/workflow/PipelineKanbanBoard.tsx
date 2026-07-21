"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FaceAvatar } from "@/components/FaceAvatar";
import { Pill } from "@/components/Pill";
import type { KanbanCard, KanbanColumn } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

function humanStatus(status: string) {
  const map: Record<string, string> = {
    draft: "Draft",
    screening: "AI screening",
    screened_hold: "Hold",
    ready_for_interview: "Ready",
    assigned: "Booked",
    interview_in_progress: "In progress",
    interview_complete: "Interview done",
    selected: "Selected",
    rejected: "Rejected",
    hold: "On hold",
    screened_rejected: "Screened out",
  };
  return map[status] ?? status.replace(/_/g, " ");
}

function statusVariant(status: string): "cyan" | "green" | "orange" | "neutral" {
  if (status === "selected") return "green";
  if (["rejected", "screened_rejected"].includes(status)) return "orange";
  if (["assigned", "interview_in_progress"].includes(status)) return "cyan";
  return "neutral";
}

function columnAccent(kind: KanbanColumn["kind"]) {
  if (kind === "screening") return "border-t-[var(--orange)]";
  if (kind === "decided") return "border-t-[var(--green)]";
  if (kind === "technical") return "border-t-[var(--cyan)]";
  if (kind === "manager") return "border-t-[var(--orange)]";
  if (kind === "hr") return "border-t-[var(--green)]";
  return "border-t-[var(--navy)]";
}

export function PipelineKanbanBoard({
  initialColumns,
  initialCards,
}: {
  initialColumns: KanbanColumn[];
  initialCards: KanbanCard[];
}) {
  const [cards, setCards] = useState(initialCards);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, KanbanCard[]>();
    for (const col of initialColumns) map.set(col.key, []);
    for (const card of cards) {
      const list = map.get(card.columnKey) ?? [];
      list.push(card);
      map.set(card.columnKey, list);
    }
    return map;
  }, [cards, initialColumns]);

  const activeCard = cards.find((c) => c.id === activeId) ?? null;

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setError(null);
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const candidateId = String(event.active.id);
    const overId = event.over?.id;
    if (!overId || typeof overId !== "string" || !overId.startsWith("col-")) return;

    const columnKey = overId.replace(/^col-/, "");
    const card = cards.find((c) => c.id === candidateId);
    if (!card || card.columnKey === columnKey) return;

    setMoving(true);
    setError(null);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/kanban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not move candidate");
        return;
      }
      setCards((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, columnKey } : c)),
      );
    } catch {
      setError("Network error");
    } finally {
      setMoving(false);
    }
  }

  return (
    <div className="relative">
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
      {moving && (
        <p className="mb-3 text-xs font-semibold text-[var(--cyan-d)]">Updating pipeline…</p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {initialColumns.map((col) => (
            <KanbanColumnView
              key={col.key}
              column={col}
              cards={cardsByColumn.get(col.key) ?? []}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? <KanbanCardView card={activeCard} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function KanbanColumnView({
  column,
  cards,
}: {
  column: KanbanColumn;
  cards: KanbanCard[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${column.key}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "case-card flex min-h-[280px] flex-col overflow-hidden border-t-4",
        columnAccent(column.kind),
        isOver && "ring-2 ring-[var(--cyan)]/40",
      )}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <span className="pipeline-col-header text-[var(--ink)]">{column.label}</span>
        <span className="rounded-full bg-[var(--cream-2)] px-2 py-0.5 text-[10px] font-bold text-[var(--ink-soft)]">
          {cards.length}
        </span>
      </div>
      <div className="mx-3 mb-3 h-px bg-[var(--cream-2)]" />
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex-1 space-y-2 px-3 pb-4">
          {cards.length === 0 ? (
            <li className="rounded-lg border border-dashed border-[var(--cream-2)] px-3 py-4 text-center text-[11px] text-[var(--ink-faint)]">
              Drop candidates here
            </li>
          ) : (
            cards.map((card) => <SortableKanbanCard key={card.id} card={card} />)
          )}
        </ul>
      </SortableContext>
    </div>
  );
}

function SortableKanbanCard({ card }: { card: KanbanCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} className={cn(isDragging && "opacity-40")}>
      <KanbanCardView card={card} dragHandleProps={{ ...attributes, ...listeners }} />
    </li>
  );
}

function KanbanCardView({
  card,
  dragHandleProps,
  dragging,
}: {
  card: KanbanCard;
  dragHandleProps?: Record<string, unknown>;
  dragging?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-3 transition-all",
        dragging && "shadow-lg ring-2 ring-[var(--cyan)]/30",
      )}
    >
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          className="cursor-grab text-[var(--ink-faint)] active:cursor-grabbing"
          aria-label="Drag candidate"
          {...dragHandleProps}
        >
          ≡
        </button>
        <FaceAvatar name={card.name} size="sm" />
        <Link
          href={`/evaluate/${card.id}`}
          className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--ink)] no-underline hover:text-[var(--cyan-d)]"
        >
          {card.name}
        </Link>
      </div>
      <div className="mt-2">
        <Pill variant={statusVariant(card.status)} className="text-[10px]">
          {humanStatus(card.status)}
        </Pill>
      </div>
    </div>
  );
}
