/** React Bits PatternWaves presets from the user-supplied component. */
export const SURFACE_PRESETS = {
  silk: {
    pattern: "dot",
    wave: "silk",
    spacing: 9,
    markSize: 0.95,
    depth: 0.95,
    light: 0,
    shine: 0.8,
    contrast: 1.2,
    speed: 0.35,
    scale: 1,
    direction: 20,
  },
  ocean: {
    pattern: "dot",
    wave: "swell",
    spacing: 10,
    markSize: 0.9,
    depth: 0.42,
    light: 0,
    shine: 1,
    contrast: 1.2,
    speed: 0.5,
    scale: 1,
    direction: 100,
  },
  pond: {
    pattern: "dot",
    wave: "ripple",
    spacing: 10,
    markSize: 0.9,
    depth: 0.55,
    light: 0,
    shine: 1.2,
    contrast: 1.2,
    speed: 0.5,
    scale: 1,
    direction: 35,
  },
  lines: {
    pattern: "line",
    wave: "silk",
    spacing: 12,
    markSize: 0.42,
    depth: 0.9,
    light: 0,
    shine: 0.6,
    contrast: 1.2,
    speed: 0.3,
    scale: 1,
    direction: 20,
  },
  terminal: {
    pattern: "glyph",
    wave: "ripple",
    spacing: 13,
    markSize: 0.95,
    depth: 0.75,
    light: 0,
    shine: 0.9,
    contrast: 1.4,
    speed: 0.3,
    scale: 1.1,
    direction: 200,
  },
  mesh: {
    pattern: "plus",
    wave: "silk",
    spacing: 14,
    markSize: 0.8,
    depth: 0.95,
    light: 0,
    shine: 1,
    contrast: 1.45,
    speed: 0.4,
    scale: 1.1,
    direction: 325,
  },
} as const;

export const PATTERNS = { dot: 0, square: 1, plus: 2, line: 3, glyph: 4 };
export const WAVES = { silk: 0, swell: 1, ripple: 2 };
export const FADES = { none: 0, edges: 1, center: 2, bottom: 3, top: 4 };
export const DEFAULT_CHARACTERS = ".:-=+*#%@";

export interface PatternWavesOptions {
  active?: boolean;
  preset?: keyof typeof SURFACE_PRESETS;
  pattern?: keyof typeof PATTERNS;
  wave?: keyof typeof WAVES;
  spacing?: number;
  markSize?: number;
  depth?: number;
  light?: number;
  shine?: number;
  contrast?: number;
  speed?: number;
  scale?: number;
  direction?: number;
  color?: string;
  backgroundColor?: string;
  opacity?: number;
  fade?: keyof typeof FADES;
  fadeSize?: number;
  characters?: string;
  interactive?: boolean;
  cursorSize?: number;
  cursorStrength?: number;
  intro?: boolean;
  paused?: boolean;
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);

export function resolvePatternWaves(options: PatternWavesOptions) {
  const base = SURFACE_PRESETS[options.preset ?? "silk"];
  return {
    ...base,
    active: options.active ?? true,
    pattern:
      options.pattern ??
      (options.preset && options.preset !== "silk" ? base.pattern : "square"),
    wave: options.wave ?? base.wave,
    spacing: options.spacing ?? base.spacing,
    markSize: options.markSize ?? base.markSize,
    depth: options.depth ?? base.depth,
    light: options.light ?? base.light,
    shine: options.shine ?? base.shine,
    contrast: options.contrast ?? base.contrast,
    speed: options.speed ?? base.speed,
    scale: options.scale ?? base.scale,
    direction: options.direction ?? base.direction,
    color: options.color ?? "#479C73",
    backgroundColor: options.backgroundColor ?? "#E4EAE8",
    opacity: options.opacity ?? 0.65,
    fade: options.fade ?? "edges",
    fadeSize: options.fadeSize ?? 0.5,
    characters: options.characters ?? DEFAULT_CHARACTERS,
    interactive: options.interactive ?? true,
    cursorSize: options.cursorSize ?? 50,
    cursorStrength: options.cursorStrength ?? 0.6,
    // Hero already owns the entrance after its loading screen.
    intro: options.intro ?? false,
    paused: options.paused ?? false,
  };
}

export type PatternWavesSettings = ReturnType<typeof resolvePatternWaves>;
