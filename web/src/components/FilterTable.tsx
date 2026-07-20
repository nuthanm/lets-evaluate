"use client";

import { useState, useMemo } from "react";

export type TableColumn = {
  key: string;
  label: string;
  /** Extra className applied to both th and td */
  className?: string;
};

export type TableFilter = {
  key: string;
  placeholder: string;
  type?: "text" | "date";
};

export type TableRow = {
  id: string;
  /** Rendered cell content — one per column, same order as `columns` */
  cells: React.ReactNode[];
  /** Plain-text values used for filtering — one per column, same order */
  searchValues: string[];
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function FilterInput({
  filter,
  value,
  onChange,
}: {
  filter: TableFilter;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex min-w-[150px] flex-1 items-center gap-2 rounded-lg border border-[var(--cream-2)] bg-[var(--cream)] px-3 py-2 focus-within:border-[var(--cyan)] focus-within:bg-white focus-within:shadow-[0_0_0_3px_var(--cyan-soft)]">
      {filter.type === "date" ? (
        <svg
          className="h-3.5 w-3.5 shrink-0 text-[var(--ink-faint)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
        </svg>
      ) : (
        <svg
          className="h-3.5 w-3.5 shrink-0 text-[var(--ink-faint)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      )}
      <input
        type={filter.type ?? "text"}
        placeholder={filter.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-[12px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="shrink-0 text-[var(--ink-faint)] hover:text-[var(--ink)]"
          aria-label="Clear"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function FilterTable({
  columns,
  filters,
  rows,
  defaultPageSize = 25,
  emptyMessage = "No data.",
}: {
  columns: TableColumn[];
  filters: TableFilter[];
  rows: TableRow[];
  defaultPageSize?: number;
  emptyMessage?: string;
}) {
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(filters.map((f) => [f.key, ""])),
  );
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const colIndex = useMemo(
    () => Object.fromEntries(columns.map((c, i) => [c.key, i])),
    [columns],
  );

  // ── Search runs over the full dataset ────────────────────────────────────
  const filtered = useMemo(() => {
    return rows.filter((row) => {
      for (const f of filters) {
        const val = filterValues[f.key]?.trim();
        if (!val) continue;
        const idx = colIndex[f.key] ?? -1;
        if (idx < 0) continue;
        const cellText = row.searchValues[idx] ?? "";
        if (f.type === "date") {
          // val is YYYY-MM-DD from <input type="date">
          if (!cellText.startsWith(val) && !cellText.includes(val)) return false;
        } else {
          if (!cellText.toLowerCase().includes(val.toLowerCase())) return false;
        }
      }
      return true;
    });
  }, [rows, filterValues, filters, colIndex]);

  // Reset to page 1 whenever filters change
  const filteredLen = filtered.length;
  const totalPages  = Math.max(1, Math.ceil(filteredLen / pageSize));
  const safePage    = Math.min(page, totalPages);

  // ── Pagination slices the filtered result ─────────────────────────────────
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const anyActive = filters.some((f) => filterValues[f.key]?.trim());

  function handleFilterChange(key: string, value: string) {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setPage(1); // reset to first page on filter change
  }

  // Build page number window (max 7 buttons)
  const pageWindow = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const delta = 2;
    const left  = Math.max(2, safePage - delta);
    const right = Math.min(totalPages - 1, safePage + delta);
    const pages: (number | "…")[] = [1];
    if (left > 2) pages.push("…");
    for (let p = left; p <= right; p++) pages.push(p);
    if (right < totalPages - 1) pages.push("…");
    pages.push(totalPages);
    return pages;
  }, [totalPages, safePage]);

  return (
    <div>
      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--cream-2)] bg-[var(--cream)] px-4 py-3">
        {filters.map((f) => (
          <FilterInput
            key={f.key}
            filter={f}
            value={filterValues[f.key] ?? ""}
            onChange={(v) => handleFilterChange(f.key, v)}
          />
        ))}
        {anyActive && (
          <span className="shrink-0 text-[11px] text-[var(--ink-faint)]">
            {filteredLen} of {rows.length} result{filteredLen !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[var(--cream-2)] bg-[var(--cream)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)] ${col.className ?? ""}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-[var(--ink-faint)]"
                >
                  {anyActive ? "No rows match your filters." : emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--cream-2)] transition-colors last:border-0 hover:bg-[var(--cyan-soft)]"
                >
                  {row.cells.map((cell, i) => (
                    <td
                      key={i}
                      className={`max-w-0 truncate px-4 py-3 ${columns[i]?.className ?? ""}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination bar ──────────────────────────────────────────────── */}
      {filteredLen > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--cream-2)] bg-[var(--cream)] px-4 py-2.5">
          {/* Left: rows-per-page + count */}
          <div className="flex items-center gap-3 text-[12px] text-[var(--ink-faint)]">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-md border border-[var(--cream-2)] bg-white px-2 py-1 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--cyan)]"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>
              {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredLen)} of {filteredLen}
            </span>
          </div>

          {/* Right: page buttons */}
          <div className="flex items-center gap-1">
            <PagerBtn
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
            >
              ‹
            </PagerBtn>

            {pageWindow.map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} className="px-1 text-[12px] text-[var(--ink-faint)]">
                  …
                </span>
              ) : (
                <PagerBtn
                  key={p}
                  onClick={() => setPage(p as number)}
                  active={p === safePage}
                >
                  {p}
                </PagerBtn>
              ),
            )}

            <PagerBtn
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Next page"
            >
              ›
            </PagerBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function PagerBtn({
  children,
  onClick,
  active,
  disabled,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      className={
        `inline-flex h-7 min-w-[28px] items-center justify-center rounded-md px-2 text-[12px] font-medium transition-colors ` +
        (active
          ? "bg-[var(--cyan)] text-white"
          : disabled
            ? "cursor-not-allowed text-[var(--ink-faint)] opacity-40"
            : "text-[var(--ink-soft)] hover:bg-[var(--cyan-soft)] hover:text-[var(--ink)]")
      }
    >
      {children}
    </button>
  );
}

