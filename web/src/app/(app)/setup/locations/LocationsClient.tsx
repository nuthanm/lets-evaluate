"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { CaseCard } from "@/components/CabinetPage";
import { FieldInput, FieldLabel } from "@/components/FormField";

type OfficeLocation = {
  id: string;
  name: string;
};

export function LocationsClient({ initialLocations }: { initialLocations: OfficeLocation[] }) {
  const [locations, setLocations] = useState<OfficeLocation[]>(initialLocations);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/office-locations", { cache: "no-store" });
    if (!res.ok) return;
    const rows = (await res.json()) as OfficeLocation[];
    setLocations(rows);
  }

  async function addLocation() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/office-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Failed to create office location.");
      }
      setName("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create office location.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    if (!editingValue.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/office-locations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingValue.trim() }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Failed to update office location.");
      }
      setEditingId(null);
      setEditingValue("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update office location.");
    } finally {
      setBusy(false);
    }
  }

  async function removeLocation(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/office-locations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Failed to delete office location.");
      }
      if (editingId === id) {
        setEditingId(null);
        setEditingValue("");
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete office location.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
      <CaseCard className="p-5">
        <h2 className="font-serif text-xl font-bold">New office location</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-faint)]">
          These options appear in the Job Description generator for recruiter selection.
        </p>

        <div className="mt-4">
          <FieldLabel htmlFor="office-name">Location name</FieldLabel>
          <FieldInput
            id="office-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Chennai"
          />
        </div>

        {error && <p className="mt-3 text-[13px] font-semibold text-[var(--orange)]">{error}</p>}

        <div className="mt-4">
          <Button
            onClick={addLocation}
            disabled={busy || !name.trim()}
            className="w-full px-5 py-2.5 text-[13px]"
          >
            {busy ? "Saving..." : "Add location"}
          </Button>
        </div>
      </CaseCard>

      <CaseCard className="p-5">
        <h2 className="font-serif text-xl font-bold">Configured office locations</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-faint)]">
          {locations.length} location{locations.length === 1 ? "" : "s"} configured
        </p>

        {locations.length === 0 ? (
          <p className="mt-4 rounded-xl bg-[var(--cream)] p-4 text-[13px] text-[var(--ink-soft)]">
            No office locations configured yet.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {locations.map((location) => {
              const isEditing = editingId === location.id;
              return (
                <div
                  key={location.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--cream-2)] bg-white p-3"
                >
                  {isEditing ? (
                    <FieldInput
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="min-w-[200px] flex-1"
                    />
                  ) : (
                    <span className="min-w-[200px] flex-1 text-[14px] text-[var(--ink)]">{location.name}</span>
                  )}

                  {isEditing ? (
                    <>
                      <Button
                        onClick={() => saveEdit(location.id)}
                        disabled={busy || !editingValue.trim()}
                        className="px-4 py-2 text-[12px]"
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditingValue("");
                        }}
                        disabled={busy}
                        className="px-4 py-2 text-[12px]"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingId(location.id);
                          setEditingValue(location.name);
                        }}
                        disabled={busy}
                        className="px-4 py-2 text-[12px]"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => removeLocation(location.id)}
                        disabled={busy}
                        className="px-4 py-2 text-[12px] text-[#c0392b] hover:text-[#c0392b]"
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CaseCard>
    </div>
  );
}
