"use client";

import { AI_STRENGTHS } from "@/lib/presentation/ai-strengths";

export function AIStrengthsSlide() {
  const highlighted = AI_STRENGTHS.filter((s) => s.highlight);
  const rest = AI_STRENGTHS.filter((s) => !s.highlight);

  return (
    <div className="pres-ai-slide">
      <div className="pres-stagger text-center">
        <p className="pres-kicker mx-auto">AI advantage</p>
        <h2 className="pres-title mt-3 text-[clamp(1.6rem,3.5vw,2.35rem)]">
          What makes our AI different
        </h2>
        <p className="pres-subtitle mx-auto mt-2 text-[14px]">
          Not a black-box score — project context, transparent cost, and humans always decide.
        </p>
      </div>

      <div className="pres-ai-hub" aria-hidden>
        <div className="pres-ai-hub-ring pres-ai-hub-ring-1" />
        <div className="pres-ai-hub-ring pres-ai-hub-ring-2" />
        <div className="pres-ai-hub-core">
          <span className="pres-ai-hub-icon">◈</span>
          <span className="pres-ai-hub-label">Project-aligned AI</span>
        </div>
      </div>

      <div className="pres-ai-highlight-row">
        {highlighted.map((s, i) => (
          <div
            key={s.id}
            className="pres-ai-card pres-ai-card-highlight"
            style={{ animationDelay: `${0.1 + i * 0.08}s` }}
          >
            <div className="pres-ai-card-glow" aria-hidden />
            <span className="pres-ai-card-icon">{s.icon}</span>
            <h3 className="pres-ai-card-title">{s.title}</h3>
            <p className="pres-ai-card-desc">{s.description}</p>
            <span className="pres-ai-card-contrast">{s.contrast}</span>
          </div>
        ))}
      </div>

      <div className="pres-ai-grid">
        {rest.map((s, i) => (
          <div
            key={s.id}
            className="pres-ai-card"
            style={{ animationDelay: `${0.35 + i * 0.07}s` }}
          >
            <span className="pres-ai-card-icon">{s.icon}</span>
            <h3 className="pres-ai-card-title">{s.title}</h3>
            <p className="pres-ai-card-desc">{s.description}</p>
            <span className="pres-ai-card-contrast">{s.contrast}</span>
          </div>
        ))}
      </div>

      <p className="pres-ai-footer">
        AI assists once · Panel reuses the same report · Leadership sees every rupee
      </p>
    </div>
  );
}
