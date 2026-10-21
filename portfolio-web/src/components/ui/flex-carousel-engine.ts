import {
  Renderer,
  Program,
  Mesh,
  Triangle,
  Plane,
  Texture,
  RenderTarget,
} from "ogl";
import {
  createProjectCardTexture,
  createProjectCardBackgroundTexture,
  PROJECT_LOGO_SCALE,
  type ProjectCardBackground,
} from "@/lib/project-card";
import {
  getProjectPreviewComposition,
  getProjectPreviewRect,
} from "@/lib/project-preview";

export interface FlexCarouselItem {
  src: string;
  alt: string;
  title: string;
  subtitle?: string;
  background?: ProjectCardBackground;
  preview?: { src: string; alt: string; width: number; height: number };
}
/** The rendered card plane in CSS pixels, relative to the carousel container. */
export interface FlexCarouselCardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export type FlexCarouselPreset = "liquid" | "ribbon" | "vortex" | "arch";
export type FlexCarouselIntro = "rise" | "bloom" | "spin" | "deal" | "none";
export type FlexCarouselFit = "natural" | "portrait" | "square" | "landscape";
export interface FlexCarouselSettings {
  preset: FlexCarouselPreset;
  intro: FlexCarouselIntro;
  cardHeight: number;
  gap: number;
  radius: number;
  fit: FlexCarouselFit;
  squeeze: number;
  focusOnClick: boolean;
  captureWheel: boolean;
  controlledIntro: boolean;
  active: boolean;
}
interface LensSettings {
  lensWidth: number;
  lensHeight: number;
  tilt: number;
  roundness: number;
  bend: number;
  reach: number;
  curl: "twist" | "rise" | "fall";
  dispersion: number;
  liquid: number;
  followCursor: boolean;
}
type Settings = FlexCarouselSettings &
  LensSettings & { autoplay: boolean; interval: number };
export interface FlexCarouselCallbacks {
  onChange?: (index: number, item: FlexCarouselItem) => void;
  onSelect?: (index: number, item: FlexCarouselItem) => void;
  onFocusChange?: (index: number | null) => void;
  /** Rendered focus amount, including its reverse during scene collection. */
  onFocusProgress?: (index: number, progress: number) => void;
  onFocusSettledChange?: (settled: boolean) => void;
  onTransitionChange?: (transitioning: boolean) => void;
  onReady?: () => void;
  onReveal?: () => void;
  onFallback?: () => void;
}
export interface FlexCarouselEngineOptions {
  items: FlexCarouselItem[];
  settings: FlexCarouselSettings;
  callbacks: FlexCarouselCallbacks;
  initialProgress: number;
}
export interface FlexCarouselEngine {
  setIntroProgress: (progress: number) => void;
  closeFocus: () => boolean;
  select: (index: number) => void;
  getSelectedIndex: () => number;
  isFocusSettled: () => boolean;
  isTransitioning: () => boolean;
  getFocusedCardRect: () => FlexCarouselCardRect | null;
  update: (options: Omit<FlexCarouselEngineOptions, "initialProgress">) => void;
  destroy: () => void;
}
interface Slot {
  item: FlexCarouselItem;
  index: number;
  texture: Texture;
  previewTexture: Texture | null;
  previewImage: number[];
  previewLoaded: boolean;
  previewReady: number;
  logoTexture: Texture | null;
  logoImage: number[];
  previewBackground: Texture | null;
  previewBackgroundSize: string;
  aspect: number;
  loaded: boolean;
  failed: boolean;
  ready: number;
  color: number[];
  image: number[];
  dispose: () => void;
}
interface Metrics {
  cardH: number;
  widths: number[];
  centers: number[];
  gap: number;
  loop: number;
}
interface CardEffect {
  alpha: number;
  x: number;
  y: number;
  scale: number;
}
interface IntroEffects {
  sceneAlpha: number;
  strength: number;
  card: ((rel: number) => CardEffect) | null;
}
interface Hit {
  key: string;
  index: number;
  rel: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}
interface Sample {
  x: number;
  t: number;
}
type IntroKind = FlexCarouselIntro | "fade";

const BEND_PRESETS: Record<FlexCarouselPreset, LensSettings> = {
  liquid: {
    lensWidth: 0.74,
    lensHeight: 1.18,
    tilt: 62,
    roundness: 1,
    bend: 0.34,
    reach: 0.38,
    curl: "twist",
    dispersion: 0.45,
    liquid: 0,
    followCursor: false,
  },
  ribbon: {
    lensWidth: 0.8,
    lensHeight: 0.8,
    tilt: 0,
    roundness: 1,
    bend: 0.34,
    reach: 0.34,
    curl: "twist",
    dispersion: 0.4,
    liquid: 0,
    followCursor: false,
  },
  vortex: {
    lensWidth: 0.7,
    lensHeight: 0.95,
    tilt: 30,
    roundness: 1,
    bend: 0.46,
    reach: 0.3,
    curl: "twist",
    dispersion: 0.5,
    liquid: 0,
    followCursor: false,
  },
  arch: {
    lensWidth: 0.8,
    lensHeight: 0.8,
    tilt: 0,
    roundness: 1,
    bend: 0.3,
    reach: 0.36,
    curl: "rise",
    dispersion: 0.4,
    liquid: 0,
    followCursor: false,
  },
};

const FIT_ASPECT: Partial<Record<FlexCarouselFit, number>> = {
  portrait: 0.75,
  square: 1,
  landscape: 4 / 3,
};
const TAPS = 12;
const PIXEL_BUDGET = 4.5e6;
const FOCUS_DURATION = 0.72;
const INTRO_DURATION: Partial<Record<IntroKind, number>> = {
  rise: 2.1,
  bloom: 1.6,
  spin: 2.2,
  deal: 1.5,
  fade: 0.35,
};

const wrap = (value: number, size: number) =>
  ((((value + size / 2) % size) + size) % size) - size / 2;
const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);
const easeOut = (value: number) => 1 - Math.pow(1 - clamp01(value), 3);
const easeOutQuint = (value: number) => 1 - Math.pow(1 - clamp01(value), 5);
const easeSine = (value: number) =>
  (1 - Math.cos(Math.PI * clamp01(value))) / 2;
const easeInOut = (value: number) => {
  const t = clamp01(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const cardVertex = `#version 300 es
in vec3 position;
in vec2 uv;
uniform vec4 uRect;
uniform vec2 uResolution;
out vec2 vUv;
out vec2 vLocal;
void main() {
  vUv = uv;
  vLocal = vec2(position.x, -position.y) * uRect.zw;
  vec2 px = uRect.xy + vLocal;
  gl_Position = vec4(px.x / uResolution.x * 2.0 - 1.0, 1.0 - px.y / uResolution.y * 2.0, 0.0, 1.0);
}
`;

const cardFragment = `#version 300 es
precision highp float;
uniform sampler2D tMap;
uniform sampler2D tPreview;
uniform sampler2D tLogo;
uniform sampler2D tPreviewBackground;
uniform vec2 uSize;
uniform vec2 uImage;
uniform vec2 uPreviewImage;
uniform float uPreviewMix;
uniform float uContain;
uniform float uSeparatedLogo;
uniform float uFocus;
uniform vec4 uLogoRect;
uniform vec2 uLogoImage;
uniform vec4 uPreviewRect;
uniform vec4 uInteriorRect;
uniform float uRadius;
uniform float uAlpha;
uniform float uReady;
uniform float uShift;
uniform float uImageZoom;
uniform float uDpr;
uniform vec3 uPlaceholder;
in vec2 vUv;
in vec2 vLocal;
out vec4 fragColor;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float insideRect(vec2 uv) {
  return step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
}

vec2 containUv(vec2 local, vec2 size, vec2 image) {
  float cardAspect = size.x / max(size.y, 1.0);
  float imageAspect = image.x / max(image.y, 1.0);
  vec2 scale = imageAspect > cardAspect ? vec2(1.0, imageAspect / cardAspect) : vec2(cardAspect / imageAspect, 1.0);
  return (vec2(local.x, 1.0 - local.y) - 0.5) * scale + 0.5;
}

void main() {
  float sd = roundedBox(vLocal, uSize * 0.5, min(uRadius, min(uSize.x, uSize.y) * 0.5));
  float mask = clamp(0.5 - sd * uDpr, 0.0, 1.0);
  vec2 local = vLocal / uSize + 0.5;
  float cardAspect = uSize.x / uSize.y;
  float imageAspect = uImage.x / max(uImage.y, 1.0);
  vec2 coverScale = imageAspect > cardAspect ? vec2(cardAspect / imageAspect, 1.0) : vec2(1.0, imageAspect / cardAspect);
  vec2 containScale = imageAspect > cardAspect ? vec2(1.0, imageAspect / cardAspect) : vec2(cardAspect / imageAspect, 1.0);
  vec2 scale = mix(coverScale, containScale, uContain);
  scale /= uImageZoom;
  vec2 uv = vec2(local.x, 1.0 - local.y);
  uv = (uv - 0.5) * scale + 0.5;
  uv.x += uShift * (1.0 - scale.x) * 0.5;
  vec3 image = texture(tMap, clamp(uv, 0.0, 1.0)).rgb;
  if (uSeparatedLogo > 0.5) {
    image = mix(texture(tMap, vec2(local.x, 1.0 - local.y)).rgb, texture(tPreviewBackground, vec2(local.x, 1.0 - local.y)).rgb, uFocus);
    vec2 interiorUv = (local * uSize - uInteriorRect.xy) / max(uInteriorRect.zw, vec2(1.0));
    image = mix(image, vec3(244.0, 245.0, 242.0) / 255.0, insideRect(interiorUv) * uPreviewMix);
  }
  vec2 previewLocal = (local * uSize - uPreviewRect.xy) / max(uPreviewRect.zw, vec2(1.0));
  vec2 previewUv = containUv(previewLocal, uPreviewRect.zw, uPreviewImage);
  float previewInside = insideRect(previewUv) * insideRect(previewLocal);
  vec4 preview = texture(tPreview, clamp(previewUv, 0.0, 1.0));
  image = mix(image, preview.rgb, uPreviewMix * previewInside * preview.a);
  if (uSeparatedLogo > 0.5) {
    vec2 logoLocal = (local * uSize - uLogoRect.xy) / max(uLogoRect.zw, vec2(1.0));
    vec2 logoUv = containUv(logoLocal, uLogoRect.zw, uLogoImage);
    vec4 logo = texture(tLogo, clamp(logoUv, 0.0, 1.0));
    image = mix(image, logo.rgb, logo.a * insideRect(logoUv) * insideRect(logoLocal));
  }
  vec3 color = mix(uPlaceholder, image, uReady);
  float alpha = mask * uAlpha;
  fragColor = vec4(color * alpha, alpha);
}
`;

const lensVertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const lensFragment = `#version 300 es
precision highp float;
uniform sampler2D tScene;
uniform vec2 uResolution;
uniform float uDpr;
uniform vec2 uCenter;
uniform vec2 uHalf;
uniform float uAngle;
uniform float uExponent;
uniform float uInner;
uniform float uOuter;
uniform float uFlow;
uniform float uCurl;
uniform float uDispersion;
uniform float uStrength;
uniform float uSceneAlpha;
out vec4 fragColor;

void main() {
  vec2 frag = gl_FragCoord.xy / uDpr;
  vec2 uv = frag / uResolution;
  vec2 rel = frag - vec2(uCenter.x, uResolution.y - uCenter.y);
  float ca = cos(uAngle);
  float sa = sin(uAngle);
  vec2 local = vec2(ca * rel.x + sa * rel.y, -sa * rel.x + ca * rel.y);
  vec2 k = max(abs(local) / uHalf, vec2(1e-5));
  float nd = pow(pow(k.x, uExponent) + pow(k.y, uExponent), 1.0 / uExponent);
  vec2 grad = pow(k, vec2(uExponent - 1.0)) * sign(local) / uHalf * pow(nd, 1.0 - uExponent);
  float glen = max(length(grad), 1e-6);
  float edge = (nd - 1.0) / glen;
  vec2 outward = grad / glen;
  vec2 normal = vec2(ca * outward.x - sa * outward.y, sa * outward.x + ca * outward.y);
  vec2 along = vec2(-normal.y, normal.x);

  float t = clamp((edge + uInner) / (uInner + uOuter), 0.0, 1.0);
  float ramp = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  float slope = 16.0 * t * t * (1.0 - t) * (1.0 - t);
  float reachX = rel.x / (uResolution.x * 0.5);
  float side = smoothstep(0.02, 0.3, abs(reachX)) * (uCurl == 0.0 ? sign(reachX) : uCurl);
  float lift = ramp * side * uFlow * uStrength;
  vec2 swirl = along * along.y * side * slope * uFlow * uStrength * 0.35;
  vec2 drift = vec2(0.0, -lift) - swirl;
  vec2 shifted = uv + drift / uResolution;

  vec2 texels = uResolution * uDpr;
  vec2 gx = dFdx(shifted);
  vec2 gy = dFdy(shifted);
  gx *= min(1.0, 3.0 / max(length(gx * texels), 1e-4));
  gy *= min(1.0, 3.0 / max(length(gy * texels), 1e-4));

  vec4 color = textureGrad(tScene, shifted, gx, gy);
  vec2 spread = vec2(0.0, side * slope * uFlow * uStrength) / uResolution * uDispersion;
  float spreadPx = length(spread * texels);
  if (color.a > 0.002 && spreadPx > 0.25) {
    vec3 base = color.rgb / color.a;
    vec3 sumColor = vec3(0.0);
    vec3 sumWeight = vec3(0.0);
    for (int i = 0; i < ${TAPS}; i++) {
      float s = (float(i) + 0.5) / float(${TAPS});
      vec4 c = textureGrad(tScene, shifted + spread * (s - 0.5), gx, gy);
      vec3 w = max(1.0 - abs(vec3(s) - vec3(0.15, 0.5, 0.85)) * 2.6, 0.0) * c.a;
      sumColor += c.rgb * (w / max(c.a, 0.002));
      sumWeight += w;
    }
    vec3 split = mix(base, sumColor / max(sumWeight, vec3(1e-4)), clamp(sumWeight * 2.0, 0.0, 1.0));
    color.rgb = mix(color.rgb, clamp(split, 0.0, 1.0) * color.a, smoothstep(0.25, 1.5, spreadPx));
  }

  fragColor = color * uSceneAlpha;
}
`;

export function createFlexCarousel(
  container: HTMLDivElement,
  options: FlexCarouselEngineOptions,
): FlexCarouselEngine | null {
  const resolveSettings = (settings: FlexCarouselSettings): Settings => ({
    ...BEND_PRESETS[settings.preset],
    ...settings,
    autoplay: false,
    interval: 4,
  });
  const settingsRef = { current: resolveSettings(options.settings) };
  const itemsRef = { current: options.items };
  const callbacksRef = { current: options.callbacks };
  let externalProgress = clamp01(options.initialProgress);
  // Keep the central project as the deal's anchor in both scroll directions.
  let introAnchorIndex = 0;
  // In loop units so a resize preserves its remaining offset during reverse scroll.
  let returnOffset = 0;
  let returnFocusAmount = 0;
  let returnFocusTarget = 0;
  let returnFocusIndex = -1;
  let announcedTransition = false;
  let announcedFocusSettled = false;
  // A selected preview returns to its own logo before the cards deal out again.
  let selectionReturn: "none" | "focus" | "deal" = "none";
  let selectionDeal = 0;
  const returnHoverAmounts = new Map<string, number>();
  let presented = false;
  const renderer = new Renderer({
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
  });
  const gl = renderer.gl;
  if (!renderer.isWebgl2) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }
  gl.clearColor(0, 0, 0, 0);
  const canvas = gl.canvas;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.setAttribute("aria-hidden", "true");

  const placeholderTexture = new Texture(gl);
  const cardProgram = new Program(gl, {
    vertex: cardVertex,
    fragment: cardFragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tMap: { value: placeholderTexture },
      tPreview: { value: placeholderTexture },
      tLogo: { value: placeholderTexture },
      tPreviewBackground: { value: placeholderTexture },
      uRect: { value: [0, 0, 1, 1] },
      uResolution: { value: [1, 1] },
      uSize: { value: [1, 1] },
      uImage: { value: [1, 1] },
      uPreviewImage: { value: [1, 1] },
      uPreviewMix: { value: 0 },
      uContain: { value: 0 },
      uSeparatedLogo: { value: 0 },
      uFocus: { value: 0 },
      uLogoRect: { value: [0, 0, 1, 1] },
      uLogoImage: { value: [1, 1] },
      uPreviewRect: { value: [0, 0, 1, 1] },
      uInteriorRect: { value: [0, 0, 1, 1] },
      uRadius: { value: 16 },
      uAlpha: { value: 1 },
      uReady: { value: 0 },
      uShift: { value: 0 },
      uImageZoom: { value: 1.08 },
      uDpr: { value: 1 },
      uPlaceholder: { value: [0.5, 0.5, 0.5] },
    },
  });
  cardProgram.setBlendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const cardMesh = new Mesh(gl, {
    geometry: new Plane(gl),
    program: cardProgram,
  });

  const target = new RenderTarget(gl, {
    width: 2,
    height: 2,
    depth: false,
    minFilter: gl.LINEAR_MIPMAP_LINEAR,
    magFilter: gl.LINEAR,
  });

  const lensUniforms = {
    tScene: { value: target.texture },
    uResolution: { value: [1, 1] },
    uDpr: { value: 1 },
    uCenter: { value: [0, 0] },
    uHalf: { value: [1, 1] },
    uAngle: { value: 0 },
    uExponent: { value: 2 },
    uInner: { value: 60 },
    uOuter: { value: 80 },
    uFlow: { value: 0 },
    uCurl: { value: 0 },
    uDispersion: { value: 0 },
    uStrength: { value: 0 },
    uSceneAlpha: { value: 0 },
  };
  const lensMesh = new Mesh(gl, {
    geometry: new Triangle(gl),
    program: new Program(gl, {
      vertex: lensVertex,
      fragment: lensFragment,
      uniforms: lensUniforms,
      depthTest: false,
      depthWrite: false,
    }),
  });

  const disposeResources = () => {
    cardMesh.geometry.remove();
    lensMesh.geometry.remove();
    cardProgram.remove();
    lensMesh.program.remove();
    gl.deleteTexture(placeholderTexture.texture);
    target.textures.forEach((texture) => gl.deleteTexture(texture.texture));
    gl.deleteFramebuffer(target.buffer);
  };

  if (
    !gl.getProgramParameter(cardProgram.program, gl.LINK_STATUS) ||
    !gl.getProgramParameter(lensMesh.program.program, gl.LINK_STATUS)
  ) {
    disposeResources();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }
  container.prepend(canvas);

  const reducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const coarsePointer = window.matchMedia("(pointer: coarse)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const anisotropy = renderer.getExtension("EXT_texture_filter_anisotropic")
    ? 8
    : 0;

  let slots: Slot[] = [];
  let width = 1;
  let height = 1;
  let pos = 0;
  let vel = 0;
  let goal = 0;
  let mode = "spring";
  let wheelAt = 0;
  let raf = 0;
  let last = performance.now();
  let visible = true;
  let alive = true;
  let dirty = true;
  let layoutDirty = true;
  let activeIndex = -1;
  let interactedAt = -Infinity;
  let autoplayAt = performance.now();
  let hasFocus = false;
  let deform = 0;
  let deformVel = 0;
  let layout: Metrics | null = null;
  let cachedMetrics: Metrics | null = null;
  let hasSize = false;
  let resnap = false;
  let hover = "";
  let lift = 1;
  let energy = 0;
  let lastPos = 0;
  const lens = { x: 0, y: 0, vx: 0, vy: 0, ready: false };
  const pointer = {
    x: 0,
    y: 0,
    over: false,
    down: false,
    id: -1,
    startX: 0,
    startY: 0,
    startPos: 0,
    dragging: false,
    touch: false,
    samples: [] as Sample[],
  };
  const introState: {
    kind: IntroKind;
    t: number;
    running: boolean;
    done: boolean;
    readyAt: number;
  } = { kind: "none", t: 0, running: false, done: false, readyAt: 0 };
  const focus = { index: -1, pending: -1, t: 0, target: 0 };
  let announcedFocusIndex = -1;
  let announcedFocusProgress = -1;
  let instances: Hit[] = [];
  const hoverAmounts = new Map<string, number>();
  const renderedHoverAmounts = new Map<string, number>();

  const loadSlot = (item: FlexCarouselItem, index: number): Slot => {
    const texture = new Texture(gl, {
      generateMipmaps: true,
      minFilter: gl.LINEAR_MIPMAP_LINEAR,
      magFilter: gl.LINEAR,
      anisotropy,
    });
    const slot: Slot = {
      item,
      index,
      texture,
      previewTexture: null,
      previewImage: [item.preview?.width ?? 1, item.preview?.height ?? 1],
      previewLoaded: false,
      previewReady: 0,
      logoTexture: null,
      logoImage: [1, 1],
      previewBackground: null,
      previewBackgroundSize: "",
      aspect: 0.8,
      loaded: false,
      failed: false,
      ready: 0,
      color: [0.5, 0.5, 0.5],
      image: [1, 1],
      dispose: () => {},
    };
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => {
      if (!alive || !slots.includes(slot)) return;
      let source: HTMLImageElement | HTMLCanvasElement;
      try {
        source = item.background
          ? item.preview
            ? createProjectCardBackgroundTexture(item.background)
            : createProjectCardTexture(image, item.background)
          : image;
        texture.image = source;
        texture.update();
        if (item.preview && item.background) {
          slot.logoTexture = new Texture(gl, {
            image,
            generateMipmaps: true,
            minFilter: gl.LINEAR_MIPMAP_LINEAR,
            magFilter: gl.LINEAR,
            anisotropy,
          });
          slot.logoTexture.update();
          slot.logoImage = [image.naturalWidth || 1, image.naturalHeight || 1];
          slot.previewBackground = new Texture(gl, {
            generateMipmaps: true,
            minFilter: gl.LINEAR_MIPMAP_LINEAR,
            magFilter: gl.LINEAR,
            anisotropy,
          });
        }
      } catch {
        slot.failed = true;
        callbacksRef.current.onFallback?.();
        return;
      }
      slot.image =
        source instanceof HTMLCanvasElement
          ? [source.width, source.height]
          : [image.naturalWidth || 1, image.naturalHeight || 1];
      slot.aspect = slot.image[0] / slot.image[1];
      cachedMetrics = null;
      try {
        const probe = document.createElement("canvas");
        probe.width = 8;
        probe.height = 8;
        const ctx = probe.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(source, 0, 0, 8, 8);
          const data = ctx.getImageData(0, 0, 8, 8).data;
          const avg = [0, 0, 0];
          for (let i = 0; i < data.length; i += 4) {
            avg[0] += data[i];
            avg[1] += data[i + 1];
            avg[2] += data[i + 2];
          }
          slot.color = avg.map((v) => v / 64 / 255);
        }
      } catch {
        slot.color = [0.5, 0.5, 0.5];
      }
      slot.loaded = true;
      dirty = true;
      start();
    };
    image.onerror = () => {
      if (!alive) return;
      slot.failed = true;
      callbacksRef.current.onFallback?.();
    };
    image.src = item.src;
    let preview: HTMLImageElement | null = null;
    if (item.preview) {
      const previewTexture = new Texture(gl, {
        generateMipmaps: true,
        minFilter: gl.LINEAR_MIPMAP_LINEAR,
        magFilter: gl.LINEAR,
        anisotropy,
      });
      slot.previewTexture = previewTexture;
      preview = new Image();
      preview.crossOrigin = "anonymous";
      preview.decoding = "async";
      preview.onload = () => {
        if (!alive || !slots.includes(slot) || !preview) return;
        try {
          previewTexture.image = preview;
          previewTexture.update();
          slot.previewImage = [
            preview.naturalWidth || 1,
            preview.naturalHeight || 1,
          ];
          slot.previewLoaded = true;
          dirty = true;
          start();
        } catch {
          // A missing capture leaves the existing logo card fully usable.
          slot.previewLoaded = false;
        }
      };
      preview.onerror = () => {
        slot.previewLoaded = false;
      };
      preview.src = item.preview.src;
    }
    slot.dispose = () => {
      image.onload = null;
      image.onerror = null;
      gl.deleteTexture(texture.texture);
      if (preview) preview.onload = preview.onerror = null;
      if (slot.previewTexture) gl.deleteTexture(slot.previewTexture.texture);
      if (slot.logoTexture) gl.deleteTexture(slot.logoTexture.texture);
      if (slot.previewBackground)
        gl.deleteTexture(slot.previewBackground.texture);
    };
    return slot;
  };

  const setItems = (next: FlexCarouselItem[]) => {
    slots.forEach((slot) => slot.dispose());
    slots = next.map(loadSlot);
    activeIndex = -1;
    introAnchorIndex = 0;
    returnOffset = 0;
    presented = false;
    hoverAmounts.clear();
    renderedHoverAmounts.clear();
    returnHoverAmounts.clear();
    returnFocusAmount = 0;
    returnFocusTarget = 0;
    returnFocusIndex = -1;
    layout = null;
    cachedMetrics = null;
    layoutDirty = true;
    resnap = true;
    focus.target = 0;
    focus.t = 0;
    focus.pending = -1;
    selectionReturn = "none";
    selectionDeal = 0;
    callbacksRef.current.onFocusChange?.(null);
    introState.readyAt = performance.now();
    dirty = true;
    start();
  };

  const metrics = (s: Settings): Metrics => {
    if (cachedMetrics) return cachedMetrics;
    const cardH = Math.max(24, s.cardHeight * height);
    const fixed = FIT_ASPECT[s.fit];
    const widths = slots.map((slot) => (fixed || slot.aspect) * cardH);
    const centers: number[] = [];
    let cursor = 0;
    for (let i = 0; i < widths.length; i++) {
      centers.push(cursor + widths[i] / 2);
      cursor += widths[i] + s.gap;
    }
    cachedMetrics = {
      cardH,
      widths,
      centers,
      gap: s.gap,
      loop: Math.max(cursor, 1),
    };
    return cachedMetrics;
  };

  const nearest = (m: Metrics, at: number) => {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < m.centers.length; i++) {
      const dist = Math.abs(wrap(m.centers[i] - at, m.loop));
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  };

  const snapPoint = (m: Metrics, at: number) => {
    const i = nearest(m, at);
    return at + wrap(m.centers[i] - at, m.loop);
  };

  const remap = (from: Metrics, to: Metrics, at: number) => {
    const i = nearest(from, at);
    const offset = wrap(at - from.centers[i], from.loop);
    const cycles = Math.round((at - offset - from.centers[i]) / from.loop);
    return (
      cycles * to.loop +
      to.centers[i] +
      offset * (to.widths[i] / from.widths[i])
    );
  };

  const step = (m: Metrics, delta: number) => {
    let at = snapPoint(m, goal);
    let index = nearest(m, at);
    const n = m.centers.length;
    for (let k = 0; k < Math.abs(delta); k++) {
      const next = (index + (delta > 0 ? 1 : n - 1)) % n;
      const distance =
        delta > 0
          ? m.widths[index] / 2 + m.gap + m.widths[next] / 2
          : -(m.widths[next] / 2 + m.gap + m.widths[index] / 2);
      at += distance;
      index = next;
    }
    goal = at;
    mode = "spring";
    dirty = true;
    start();
  };

  const goTo = (m: Metrics, index: number) => {
    const i =
      ((index % m.centers.length) + m.centers.length) % m.centers.length;
    goal = goal + wrap(m.centers[i] - goal, m.loop);
    mode = "spring";
    dirty = true;
    start();
  };

  const openFocus = (index: number) => {
    focus.index = index;
    focus.pending = -1;
    focus.target = 1;
    callbacksRef.current.onFocusChange?.(index);
    dirty = true;
    start();
  };

  const closeFocus = (replayDeal = true) => {
    focus.pending = -1;
    if (selectionReturn !== "none" && replayDeal) return true;
    if (focus.target === 0) return false;
    if (replayDeal && !reducedMotion && externalProgress >= 1) {
      selectionReturn = "focus";
      selectionDeal = 0;
      pointer.down = false;
      pointer.dragging = false;
      container.removeAttribute("data-dragging");
      vel = 0;
      energy = 0;
      deform = 0;
      deformVel = 0;
    }
    focus.target = 0;
    if (reducedMotion) focus.t = 0;
    callbacksRef.current.onFocusChange?.(null);
    dirty = true;
    start();
    return true;
  };

  const canInteract = () =>
    settingsRef.current.active &&
    (!settingsRef.current.controlledIntro || externalProgress >= 1);

  const isTransitioning = () =>
    canInteract() &&
    (pointer.dragging ||
      selectionReturn !== "none" ||
      focus.pending >= 0 ||
      focus.t !== focus.target);

  const isFocusSettled = () =>
    canInteract() &&
    selectionReturn === "none" &&
    focus.target === 1 &&
    focus.t === 1 &&
    focus.pending < 0 &&
    !pointer.dragging &&
    Math.abs(goal - pos) < 0.5 &&
    Math.abs(vel) < 0.5;

  const skipIntro = () => {
    if (settingsRef.current.controlledIntro) return;
    if (introState.running) introState.t = 1;
  };

  const introEffects = (): IntroEffects => {
    const t = introState.running ? introState.t : introState.done ? 1 : 0;
    const e: IntroEffects = { sceneAlpha: 1, strength: 1, card: null };
    if (!introState.done && !introState.running) {
      e.sceneAlpha = 0;
      e.strength = 0;
      return e;
    }
    if (t >= 1) return e;
    const kind = introState.kind;
    if (kind === "rise") {
      e.strength = easeInOut((t - 0.3) / 0.65);
      e.card = (rel) => {
        const delay = Math.min(Math.abs(rel) / (width * 0.6), 1) * 0.34;
        const local = clamp01((t - delay) / 0.6);
        return {
          alpha: clamp01(local * 4),
          x: 0,
          y: (1 - easeOutQuint(local)) * height * 0.62,
          scale: 0.5 + 0.5 * easeInOut((local - 0.18) / 0.82),
        };
      };
    } else if (kind === "bloom") {
      e.strength = easeInOut((t - 0.2) / 0.8);
      e.card = (rel) => {
        const delay = Math.min(Math.abs(rel) / (width * 0.6), 1) * 0.25;
        const local = easeOut((t - delay) / 0.55);
        return { alpha: local, x: 0, y: 0, scale: 0.92 + 0.08 * local };
      };
    } else if (kind === "spin") {
      e.sceneAlpha = easeOut(t / 0.25);
      e.strength = easeOut((t - 0.55) / 0.45);
    } else if (kind === "deal") {
      e.strength = easeSine((t - 0.3) / 0.7);
      e.card = (rel) => {
        const spread = Math.min(Math.abs(rel) / (width * 0.6), 1) * 0.18;
        // Every card reaches its resting position at the same input boundary.
        const local = easeSine((t - spread) / (1 - spread));
        return {
          // The central card is the opaque hand-off from the particle square.
          alpha:
            (settingsRef.current.controlledIntro ||
              selectionReturn === "deal") &&
            Math.abs(rel) < 0.5
              ? 1
              : easeSine(t / 0.22),
          x: -rel * (1 - local),
          y: 0,
          scale: 1,
        };
      };
    } else {
      e.sceneAlpha = easeOut(t);
      e.strength = easeOut(t);
    }
    return e;
  };

  const beginIntro = (s: Settings, m: Metrics) => {
    const kind = reducedMotion && s.intro !== "none" ? "fade" : s.intro;
    introState.kind = INTRO_DURATION[kind] ? kind : "none";
    introState.running = introState.kind !== "none";
    introState.done = !introState.running;
    introState.t = 0;
    if (introState.done) callbacksRef.current.onReveal?.();
    if (introState.kind === "spin") {
      const distance = m.loop * 1.6 + width;
      pos = goal + distance;
      vel = -distance * 3;
      mode = "spring";
    }
  };

  const resize = () => {
    const nextWidth = Math.max(1, container.clientWidth);
    const nextHeight = Math.max(1, container.clientHeight);
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      2,
      Math.sqrt(PIXEL_BUDGET / (nextWidth * nextHeight)),
    );
    if (
      hasSize &&
      width === nextWidth &&
      height === nextHeight &&
      renderer.dpr === dpr
    )
      return;
    hasSize = true;
    width = nextWidth;
    height = nextHeight;
    renderer.dpr = dpr;
    cachedMetrics = null;
    renderer.setSize(width, height);
    target.setSize(
      Math.max(2, Math.round(width * renderer.dpr)),
      Math.max(2, Math.round(height * renderer.dpr)),
    );
    lensUniforms.tScene.value = target.texture;
    lens.ready = false;
    lens.vx = 0;
    lens.vy = 0;
    layoutDirty = true;
    dirty = true;
    start();
  };

  const frame = (now: number, layoutOnly = false) => {
    raf = 0;
    if (
      !alive ||
      (!layoutOnly &&
        (!visible || document.hidden || !settingsRef.current.active))
    )
      return;
    const s = settingsRef.current;
    const elapsed = layoutOnly ? 0 : Math.max(0, (now - last) / 1000);
    // Springs need a bounded step; the focus timeline follows elapsed time.
    const dt = layoutOnly ? 0 : Math.min(0.05, Math.max(0.001, elapsed));
    last = now;
    if (!s || !slots.length) {
      return;
    }

    const m = metrics(s);
    const n = slots.length;
    let animating = false;

    if (resnap) {
      goal = snapPoint(m, goal);
      pos = goal;
      lastPos = pos;
      vel = 0;
      resnap = false;
    } else if (layout && layout.loop !== m.loop) {
      pos = remap(layout, m, pos);
      goal = remap(layout, m, goal);
      lastPos = pos;
      pointer.startPos = pos + (pointer.x - pointer.startX);
      animating = true;
    }
    layout = m;

    if (s.controlledIntro) {
      introState.kind = s.intro;
      introState.t = externalProgress;
      introState.running = externalProgress < 1;
      introState.done = externalProgress >= 1;
      if (externalProgress < 1) {
        const returnAmount = easeInOut((externalProgress - 0.45) / 0.55);
        pos = goal =
          m.centers[introAnchorIndex] + returnOffset * m.loop * returnAmount;
        vel = 0;
        energy = 0;
        lastPos = pos;
      }
    } else if (!introState.running && !introState.done) {
      const allSettled = slots.every((slot) => slot.loaded || slot.failed);
      if (allSettled || now - introState.readyAt > 3500) {
        goal = snapPoint(m, goal);
        pos = goal;
        beginIntro(s, m);
      }
    }
    if (introState.running && !s.controlledIntro) {
      introState.t = Math.min(
        1,
        introState.t + dt / (INTRO_DURATION[introState.kind] || 1),
      );
      if (introState.t >= 1) {
        introState.running = false;
        introState.done = true;
        callbacksRef.current.onReveal?.();
      }
      animating = true;
    }

    if (!layoutOnly && mode === "wheel" && now - wheelAt > 150) {
      goal = snapPoint(m, goal);
      mode = "spring";
    }
    if (!pointer.dragging) {
      const spinning = introState.running && introState.kind === "spin";
      const stiffness = spinning ? 9 : mode === "wheel" ? 80 : 55;
      const damping = 2 * Math.sqrt(stiffness);
      const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        const acc = stiffness * (goal - pos) - damping * vel;
        vel += acc * h;
        pos += vel * h;
      }
      if (Math.abs(goal - pos) < 0.05 && Math.abs(vel) < 0.5) {
        pos = goal;
        vel = 0;
      } else {
        animating = true;
      }
    } else {
      animating = true;
    }

    if (Math.abs(pos) > m.loop * 8) {
      const shift = Math.round(pos / m.loop) * m.loop;
      pos -= shift;
      goal -= shift;
      pointer.startPos -= shift;
    }

    const current = nearest(m, pos);
    if (current !== activeIndex) {
      activeIndex = current;

      callbacksRef.current.onChange?.(current, itemsRef.current[current]);
    }

    if (
      !layoutOnly &&
      focus.pending >= 0 &&
      mode === "spring" &&
      Math.abs(goal - pos) < 1.5 &&
      Math.abs(vel) < 30
    ) {
      if (current === focus.pending) openFocus(current);
      else focus.pending = -1;
    }

    if (
      !layoutOnly &&
      s.autoplay &&
      !reducedMotion &&
      introState.done &&
      focus.target === 0 &&
      focus.t < 0.01 &&
      !pointer.over &&
      !pointer.down &&
      !hasFocus &&
      mode === "spring" &&
      Math.abs(goal - pos) < 1 &&
      now - interactedAt > 3000 &&
      now - autoplayAt > s.interval * 1000
    ) {
      autoplayAt = now;
      step(m, 1);
    }
    if (s.autoplay && !reducedMotion) animating = true;

    const travel = Math.abs(pos - lastPos) / Math.max(dt, 0.001);
    lastPos = pos;
    const lensEnabled =
      width >= 700 && !coarsePointer.matches && !reducedMotion;
    const energyTarget =
      !lensEnabled || (s.controlledIntro && externalProgress < 1)
        ? 0
        : Math.min(travel / 2600, 1);
    energy +=
      (energyTarget - energy) *
      (1 - Math.exp(-dt / (energyTarget > energy ? 0.07 : 0.35)));
    if (energy > 0.001) animating = true;
    const liquidAmount = lensEnabled ? s.liquid : 0;
    const push = Math.max(-1, Math.min(1, vel / 2200));
    const deformStiffness = 120;
    const deformDamping = 2 * Math.sqrt(deformStiffness) * 0.32;
    deformVel +=
      (deformStiffness * (push - deform) - deformDamping * deformVel) * dt;
    deform += deformVel * dt;
    if (Math.abs(deform) > 0.0005 || Math.abs(deformVel) > 0.005)
      animating = true;

    const scrollControlled = s.controlledIntro && externalProgress < 1;
    if (scrollControlled) {
      // Reverse the actual rendered expansion, without a clock-driven snap.
      focus.t = returnFocusAmount * clamp01((externalProgress - 0.55) / 0.45);
    } else {
      const distance = elapsed / FOCUS_DURATION;
      focus.t =
        focus.target > focus.t
          ? Math.min(focus.target, focus.t + distance)
          : Math.max(focus.target, focus.t - distance);
      if (focus.t !== focus.target) animating = true;
    }
    const focusAmount = clamp01(focus.t);
    const focusEase = easeSine(focusAmount);
    const focusW =
      focus.index >= 0 && focus.index < n ? m.widths[focus.index] : m.cardH;
    const focusScale = Math.max(
      1,
      Math.min(1.3, (height * 0.54) / m.cardH, (width * 0.92) / focusW),
    );
    const nextLift = 1 + (focusScale - 1) * focusEase;
    if (Math.abs(nextLift - lift) > 0.0005) {
      lift = nextLift;
      container.style.setProperty("--flex-carousel-lift", lift.toFixed(4));
    }

    let beganSelectionDeal = false;
    if (selectionReturn === "focus" && focus.t === 0) {
      selectionReturn = "deal";
      selectionDeal = 0;
      beganSelectionDeal = true;
      introAnchorIndex = focus.index;
      pos = goal = m.centers[introAnchorIndex];
      lastPos = pos;
    }
    if (selectionReturn === "deal") {
      if (!beganSelectionDeal && !layoutOnly)
        selectionDeal = Math.min(1, selectionDeal + elapsed / 0.9);
      introState.kind = "deal";
      introState.t = selectionDeal;
      introState.running = selectionDeal < 1;
      introState.done = selectionDeal === 1;
      if (selectionDeal === 1) selectionReturn = "none";
      // Draw the exact endpoint too; it hands input back without another frame.
      animating = true;
    }
    const effects = introEffects();
    if (selectionReturn === "focus") effects.strength = 0;

    const hoverEnabled =
      !reducedMotion &&
      selectionReturn === "none" &&
      introState.done &&
      focus.target === 0 &&
      focus.t < 0.01 &&
      !pointer.down &&
      !pointer.dragging &&
      Math.abs(goal - pos) < 1 &&
      Math.abs(vel) < 15;
    const keyboardHover = hasFocus && container.matches(":focus-visible");
    const hovered = hoverEnabled
      ? keyboardHover
        ? instances.find(
            (instance) =>
              instance.index === activeIndex &&
              Math.abs(instance.rel) < m.widths[activeIndex] / 2,
          )
        : finePointer.matches && width >= 700 && pointer.over && !pointer.touch
          ? instances.find(
              (instance) =>
                pointer.x >= instance.x0 &&
                pointer.x <= instance.x1 &&
                pointer.y >= instance.y0 &&
                pointer.y <= instance.y1,
            )
          : undefined
      : undefined;
    if (!scrollControlled) {
      if (hovered && !hoverAmounts.has(hovered.key))
        hoverAmounts.set(hovered.key, 0);
      for (const [key, amount] of hoverAmounts) {
        const targetAmount = hovered?.key === key ? 1 : 0;
        const nextAmount =
          amount + (targetAmount - amount) * (1 - Math.exp(-dt / 0.09));
        if (Math.abs(targetAmount - nextAmount) < 0.001) {
          if (targetAmount === 0) hoverAmounts.delete(key);
          else hoverAmounts.set(key, 1);
        } else {
          hoverAmounts.set(key, nextAmount);
          animating = true;
        }
      }
    }

    const homeX = width / 2;
    const homeY = height / 2;
    const follow =
      s.followCursor &&
      pointer.over &&
      !pointer.dragging &&
      !pointer.touch &&
      focus.target === 0;
    const aimX = follow ? pointer.x : homeX;
    const aimY = follow ? pointer.y : homeY;
    if (!lens.ready) {
      lens.x = homeX;
      lens.y = homeY;
      lens.ready = true;
    }
    const lensK = 110;
    const lensC = 2 * Math.sqrt(lensK) * 0.8;
    lens.vx += (lensK * (aimX - lens.x) - lensC * lens.vx) * dt;
    lens.vy += (lensK * (aimY - lens.y) - lensC * lens.vy) * dt;
    lens.x += lens.vx * dt;
    lens.y += lens.vy * dt;
    if (
      Math.abs(aimX - lens.x) + Math.abs(aimY - lens.y) > 0.2 ||
      Math.abs(lens.vx) + Math.abs(lens.vy) > 0.5
    )
      animating = true;

    const cardH = m.cardH;
    let halfW = (s.lensWidth * width) / 2;
    let halfH = (s.lensHeight * width) / 2;
    const squash = Math.abs(deform) * liquidAmount;
    halfW *= 1 + squash * 0.16;
    halfH *= 1 - squash * 0.08;
    const lensX = lens.x - deform * 14 * liquidAmount;

    for (let i = 0; i < n; i++) {
      const slot = slots[i];
      if (slot.loaded && slot.ready < 1) {
        slot.ready = s.controlledIntro
          ? 1
          : Math.min(1, slot.ready + dt / 0.45);
        animating = true;
      }
      if (slot.previewLoaded && slot.previewReady < 1) {
        slot.previewReady = Math.min(1, slot.previewReady + dt / 0.2);
        animating = true;
      }
    }

    const waiting = !s.controlledIntro && !introState.done;
    if (dirty || animating || pointer.dragging) {
      dirty = false;
      instances = [];
      renderedHoverAmounts.clear();
      const dpr = renderer.dpr;
      cardProgram.uniforms.uResolution.value = [width, height];
      cardProgram.uniforms.uDpr.value = dpr;
      cardProgram.uniforms.uRadius.value = s.radius;
      const shrink = lensEnabled ? 1 - clamp01(s.squeeze) * energy : 1;
      const draws = [];
      for (let i = 0; i < n; i++) {
        const w = m.widths[i];
        const baseRel = wrap(m.centers[i] - pos, m.loop);
        for (let k = -3; k <= 3; k++) {
          const key = `${i}:${k}`;
          const rel = baseRel + k * m.loop;
          if (Math.abs(rel) - w / 2 > width + 40) continue;
          const fx = effects.card ? effects.card(rel) : null;
          let x = homeX + rel + (fx ? fx.x : 0);
          let scale = shrink * (fx ? fx.scale : 1);
          let alpha = fx ? fx.alpha : 1;
          const hoverAmount = scrollControlled
            ? (returnHoverAmounts.get(key) ?? 0) *
              easeInOut((externalProgress - 0.82) / 0.18)
            : hoverEnabled
              ? (hoverAmounts.get(key) ?? 0)
              : 0;
          if (hoverAmount > 0) renderedHoverAmounts.set(key, hoverAmount);
          scale *= 1 + hoverAmount * 0.025;
          const focusedCard = i === focus.index && Math.abs(rel) < w;
          if (selectionReturn === "focus" && !focusedCard) continue;
          const preview = focusedCard ? slots[i].item.preview : undefined;
          if (focusAmount > 0) {
            if (focusedCard && !preview) {
              scale *= 1 + (focusScale - 1) * focusEase;
            } else if (!focusedCard) {
              const order = Math.min(Math.abs(rel) / width, 1) * 0.12;
              const part = easeSine((focusAmount - order) / (1 - order));
              x += Math.sign(rel) * part * width * 0.22;
              alpha *= 1 - part;
            }
          }
          let cw = w * scale;
          let ch = cardH * scale;
          let y = homeY + (fx ? fx.y : 0) - hoverAmount * 4;
          if (preview && focusAmount > 0) {
            const targetRect = getProjectPreviewRect(
              width,
              height,
              preview.width / Math.max(preview.height, 1),
            );
            cw += (targetRect.width - cw) * focusEase;
            ch += (targetRect.height - ch) * focusEase;
            x += (targetRect.x + targetRect.width / 2 - x) * focusEase;
            y += (targetRect.y + targetRect.height / 2 - y) * focusEase;
          }
          if (alpha <= 0.001 || x + cw / 2 < -40 || x - cw / 2 > width + 40)
            continue;
          draws.push({
            key,
            i,
            rel,
            x,
            y,
            cw,
            ch,
            alpha,
            previewMix: preview ? focusAmount : 0,
          });
        }
      }
      draws.sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel));
      let first = true;
      for (const draw of draws) {
        const slot = slots[draw.i];
        const logoSize = Math.min(draw.cw, draw.ch) * PROJECT_LOGO_SCALE;
        const logoRect = [
          (draw.cw - logoSize) / 2,
          (draw.ch - logoSize) / 2,
          logoSize,
          logoSize,
        ];
        let previewRect = [0, 0, draw.cw, draw.ch];
        let interiorRect = previewRect;
        const logoProgress = easeSine(draw.previewMix);
        const preview = slot.item.preview;
        if (preview && slot.logoTexture && slot.item.background) {
          const aspect = preview.width / Math.max(preview.height, 1);
          const destination = getProjectPreviewRect(width, height, aspect);
          const composition = getProjectPreviewComposition(
            destination.width,
            aspect,
          );
          const backgroundSize = `${Math.round(destination.width)}:${Math.round(destination.height)}`;
          if (
            slot.previewBackground &&
            slot.previewBackgroundSize !== backgroundSize
          ) {
            try {
              slot.previewBackground.image = createProjectCardBackgroundTexture(
                slot.item.background,
                1024,
                Math.max(
                  1,
                  Math.round((1024 * destination.height) / destination.width),
                ),
              );
              slot.previewBackground.update();
              slot.previewBackgroundSize = backgroundSize;
            } catch {
              // Keep the original square gradient if a new surface cannot allocate.
              gl.deleteTexture(slot.previewBackground.texture);
              slot.previewBackground = null;
            }
          }
          const sx = draw.cw / destination.width;
          const sy = draw.ch / destination.height;
          const scaledRect = (rect: {
            x: number;
            y: number;
            width: number;
            height: number;
          }) => [rect.x * sx, rect.y * sy, rect.width * sx, rect.height * sy];
          previewRect = scaledRect(composition.media);
          interiorRect = scaledRect(composition.interior);
          const destinationLogo = scaledRect(composition.logo);
          for (let index = 0; index < logoRect.length; index++)
            logoRect[index] +=
              (destinationLogo[index] - logoRect[index]) * logoProgress;
        }
        cardProgram.uniforms.tMap.value = slot.texture;
        cardProgram.uniforms.tLogo.value = slot.logoTexture ?? slot.texture;
        cardProgram.uniforms.tPreviewBackground.value =
          slot.previewBackground ?? slot.texture;
        cardProgram.uniforms.uSeparatedLogo.value = Number(
          Boolean(slot.logoTexture),
        );
        cardProgram.uniforms.uFocus.value = logoProgress;
        cardProgram.uniforms.uLogoRect.value = logoRect;
        cardProgram.uniforms.uLogoImage.value = slot.logoImage;
        cardProgram.uniforms.uPreviewRect.value = previewRect;
        cardProgram.uniforms.uInteriorRect.value = interiorRect;
        cardProgram.uniforms.tPreview.value = slot.previewLoaded
          ? slot.previewTexture
          : slot.texture;
        cardProgram.uniforms.uPreviewImage.value = slot.previewImage;
        const previewProgress = clamp01((draw.previewMix - 0.18) / 0.7);
        cardProgram.uniforms.uPreviewMix.value =
          previewProgress *
          previewProgress *
          (3 - 2 * previewProgress) *
          slot.previewReady;
        cardProgram.uniforms.uContain.value = slot.item.preview ? 1 : 0;
        cardProgram.uniforms.uRect.value = [
          draw.x,
          draw.y,
          draw.cw + 2,
          draw.ch + 2,
        ];
        cardProgram.uniforms.uSize.value = [draw.cw, draw.ch];
        cardProgram.uniforms.uImage.value = slot.image;
        cardProgram.uniforms.uAlpha.value = draw.alpha;
        cardProgram.uniforms.uReady.value = slot.ready;
        cardProgram.uniforms.uImageZoom.value =
          slot.item.background || slot.item.preview ? 1 : 1.08;
        cardProgram.uniforms.uShift.value =
          reducedMotion || slot.item.background || slot.item.preview
            ? 0
            : Math.max(-1, Math.min(1, draw.rel / (width * 0.75)));
        cardProgram.uniforms.uPlaceholder.value = slot.color;
        renderer.render({ scene: cardMesh, target, clear: first });
        first = false;
        instances.push({
          key: draw.key,
          index: draw.i,
          rel: draw.rel,
          x0: draw.x - draw.cw / 2,
          x1: draw.x + draw.cw / 2,
          y0: draw.y - draw.ch / 2,
          y1: draw.y + draw.ch / 2,
        });
      }
      if (first) {
        renderer.bindFramebuffer(target);
        gl.viewport(0, 0, target.width, target.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      renderer.bindFramebuffer();
      target.texture.bind();
      gl.generateMipmap(gl.TEXTURE_2D);

      lensUniforms.uResolution.value = [width, height];
      lensUniforms.uDpr.value = dpr;
      lensUniforms.uCenter.value = [lensX, lens.y];
      lensUniforms.uHalf.value = [Math.max(halfW, 1), Math.max(halfH, 1)];
      lensUniforms.uAngle.value = lensEnabled
        ? ((s.tilt * Math.PI) / 180) * effects.strength
        : 0;
      lensUniforms.uExponent.value =
        2 + Math.pow(1 - clamp01(s.roundness), 1.5) * 10;
      const spanW = Math.max(halfW, 1);
      const spanH = Math.max(halfH, 1);
      const inner = Math.max(4, s.reach * (spanW + spanH) * 0.5);
      lensUniforms.uInner.value = inner;
      lensUniforms.uOuter.value = inner * 1.6;
      lensUniforms.uFlow.value = s.bend * (spanW + spanH) * 0.45;
      lensUniforms.uCurl.value =
        s.curl === "rise" ? 1 : s.curl === "fall" ? -1 : 0;
      lensUniforms.uDispersion.value =
        s.dispersion * 0.12 * (1 + Math.abs(deform) * liquidAmount * 1.2);
      lensUniforms.uStrength.value = lensEnabled
        ? effects.strength * (1 - focusEase)
        : 0;
      lensUniforms.uSceneAlpha.value = effects.sceneAlpha;
      renderer.render({ scene: lensMesh });
      layoutDirty = false;
      if (!presented && slots[0].loaded && slots[0].ready === 1) {
        presented = true;
        callbacksRef.current.onReady?.();
      }
    }

    let nextHover = "";
    if (
      pointer.over &&
      !pointer.dragging &&
      introState.done &&
      s.focusOnClick
    ) {
      const hit = instances.find(
        (inst) =>
          pointer.x >= inst.x0 &&
          pointer.x <= inst.x1 &&
          pointer.y >= inst.y0 &&
          pointer.y <= inst.y1,
      );
      if (focus.target > 0) nextHover = "close";
      else if (hit) nextHover = "open";
    }
    if (nextHover !== hover) {
      hover = nextHover;
      if (hover) container.setAttribute("data-hover", hover);
      else container.removeAttribute("data-hover");
    }

    const transitioning = isTransitioning();
    if (
      focus.index >= 0 &&
      (focus.index !== announcedFocusIndex ||
        focusAmount !== announcedFocusProgress)
    ) {
      announcedFocusIndex = focus.index;
      announcedFocusProgress = focusAmount;
      callbacksRef.current.onFocusProgress?.(focus.index, focusAmount);
    }
    if (transitioning !== announcedTransition) {
      announcedTransition = transitioning;
      container.toggleAttribute("data-transitioning", transitioning);
      callbacksRef.current.onTransitionChange?.(transitioning);
    }
    const focusSettled = isFocusSettled();
    if (focusSettled !== announcedFocusSettled) {
      announcedFocusSettled = focusSettled;
      callbacksRef.current.onFocusSettledChange?.(focusSettled);
    }

    if (
      !layoutOnly &&
      s.active &&
      visible &&
      (animating || waiting || dirty || pointer.down)
    )
      raf = requestAnimationFrame(frame);
  };

  const start = () => {
    if (
      raf ||
      !visible ||
      !alive ||
      document.hidden ||
      !settingsRef.current.active
    )
      return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const localPoint = (e: PointerEvent): [number, number] => {
    const rect = container.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!canInteract() || isTransitioning() || !slots.length) return;
    if (e.button !== undefined && e.button > 0) return;
    skipIntro();
    const [x, y] = localPoint(e);
    pointer.down = true;
    pointer.id = e.pointerId;
    pointer.touch = e.pointerType === "touch";
    pointer.startX = x;
    pointer.startY = y;
    pointer.x = x;
    pointer.y = y;
    pointer.startPos = pos;
    pointer.dragging = false;
    pointer.samples = [{ x, t: performance.now() }];
    interactedAt = performance.now();
    if (Math.abs(vel) > 40) {
      goal = pos;
      vel = 0;
    }
    dirty = true;
    start();
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!canInteract() || !slots.length) return;
    const [x, y] = localPoint(e);
    pointer.x = x;
    pointer.y = y;
    pointer.touch = e.pointerType === "touch";
    pointer.over = true;
    if (pointer.down && e.pointerId === pointer.id) {
      const dx = x - pointer.startX;
      const dy = y - pointer.startY;
      const slop = pointer.touch ? 10 : 5;
      if (!pointer.dragging) {
        if (
          pointer.touch &&
          Math.abs(dy) > slop &&
          Math.abs(dy) > Math.abs(dx)
        ) {
          pointer.down = false;
          return;
        }
        if (Math.abs(dx) > slop) {
          // Restore the existing row in place while this same drag continues.
          // Only explicit closing gestures replay the central-card deal.
          closeFocus(false);
          pointer.dragging = true;
          pointer.startX = x;
          pointer.startPos = pos;
          try {
            container.setPointerCapture(e.pointerId);
          } catch {
            pointer.dragging = true;
          }
          container.setAttribute("data-dragging", "");
        }
      }
      if (pointer.dragging) {
        pos = pointer.startPos - (x - pointer.startX);
        goal = pos;
        vel = 0;
        const now = performance.now();
        pointer.samples.push({ x, t: now });
        while (pointer.samples.length > 2 && now - pointer.samples[0].t > 100)
          pointer.samples.shift();
      }
    }
    dirty = true;
    start();
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!canInteract() || !slots.length) return;
    if (!pointer.down || e.pointerId !== pointer.id) return;
    pointer.down = false;
    container.removeAttribute("data-dragging");
    const s = settingsRef.current;
    if (!s) return;
    const m = metrics(s);
    interactedAt = performance.now();
    if (pointer.dragging) {
      pointer.dragging = false;
      const now = performance.now();
      const first = pointer.samples[0];
      const lastSample = pointer.samples[pointer.samples.length - 1];
      let velocity = 0;
      if (
        first &&
        lastSample &&
        lastSample.t > first.t &&
        now - lastSample.t < 70
      ) {
        velocity =
          -((lastSample.x - first.x) / (lastSample.t - first.t)) * 1000;
      }
      vel = velocity;
      const landing = snapPoint(m, pos + velocity * 0.32);
      goal = landing;
      if (Math.abs(velocity) > 400 && Math.abs(landing - pos) < 1)
        step(m, velocity > 0 ? 1 : -1);
      mode = "spring";
      start();
      return;
    }
    if (closeFocus()) return;
    const [x, y] = localPoint(e);
    const hit = instances.find(
      (inst) => x >= inst.x0 && x <= inst.x1 && y >= inst.y0 && y <= inst.y1,
    );
    if (!hit) return;
    if (hit.index === activeIndex && Math.abs(goal - pos) < 2) {
      callbacksRef.current.onSelect?.(hit.index, itemsRef.current[hit.index]);
      if (s.focusOnClick) openFocus(hit.index);
    } else {
      const rel = (hit.x0 + hit.x1) / 2 - width / 2;
      goal = snapPoint(m, pos + rel);
      mode = "spring";
      if (s.focusOnClick) focus.pending = hit.index;
      start();
    }
  };

  const onPointerLeave = () => {
    pointer.over = false;
    if (!pointer.dragging) pointer.down = false;
    dirty = true;
    start();
  };

  const onPointerCancel = () => {
    pointer.down = false;
    pointer.dragging = false;
    container.removeAttribute("data-dragging");
    const s = settingsRef.current;
    if (!s || !slots.length) return;
    goal = snapPoint(metrics(s), pos);
    mode = "spring";
    start();
  };

  const onWheel = (e: WheelEvent) => {
    if (!canInteract() || !slots.length) return;
    const s = settingsRef.current;
    if (!s || e.ctrlKey || !s.captureWheel) return;
    if (isTransitioning()) {
      e.preventDefault();
      return;
    }
    let dx = e.deltaX;
    let dy = e.deltaY;
    if (e.shiftKey && Math.abs(dx) < Math.abs(dy)) {
      dx = dy;
      dy = 0;
    }
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? height : 1;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    e.preventDefault();
    skipIntro();
    interactedAt = performance.now();
    if (closeFocus()) return;
    const delta = Math.max(-120, Math.min(120, (horizontal ? dx : dy) * unit));
    goal += delta * 1.25;
    mode = "wheel";
    wheelAt = performance.now();
    start();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!canInteract() || !slots.length) return;
    if (isTransitioning() && e.key !== "Escape") {
      if (
        ["ArrowLeft", "ArrowRight", "Home", "End", "Enter", " "].includes(e.key)
      )
        e.preventDefault();
      return;
    }
    const s = settingsRef.current;
    if (!s) return;
    const m = metrics(s);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      skipIntro();
      if (closeFocus()) return;
      interactedAt = performance.now();
      step(m, 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      skipIntro();
      if (closeFocus()) return;
      interactedAt = performance.now();
      step(m, -1);
    } else if (e.key === "Home") {
      e.preventDefault();
      if (closeFocus()) return;
      goTo(m, 0);
    } else if (e.key === "End") {
      e.preventDefault();
      if (closeFocus()) return;
      goTo(m, slots.length - 1);
    } else if (e.key === "Escape") {
      if (closeFocus()) e.preventDefault();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (closeFocus() || activeIndex < 0) return;
      callbacksRef.current.onSelect?.(
        activeIndex,
        itemsRef.current[activeIndex],
      );
      if (s.focusOnClick) openFocus(activeIndex);
    }
  };

  const onFocus = () => {
    hasFocus = true;
    dirty = true;
    start();
  };
  const onBlur = () => {
    hasFocus = false;
    dirty = true;
    start();
  };
  const onPointerCapabilityChange = () => {
    hoverAmounts.clear();
    dirty = true;
    start();
  };
  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else start();
  };
  const onContextLost = (event: Event) => {
    event.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
    alive = false;
    callbacksRef.current.onFallback?.();
  };

  canvas.addEventListener("webglcontextlost", onContextLost);
  coarsePointer.addEventListener("change", onPointerCapabilityChange);
  finePointer.addEventListener("change", onPointerCapabilityChange);
  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("pointerup", onPointerUp);
  container.addEventListener("pointerleave", onPointerLeave);
  container.addEventListener("pointercancel", onPointerCancel);
  container.addEventListener("wheel", onWheel, { passive: false });
  container.addEventListener("keydown", onKeyDown);
  container.addEventListener("focus", onFocus);
  container.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("resize", resize);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else start();
  });
  intersectionObserver.observe(container);

  resize();
  setItems(itemsRef.current);

  const destroy = () => {
    alive = false;
    visible = false;
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    container.removeEventListener("pointerdown", onPointerDown);
    container.removeEventListener("pointermove", onPointerMove);
    container.removeEventListener("pointerup", onPointerUp);
    container.removeEventListener("pointerleave", onPointerLeave);
    container.removeEventListener("pointercancel", onPointerCancel);
    container.removeEventListener("wheel", onWheel);
    container.removeEventListener("keydown", onKeyDown);
    container.removeEventListener("focus", onFocus);
    container.removeEventListener("blur", onBlur);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("resize", resize);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    coarsePointer.removeEventListener("change", onPointerCapabilityChange);
    finePointer.removeEventListener("change", onPointerCapabilityChange);
    slots.forEach((slot) => slot.dispose());
    slots = [];
    disposeResources();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  };

  const refreshLayout = () => {
    if (!alive || !slots.length) return false;
    const measuredWidth = container.clientWidth;
    const measuredHeight = container.clientHeight;
    if (!measuredWidth || !measuredHeight) return false;
    if (measuredWidth !== width || measuredHeight !== height) resize();
    if (layoutDirty) {
      // Remap a paused surface after resize without advancing animation or input.
      cancelAnimationFrame(raf);
      raf = 0;
      dirty = true;
      frame(performance.now(), true);
      if (settingsRef.current.active) start();
    }
    return true;
  };

  return {
    closeFocus,
    isFocusSettled,
    isTransitioning,
    getSelectedIndex: () =>
      refreshLayout()
        ? nearest(metrics(settingsRef.current), pos)
        : Math.max(0, activeIndex),
    getFocusedCardRect: () => {
      if (!alive || focus.index < 0 || (focus.target === 0 && focus.t <= 0))
        return null;
      if (!refreshLayout()) return null;
      let focusedInstance: Hit | undefined;
      for (const instance of instances) {
        if (
          instance.index === focus.index &&
          (!focusedInstance ||
            Math.abs(instance.rel) < Math.abs(focusedInstance.rel))
        ) {
          focusedInstance = instance;
        }
      }
      if (!focusedInstance) return null;
      return {
        x: focusedInstance.x0,
        y: focusedInstance.y0,
        width: focusedInstance.x1 - focusedInstance.x0,
        height: focusedInstance.y1 - focusedInstance.y0,
      };
    },
    select: (index) => {
      if (!slots.length || !canInteract() || isTransitioning()) return;
      if (closeFocus()) return;
      goTo(metrics(settingsRef.current), index);
    },
    setIntroProgress: (progress) => {
      const previous = externalProgress;
      externalProgress = clamp01(progress);
      if (previous === externalProgress) return;
      if (previous >= 1 && externalProgress < 1) {
        // Scene navigation owns this reverse; do not replay the selection deal.
        selectionReturn = "none";
        selectionDeal = 0;
        if (slots.length) {
          const m = metrics(settingsRef.current);
          introAnchorIndex = nearest(m, pos);
          returnOffset =
            wrap(pos - m.centers[introAnchorIndex], m.loop) / m.loop;
        }
        returnFocusAmount = focus.t;
        returnFocusTarget = focus.target;
        returnFocusIndex = focus.index;
        returnHoverAmounts.clear();
        for (const [key, amount] of renderedHoverAmounts) {
          returnHoverAmounts.set(key, amount);
        }
        closeFocus(false);
        vel = 0;
        energy = 0;
        deform = 0;
        deformVel = 0;
        lastPos = pos;
        pointer.down = false;
        pointer.dragging = false;
        container.removeAttribute("data-dragging");
      }
      if (externalProgress === 0) {
        if (focus.index >= 0) {
          callbacksRef.current.onFocusProgress?.(focus.index, 0);
          announcedFocusIndex = focus.index;
          announcedFocusProgress = 0;
        }
        returnOffset = 0;
        returnFocusAmount = 0;
        returnFocusTarget = 0;
        returnFocusIndex = -1;
        returnHoverAmounts.clear();
        hoverAmounts.clear();
        renderedHoverAmounts.clear();
        selectionReturn = "none";
        selectionDeal = 0;
        focus.pending = -1;
        focus.t = 0;
        focus.target = 0;
        focus.index = -1;
        vel = 0;
        energy = 0;
        deform = 0;
        deformVel = 0;
        lens.ready = false;
        lens.vx = 0;
        lens.vy = 0;
        pointer.down = false;
        pointer.dragging = false;
        pointer.samples.length = 0;
        container.removeAttribute("data-dragging");
      }
      if (previous < 1 && externalProgress === 1 && slots.length) {
        const m = metrics(settingsRef.current);
        pos = goal = m.centers[introAnchorIndex] + returnOffset * m.loop;
        lastPos = pos;
        vel = 0;
        focus.index = returnFocusIndex;
        focus.t = returnFocusAmount;
        focus.target = returnFocusTarget;
        hoverAmounts.clear();
        for (const [key, amount] of returnHoverAmounts) {
          hoverAmounts.set(key, amount);
        }
        if (focus.target > 0) callbacksRef.current.onFocusChange?.(focus.index);
      }
      dirty = true;
      start();
    },
    update: (next) => {
      const changed =
        next.items.length !== itemsRef.current.length ||
        next.items.some(
          (item, index) =>
            item.src !== itemsRef.current[index].src ||
            item.preview?.src !== itemsRef.current[index].preview?.src ||
            item.preview?.width !== itemsRef.current[index].preview?.width ||
            item.preview?.height !== itemsRef.current[index].preview?.height ||
            item.background !== itemsRef.current[index].background,
        );
      itemsRef.current = next.items;
      callbacksRef.current = next.callbacks;
      const previous = settingsRef.current;
      const resolved = resolveSettings(next.settings);
      const settingsChanged = (
        Object.keys(resolved) as (keyof Settings)[]
      ).some((key) => resolved[key] !== previous[key]);
      // React may only replace callbacks; keep idle GPU surfaces asleep.
      if (!changed && !settingsChanged) return;
      if (
        previous.cardHeight !== next.settings.cardHeight ||
        previous.fit !== next.settings.fit ||
        previous.gap !== next.settings.gap ||
        previous.radius !== next.settings.radius ||
        previous.squeeze !== next.settings.squeeze ||
        previous.preset !== next.settings.preset
      ) {
        cachedMetrics = null;
        layoutDirty = true;
      }
      settingsRef.current = resolved;
      if (!next.settings.active) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      if (changed) setItems(next.items);
      dirty = true;
      start();
    },
    destroy,
  };
}
