"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { CaseCard } from "@/components/CabinetPage";
import { FieldInput, FieldLabel } from "@/components/FormField";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Window = { dayOfWeek: number; startMinute: number; endMinute: number };

function toTime(minute: number) {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function fromTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function AvailabilityEditor() {
  const [windows, setWindows] = useState<Window[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/availability")
      .then((r) => r.json())
      .then((rows) => {
        setWindows(
          (rows as Window[]).length
            ? rows
            : [
                { dayOfWeek: 0, startMinute: 540, endMinute: 1080 },
                { dayOfWeek: 1, startMinute: 540, endMinute: 1080 },
                { dayOfWeek: 2, startMinute: 540, endMinute: 1080 },
                { dayOfWeek: 3, startMinute: 540, endMinute: 1080 },
                { dayOfWeek: 4, startMinute: 540, endMinute: 1080 },
              ],
        );
      })
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ windows }),
    });
    setSaving(false);
    setMsg(res.ok ? "Availability saved" : "Could not save");
  }

  return (
    <CaseCard className="mt-5 p-5">
      <h2 className="font-serif text-lg font-bold">Interview availability</h2>
      <p className="mt-1 text-[13px] text-[var(--ink-faint)]">
        Weekly windows used when recruiters schedule your calendar slots.
      </p>
      <div className="mt-4 space-y-2">
        {DAYS.map((label, dow) => {
          const w = windows.find((x) => x.dayOfWeek === dow);
          return (
            <div key={dow} className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="w-10 font-semibold">{label}</span>
              <FieldInput
                type="time"
                value={w ? toTime(w.startMinute) : ""}
                onChange={(e) => {
                  const start = fromTime(e.target.value);
                  setWindows((prev) => {
                    const rest = prev.filter((x) => x.dayOfWeek !== dow);
                    const end = w?.endMinute ?? 1080;
                    return [...rest, { dayOfWeek: dow, startMinute: start, endMinute: end }];
                  });
                }}
                className="w-28"
              />
              <span>–</span>
              <FieldInput
                type="time"
                value={w ? toTime(w.endMinute) : ""}
                onChange={(e) => {
                  const end = fromTime(e.target.value);
                  setWindows((prev) => {
                    const rest = prev.filter((x) => x.dayOfWeek !== dow);
                    const start = w?.startMinute ?? 540;
                    return [...rest, { dayOfWeek: dow, startMinute: start, endMinute: end }];
                  });
                }}
                className="w-28"
              />
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save availability"}
        </Button>
        {msg && <span className="text-[13px] text-[var(--ink-soft)]">{msg}</span>}
      </div>
    </CaseCard>
  );
}
