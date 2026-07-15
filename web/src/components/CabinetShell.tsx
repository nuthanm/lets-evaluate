"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Logo, LogoMark } from "@/components/Logo";
import { FaceAvatar } from "@/components/FaceAvatar";
import { LogoutButton } from "@/components/LogoutButton";
import type { MemberRole } from "@/lib/auth/config";
import { getRoleDisplayName } from "@/lib/auth/validation";
import { cn } from "@/lib/utils";
import {
  DashboardIcon,
  ProjectsIcon,
  RolesIcon,
  OpeningsIcon,
  CandidatesIcon,
  InterviewersIcon,
  BookingIcon,
  PipelineIcon,
  AssignmentsIcon,
  ArchivesIcon,
  CollapseIcon,
  LibraryIcon,
} from "@/components/NavIcons";

type IconType = (props: { className?: string }) => React.ReactElement;

type NavItem = {
  href: string;
  label: string;
  icon: IconType;
};

type NavSection = { label?: string; items: NavItem[] };

function navForRole(role: MemberRole): NavSection[] {
  if (role === "interviewer" || role === "manager" || role === "hr") {
    return [
      {
        items: [
          { href: "/people", label: "Dashboard", icon: DashboardIcon },
          { href: "/assignments", label: "My Assignments", icon: AssignmentsIcon },
          { href: "/library", label: "Question Library", icon: LibraryIcon },
          { href: "/archive", label: "Archives", icon: ArchivesIcon },
        ],
      },
    ];
  }

  if (role === "ta") {
    return [
      {
        items: [{ href: "/people", label: "Dashboard", icon: DashboardIcon }],
      },
      {
        label: "Talent",
        items: [
          { href: "/candidates", label: "Candidates", icon: CandidatesIcon },
          { href: "/interviewers", label: "Interviewers", icon: InterviewersIcon },
          { href: "/booking", label: "Booking", icon: BookingIcon },
        ],
      },
      {
        label: "Records",
        items: [
          { href: "/pipeline", label: "Pipeline", icon: PipelineIcon },
          { href: "/library", label: "Question Library", icon: LibraryIcon },
          { href: "/job-descriptions", label: "Job Descriptions", icon: RolesIcon },
          { href: "/archive", label: "Archives", icon: ArchivesIcon },
        ],
      },
    ];
  }

  return [
    {
      items: [{ href: "/people", label: "Dashboard", icon: DashboardIcon }],
    },
    {
      label: "Configuration",
      items: [
        { href: "/setup/projects", label: "Projects", icon: ProjectsIcon },
        { href: "/setup/locations", label: "Office locations", icon: ProjectsIcon },
        { href: "/setup/roles", label: "Roles", icon: RolesIcon },
        { href: "/setup/pipeline", label: "Interview Process", icon: PipelineIcon },
        { href: "/setup/templates", label: "Mail templates", icon: RolesIcon },
        { href: "/setup/mail-assets", label: "Mail assets", icon: ProjectsIcon },
        { href: "/setup/audit", label: "Audit log", icon: ArchivesIcon },
        { href: "/openings", label: "Openings", icon: OpeningsIcon },
      ],
    },
    {
      label: "Talent",
      items: [
        { href: "/candidates", label: "Candidates", icon: CandidatesIcon },
        { href: "/interviewers", label: "Interviewers", icon: InterviewersIcon },
        { href: "/booking", label: "Booking", icon: BookingIcon },
      ],
    },
    {
      label: "Records",
      items: [
        { href: "/pipeline", label: "Pipeline", icon: PipelineIcon },
        { href: "/library", label: "Question Library", icon: LibraryIcon },
        { href: "/job-descriptions", label: "Job Descriptions", icon: RolesIcon },
        { href: "/archive", label: "Archives", icon: ArchivesIcon },
      ],
    },
  ];
}

function mobileNavForRole(role: MemberRole) {
  if (role === "interviewer" || role === "manager" || role === "hr") {
    return [
      { href: "/people", label: "Home" },
      { href: "/assignments", label: "Queue" },
      { href: "/library", label: "Library" },
      { href: "/archive", label: "Archive" },
    ];
  }

  return [
    { href: "/people", label: "Home" },
    { href: "/candidates", label: "People" },
    { href: "/job-descriptions", label: "JD" },
    { href: "/evaluate/new", label: "+", accent: true as const },
    { href: "/booking", label: "Booking" },
    { href: "/archive", label: "Archive" },
  ];
}

const STORAGE_KEY = "sidebar:collapsed";

const collapseStore = {
  listeners: new Set<() => void>(),
  get() {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  },
  toggle() {
    const next = !this.get();
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    this.listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    collapseStore.listeners.add(listener);
    return () => collapseStore.listeners.delete(listener);
  },
};

export function CabinetShell({
  userName,
  userRole,
  navBadges,
  children,
}: {
  userName: string;
  userRole: MemberRole;
  navBadges?: { candidates?: number; booking?: number };
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const collapsed = useSyncExternalStore(
    (l) => collapseStore.subscribe(l),
    () => collapseStore.get(),
    () => false,
  );

  function toggleCollapsed() {
    collapseStore.toggle();
  }

  const sections = navForRole(userRole);

  function navBadge(href: string) {
    if (href === "/candidates" && navBadges?.candidates) {
      return navBadges.candidates;
    }
    if (href === "/booking" && navBadges?.booking) {
      return navBadges.booking;
    }
    return 0;
  }

  function isActive(item: NavItem) {
    const path = item.href.split("?")[0];
    if (path === "/people") return pathname === "/people";
    if (path === "/setup/projects") {
      return pathname === "/setup/projects" || pathname === "/setup";
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  return (
    <div className="min-h-screen bg-[var(--cream)] pb-20 md:h-screen md:overflow-hidden md:pb-6 md:pt-6">
      <div
        className={cn(
          "case-cabinet mx-auto flex min-h-[calc(100vh-3rem)] flex-col md:mx-6 md:h-[calc(100vh-3rem)] md:min-h-0 md:flex-row md:items-stretch",
        )}
      >
        <aside
          className={cn(
            "hidden shrink-0 flex-col overflow-x-clip border-b border-[var(--cream-2)] bg-[var(--cream-2)] transition-[width] duration-200 ease-out md:flex md:h-full md:rounded-l-xl md:border-b-0 md:border-r",
            collapsed ? "md:w-[74px]" : "md:w-[236px]",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 p-4",
              collapsed ? "justify-center px-2" : "justify-between",
            )}
          >
            {collapsed ? (
              <Link href="/people" aria-label="Home">
                <LogoMark />
              </Link>
            ) : (
              <Logo href="/people" />
            )}
            {!collapsed && (
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-[var(--ink-soft)] transition-colors hover:bg-white hover:text-[var(--ink)]"
              >
                <CollapseIcon className="size-[18px]" />
              </button>
            )}
          </div>

          {collapsed && (
            <div className="flex justify-center px-2 pb-1">
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label="Expand sidebar"
                title="Expand sidebar"
                className="grid size-8 place-items-center rounded-lg text-[var(--ink-soft)] transition-colors hover:bg-white hover:text-[var(--ink)]"
              >
                <CollapseIcon className="size-[18px] rotate-180" />
              </button>
            </div>
          )}

          <nav
            className="cabinet-nav flex min-h-0 flex-1 flex-col gap-1 overflow-x-clip overflow-y-auto px-2 py-2"
            aria-label="App navigation"
          >
            {sections.map((section, si) => (
              <div key={section.label ?? `s-${si}`} className="flex flex-col gap-0.5">
                {section.label &&
                  (collapsed ? (
                    <div className="mx-auto my-1.5 h-px w-6 bg-black/10" />
                  ) : (
                    <div className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
                      {section.label}
                    </div>
                  ))}
                {section.items.map((item) => {
                  const on = isActive(item);
                  const Icon = item.icon;
                  const badge = navBadge(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center rounded-lg text-[13px] font-semibold transition-colors",
                        collapsed
                          ? "justify-center px-2 py-2.5"
                          : "gap-3 px-3 py-2.5",
                        on
                          ? "bg-white text-[var(--ink)] shadow-[inset_3px_0_0_var(--cyan)]"
                          : "text-[var(--ink-soft)] hover:bg-white/60 hover:text-[var(--ink)]",
                      )}
                    >
                      <span
                        className={cn(
                          "relative grid size-8 shrink-0 place-items-center rounded-lg border transition-colors",
                          on
                            ? "border-[var(--cyan)] bg-[var(--cyan-soft)] text-[var(--cyan-d)]"
                            : "border-[var(--cream-2)] bg-white/40 text-[var(--ink-soft)]",
                        )}
                      >
                        <Icon className="size-[18px]" />
                        {badge > 0 && collapsed && (
                          <span className="absolute -right-1 -top-1 grid min-w-[16px] place-items-center rounded-full bg-[var(--orange)] px-1 text-[9px] font-bold text-white">
                            {badge > 9 ? "9+" : badge}
                          </span>
                        )}
                      </span>
                      {!collapsed && (
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-2 truncate">
                          <span className="truncate">{item.label}</span>
                          {badge > 0 && (
                            <span className="shrink-0 rounded-full bg-[var(--orange)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {badge}
                            </span>
                          )}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div
            className={cn(
              "shrink-0 border-t border-[var(--cream-2)]",
              collapsed ? "flex flex-col items-center gap-2 p-2" : "p-3",
            )}
          >
            {collapsed ? (
              <>
                <Link
                  href="/profile"
                  title={userName}
                  aria-label="Profile"
                  className={cn(
                    "grid place-items-center rounded-full transition-shadow hover:ring-2 hover:ring-[var(--cyan)]",
                    pathname === "/profile" && "ring-2 ring-[var(--cyan)]",
                  )}
                >
                  <FaceAvatar name={userName} size="sm" />
                </Link>
                <LogoutButton
                  compact
                  className="grid size-9 place-items-center rounded-lg p-0"
                />
              </>
            ) : (
              <>
                <Link
                  href="/profile"
                  className={cn(
                    "mb-2 flex items-center gap-2.5 rounded-lg px-1 py-1 transition-colors hover:bg-white/60",
                    pathname === "/profile" && "bg-white",
                  )}
                >
                  <FaceAvatar name={userName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold">{userName}</div>
                    <div className="truncate text-[11px] text-[var(--ink-faint)]">
                      {getRoleDisplayName(userRole)}
                    </div>
                  </div>
                </Link>
                <LogoutButton />
              </>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-white md:h-full md:min-h-0 md:overflow-y-auto md:rounded-r-xl">
          <div className="flex items-center justify-between border-b border-[var(--cream-2)] px-4 py-3 md:hidden">
            <Link href="/profile" className="flex min-w-0 items-center gap-2">
              <FaceAvatar name={userName} size="sm" />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-bold">{userName}</div>
                <div className="truncate text-[11px] text-[var(--ink-faint)]">
                  {getRoleDisplayName(userRole)}
                </div>
              </div>
            </Link>
            <LogoutButton className="!w-auto shrink-0 rounded-full px-3 py-1.5 text-[11px]" />
          </div>
          {children}
        </div>
      </div>

      <MobileNav pathname={pathname} role={userRole} />
    </div>
  );
}

function MobileNav({
  pathname,
  role,
}: {
  pathname: string;
  role: MemberRole;
}) {
  const items = mobileNavForRole(role);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-[var(--cream-2)] bg-white px-2 py-2 md:hidden"
      aria-label="Mobile navigation"
    >
      {items.map(({ href, label, accent }) => {
        const on =
          pathname === href ||
          (href !== "/people" && pathname.startsWith(href.replace("/new", "")));
        if (accent) {
          return (
            <Link
              key={href}
              href={href}
              className="grid size-11 place-items-center rounded-full bg-[var(--green)] text-xl font-bold text-white shadow-md"
              aria-label="New evaluation"
            >
              +
            </Link>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-full px-3 py-2 text-[10px] font-bold",
              on
                ? "bg-[var(--cyan-soft)] text-[var(--cyan-d)]"
                : "text-[var(--ink-faint)]",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
