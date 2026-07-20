export default function PeoplePLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--cream-2)]" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-[var(--cream-2)]" />
      </div>

      {/* Stat blocks */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-[var(--cream-2)] bg-[var(--cream)]"
          />
        ))}
      </div>

      {/* Main dashboard cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-80 animate-pulse rounded-xl border border-[var(--cream-2)] bg-[var(--cream)]"
          />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-lg bg-[var(--cream-2)]"
          />
        ))}
      </div>
    </div>
  );
}
