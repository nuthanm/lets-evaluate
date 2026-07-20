export default function CandidatesLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-[var(--cream-2)]" />
        <div className="h-4 w-80 animate-pulse rounded-lg bg-[var(--cream-2)]" />
      </div>

      {/* Action buttons skeleton */}
      <div className="flex gap-2">
        <div className="h-10 w-32 animate-pulse rounded-lg bg-[var(--cream-2)]" />
        <div className="h-10 w-40 animate-pulse rounded-lg bg-[var(--cream-2)]" />
      </div>

      {/* Stat blocks (4 columns) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-[var(--cream-2)] bg-[var(--cream)]"
          />
        ))}
      </div>

      {/* Candidates grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-xl border border-[var(--cream-2)] bg-[var(--cream)]"
          />
        ))}
      </div>
    </div>
  );
}
