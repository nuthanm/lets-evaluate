"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function LogoutButton({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await signOut({ redirect: false });
      // replace() clears history entry so Back cannot return to authenticated pages
      window.location.replace("/");
    } catch {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <div className="group/nav relative">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loading}
          aria-label="Sign out"
          title="Sign out"
          className={cn(
            "grid cursor-pointer place-items-center rounded-lg transition-colors",
            "text-[var(--ink-soft)] hover:text-red-600 hover:bg-red-50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-1/2 left-full z-50 ml-2 translate-y-1/2 whitespace-nowrap rounded-md bg-[var(--ink)] px-2.5 py-1.5 text-[12px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/nav:opacity-100"
        >
          {loading ? "Signing out…" : "Sign out"}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] font-semibold transition-colors",
        "text-[var(--ink-soft)] hover:text-red-600 hover:bg-red-50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
        aria-hidden
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5M21 12H9" />
      </svg>
      <span>{loading ? "Signing out…" : "Sign out"}</span>
    </button>
  );
}
