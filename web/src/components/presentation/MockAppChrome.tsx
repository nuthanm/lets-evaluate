import { cn } from "@/lib/utils";

const NAV = [
  { id: "dashboard", label: "Home", icon: "⌂" },
  { id: "evaluate", label: "Cases", icon: "◈" },
  { id: "pipeline", label: "Flow", icon: "▤" },
  { id: "booking", label: "Schedule", icon: "◷" },
  { id: "assignments", label: "Queue", icon: "☰" },
  { id: "audit", label: "Log", icon: "◎" },
];

export function MockAppChrome({
  activeId,
  pageTitle,
  pageSubtitle,
  children,
}: {
  activeId: string;
  pageTitle: string;
  pageSubtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pres-mock-frame">
      <aside className="pres-mock-sidebar" aria-hidden>
        <div className="pres-mock-logo">LE</div>
        <nav className="pres-mock-nav">
          {NAV.map((item) => (
            <div
              key={item.id}
              className={cn(
                "pres-mock-nav-item",
                activeId === item.id && "pres-mock-nav-item-active",
              )}
              title={item.label}
            >
              <span>{item.icon}</span>
            </div>
          ))}
        </nav>
      </aside>
      <div className="pres-mock-main">
        <header className="pres-mock-header">
          <div>
            <h3 className="pres-mock-page-title">{pageTitle}</h3>
            {pageSubtitle ? (
              <p className="pres-mock-page-sub">{pageSubtitle}</p>
            ) : null}
          </div>
          <span className="pres-mock-demo-badge">Preview</span>
        </header>
        <div className="pres-mock-body">{children}</div>
      </div>
    </div>
  );
}

export function MockStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "cyan" | "green" | "orange";
}) {
  return (
    <div className={cn("pres-mock-stat", tone !== "default" && `pres-mock-stat-${tone}`)}>
      <span className="pres-mock-stat-label">{label}</span>
      <span className="pres-mock-stat-value">{value}</span>
    </div>
  );
}

export function MockPill({
  children,
  tone = "cyan",
}: {
  children: React.ReactNode;
  tone?: "cyan" | "green" | "orange" | "neutral";
}) {
  return (
    <span className={cn("pres-mock-pill", `pres-mock-pill-${tone}`)}>
      {children}
    </span>
  );
}
