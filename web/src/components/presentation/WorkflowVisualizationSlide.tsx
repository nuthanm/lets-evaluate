"use client";

import { useCallback, useEffect, useState } from "react";
import { WORKFLOW_MODULES } from "@/lib/presentation/workflow-modules";
import { cn } from "@/lib/utils";

const CYCLE_MS = 4800;

export function WorkflowVisualizationSlide() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [stepPhase, setStepPhase] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const module = WORKFLOW_MODULES[activeIndex]!;
  const stepCount = module.steps.length;

  const goToModule = useCallback((index: number) => {
    if (index < 0 || index >= WORKFLOW_MODULES.length) return;
    setActiveIndex(index);
    setStepPhase(0);
    setAnimKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const stepTimer = window.setInterval(() => {
      setStepPhase((p) => (p + 1) % (stepCount + 1));
    }, 900);

    return () => window.clearInterval(stepTimer);
  }, [activeIndex, stepCount]);

  useEffect(() => {
    const moduleTimer = window.setInterval(() => {
      setActiveIndex((i) => {
        const next = (i + 1) % WORKFLOW_MODULES.length;
        setStepPhase(0);
        setAnimKey((k) => k + 1);
        return next;
      });
    }, CYCLE_MS);

    return () => window.clearInterval(moduleTimer);
  }, []);

  return (
    <div className="pres-workflow">
      <div className="pres-stagger">
        <p className="pres-kicker">Portal workflow</p>
        <h2 className="pres-title mt-3 text-[clamp(1.6rem,3.5vw,2.4rem)]">
          What this portal actually does
        </h2>
        <p className="pres-subtitle mt-2 text-[14px]">
          Six modules, one connected flow — from setup to signed offer.
        </p>
      </div>

      <div className="pres-workflow-modules" role="tablist" aria-label="Workflow modules">
        {WORKFLOW_MODULES.map((m, i) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={i === activeIndex}
            onClick={() => goToModule(i)}
            className={cn(
              "pres-workflow-module-tab",
              `pres-workflow-tone-${m.tone}`,
              i === activeIndex && "pres-workflow-module-tab-active",
            )}
          >
            <span className="pres-workflow-module-icon" aria-hidden>
              {m.icon}
            </span>
            <span className="pres-workflow-module-label">{m.title}</span>
          </button>
        ))}
      </div>

      <div
        key={animKey}
        className={cn(
          "pres-workflow-stage",
          `pres-workflow-tone-${module.tone}`,
        )}
      >
        <div className="pres-workflow-stage-head">
          <span className="pres-workflow-stage-icon" aria-hidden>
            {module.icon}
          </span>
          <div>
            <h3 className="pres-workflow-stage-title">{module.title}</h3>
            <p className="pres-workflow-stage-tagline">{module.tagline}</p>
          </div>
        </div>

        <div className="pres-workflow-steps" aria-label={`${module.title} workflow steps`}>
          {module.steps.map((step, i) => {
            const isActive = i <= stepPhase;
            const isCurrent = i === stepPhase;

            return (
              <div key={step.label} className="pres-workflow-step-wrap">
                {i > 0 && (
                  <div
                    className={cn(
                      "pres-workflow-connector",
                      isActive && "pres-workflow-connector-active",
                    )}
                    aria-hidden
                  >
                    <span className="pres-workflow-connector-flow" />
                  </div>
                )}
                <div
                  className={cn(
                    "pres-workflow-step",
                    isActive && "pres-workflow-step-active",
                    isCurrent && "pres-workflow-step-current",
                  )}
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className="pres-workflow-step-num">{String(i + 1).padStart(2, "0")}</div>
                  <div className="pres-workflow-step-body">
                    <div className="pres-workflow-step-label">{step.label}</div>
                    <div className="pres-workflow-step-detail">{step.detail}</div>
                  </div>
                  {isCurrent && <span className="pres-workflow-step-pulse" aria-hidden />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pres-workflow-outcome">
          <span className="pres-workflow-outcome-label">Outcome</span>
          <p>{module.outcome}</p>
        </div>
      </div>

      <div className="pres-workflow-progress" aria-hidden>
        {WORKFLOW_MODULES.map((m, i) => (
          <span
            key={m.id}
            className={cn(
              "pres-workflow-progress-dot",
              i === activeIndex && "pres-workflow-progress-dot-active",
            )}
          />
        ))}
      </div>
    </div>
  );
}
