import { cn } from "@/lib/utils";

const variants = {
  cyan: "border border-[var(--cyan)]/20 bg-[var(--cyan-soft)] text-[var(--cyan-d)]",
  green: "border border-[var(--green)]/20 bg-[var(--green-soft)] text-[var(--green)]",
  orange: "border border-[var(--orange)]/20 bg-[var(--orange-soft)] text-[var(--orange)]",
  red: "pill-red",
  neutral: "border border-[var(--cream-2)] bg-[var(--cream-2)] text-[var(--ink-soft)]",
} as const;

type PillProps = {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
  style?: React.CSSProperties;
};

export function Pill({ children, variant = "cyan", className, style }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold",
        variants[variant],
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}
