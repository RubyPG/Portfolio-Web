import type { RadarView } from "@/components/ui/Radar";

export const HORIZON_VIEW: RadarView = {
  tilt: 64,
  centerX: 0.5,
  centerY: 0.94,
  scale: 1.3,
};

export const OVERHEAD_VIEW: RadarView = {
  tilt: 0,
  centerX: 0.5,
  centerY: 0.5,
  scale: 0.92,
};

const mix = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

function fade(start: number, end: number, progress: number) {
  const value = Math.min(1, Math.max(0, (progress - start) / (end - start)));
  return value * value * (3 - 2 * value);
}

/** Camera and the two text planes share one reversible, already-eased clock. */
export function getContactTransition(progress: number) {
  const value = Number.isFinite(progress)
    ? Math.min(1, Math.max(0, progress))
    : 0;
  const travel = (HORIZON_VIEW.centerY - OVERHEAD_VIEW.centerY) * 100;
  return {
    radar: {
      tilt: mix(HORIZON_VIEW.tilt, OVERHEAD_VIEW.tilt, value),
      centerX: 0.5,
      centerY: mix(HORIZON_VIEW.centerY, OVERHEAD_VIEW.centerY, value),
      scale: mix(HORIZON_VIEW.scale, OVERHEAD_VIEW.scale, value),
    },
    about: {
      yPercent: -travel * value,
      rotationX: -HORIZON_VIEW.tilt * value,
      scale: mix(1, 0.88, value),
      opacity: 1 - fade(0.05, 0.5, value),
    },
    contact: {
      yPercent: travel * (1 - value),
      rotationX: HORIZON_VIEW.tilt * (1 - value),
      scale: mix(0.88, 1, value),
      opacity: fade(0.34, 0.9, value),
    },
    maskTopAlpha: value,
  };
}
