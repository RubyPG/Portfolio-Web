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
import type { PatternWavesOptions } from "./pattern-waves-settings";
import styles from "./PatternWaves.module.css";

export interface PatternWavesHandle {
  /** Reversible band translation: 0 is the intact surface, 1 is empty. */
  setExitProgress(progress: number): void;
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
  const controller = useRef<PatternWavesController | null>(null);
  const options = useRef<PatternWavesOptions>({ active, ...props });
  const previousProps = useRef<PatternWavesOptions>({ active, ...props });
  const exit = useRef(0);

  useImperativeHandle(
    ref,
    () => ({
      setExitProgress(progress) {
        if (exit.current === progress) return;
        exit.current = progress;
        controller.current?.setExitProgress(progress);
      },
      setActive(next) {
        if (options.current.active === next) return;
        options.current.active = next;
        controller.current?.update({ active: next });
      },
    }),
    [],
  );

  useEffect(() => {
    if (!root.current || !canvas.current) return;
    controller.current = createPatternWaves(
      root.current,
      canvas.current,
      options.current,
      exit.current,
    );
    return () => {
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
      controller.current?.update(changed);
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
    </div>
  );
}
