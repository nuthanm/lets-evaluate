export default function EvaluateLoading() {
  return (
    <div className="case-fade-in flex min-h-full flex-1 flex-col">
      {/* Mirrors EvaluateClient's navy title bar so the swap-in doesn't flash
          from a light header to a dark one. */}
      <div className="flex items-center justify-between gap-3 bg-[var(--navy)] px-5 py-3.5 md:px-6">
        <div className="min-w-0">
          <div className="h-4 w-40 animate-pulse rounded-md bg-white/15" />
          <div className="mt-2 h-2.5 w-24 animate-pulse rounded-md bg-white/10" />
        </div>
      </div>

      {/* Step bar placeholder */}
      <div className="flex gap-2 border-b border-[var(--cream-2)] bg-white px-5 py-3 md:px-6">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="h-6 w-20 animate-pulse rounded-md bg-[var(--cream-2)]"
          />
        ))}
      </div>

      {/* Info tiles strip placeholder */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--cream-2)] bg-white px-4 py-2">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="h-6 w-28 animate-pulse rounded-lg bg-[var(--cream-2)]"
          />
        ))}
        <div className="ml-auto h-7 w-44 animate-pulse rounded-lg bg-[var(--cream-2)]" />
      </div>

      <div className="flex-1 overflow-auto bg-[var(--cream)] p-5 md:p-7">
        {/* Candidate summary card placeholder */}
        <div className="mb-5 flex items-center gap-4 rounded-xl border border-[var(--cream-2)] bg-white p-4">
          <div className="size-14 shrink-0 animate-pulse rounded-xl bg-[var(--cream-2)]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-44 animate-pulse rounded-md bg-[var(--cream-2)]" />
            <div className="h-3 w-28 animate-pulse rounded-md bg-[var(--cream-2)]" />
          </div>
        </div>

        {/* Body content placeholder */}
        <div className="space-y-3">
          <div className="h-40 animate-pulse rounded-xl border border-[var(--cream-2)] bg-white" />
          <div className="h-64 animate-pulse rounded-xl border border-[var(--cream-2)] bg-white" />
        </div>
      </div>
    </div>
  );
}
