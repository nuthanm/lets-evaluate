import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "main" | "ghost" | "outline";
};

export function Button({
  variant = "main",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-sm font-bold transition-all disabled:opacity-50",
        variant === "main" &&
          "bg-[var(--ink)] text-white shadow-sm hover:bg-[var(--navy)] hover:-translate-y-px",
        variant === "ghost" &&
          "border border-[var(--cream-2)] bg-white text-[var(--ink)] hover:border-[var(--cyan)] hover:bg-[var(--cream)]",
        variant === "outline" &&
          "border border-[var(--cream-2)] bg-white text-[var(--ink)] hover:border-[var(--cyan)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "main",
  className,
  children,
}: {
  href: string;
  variant?: "main" | "ghost";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-sm font-bold transition-all",
        variant === "main" &&
          "bg-[var(--ink)] text-white shadow-sm hover:bg-[var(--navy)] hover:-translate-y-px",
        variant === "ghost" &&
          "border border-[var(--cream-2)] bg-white text-[var(--ink)] hover:border-[var(--cyan)] hover:bg-[var(--cream)]",
        className,
      )}
    >
      {children}
    </Link>
  );
}
