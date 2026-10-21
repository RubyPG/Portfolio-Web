"use client";

import { useEffect, useRef, useState } from "react";
import { LandingStory } from "@/components/layout/LandingStory";
import CallChip from "@/components/ui/CallChip";
import styles from "./PortfolioIntro.module.css";

type IntroPhase = "loading" | "done" | "ready" | "fallback";

const MINIMUM_LOADING_MS = 900;
const MAXIMUM_LOADING_MS = 5_000;
const COMPLETION_MS = 650;

export function PortfolioIntro() {
  const root = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<IntroPhase>("loading");

  useEffect(() => {
    let disposed = false;
    const timers = new Set<number>();
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const wait = (milliseconds: number) =>
      new Promise<void>((resolve) => {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          resolve();
        }, milliseconds);
        timers.add(timer);
      });

    const prepare = async () => {
      const overlay = root.current?.querySelector<HTMLElement>(
        "[data-portfolio-loader]",
      );
      // If the CSS fallback already revealed the page, do not cover it again.
      if (overlay && getComputedStyle(overlay).visibility === "hidden") {
        setPhase("fallback");
        return;
      }
      const portrait = root.current?.querySelector<HTMLImageElement>(
        '[data-hero-layer="portrait"] img',
      );
      const assets = Promise.all([
        document.fonts.load('400 1em "League Gothic"'),
        document.fonts.load('400 1em "Amazed"'),
        portrait?.decode() ?? Promise.reject(new Error("Portrait unavailable")),
      ]).then(
        () => true,
        () => false,
      );

      let deadline: number;
      const timeout = new Promise<false>((resolve) => {
        deadline = window.setTimeout(() => resolve(false), MAXIMUM_LOADING_MS);
        timers.add(deadline);
      });
      // Once hydrated, the resource timeout owns the release deadline.
      if (overlay) overlay.style.animation = "none";

      const [loaded] = await Promise.all([
        Promise.race([assets, timeout]),
        wait(reducedMotion ? 0 : MINIMUM_LOADING_MS),
      ]);
      window.clearTimeout(deadline!);
      timers.delete(deadline!);
      if (disposed) return;

      // A missing resource must never trap visitors behind the introduction.
      if (!loaded || reducedMotion) {
        setPhase("ready");
        return;
      }

      setPhase("done");
      await wait(COMPLETION_MS);
      if (!disposed) setPhase("ready");
    };

    void prepare().catch(() => {
      if (!disposed) setPhase("ready");
    });
    return () => {
      disposed = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <div ref={root} data-portfolio-intro data-phase={phase}>
      <LandingStory
        ready={phase === "ready" || phase === "fallback"}
        animateIntro={phase === "ready"}
      />
      {(phase === "loading" || phase === "done") && (
        <div className={styles.overlay} data-portfolio-loader>
          <CallChip
            icon="terminal"
            name="portfolio"
            argument="RubenPG"
            status={phase === "loading" ? "running" : "done"}
            expectedMs={MINIMUM_LOADING_MS}
            size={38}
            radius={10}
            color="var(--paper)"
            surfaceColor="var(--ink)"
            progressColor="var(--accent)"
            progressOpacity={0.08}
            doneColor="var(--accent)"
            errorColor="var(--ink)"
            washOpacity={0.14}
            showTimer
          />
        </div>
      )}
      <noscript>
        <style>{`[data-portfolio-loader] { display: none !important; }`}</style>
      </noscript>
    </div>
  );
}
