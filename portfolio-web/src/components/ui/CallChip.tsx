"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CommandLineIcon,
  File02Icon,
  PencilEdit01Icon,
  RefreshIcon,
  Search01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

import "./CallChip.css";

export type CallChipStatus = "idle" | "running" | "done" | "error";

export interface CallChipProps {
  icon?: "terminal" | "file" | "search" | "edit" | ReactNode;
  name?: string;
  argument?: string;
  status?: CallChipStatus;
  expectedMs?: number;
  size?: number;
  radius?: number;
  color?: string;
  surfaceColor?: string;
  progressColor?: string;
  progressOpacity?: number;
  doneColor?: string;
  errorColor?: string;
  washOpacity?: number;
  shake?: number;
  showTimer?: boolean;
  onRetry?: () => void;
  className?: string;
  style?: CSSProperties;
}

const ICONS = {
  terminal: CommandLineIcon,
  file: File02Icon,
  search: Search01Icon,
  edit: PencilEdit01Icon,
};
const WORDS: Record<CallChipStatus, string> = {
  idle: "en espera",
  running: "cargando",
  done: "completado",
  error: "error",
};
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const SHAKE = [0, -1, 1, -0.66, 0.66, -0.33, 0];
const glyphOf = (status: CallChipStatus) =>
  status === "done" ? "check" : status === "error" ? "retry" : "tool";
const formatTime = (ms: number) =>
  ms < 10000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;

type ChipStyles = CSSProperties & Record<`--cc-${string}`, string>;

export default function CallChip({
  icon = "terminal",
  name = "bash",
  argument = "npm test",
  status = "running",
  expectedMs = 2500,
  size = 34,
  radius = 10,
  color = "currentColor",
  surfaceColor = "#27272a",
  progressColor = "currentColor",
  progressOpacity = 0.08,
  doneColor = "#22c55e",
  errorColor = "#ef4444",
  washOpacity = 0.14,
  shake = 6,
  showTimer = true,
  onRetry,
  className = "",
  style,
}: CallChipProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<HTMLSpanElement>(null);
  const previousStatusRef = useRef<CallChipStatus | null>(null);
  const progressRunRef = useRef<{ startedAt: number; duration: number } | null>(
    null,
  );
  const elapsedRef = useRef(0);
  const [initialStatus] = useState(status);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const fill = fillRef.current;
    const slot = slotRef.current;
    if (!root || !fill || !slot) return;

    const motion = window.matchMedia(MOTION_QUERY);
    const previousStatus = previousStatusRef.current;
    const currentGlyph = glyphOf(status);
    const previousGlyph = previousStatus ? glyphOf(previousStatus) : null;
    let shakeAnimation: Animation | undefined;

    slot.querySelectorAll<HTMLElement>("[data-glyph]").forEach((glyph) => {
      if (glyph.dataset.glyph === currentGlyph) glyph.dataset.state = "in";
      else if (glyph.dataset.glyph === previousGlyph)
        glyph.dataset.state = "out";
      else delete glyph.dataset.state;
    });

    const setFill = (fraction: number, instant: boolean) => {
      if (instant) fill.style.transition = "none";
      fill.style.transform = `scaleX(${fraction})`;
      if (instant) {
        // Commit the reset before starting the next CSS transition.
        void fill.offsetWidth;
        fill.style.transition = "";
      }
    };

    if (status === "running") {
      setFill(0, true);
      root.dataset.mounted = "";
      progressRunRef.current = {
        startedAt: performance.now(),
        duration: motion.matches ? 0 : Math.max(0, expectedMs),
      };
      setFill(0.9, motion.matches);
    } else if (status === "done") {
      setFill(1, !previousStatus || motion.matches);
    } else if (status === "error") {
      const transform = getComputedStyle(fill).transform;
      const run = progressRunRef.current;
      const fraction =
        previousStatus === "running" && run
          ? 0.9 *
            (run.duration > 0
              ? Math.min(1, (performance.now() - run.startedAt) / run.duration)
              : 1)
          : transform === "none"
            ? 0
            : new DOMMatrix(transform).a;
      setFill(Math.max(0, Math.min(1, fraction)), true);
      if (
        previousStatus &&
        previousStatus !== status &&
        shake > 0 &&
        !motion.matches
      ) {
        shakeAnimation = root.animate(
          SHAKE.map((step) => ({
            transform: `translateX(${step * shake}px)`,
            easing: "cubic-bezier(0.77, 0, 0.175, 1)",
          })),
          { duration: 450, composite: "add" },
        );
      }
    } else {
      setFill(0, true);
    }

    root.dataset.mounted = "";
    previousStatusRef.current = status;

    const updateMotion = () => {
      if (!motion.matches) return;
      shakeAnimation?.cancel();
      if (status === "running") {
        progressRunRef.current = { startedAt: performance.now(), duration: 0 };
        setFill(0.9, true);
      }
    };
    motion.addEventListener("change", updateMotion);

    return () => {
      shakeAnimation?.cancel();
      motion.removeEventListener("change", updateMotion);
    };
  }, [status, expectedMs, shake]);

  useEffect(() => {
    const timer = timerRef.current;
    if (!showTimer || !timer) return;
    if (status !== "running") {
      timer.textContent =
        status === "idle" || !elapsedRef.current
          ? "—"
          : formatTime(elapsedRef.current);
      return;
    }

    const motion = window.matchMedia(MOTION_QUERY);
    const startedAt = performance.now();
    let interval: ReturnType<typeof setInterval> | undefined;
    const writeTime = () => {
      elapsedRef.current = performance.now() - startedAt;
      timer.textContent = formatTime(elapsedRef.current);
    };
    const stopTicker = () => {
      if (interval !== undefined) clearInterval(interval);
      interval = undefined;
    };
    const startTicker = () => {
      stopTicker();
      if (document.hidden) return;
      writeTime();
      // The numeric label needs no display-rate layout work. Progress itself
      // retains its smooth compositor animation and the final time is exact.
      interval = setInterval(writeTime, motion.matches ? 250 : 100);
    };

    startTicker();
    motion.addEventListener("change", startTicker);
    document.addEventListener("visibilitychange", startTicker);
    return () => {
      stopTicker();
      writeTime();
      motion.removeEventListener("change", startTicker);
      document.removeEventListener("visibilitychange", startTicker);
    };
  }, [status, showTimer]);

  const font = Math.max(11, Math.round(size * 0.38));
  const toolIcon =
    typeof icon === "string"
      ? (ICONS[icon as keyof typeof ICONS] ?? ICONS.terminal)
      : null;
  const iconSize = font + 2;
  const initialGlyph = glyphOf(initialStatus);
  const chipStyle: ChipStyles = {
    "--cc-size": `${size}px`,
    "--cc-font": `${font}px`,
    "--cc-pad": `${Math.round(size * 0.35)}px`,
    "--cc-gap": `${Math.round(font * 0.55)}px`,
    "--cc-radius": `${radius}px`,
    "--cc-color": color,
    "--cc-surface": surfaceColor,
    "--cc-progress": progressColor,
    "--cc-progress-pct": `${progressOpacity * 100}%`,
    "--cc-done": doneColor,
    "--cc-error": errorColor,
    "--cc-wash-pct": `${washOpacity * 100}%`,
    "--cc-expected": `${Math.max(0, expectedMs)}ms`,
    ...style,
  };

  return (
    <span
      ref={rootRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy={status === "running" || undefined}
      data-status={status}
      data-retry={status === "error" && onRetry ? "" : undefined}
      className={`call-chip${className ? ` ${className}` : ""}`}
      style={chipStyle}
    >
      <span ref={fillRef} className="call-chip__fill" aria-hidden="true" />
      <span ref={slotRef} className="call-chip__slot" aria-hidden="true">
        <span
          className="call-chip__glyph"
          data-glyph="tool"
          data-state={initialGlyph === "tool" ? "in" : undefined}
        >
          {toolIcon ? (
            <HugeiconsIcon icon={toolIcon} size={iconSize} strokeWidth={1.8} />
          ) : (
            icon
          )}
        </span>
        <span
          className="call-chip__glyph"
          data-glyph="check"
          data-state={initialGlyph === "check" ? "in" : undefined}
        >
          <HugeiconsIcon icon={Tick02Icon} size={iconSize} strokeWidth={2.2} />
        </span>
        <span
          className="call-chip__glyph"
          data-glyph="retry"
          data-state={initialGlyph === "retry" ? "in" : undefined}
        >
          <HugeiconsIcon icon={RefreshIcon} size={iconSize} strokeWidth={2} />
        </span>
      </span>
      <span className="call-chip__name" aria-hidden="true">
        {name}
      </span>
      <span className="call-chip__arg" aria-hidden="true">
        {argument}
      </span>
      {showTimer ? (
        <span ref={timerRef} className="call-chip__timer" aria-hidden="true">
          {status === "running" ? "0 ms" : "—"}
        </span>
      ) : null}
      {status === "error" && onRetry ? (
        <button
          type="button"
          className="call-chip__retry"
          aria-label={`Reintentar ${name} ${argument}`}
          onClick={onRetry}
        />
      ) : null}
      <span className="call-chip__sr">
        {name} {argument}: {WORDS[status]}
      </span>
    </span>
  );
}
