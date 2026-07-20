"use client";

import { useCallback, useEffect, useState } from "react";
import { ButtonLink } from "@/components/Button";
import { SHOWCASE_SLIDES } from "@/lib/presentation/showcase-slides";
import { MockPageById } from "./MockPages";
import { cn } from "@/lib/utils";

export function PageShowcaseCarousel() {
  const [index, setIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const slide = SHOWCASE_SLIDES[index]!;

  const go = useCallback((next: number) => {
    if (next < 0 || next >= SHOWCASE_SLIDES.length) return;
    setIndex(next);
    setAnimKey((k) => k + 1);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowUp" || (e.key === "ArrowLeft" && e.altKey)) {
        e.preventDefault();
        e.stopPropagation();
        go(index - 1);
      }
      if (e.key === "ArrowDown" || (e.key === "ArrowRight" && e.altKey)) {
        e.preventDefault();
        e.stopPropagation();
        go(index + 1);
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [go, index]);

  return (
    <div className="pres-showcase">
      <div className="pres-showcase-intro pres-stagger">
        <p className="pres-kicker">Product showcase</p>
        <h2 className="pres-title mt-3 text-[clamp(1.5rem,3.5vw,2.25rem)]">
          {slide.title}
        </h2>
        <p className="pres-subtitle mt-2 text-[14px]">{slide.caption}</p>
      </div>

      <div className="pres-showcase-layout">
        <div className="pres-showcase-preview-wrap">
          <div key={animKey} className="pres-showcase-preview pres-slide">
            <MockPageById id={slide.id} />
          </div>

          <div className="pres-showcase-highlights" aria-label="Feature highlights">
            {slide.highlights.map((h, i) => (
              <div
                key={h}
                className="pres-showcase-highlight"
                style={{ animationDelay: `${0.08 * i}s` }}
              >
                <span className="pres-showcase-highlight-dot" />
                {h}
              </div>
            ))}
          </div>
        </div>

        <aside className="pres-showcase-rail">
          <div className="pres-showcase-rail-label">Screens</div>
          <ul className="pres-showcase-thumbs">
            {SHOWCASE_SLIDES.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  className={cn(
                    "pres-showcase-thumb",
                    i === index && "pres-showcase-thumb-active",
                  )}
                aria-current={i === index ? "true" : undefined}
                >
                  <span className="pres-showcase-thumb-num">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="pres-showcase-thumb-title">{s.title}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="pres-showcase-nav">
            <button
              type="button"
              className="pres-nav-btn flex-1"
              disabled={index === 0}
              onClick={() => go(index - 1)}
              aria-label="Previous screen"
            >
              ← Prev
            </button>
            <span className="text-[11px] font-bold text-[var(--ink-faint)]">
              {index + 1}/{SHOWCASE_SLIDES.length}
            </span>
            <button
              type="button"
              className="pres-nav-btn flex-1"
              disabled={index === SHOWCASE_SLIDES.length - 1}
              onClick={() => go(index + 1)}
              aria-label="Next screen"
            >
              Next →
            </button>
          </div>

          <p className="pres-showcase-tip">
            Alt + ← → to browse screens without changing deck slide
          </p>

          <ButtonLink
            href="/login"
            variant="ghost"
            className="mt-3 w-full px-4 py-2.5 text-xs"
          >
            Open live app →
          </ButtonLink>
        </aside>
      </div>
    </div>
  );
}

export function PageShowcaseCarouselCompact() {
  const [index, setIndex] = useState(0);
  const slide = SHOWCASE_SLIDES[index]!;

  return (
    <div className="pres-showcase-compact">
      <MockPageById id={slide.id} />
      <div className="pres-showcase-compact-controls">
        {SHOWCASE_SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={s.title}
            onClick={() => setIndex(i)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === index ? "w-5 bg-[var(--cyan)]" : "w-1.5 bg-[var(--cream-2)]",
            )}
          />
        ))}
      </div>
      <p className="text-center text-[12px] font-semibold text-[var(--ink-soft)]">
        {slide.title}
      </p>
    </div>
  );
}
