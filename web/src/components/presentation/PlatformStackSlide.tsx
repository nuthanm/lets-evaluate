"use client";

import { STACK_TILES, type StackTileTone } from "@/lib/presentation/stack-tiles";
import { cn } from "@/lib/utils";

const TONE_CAT: Record<StackTileTone, string> = {
  cyan: "text-[var(--cyan-d)]",
  green: "text-[var(--green)]",
  orange: "text-[var(--orange)]",
  planned: "text-[var(--orange)]",
  neutral: "text-[var(--ink-faint)]",
};

export function PlatformStackSlide() {
  return (
    <div className="pres-stack">
      <div className="pres-stagger">
        <p className="pres-kicker">Platform</p>
        <h2 className="pres-title mt-3 text-[clamp(1.5rem,3.5vw,2.25rem)]">
          Technology stack
        </h2>
        <p className="pres-subtitle mt-2 max-w-none text-[14px]">
          Versions from the live codebase · hover a tile to highlight · others keep
          drifting
        </p>
      </div>

      <div className="pres-stack-arena" aria-label="Platform technology stack">
        {STACK_TILES.map((tile) => (
          <div
            key={tile.id}
            className={cn("pres-stack-tile", `pres-stack-tile-${tile.tone}`)}
            style={{
              top: tile.top,
              left: tile.left,
              width: tile.width ?? 148,
            }}
          >
            <div
              className="pres-stack-tile-inner"
              style={{ animationDelay: `${tile.delay}s` }}
            >
              <div className={cn("pres-stack-tile-cat", TONE_CAT[tile.tone])}>
                {tile.category}
              </div>
              <div className="pres-stack-tile-name">{tile.name}</div>
              <div className="pres-stack-tile-ver">{tile.version}</div>
              <div className="pres-stack-tile-note">{tile.note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
