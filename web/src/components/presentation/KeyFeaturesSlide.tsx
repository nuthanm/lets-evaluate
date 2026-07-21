"use client";

import { KEY_FEATURES } from "@/lib/presentation/key-features";
import { cn } from "@/lib/utils";

export function KeyFeaturesSlide() {
  return (
    <div className="pres-features">
      <div className="pres-stagger">
        <p className="pres-kicker">Key features</p>
        <h2 className="pres-title mt-3 text-[clamp(1.6rem,3.5vw,2.35rem)]">
          Everything in one evaluation portal
        </h2>
        <p className="pres-subtitle mt-2 text-[14px]">
          Purpose-built modules — not a generic ATS with an AI bolt-on.
        </p>
      </div>

      <div className="pres-features-bento">
        {KEY_FEATURES.map((feature, i) => (
          <article
            key={feature.id}
            className={cn(
              "pres-feature-card",
              `pres-feature-tone-${feature.tone}`,
              feature.size === "wide" && "pres-feature-wide",
              feature.size === "tall" && "pres-feature-tall",
            )}
            style={{ animationDelay: `${0.06 * i}s` }}
          >
            <div className="pres-feature-shimmer" aria-hidden />
            <div className="pres-feature-inner">
              <div className="pres-feature-top">
                <span className={cn("pres-feature-badge", `pres-feature-badge-${feature.tone}`)}>
                  {feature.badge}
                </span>
                <span className="pres-feature-accent" aria-hidden />
              </div>
              <h3 className="pres-feature-title">{feature.title}</h3>
              <p className="pres-feature-desc">{feature.description}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
