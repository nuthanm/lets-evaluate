export default function BookingLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-[var(--cream-2)]" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-[var(--cream-2)]" />
      </div>

      {/* Layout: sidebar + main */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Sidebar candidates list */}
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg border border-[var(--cream-2)] bg-[var(--cream)]"
            />
          ))}
        </div>

        {/* Main booking panel */}
        <div className="md:col-span-2 space-y-4">
          <div className="h-12 animate-pulse rounded-lg bg-[var(--cream-2)]" />
          <div className="h-64 animate-pulse rounded-xl border border-[var(--cream-2)] bg-[var(--cream)]" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-[var(--cream-2)]"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
