type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

export function ProjectsIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

export function RolesIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </svg>
  );
}

export function OpeningsIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden>
      <path d="M3 11l15-6v14L3 13z" />
      <path d="M3 11v2a2 2 0 0 0 2 2h1" />
      <path d="M7 15v3a1.5 1.5 0 0 0 3 0v-2" />
      <path d="M18 8a3 3 0 0 1 0 6" />
    </svg>
  );
}

export function CandidatesIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 4.2a3.2 3.2 0 0 1 0 6.1" />
      <path d="M18 14.2a5.5 5.5 0 0 1 3.5 5.1" />
    </svg>
  );
}

export function InterviewersIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden>
      <circle cx="10" cy="8" r="3.4" />
      <path d="M3.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="m16.5 11.5 1.6 1.6 3-3.2" />
    </svg>
  );
}

export function BookingIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v3M16 3v3" />
      <path d="m9 14.5 2 2 3.5-3.8" />
    </svg>
  );
}

export function PipelineIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden>
      <rect x="3" y="4" width="4.5" height="16" rx="1.2" />
      <rect x="9.75" y="4" width="4.5" height="11" rx="1.2" />
      <rect x="16.5" y="4" width="4.5" height="14" rx="1.2" />
    </svg>
  );
}

export function AssignmentsIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden>
      <rect x="4" y="4" width="16" height="17" rx="2" />
      <path d="M8 3v3M16 3v3M8 12l2 2 4-4" />
    </svg>
  );
}

export function ArchivesIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden>
      <rect x="3" y="4" width="18" height="4.5" rx="1.5" />
      <path d="M5 8.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5" />
      <path d="M10 12.5h4" />
    </svg>
  );
}

export function CollapseIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      <path d="m15.5 9-2.5 3 2.5 3" />
    </svg>
  );
}

export function LibraryIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden>
      <path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14" />
      <path d="M4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </svg>
  );
}
