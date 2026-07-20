"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/people", label: "People", icon: PeopleIcon },
  { href: "/assignments", label: "Assignments", icon: AssignIcon },
  { href: "/evaluate", label: "Evaluate", icon: EvaluateIcon },
  { href: "/setup", label: "Setup", icon: SetupIcon },
  { href: "/archive", label: "Archive", icon: ArchiveIcon },
];

export function FloatingDock() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-[40px] bg-[var(--navy)] px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,.25)]"
      aria-label="Main navigation"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const on =
          pathname === href || (href !== "/people" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            prefetch
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-[28px] px-4 py-2.5 text-[10px] font-semibold transition-colors",
              on
                ? "bg-[var(--cyan)] text-white"
                : "text-white/45 hover:text-white/80",
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
      <Link
        href="/evaluate/new"
        prefetch
        className="ml-1 grid size-11 place-items-center rounded-full bg-[var(--green)] text-xl leading-none text-white"
        title="New evaluation"
        aria-label="New evaluation"
      >
        +
      </Link>
    </nav>
  );
}

function PeopleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function AssignIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function EvaluateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function SetupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42" />
    </svg>
  );
}

function ArchiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    </svg>
  );
}
