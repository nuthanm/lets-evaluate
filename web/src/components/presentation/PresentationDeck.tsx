"use client";

import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/Button";
import { useBrand } from "@/components/BrandContext";
import type { BrandConfig } from "@/lib/brand";
import { AIStrengthsSlide } from "@/components/presentation/AIStrengthsSlide";
import { KeyFeaturesSlide } from "@/components/presentation/KeyFeaturesSlide";
import { PageShowcaseCarousel } from "@/components/presentation/PageShowcaseCarousel";
import { PlatformStackSlide } from "@/components/presentation/PlatformStackSlide";
import { RoleArchitectureSlide } from "@/components/presentation/RoleArchitectureSlide";
import { WorkflowVisualizationSlide } from "@/components/presentation/WorkflowVisualizationSlide";
import { cn } from "@/lib/utils";

const SLIDE_COUNT = 11;
const AI_SLIDE_INDEX = 3;
const WORKFLOW_SLIDE_INDEX = 4;
const FEATURES_SLIDE_INDEX = 5;
const ROLE_ARCH_SLIDE_INDEX = 6;
const STACK_SLIDE_INDEX = 9;
const SHOWCASE_SLIDE_INDEX = 10;

const WIDE_SLIDES = new Set([
  WORKFLOW_SLIDE_INDEX,
  AI_SLIDE_INDEX,
  FEATURES_SLIDE_INDEX,
  ROLE_ARCH_SLIDE_INDEX,
  STACK_SLIDE_INDEX,
  SHOWCASE_SLIDE_INDEX,
]);

export function PresentationDeck() {
  const brand = useBrand();
  const [slide, setSlide] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [exiting, setExiting] = useState(false);

  const progress = ((slide + 1) / SLIDE_COUNT) * 100;
  const isWide = WIDE_SLIDES.has(slide);
  const isStack = slide === STACK_SLIDE_INDEX;

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= SLIDE_COUNT || next === slide) return;
      setExiting(true);
      window.setTimeout(() => {
        setSlide(next);
        setAnimKey((k) => k + 1);
        setExiting(false);
      }, 220);
    },
    [slide],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        go(slide + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(slide - 1);
      }
      if (e.key === "Home") go(0);
      if (e.key === "End") go(SLIDE_COUNT - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, slide]);

  return (
    <div className="pres-root">
      <div className="pres-progress" aria-hidden>
        <div className="pres-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="pres-shell">
        <header className="pres-header">
          <Logo href="/" />
          <div className="flex items-center gap-3 text-xs font-semibold text-[var(--ink-faint)]">
            <span className="hidden sm:inline">{brand.orgName} · The Brief</span>
            <span>
              {slide + 1} / {SLIDE_COUNT}
            </span>
          </div>
        </header>

        <main
          className={cn(
            "pres-stage",
            isWide && "pres-stage-wide",
            isStack && "pres-stage-stack",
          )}
        >
          <div
            key={animKey}
            className={cn(
              "pres-slide",
              isWide && "pres-slide-wide",
              isStack && "pres-slide-stack",
              exiting && "pres-slide-out",
            )}
          >
            {slide === 0 && <SlideTitle brand={brand} />}
            {slide === 1 && <SlideProblem />}
            {slide === 2 && <SlideSolution />}
            {slide === AI_SLIDE_INDEX && <AIStrengthsSlide />}
            {slide === WORKFLOW_SLIDE_INDEX && <WorkflowVisualizationSlide />}
            {slide === FEATURES_SLIDE_INDEX && <KeyFeaturesSlide />}
            {slide === ROLE_ARCH_SLIDE_INDEX && <RoleArchitectureSlide />}
            {slide === 7 && <SlideCost />}
            {slide === 8 && <SlideBuilt />}
            {slide === STACK_SLIDE_INDEX && <PlatformStackSlide />}
            {slide === SHOWCASE_SLIDE_INDEX && <PageShowcaseCarousel />}
          </div>
        </main>
      </div>

      <footer className="pres-footer">
        <button
          type="button"
          className="pres-nav-btn"
          disabled={slide === 0}
          onClick={() => go(slide - 1)}
          aria-label="Previous slide"
        >
          ←
        </button>

        <div className="flex items-center gap-1.5">
          {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => go(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === slide
                  ? "w-6 bg-[var(--cyan)]"
                  : "w-1.5 bg-[var(--cream-2)] hover:bg-[var(--cyan-soft)]",
              )}
            />
          ))}
        </div>

        {slide < SLIDE_COUNT - 1 ? (
          <button
            type="button"
            className="pres-nav-btn"
            onClick={() => go(slide + 1)}
            aria-label="Next slide"
          >
            →
          </button>
        ) : (
          <ButtonLink href="/login" className="px-5 py-2.5 text-xs">
            Try live app →
          </ButtonLink>
        )}
      </footer>
    </div>
  );
}

function SlideTitle({ brand }: { brand: BrandConfig }) {
  return (
    <div className="pres-stagger text-center">
      <p className="pres-kicker mx-auto">The Brief · July 2026</p>
      <h1 className="pres-title mt-5">
        {brand.orgName} Hiring
        <span className="mt-2 block text-[var(--cyan-d)]">What it actually does</span>
      </h1>
      <p className="pres-subtitle mx-auto">
        One portal for technical hiring — project-aligned AI screening, structured
        interviews, panel coordination, and full audit visibility.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <span className="pres-pill pres-pill-win">AI assists</span>
        <span className="pres-pill pres-pill-win">Humans decide</span>
        <span className="pres-pill pres-pill-win">End-to-end evaluation</span>
      </div>
    </div>
  );
}

function SlideProblem() {
  const pains = [
    [
      "Manual, fragmented process",
      "Screening happens in spreadsheets and email — no single source of truth for the team.",
    ],
    [
      "Missing or inconsistent screening",
      "Resumes reviewed without project or tech-stack context — generic keyword matching.",
    ],
    [
      "Interviewers lack context",
      "No shared questions, no prior-round feedback — each panel member starts from scratch.",
    ],
    [
      "No progress tracking",
      "Can't see where a candidate stands, what was covered, or what feedback is pending for the next round.",
    ],
  ];

  return (
    <div className="pres-stagger">
      <p className="pres-kicker">The problem</p>
      <h2 className="pres-title mt-4">The evaluation workflow is where we lose time</h2>
      <p className="pres-subtitle">
        Between screening and final decision — manual steps, missing context, and no
        visibility into interview feedback status.
      </p>
      <div className="pres-grid-2 mt-8">
        {pains.map(([title, desc]) => (
          <div key={title} className="pres-card">
            <div className="text-sm font-extrabold">{title}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-soft)]">
              {desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideSolution() {
  const steps = [
    ["01", "Configure", "Projects, roles, pipeline stages, question bank"],
    ["02", "Screen", "AI parses resume against your tech stack"],
    ["03", "Assign", "Book panel with shared AI report and handoff notes"],
    ["04", "Decide", "Structured interview, per-round feedback, PDF + audit"],
  ];

  return (
    <div className="pres-stagger">
      <p className="pres-kicker">Our solution</p>
      <h2 className="pres-title mt-4">One portal. End-to-end evaluation.</h2>
      <p className="pres-subtitle">
        Purpose-built for technical hiring — from first resume import to signed offer,
        with AI that assists and humans that decide.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {steps.map(([num, title, desc]) => (
          <div
            key={num}
            className="pres-card flex gap-4 border-l-[3px] border-l-[var(--cyan)]"
          >
            <span className="font-serif text-2xl font-bold text-[var(--cyan-d)]">
              {num}
            </span>
            <div>
              <div className="text-sm font-extrabold">{title}</div>
              <p className="mt-0.5 text-[13px] text-[var(--ink-soft)]">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideCost() {
  const items = [
    { label: "Cloud hosting", amount: "~₹1,500/mo", detail: "App server, database, storage" },
    { label: "OpenAI API", amount: "~₹1,200/mo", detail: "Resume screening + JD generation" },
    { label: "Email delivery", amount: "~₹200/mo", detail: "Transactional mail via Resend/Graph" },
    { label: "Domain & SSL", amount: "~₹100/mo", detail: "Certificate and DNS" },
  ];

  return (
    <div className="pres-stagger">
      <p className="pres-kicker">Cost</p>
      <h2 className="pres-title mt-4">Where the money goes</h2>
      <p className="pres-subtitle">
        Estimated monthly spend for a pilot team — every rupee visible in the admin dashboard.
      </p>
      <div className="mt-8 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="pres-card flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold">{item.label}</div>
              <p className="mt-0.5 text-[13px] text-[var(--ink-soft)]">{item.detail}</p>
            </div>
            <span className="font-serif shrink-0 text-xl font-bold text-[var(--cyan-d)]">
              {item.amount}
            </span>
          </div>
        ))}
      </div>
      <div className="pres-card mt-4 border-[var(--green-soft)] bg-[var(--green-soft)]/40 text-center">
        <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--green)]">
          Estimated total
        </div>
        <div className="font-serif mt-1 text-3xl font-bold">~₹3,000/mo</div>
        <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
          No per-seat licensing · usage-based AI · scales with volume
        </p>
      </div>
    </div>
  );
}

function SlideBuilt() {
  const built = [
    "AI resume screening (project + role aligned)",
    "Pipeline, booking, interviewer assignment",
    "Structured interview workspace + PDF reports",
    "Mail templates, audit log, bulk CSV import",
    "Job descriptions with AI assist + PDF/DOCX export",
    "Question library and role-based configuration",
  ];
  const gaps = [
    ["Third-party resume integration", "2–3 weeks · API connectors"],
    ["Bulk processing at scale", "2–3 weeks · background jobs"],
    ["SAML / SSO integration", "2–3 weeks · enterprise auth"],
    ["Calendar sync", "3–4 weeks · Graph/Google APIs"],
    ["Auto-email triggers", "2–3 weeks · Graph/Resend"],
  ];

  return (
    <div className="pres-stagger">
      <p className="pres-kicker">Honest status</p>
      <h2 className="pres-title mt-4">Built today · gaps with timelines</h2>
      <div className="pres-grid-2 mt-8">
        <div className="pres-card">
          <div className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--green)]">
            Demo-ready
          </div>
          <ul className="space-y-2 text-[13px] text-[var(--ink-soft)]">
            {built.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-[var(--green)]">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="pres-card">
          <div className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--orange)]">
            Roadmap
          </div>
          <ul className="space-y-2">
            {gaps.map(([item, time]) => (
              <li
                key={item}
                className="flex items-center justify-between gap-2 text-[13px]"
              >
                <span>{item}</span>
                <span className="pres-pill pres-pill-gap shrink-0 text-[10px]">
                  {time}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
