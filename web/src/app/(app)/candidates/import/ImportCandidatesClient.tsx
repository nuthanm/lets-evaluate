"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { CaseCard } from "@/components/CabinetPage";

export function ImportCandidatesClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/candidates/import", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setResult(data.error ?? "Import failed");
      return;
    }
    setResult(`Imported ${data.imported} candidate(s).`);
    router.refresh();
  }

  return (
    <CaseCard className="max-w-xl p-6">
      <h2 className="font-serif text-xl font-bold">Bulk CSV import</h2>
      <p className="mt-2 text-[13px] text-[var(--ink-soft)]">
        Columns: <code className="text-[12px]">name</code>,{" "}
        <code className="text-[12px]">email</code>,{" "}
        <code className="text-[12px]">phone</code>,{" "}
        <code className="text-[12px]">source</code>,{" "}
        <code className="text-[12px]">project_id</code>,{" "}
        <code className="text-[12px]">role_id</code>,{" "}
        <code className="text-[12px]">consent</code> (yes/no)
      </p>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button type="submit" disabled={!file || loading}>
          {loading ? "Importing…" : "Import CSV"}
        </Button>
        {result && (
          <p className="text-[13px] text-[var(--ink-soft)]">{result}</p>
        )}
      </form>
    </CaseCard>
  );
}
