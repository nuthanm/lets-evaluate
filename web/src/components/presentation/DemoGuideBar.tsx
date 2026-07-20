"use client";

import "@/styles/presentation.css";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DEMO_STORAGE_KEY,
  DEMO_STEPS,
  stepIndexForPath,
} from "@/lib/presentation/demo-steps";

export function DemoGuideBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(localStorage.getItem(DEMO_STORAGE_KEY) === "1");
  }, [pathname]);

  if (!active) return null;

  const stepIndex = stepIndexForPath(pathname);
  const step = stepIndex >= 0 ? DEMO_STEPS[stepIndex] : null;
  const displayIndex = stepIndex >= 0 ? stepIndex : 0;
  const displayStep = step ?? DEMO_STEPS[0];

  const prev = displayIndex > 0 ? DEMO_STEPS[displayIndex - 1] : null;
  const next =
    displayIndex < DEMO_STEPS.length - 1 ? DEMO_STEPS[displayIndex + 1] : null;

  function exitDemo() {
    localStorage.removeItem(DEMO_STORAGE_KEY);
    setActive(false);
    router.push("/presentation");
  }

  return (
    <div className="demo-guide-bar" role="region" aria-label="Demo guide">
      <div className="demo-guide-inner">
        <div className="min-w-0 flex-1">
          <div className="demo-guide-step">
            Demo · Step {displayIndex + 1} of {DEMO_STEPS.length}
            {stepIndex < 0 && pathname !== displayStep.path ? (
              <span className="ml-2 normal-case tracking-normal text-white/50">
                (navigate to match this step)
              </span>
            ) : null}
          </div>
          <div className="demo-guide-title">{displayStep.title}</div>
          <p className="demo-guide-hint">{displayStep.hint}</p>
        </div>

        <div className="demo-guide-actions">
          {prev ? (
            <Link href={prev.path} className="demo-guide-btn">
              ← {prev.title}
            </Link>
          ) : null}
          {next ? (
            <Link href={next.path} className="demo-guide-btn demo-guide-btn-primary">
              {next.title} →
            </Link>
          ) : (
            <button
              type="button"
              className="demo-guide-btn demo-guide-btn-primary"
              onClick={exitDemo}
            >
              Finish demo
            </button>
          )}
          <button type="button" className="demo-guide-btn" onClick={exitDemo}>
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}

export function DemoGuideShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pad, setPad] = useState(false);

  useEffect(() => {
    setPad(localStorage.getItem(DEMO_STORAGE_KEY) === "1");
  }, [pathname]);

  return (
    <div className={pad ? "demo-guide-shell-pad" : undefined}>
      {children}
      <DemoGuideBar />
    </div>
  );
}
