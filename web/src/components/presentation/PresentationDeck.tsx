"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/Button";
import { useBrand } from "@/components/BrandContext";
import type { BrandConfig } from "@/lib/brand";
import { PageShowcaseCarousel } from "@/components/presentation/PageShowcaseCarousel";
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

const SLIDE_COUNT = 8;
const SHOWCASE_SLIDE_INDEX = 7;

export function PresentationDeck() {
  const brand = useBrand();
  const [slide, setSlide] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [exiting, setExiting] = useState(false);

  const progress = ((slide + 1) / SLIDE_COUNT) * 100;
  const isShowcase = slide === SHOWCASE_SLIDE_INDEX;

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
            <span className="hidden sm:inline">{brand.orgName} · Approval brief</span>
            <span>
              {slide + 1} / {SLIDE_COUNT}
            </span>
          </div>
        </header>

        <main className={cn("pres-stage", isShowcase && "pres-stage-wide")}>
          <div
            key={animKey}
            className={cn(
              "pres-slide",
              isShowcase && "pres-slide-wide",
              exiting && "pres-slide-out",
            )}
          >
            {slide === 0 && <SlideTitle brand={brand} />}
            {slide === 1 && <SlideProblem />}
            {slide === 2 && <SlideSolution />}
            {slide === 3 && <SlideCompare />}
            {slide === 4 && <SlideCost />}
            {slide === 5 && <SlideBuilt />}
            {slide === 6 && <SlideAsk />}
            {slide === 7 && <PageShowcaseCarousel />}
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
      <p className="pres-kicker mx-auto">Internal approval · July 2026</p>
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
        Purpose-built for technical hiring — not a generic ATS module.
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
        Next slide → product showcase with interactive screen previews
      </p>
    </div>
  );
}
