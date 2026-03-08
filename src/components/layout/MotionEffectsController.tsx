import React, { useEffect } from "react";

type MotionKind = "surface" | "button" | "chip" | "field";

type MotionConfig = {
  maxRotateX: number;
  maxRotateY: number;
  maxShiftX: number;
  maxShiftY: number;
  scale: number;
};

const CONFIG_BY_KIND: Record<MotionKind, MotionConfig> = {
  surface: {
    maxRotateX: 5,
    maxRotateY: 6,
    maxShiftX: 8,
    maxShiftY: 10,
    scale: 1.012,
  },
  button: {
    maxRotateX: 3,
    maxRotateY: 4,
    maxShiftX: 4,
    maxShiftY: 4,
    scale: 1.018,
  },
  chip: {
    maxRotateX: 2,
    maxRotateY: 2.5,
    maxShiftX: 2,
    maxShiftY: 2,
    scale: 1.01,
  },
  field: {
    maxRotateX: 0,
    maxRotateY: 0,
    maxShiftX: 0,
    maxShiftY: 0,
    scale: 1.004,
  },
};

const MOTION_SELECTORS = [
  ".motion-surface",
  ".motion-button",
  ".motion-chip",
  ".motion-field",
].join(", ");

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const resolveMotionKind = (element: HTMLElement): MotionKind | null => {
  if (element.classList.contains("motion-surface")) return "surface";
  if (element.classList.contains("motion-button")) return "button";
  if (element.classList.contains("motion-chip")) return "chip";
  if (element.classList.contains("motion-field")) return "field";
  return null;
};

const resetMotionState = (element: HTMLElement) => {
  element.style.setProperty("--motion-x", "50%");
  element.style.setProperty("--motion-y", "50%");
  element.style.setProperty("--motion-rotate-x", "0deg");
  element.style.setProperty("--motion-rotate-y", "0deg");
  element.style.setProperty("--motion-shift-x", "0px");
  element.style.setProperty("--motion-shift-y", "0px");
  element.style.setProperty("--motion-scale", "1");
  element.dataset.motionActive = "false";
};

const MotionEffectsController: React.FC = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

    let cleanups: Array<() => void> = [];

    const clearPrevious = () => {
      cleanups.forEach((cleanup) => cleanup());
      cleanups = [];
    };

    const initMotion = () => {
      clearPrevious();

      const elements = Array.from(
        document.querySelectorAll<HTMLElement>(MOTION_SELECTORS),
      );

      elements.forEach((element) => {
        const kind = resolveMotionKind(element);
        if (!kind) return;

        resetMotionState(element);
        element.dataset.motionReady = "true";

        const handleFocusIn = () => {
          element.dataset.motionActive = "true";
          element.style.setProperty("--motion-scale", `${CONFIG_BY_KIND[kind].scale}`);
        };

        const handleFocusOut = () => {
          resetMotionState(element);
        };

        element.addEventListener("focusin", handleFocusIn);
        element.addEventListener("focusout", handleFocusOut);

        const cleanupHandlers: Array<() => void> = [
          () => {
            element.removeEventListener("focusin", handleFocusIn);
            element.removeEventListener("focusout", handleFocusOut);
            delete element.dataset.motionReady;
            delete element.dataset.motionActive;
            resetMotionState(element);
          },
        ];

        if (reduceMotion || coarsePointer) {
          cleanups.push(() => cleanupHandlers.forEach((cleanup) => cleanup()));
          return;
        }

        const config = CONFIG_BY_KIND[kind];
        let frameId = 0;

        const updateMotion = (clientX: number, clientY: number) => {
          const bounds = element.getBoundingClientRect();
          const x = clamp((clientX - bounds.left) / bounds.width, 0, 1);
          const y = clamp((clientY - bounds.top) / bounds.height, 0, 1);

          const rotateX = (0.5 - y) * config.maxRotateX * 2;
          const rotateY = (x - 0.5) * config.maxRotateY * 2;
          const shiftX = (x - 0.5) * config.maxShiftX;
          const shiftY = -Math.abs((0.5 - y) * config.maxShiftY) - config.maxShiftY * 0.15;

          element.style.setProperty("--motion-x", `${Math.round(x * 100)}%`);
          element.style.setProperty("--motion-y", `${Math.round(y * 100)}%`);
          element.style.setProperty("--motion-rotate-x", `${rotateX.toFixed(2)}deg`);
          element.style.setProperty("--motion-rotate-y", `${rotateY.toFixed(2)}deg`);
          element.style.setProperty("--motion-shift-x", `${shiftX.toFixed(2)}px`);
          element.style.setProperty("--motion-shift-y", `${shiftY.toFixed(2)}px`);
          element.style.setProperty("--motion-scale", `${config.scale}`);
          element.dataset.motionActive = "true";
        };

        const handlePointerMove = (event: PointerEvent) => {
          window.cancelAnimationFrame(frameId);
          frameId = window.requestAnimationFrame(() =>
            updateMotion(event.clientX, event.clientY),
          );
        };

        const handlePointerEnter = (event: PointerEvent) => {
          updateMotion(event.clientX, event.clientY);
        };

        const handlePointerLeave = () => {
          window.cancelAnimationFrame(frameId);
          resetMotionState(element);
        };

        element.addEventListener("pointerenter", handlePointerEnter);
        element.addEventListener("pointermove", handlePointerMove);
        element.addEventListener("pointerleave", handlePointerLeave);

        cleanupHandlers.push(
          () => element.removeEventListener("pointerenter", handlePointerEnter),
          () => element.removeEventListener("pointermove", handlePointerMove),
          () => element.removeEventListener("pointerleave", handlePointerLeave),
          () => window.cancelAnimationFrame(frameId),
        );

        cleanups.push(() => cleanupHandlers.forEach((cleanup) => cleanup()));
      });
    };

    initMotion();
    document.addEventListener("astro:page-load", initMotion);

    return () => {
      document.removeEventListener("astro:page-load", initMotion);
      clearPrevious();
    };
  }, []);

  return null;
};

export default MotionEffectsController;
