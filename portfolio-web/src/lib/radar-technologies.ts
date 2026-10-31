import type { RadarView } from "@/components/ui/radar-engine";

export const RADAR_FOCAL = 2;
const TAU = Math.PI * 2;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export interface RadarTechnologyPoint {
  x: number;
  y: number;
}

/** The drawn frame: CSS pixels, sweep in radians, and view tilt in degrees. */
export interface RadarFrame {
  time: number;
  sweep: number;
  speed: number;
  width: number;
  height: number;
  view: RadarView;
}

/** Stable world positions shared by the departing stack and the radar echoes. */
export function getRadarTechnologyPoint(
  index: number,
  count: number,
): RadarTechnologyPoint {
  const total = Math.max(1, count);
  const position = clamp(index, 0, total - 1);
  const angle = position * Math.PI * (3 - Math.sqrt(5)) + 0.34;
  const radius = 0.22 + 0.68 * Math.sqrt((position + 0.5) / total);
  return { x: Math.sin(angle) * radius, y: Math.cos(angle) * radius };
}

/** Exact center projection from radar-shaders.ts SPRITE_VERTEX, before DPR. */
export function projectRadarTechnology(
  point: RadarTechnologyPoint,
  view: RadarView,
  width: number,
  height: number,
) {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const tilt = (clamp(view.tilt, 0, 80) * Math.PI) / 180;
  const fit = (clamp(view.scale, 0.1, 4) * Math.min(w, h)) / h;
  const distance = (2 * RADAR_FOCAL) / fit;
  const depth = Math.max(0.0001, distance + point.y * Math.sin(tilt));
  const factor = (RADAR_FOCAL * h) / depth;
  return {
    x: clamp(view.centerX, -1, 2) * w + point.x * factor,
    y: clamp(view.centerY, -1, 2) * h - point.y * Math.cos(tilt) * factor,
  };
}

export function getRadarTechnologySize(width: number) {
  return width < 600 ? 20 : width < 1000 ? 24 : 28;
}

export function getRadarTechnologyPresence(progress: number) {
  const travel = clamp((progress - 0.45) / 0.3, 0, 1);
  return (1 - Math.cos(travel * Math.PI)) / 2;
}

/** Same atan2(x,y), direction and angular wrapping used by the sweep shader. */
export function getRadarTechnologyIntensity(
  point: RadarTechnologyPoint,
  sweep: number,
  speed: number,
) {
  const bearing = Math.atan2(point.x, point.y);
  const direction = speed < 0 ? -1 : 1;
  const behind = (((direction * (sweep - bearing)) % TAU) + TAU) % TAU;
  return 0.06 + 0.54 * Math.exp(-behind / 0.48);
}
