"use client";

import {
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type Ref,
} from "react";
import {
  createPatternWaves,
  type PatternWavesController,
} from "./pattern-waves-engine";
import { clamp, type PatternWavesOptions } from "./pattern-waves-settings";
import {
  createTopography,
  type TopographyController,
} from "./topography-engine";
import styles from "./PatternWaves.module.css";

export interface PatternWavesHandle {
  /** Reversible band translation: 0 is the intact surface, 1 is empty. */
  setExitProgress(progress: number): void;
  /** Shared surface: Hero squares (0) to the project terrain (1). */
  setTerrainProgress(progress: number): void;
  setActive(active: boolean): void;
}

export interface PatternWavesProps extends PatternWavesOptions {
  ref?: Ref<PatternWavesHandle>;
  className?: string;
  style?: CSSProperties;
}

/** React Bits surface, kept independent from the Hero's text and portrait. */
export function PatternWaves({
  ref,
  className,
  style,
  active = true,
  ...props
}: PatternWavesProps) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const terrainCanvas = useRef<HTMLCanvasElement>(null);
  const topography = useRef<TopographyController | null>(null);
  const terrain = useRef(0);
  const controller = useRef<PatternWavesController | null>(null);
  const options = useRef<PatternWavesOptions>({ active, ...props });
  const previousProps = useRef<PatternWavesOptions>({ active, ...props });
  const exit = useRef(0);
  const applyTerrain = (progress: number) => {
    const p = clamp(progress, 0, 1);
    terrain.current = p;
    root.current?.toggleAttribute("data-terrain-morph", p > 0);
    const t = clamp((p - 0.08) / 0.84, 0, 1);
    const blend = t * t * (3 - 2 * t);
    root.current?.style.setProperty("--terrain-opacity", String(blend));
    root.current?.style.setProperty("--pattern-opacity", String(1 - blend));
    root.current?.style.removeProperty("--pattern-zoom");
    root.current?.style.removeProperty("--terrain-progress");
    controller.current?.setTerrainProgress(0);
    controller.current?.update({
      active: Boolean(options.current.active) && p < 0.92,
    });
    // Enter at the final camera pose. Only opacity changes with scroll.
    if (p > 0.08) topography.current?.setProgress(1);
    topography.current?.setActive(Boolean(options.current.active) && p > 0.08);
  };

  useImperativeHandle(
    ref,
    () => ({
      setExitProgress(progress) {
        if (exit.current === progress) return;
        exit.current = progress;
        controller.current?.setExitProgress(progress);
      },
      setTerrainProgress(progress) {
        if (terrain.current === progress) return;
        applyTerrain(progress);
      },
      setActive(next) {
        if (options.current.active === next) return;
        options.current.active = next;
        controller.current?.update({ active: next && terrain.current < 0.92 });
        topography.current?.setActive(next && terrain.current > 0.08);
      },
    }),
    [],
  );

  useEffect(() => {
    if (!root.current || !canvas.current || !terrainCanvas.current) return;
    controller.current = createPatternWaves(
      root.current,
      canvas.current,
      options.current,
      exit.current,
    );
    topography.current = createTopography(
      root.current,
      terrainCanvas.current,
      terrain.current > 0.08 ? 1 : 0,
      Boolean(options.current.active) && terrain.current > 0.08,
    );
    applyTerrain(terrain.current);
    return () => {
      topography.current?.destroy();
      topography.current = null;
      controller.current?.destroy();
      controller.current = null;
    };
  }, []);

  useEffect(() => {
    // Compare actual prop changes, not current imperative settings. A rerender
    // with the same active={false} must not undo LandingStory's setActive(true).
    const nextProps = { active, ...props };
    const keys = new Set<keyof PatternWavesOptions>([
      ...(Object.keys(previousProps.current) as (keyof PatternWavesOptions)[]),
      ...(Object.keys(nextProps) as (keyof PatternWavesOptions)[]),
    ]);
    const changed = Object.fromEntries(
      [...keys]
        .filter((key) => nextProps[key] !== previousProps.current[key])
        .map((key) => [key, nextProps[key]]),
    ) as PatternWavesOptions;
    if (Object.keys(changed).length) {
      options.current = { ...options.current, ...changed };
      controller.current?.update({
        ...changed,
        active: Boolean(options.current.active) && terrain.current < 0.92,
      });
      topography.current?.setActive(
        Boolean(options.current.active) && terrain.current > 0.08,
      );
    }
    previousProps.current = nextProps;
  });

  return (
    <div
      ref={root}
      className={`${styles.root} ${className ?? ""}`}
      style={style}
      aria-hidden="true"
      data-pattern-waves
    >
      <canvas ref={canvas} className={styles.canvas} />
      <svg
        className={styles.fallback}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        data-topography-fallback
      >
        {Array.from({ length: 22 }, (_, index) => (
          <path
            key={index}
            d={`M -160 ${650 + index * 13} C 120 ${660 + index * 9}, 200 ${150 + index * 18}, 430 ${180 + index * 18} S 720 ${830 - index * 8}, 930 ${580 - index * 7} S 1190 ${180 + index * 20}, 1600 ${240 + index * 19}`}
          />
        ))}
      </svg>
      <canvas ref={terrainCanvas} className={styles.terrain} data-topography />
    </div>
  );
}
