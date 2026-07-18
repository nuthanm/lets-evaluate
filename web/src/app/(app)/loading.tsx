export default function AppLoading() {
  return (
    <div className="case-fade-in p-4 md:p-6">
      <div className="mb-4 h-6 w-44 animate-pulse rounded-md bg-[var(--cream-2)]" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="h-28 animate-pulse rounded-xl border border-[var(--cream-2)] bg-[var(--cream)]"
          />
        ))}
      </div>
    </div>
  );
}
