"use client";

import {
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type Ref,
} from "react";
import type { RadarController, RadarOptions, RadarView } from "./radar-engine";
import styles from "./Radar.module.css";

export type { RadarView } from "./radar-engine";

export interface RadarHandle {
  /** Load the engine before entering the section, without activating its GPU. */
  prepare(): void;
  /** Camera values are in degrees and normalized container coordinates. */
  setView(view: Partial<RadarView>): void;
  setActive(active: boolean): void;
}

export interface RadarProps extends Partial<RadarOptions> {
  ref?: Ref<RadarHandle>;
  className?: string;
  style?: CSSProperties;
}

/** Decorative React Bits radar; content and navigation stay in the surrounding DOM. */
export function Radar({
  ref,
  active = true,
  tilt = 64,
  centerX = 0.5,
  centerY = 0.92,
  scale = 1.7,
  color = "#479C73",
  speed = 0.35,
  glow = 0.3,
  opacity = 0.55,
  className,
  style,
}: RadarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controller = useRef<RadarController | null>(null);
  const options = useRef<RadarOptions>({
    active,
    tilt,
    centerX,
    centerY,
    scale,
    color,
    speed,
    glow,
    opacity,
  });
  const previousProps = useRef<RadarOptions>({
    active,
    tilt,
    centerX,
    centerY,
    scale,
    color,
    speed,
    glow,
    opacity,
  });
  const prepared = useRef(false);
  const load = useRef<() => void>(() => {});

  useImperativeHandle(
    ref,
    () => ({
      prepare() {
        prepared.current = true;
        load.current();
      },
      setView(view) {
        if (
          (view.tilt === undefined || view.tilt === options.current.tilt) &&
          (view.centerX === undefined ||
            view.centerX === options.current.centerX) &&
          (view.centerY === undefined ||
            view.centerY === options.current.centerY) &&
          (view.scale === undefined || view.scale === options.current.scale)
        )
          return;
        options.current = { ...options.current, ...view };
        controller.current?.update(view);
      },
      setActive(next) {
        if (options.current.active === next) return;
        options.current.active = next;
        controller.current?.update({ active: next });
        if (next) {
          prepared.current = true;
          load.current();
        }
      },
    }),
    [],
  );

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    let alive = true;
    let loading = false;
    load.current = () => {
      if (!alive || loading || controller.current) return;
      loading = true;
      void import("./radar-engine")
        .then(({ createRadar }) => {
          if (!alive) return;
          controller.current = createRadar(root, canvas, options.current);
        })
        .catch(() => {
          // The decorative fallback is the page's existing background.
          // A later explicit activation may retry a failed chunk request.
          loading = false;
        });
    };
    // Natural/reduced-motion flow can approach the section without story events.
    const proximity = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && options.current.active) load.current();
      },
      { rootMargin: "320px" },
    );
    proximity.observe(root);
    if (prepared.current) load.current();
    return () => {
      alive = false;
      proximity.disconnect();
      load.current = () => {};
      controller.current?.destroy();
      controller.current = null;
    };
  }, []);

  useEffect(() => {
    const nextProps: RadarOptions = {
      active,
      tilt,
      centerX,
      centerY,
      scale,
      color,
      speed,
      glow,
      opacity,
    };
    const changed: Partial<RadarOptions> = {};
    for (const key of Object.keys(nextProps) as (keyof RadarOptions)[]) {
      if (nextProps[key] !== previousProps.current[key])
        Object.assign(changed, { [key]: nextProps[key] });
    }
    previousProps.current = nextProps;
    if (!Object.keys(changed).length) return;
    options.current = { ...options.current, ...changed };
    controller.current?.update(changed);
    if (changed.active) {
      prepared.current = true;
      load.current();
    }
  }, [active, tilt, centerX, centerY, scale, color, speed, glow, opacity]);

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${className ?? ""}`}
      style={style}
      aria-hidden="true"
      data-radar
    >
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
