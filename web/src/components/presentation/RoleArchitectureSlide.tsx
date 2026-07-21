"use client";

import { useCallback, useEffect, useState } from "react";
import { ROLE_WORKFLOWS } from "@/lib/presentation/role-workflows";
import { cn } from "@/lib/utils";

const CYCLE_MS = 5200;

export function RoleArchitectureSlide() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [stepPhase, setStepPhase] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const role = ROLE_WORKFLOWS[activeIndex]!;
  const stepCount = role.steps.length;

  const goToRole = useCallback((index: number) => {
    if (index < 0 || index >= ROLE_WORKFLOWS.length) return;
    setActiveIndex(index);
    setStepPhase(0);
    setAnimKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const stepTimer = window.setInterval(() => {
      setStepPhase((p) => (p + 1) % (stepCount + 1));
    }, 850);

    return () => window.clearInterval(stepTimer);
  }, [activeIndex, stepCount]);

  useEffect(() => {
    const roleTimer = window.setInterval(() => {
      setActiveIndex((i) => {
        const next = (i + 1) % ROLE_WORKFLOWS.length;
        setStepPhase(0);
        setAnimKey((k) => k + 1);
        return next;
      });
    }, CYCLE_MS);

    return () => window.clearInterval(roleTimer);
  }, []);

  return (
    <div className="pres-workflow">
      <div className="pres-stagger">
        <p className="pres-kicker">Architecture workflow</p>
        <h2 className="pres-title mt-3 text-[clamp(1.6rem,3.5vw,2.4rem)]">
          How each role moves through the portal
        </h2>
        <p className="pres-subtitle mt-2 text-[14px]">
          Recruiter, interviewer, manager, admin, and HR — each with a connected workflow.
        </p>
      </div>

      <div className="pres-workflow-modules" role="tablist" aria-label="Role workflows">
        {ROLE_WORKFLOWS.map((r, i) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={i === activeIndex}
            onClick={() => goToRole(i)}
            className={cn(
              "pres-workflow-module-tab",
              `pres-workflow-tone-${r.tone}`,
              i === activeIndex && "pres-workflow-module-tab-active",
            )}
          >
            <span className="pres-workflow-module-icon" aria-hidden>
              {r.icon}
            </span>
            <span className="pres-workflow-module-label">{r.role}</span>
          </button>
        ))}
      </div>

      <div
        key={animKey}
        className={cn("pres-workflow-stage", `pres-workflow-tone-${role.tone}`)}
      >
        <div className="pres-workflow-stage-head">
          <span className="pres-workflow-stage-icon" aria-hidden>
            {role.icon}
          </span>
          <div>
            <h3 className="pres-workflow-stage-title">{role.role}</h3>
            <p className="pres-workflow-stage-tagline">{role.tagline}</p>
          </div>
        </div>

        <div className="pres-workflow-steps" aria-label={`${role.role} workflow steps`}>
          {role.steps.map((step, i) => {
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
          <p>{role.outcome}</p>
        </div>
      </div>

      <div className="pres-workflow-progress" aria-hidden>
        {ROLE_WORKFLOWS.map((r, i) => (
          <span
            key={r.id}
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
