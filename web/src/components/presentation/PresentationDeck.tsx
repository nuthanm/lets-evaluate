"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/Button";
import { useBrand } from "@/components/BrandContext";
import type { BrandConfig } from "@/lib/brand";
import { AIStrengthsSlide } from "@/components/presentation/AIStrengthsSlide";
import { KeyFeaturesSlide } from "@/components/presentation/KeyFeaturesSlide";
import { PageShowcaseCarousel } from "@/components/presentation/PageShowcaseCarousel";
import { PlatformStackSlide } from "@/components/presentation/PlatformStackSlide";
import { WorkflowVisualizationSlide } from "@/components/presentation/WorkflowVisualizationSlide";
import { cn } from "@/lib/utils";

type CompareRow = {
  label: string;
  le: number;
  zoho: number;
  leLabel: string;
  zohoLabel: string;
};

const COMPARE_ROWS: CompareRow[] = [
  { label: "Cost efficiency", le: 92, zoho: 38, leLabel: "Usage-based", zohoLabel: "Per-seat" },
  { label: "AI transparency", le: 95, zoho: 35, leLabel: "Full breakdown", zohoLabel: "Opaque score" },
  { label: "Ease of use", le: 88, zoho: 52, leLabel: "Focused flow", zohoLabel: "Complex modules" },
  { label: "Evaluation depth", le: 94, zoho: 42, leLabel: "Structured interviews", zohoLabel: "Basic pipeline" },
  { label: "ATS breadth", le: 35, zoho: 92, leLabel: "Eval core only", zohoLabel: "Full funnel" },
];

type CompetitiveRow = {
  criteria: string;
  zoho: { stars: number; note: string };
  le: { stars: number; note: string };
};

const COMPETITIVE_MATRIX: CompetitiveRow[] = [
  {
    criteria: "Security",
    zoho: { stars: 4, note: "Enterprise certs" },
    le: { stars: 3, note: "Self-hosted control; 2FA gap" },
  },
  {
    criteria: "Cost",
    zoho: { stars: 2, note: "Per-seat adds up" },
    le: { stars: 5, note: "Usage-based, no seat tax" },
  },
  {
    criteria: "Performance",
    zoho: { stars: 3, note: "Can lag" },
    le: { stars: 4, note: "Optimized eval path" },
  },
  {
    criteria: "Transparency",
    zoho: { stars: 2, note: "Opaque AI" },
    le: { stars: 5, note: "Full AI + cost visibility" },
  },
  {
    criteria: "Ease of use",
    zoho: { stars: 2, note: "Complex" },
    le: { stars: 4, note: "Focused workflow" },
  },
  {
    criteria: "ATS breadth",
    zoho: { stars: 5, note: "Full funnel" },
    le: { stars: 2, note: "By design" },
  },
  {
    criteria: "Technical evaluation depth",
    zoho: { stars: 2, note: "Basic pipeline" },
    le: { stars: 5, note: "Structured interviews" },
  },
];

const SLIDE_COUNT = 13;
const WORKFLOW_SLIDE_INDEX = 3;
const AI_SLIDE_INDEX = 4;
const FEATURES_SLIDE_INDEX = 5;
const STACK_SLIDE_INDEX = 11;
const SHOWCASE_SLIDE_INDEX = 12;

export function PresentationDeck() {
  const brand = useBrand();
  const [slide, setSlide] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [exiting, setExiting] = useState(false);

  const progress = ((slide + 1) / SLIDE_COUNT) * 100;
  const isStack = slide === STACK_SLIDE_INDEX;
  const isWide =
    isStack ||
    slide === SHOWCASE_SLIDE_INDEX ||
    slide === WORKFLOW_SLIDE_INDEX ||
    slide === AI_SLIDE_INDEX ||
    slide === FEATURES_SLIDE_INDEX;

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
            {slide === WORKFLOW_SLIDE_INDEX && <WorkflowVisualizationSlide />}
            {slide === AI_SLIDE_INDEX && <AIStrengthsSlide />}
            {slide === FEATURES_SLIDE_INDEX && <KeyFeaturesSlide />}
            {slide === 6 && <SlideCompare />}
            {slide === 7 && <SlideCost />}
            {slide === 8 && <SlideBuilt />}
            {slide === 9 && <SlideAsk />}
            {slide === 10 && <SlideCompetitiveMatrix />}
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
        {brand.appTitle}
        <span className="mt-2 block text-[var(--cyan-d)]">vs Zoho Recruit</span>
      </h1>
      <p className="pres-subtitle mx-auto">
        Zoho tracks candidates. We evaluate them — with project-aligned AI,
        full transparency, and structured interviews in one portal.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <span className="pres-pill pres-pill-win">AI assists</span>
        <span className="pres-pill pres-pill-win">Humans decide</span>
        <span className="pres-pill pres-pill-win">60–80% lower cost</span>
      </div>
    </div>
  );
}

function SlideProblem() {
  const pains = [
    ["Generic resume parsing", "No project or tech-stack context at screen time"],
    ["Fragmented workflow", "TA in Zoho · interviewers prep elsewhere"],
    ["Opaque AI matching", "Enterprise tier · leadership can't audit decisions"],
    ["Per-seat licensing", "~₹5,000–7,500/mo for 3 recruiters + add-ons"],
  ];

  return (
    <div className="pres-stagger">
      <p className="pres-kicker">The problem</p>
      <h2 className="pres-title mt-4">Zoho Recruit tracks. It doesn&apos;t evaluate.</h2>
      <p className="pres-subtitle">
        The leak is between screening and interview — where we lose the most time.
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
    ["01", "Configure", "Projects, roles, question bank"],
    ["02", "Screen", "Resume parsed against your stack"],
    ["03", "Assign", "Panel sees the same AI output"],
    ["04", "Decide", "Structured interview + PDF + audit"],
  ];

  return (
    <div className="pres-stagger">
      <p className="pres-kicker">Our solution</p>
      <h2 className="pres-title mt-4">One portal. End-to-end evaluation.</h2>
      <p className="pres-subtitle">
        Purpose-built for technical hiring — not a generic ATS module. Next → animated
        workflow for each module.
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

function SlideCompare() {
  return (
    <div className="pres-stagger">
      <p className="pres-kicker">Head-to-head</p>
      <h2 className="pres-title mt-4">Where we win</h2>
      <div className="mt-8 space-y-4">
        {COMPARE_ROWS.map((row) => (
          <div key={row.label} className="pres-card">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-extrabold">{row.label}</span>
              <span className="pres-pill pres-pill-win text-[10px]">
                Let&apos;s Evaluate
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-[11px] font-semibold text-[var(--cyan-d)]">
                  {row.leLabel}
                </span>
                <div className="pres-metric-bar flex-1">
                  <div
                    className="pres-metric-fill bg-[var(--cyan)]"
                    style={{ width: `${row.le}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-[11px] font-semibold text-[var(--ink-faint)]">
                  {row.zohoLabel}
                </span>
                <div className="pres-metric-bar flex-1">
                  <div
                    className="pres-metric-fill bg-[var(--cream-2)]"
                    style={{ width: `${row.zoho}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideCost() {
  return (
    <div className="pres-stagger">
      <p className="pres-kicker">Cost</p>
      <h2 className="pres-title mt-4">~60–80% lower for evaluation teams</h2>
      <p className="pres-subtitle">
        3 recruiters · 5,000 AI screenings per year · annual estimate
      </p>
      <div className="pres-grid-2 mt-8">
        <div className="pres-card border-[var(--orange-soft)] bg-[var(--orange-soft)]/30">
          <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--orange)]">
            Zoho Recruit Standard
          </div>
          <div className="font-serif mt-2 text-4xl font-bold">~₹1.1L</div>
          <p className="mt-1 text-[13px] text-[var(--ink-soft)]">/ year + GST · per-seat</p>
        </div>
        <div className="pres-card border-[var(--green-soft)] bg-[var(--green-soft)]/40">
          <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--green)]">
            Let&apos;s Evaluate
          </div>
          <div className="font-serif mt-2 text-4xl font-bold">~₹35K</div>
          <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
            / year · hosting + ~₹550 AI
          </p>
        </div>
      </div>
      <p className="mt-6 text-center text-[13px] text-[var(--ink-faint)]">
        Every AI rupee visible in the admin dashboard — not a black-box subscription.
      </p>
    </div>
  );
}

function SlideBuilt() {
  const built = [
    "AI resume screening (project + role aligned)",
    "Pipeline, booking, interviewer assignment",
    "Structured interview workspace + PDF reports",
    "Mail templates, audit log, bulk CSV import",
  ];
  const gaps = [
    ["2FA", "1–2 weeks · free"],
    ["Auto-email triggers", "2–3 weeks · Graph/Resend"],
    ["Calendar sync", "3–4 weeks · free APIs"],
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

function SlideCompetitiveMatrix() {
  return (
    <div className="pres-stagger">
      <p className="pres-kicker">Competitive scorecard</p>
      <h2 className="pres-title mt-4">How we compete with mature Zoho Recruit</h2>
      <p className="pres-subtitle">
        Honest ratings across seven dimensions — strengths and trade-offs before the
        product walkthrough.
      </p>

      <div className="pres-scorecard mt-6">
        <div className="pres-scorecard-head">
          <span className="pres-scorecard-criteria">Criteria</span>
          <span className="pres-scorecard-col pres-scorecard-col-zoho">Zoho Recruit</span>
          <span className="pres-scorecard-col pres-scorecard-col-le">Let&apos;s Evaluate</span>
        </div>

        {COMPETITIVE_MATRIX.map((row) => {
          const leWins = row.le.stars > row.zoho.stars;
          const zohoWins = row.zoho.stars > row.le.stars;

          return (
            <div key={row.criteria} className="pres-scorecard-row">
              <div className="pres-scorecard-criteria">{row.criteria}</div>
              <div
                className={cn(
                  "pres-scorecard-cell pres-scorecard-col-zoho",
                  zohoWins && "pres-scorecard-cell-win-zoho",
                )}
              >
                <StarRating score={row.zoho.stars} />
                <span className="pres-scorecard-note">{row.zoho.note}</span>
              </div>
              <div
                className={cn(
                  "pres-scorecard-cell pres-scorecard-col-le",
                  leWins && "pres-scorecard-cell-win-le",
                )}
              >
                <StarRating score={row.le.stars} />
                <span className="pres-scorecard-note">{row.le.note}</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-center text-[13px] text-[var(--ink-faint)]">
        Next → platform stack, then live product showcase
      </p>
    </div>
  );
}

function StarRating({ score }: { score: number }) {
  return (
    <span className="pres-stars" aria-label={`${score} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn("pres-star", i < score && "pres-star-filled")}
          aria-hidden
        >
          ★
        </span>
      ))}
    </span>
  );
}

function SlideAsk() {
  return (
    <div className="pres-stagger text-center">
      <p className="pres-kicker mx-auto">The ask</p>
      <h2 className="pres-title mt-4">90-day internal pilot</h2>
      <p className="pres-subtitle mx-auto">
        Low risk, reversible. Keep Zoho for posting if needed — replace the
        evaluation workflow where we lose time.
      </p>
      <div className="pres-grid-2 mx-auto mt-8 max-w-lg text-left">
        {[
          "Approve pilot for TA + 5–10 interviewers",
          "Budget ~₹3,000/mo (hosting + OpenAI)",
          "Review at Day 30 and Day 90",
          "Success: cycle time, panel rejection rate, AI cost",
        ].map((item) => (
          <div key={item} className="pres-card text-[13px] font-semibold">
            {item}
          </div>
        ))}
      </div>
      <p className="mt-6 text-[13px] text-[var(--ink-faint)]">
        Next → competitive scorecard
      </p>
    </div>
  );
}
