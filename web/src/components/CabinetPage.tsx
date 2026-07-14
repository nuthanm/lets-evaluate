import { cn } from "@/lib/utils";

export function CabinetPage({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("flex min-h-full flex-1 flex-col", className)}>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--cream-2)] bg-white px-6 py-5 md:px-7">
        <div>
          <h1 className="font-serif text-2xl font-bold">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-[13px] text-[var(--ink-faint)]">{subtitle}</p>
          )}
        </div>
        {actions}
      </header>
      <div className={cn("flex-1 bg-[var(--cream)] p-6 md:p-7", bodyClassName)}>
        {children}
      </div>
    </div>
  );
}

export function CaseCard({
  children,
  className,
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={cn("case-card", hover && "case-card-hover", className)}>{children}</div>
  );
}

export function CasePanel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("case-card overflow-hidden", className)}>
      <div className="case-panel-head">{title}</div>
      <div className="p-0">{children}</div>
    </section>
  );
}

export function StatBlock({
  label,
  value,
  icon,
  className,
  variant = "default",
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  variant?: "default" | "cyan" | "orange" | "green" | "purple" | "teal" | "navy";
}) {
  type Config = { borderColor: string; numColor: string; badgeBg: string; badgeText: string; labelColor: string };

  const configs: Record<string, Config> = {
    default: {
      borderColor: "border-t-4 border-t-[#cbd5e1]",
      numColor:    "#292929",
      badgeBg:    "#f1f5f9",
      badgeText:  "#64748b",
      labelColor: "#9a9a9a",
    },
    cyan: {
      borderColor: "border-t-4 border-t-[#23b0e6]",
      numColor:    "#1c8db8",
      badgeBg:    "#23b0e6",
      badgeText:  "#ffffff",
      labelColor: "#1c8db8",
    },
    orange: {
      borderColor: "border-t-4 border-t-[#e87722]",
      numColor:    "#e87722",
      badgeBg:    "#e87722",
      badgeText:  "#ffffff",
      labelColor: "#e87722",
    },
    green: {
      borderColor: "border-t-4 border-t-[#61a229]",
      numColor:    "#61a229",
      badgeBg:    "#61a229",
      badgeText:  "#ffffff",
      labelColor: "#61a229",
    },
    purple: {
      borderColor: "border-t-4 border-t-[#7c3aed]",
      numColor:    "#6d28d9",
      badgeBg:    "#7c3aed",
      badgeText:  "#ffffff",
      labelColor: "#7c3aed",
    },
    teal: {
      borderColor: "border-t-4 border-t-[#0f766e]",
      numColor:    "#0f766e",
      badgeBg:    "#0f766e",
      badgeText:  "#ffffff",
      labelColor: "#0f766e",
    },
    // navy kept as alias to purple for backward compat
    navy: {
      borderColor: "border-t-4 border-t-[#1a2b3c]",
      numColor:    "#1a2b3c",
      badgeBg:    "#1a2b3c",
      badgeText:  "#ffffff",
      labelColor: "#1a2b3c",
    },
  };

  const c = configs[variant] ?? configs.default;

  return (
    <div
      className={cn(
        "case-card relative flex flex-col justify-between overflow-hidden p-5",
        c.borderColor,
        className,
      )}
    >
      <p
        className="case-label"
        style={{ color: c.labelColor }}
      >
        {label}
      </p>
      <p
        className="font-serif mt-2 text-[2.8rem] font-bold leading-none"
        style={{ color: c.numColor }}
      >
        {value}
      </p>
      {icon && (
        <div
          className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-xl text-[1.1rem] font-bold"
          style={{ background: c.badgeBg, color: c.badgeText }}
          aria-hidden
        >
          {icon}
        </div>
      )}
    </div>
  );
}
