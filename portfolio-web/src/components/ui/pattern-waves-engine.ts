import { Mesh, Program, Renderer, RenderTarget, Texture, Triangle } from "ogl";
import type { OGLRenderingContext } from "ogl";
import { observeEffectVisibility } from "./effect-visibility";
import { getPatternWaveBands } from "@/lib/pattern-wave-bands";
import {
  fieldFragment,
  markFragment,
  passVertex,
  rippleFragment,
} from "./pattern-waves-shaders";
import {
  clamp,
  DEFAULT_CHARACTERS,
  FADES,
  PATTERNS,
  resolvePatternWaves,
  WAVES,
  type PatternWavesOptions,
  type PatternWavesSettings,
} from "./pattern-waves-settings";

/** Adapted from the user-supplied React Bits PatternWaves. See LICENSE-react-bits.md. */
const WAVE_UNIT = 520;
const RIPPLE_CELL = 8;
const RIPPLE_RATE = 60;
const PIXEL_BUDGET = 2.5e6;
const FRAME_MS = 1000 / 30;
type Color = [number, number, number, number];
type Ripple = {
  width: number;
  height: number;
  read: RenderTarget;
  write: RenderTarget;
};
type Pointer = {
  x: number;
  y: number;
  inside: boolean;
  placed: boolean;
  lastX: number;
  lastY: number;
  burst: number;
};

export interface PatternWavesController {
  update(options: PatternWavesOptions): void;
  setExitProgress(progress: number): void;
  destroy(): void;
}

// Called only after mounting; no DOM, color parsing or GPU work during SSR.
function parseColor(value: string, fallback: Color): Color {
  try {
    const scratch = document.createElement("canvas");
    scratch.width = scratch.height = 1;
    const context = scratch.getContext("2d", { willReadFrequently: true });
    if (!context) return fallback;
    context.fillStyle = `rgba(${fallback
      .slice(0, 3)
      .map((v) => v * 255)
      .join(",")},${fallback[3]})`;
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const rgba = context.getImageData(0, 0, 1, 1).data;
    return [rgba[0] / 255, rgba[1] / 255, rgba[2] / 255, rgba[3] / 255];
  } catch {
    return fallback;
  }
}

function buildAtlas(characters: string) {
  const glyphs = Array.from(characters || DEFAULT_CHARACTERS).slice(0, 128);
  const columns = Math.ceil(Math.sqrt(glyphs.length));
  const lines = Math.ceil(glyphs.length / columns);
  const canvas = document.createElement("canvas");
  canvas.width = columns * 128;
  canvas.height = lines * 128;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font =
    "500 110px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  glyphs.forEach((glyph, index) => {
    context.fillText(
      glyph,
      (index % columns) * 128 + 64,
      Math.floor(index / columns) * 128 + 64,
    );
  });
  return { canvas, columns, lines, count: glyphs.length };
}

function createSurface(canvas: HTMLCanvasElement) {
  // Preflight avoids OGL attempting its WebGL1 fallback with GLSL 300 shaders.
  const context = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!context || context.isContextLost()) return null;
  const renderer = new Renderer({
    canvas,
    webgl: 2,
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  const gl = renderer.gl as OGLRenderingContext & WebGL2RenderingContext;
  gl.clearColor(0, 0, 0, 0);
  const targets = new Set<RenderTarget>();
  const textures: Texture[] = [];
  const programs: Program[] = [];
  let geometry: Triangle | null = null;
  const disposeTarget = (target: RenderTarget) => {
    gl.deleteFramebuffer(target.buffer);
    for (const texture of target.textures) gl.deleteTexture(texture.texture);
    targets.delete(target);
  };
  const destroy = () => {
    for (const target of targets) disposeTarget(target);
    for (const texture of textures) gl.deleteTexture(texture.texture);
    for (const program of programs) {
      program.remove();
      gl.deleteShader(program.vertexShader);
      gl.deleteShader(program.fragmentShader);
    }
    geometry?.remove();
  };
  try {
    geometry = new Triangle(gl);
    const blank = new Texture(gl);
    textures.push(blank);
    const atlasTexture = new Texture(gl, {
      generateMipmaps: true,
      minFilter: gl.LINEAR_MIPMAP_LINEAR,
      magFilter: gl.LINEAR,
      flipY: false,
    });
    textures.push(atlasTexture);
    let floatTargets = !!gl.getExtension("EXT_color_buffer_float");
    const targetFor = (width: number, height: number, floating = false) => {
      const target = new RenderTarget(gl, {
        width,
        height,
        depth: false,
        minFilter: floating ? gl.LINEAR : gl.NEAREST,
        magFilter: floating ? gl.LINEAR : gl.NEAREST,
        ...(floating
          ? { type: gl.HALF_FLOAT, format: gl.RGBA, internalFormat: gl.RGBA16F }
          : {}),
      });
      targets.add(target);
      renderer.bindFramebuffer(target);
      const complete =
        gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      renderer.bindFramebuffer();
      if (!complete) {
        disposeTarget(target);
        throw new Error("PatternWaves framebuffer unavailable");
      }
      return target;
    };
    const programFor = (
      fragment: string,
      uniforms: Record<string, { value: number | number[] | Texture }>,
    ) => {
      const program = new Program(gl, {
        vertex: passVertex,
        fragment,
        uniforms,
        depthTest: false,
        depthWrite: false,
      });
      programs.push(program);
      if (!gl.getProgramParameter(program.program, gl.LINK_STATUS))
        throw new Error("PatternWaves shader unavailable");
      return program;
    };

    let fieldTarget = targetFor(1, 1);
    let ripple: Ripple | null = null;
    let width = 1;
    let height = 1;
    let rippleClock = 0;
    let rippleLive = false;
    let atlasKey = "";
    let configured: PatternWavesSettings | null = null;
    let needsConfigure = true;
    let drawnTime = NaN;
    let drawnIntro = NaN;
    const fieldUniforms = {
      uSize: { value: [1, 1] },
      uDpr: { value: 1 },
      uOrigin: { value: [0, 0] },
      uPitch: { value: [1, 1] },
      uWave: { value: 0 },
      uTime: { value: 0 },
      uUnit: { value: WAVE_UNIT },
      uHeading: { value: [1, 0] },
      uAmp: { value: 0 },
      uDepth: { value: 0.5 },
      uLight: { value: [0, 0, 1] },
      uShine: { value: 0.8 },
      uContrast: { value: 1 },
      uInk: { value: 0 },
      uOpacity: { value: 1 },
      uFade: { value: 0 },
      uFadeSize: { value: 0.5 },
      uAppear: { value: 0 },
      tRipple: { value: blank },
      uRipple: { value: 0 },
    };
    const fieldMesh = new Mesh(gl, {
      geometry,
      program: programFor(fieldFragment, fieldUniforms),
    });
    const rippleUniforms = {
      tState: { value: blank },
      uTexel: { value: [1, 1] },
      uSize: { value: [1, 1] },
      uFrom: { value: [0, 0] },
      uTo: { value: [0, 0] },
      uRadius: { value: 40 },
      uImpulse: { value: 0 },
      uDamping: { value: 0.975 },
    };
    const rippleMesh = new Mesh(gl, {
      geometry,
      program: programFor(rippleFragment, rippleUniforms),
    });
    const markUniforms = {
      tField: { value: fieldTarget.texture },
      tAtlas: { value: atlasTexture },
      uOrigin: { value: [0, 0] },
      uPitch: { value: [1, 1] },
      uGrid: { value: [1, 1] },
      uPattern: { value: 0 },
      uMarkSize: { value: 0.9 },
      uStroke: { value: 2 },
      uColor: { value: [1, 1, 1] },
      uAccent: { value: [1, 1, 1] },
      uBackground: { value: [0, 0, 0, 1] },
      uAtlas: { value: [1, 1, 0] },
      uResolution: { value: [1, 1] },
      uBandDirection: { value: [0, 1] },
      uBandNormal: { value: [1, 0] },
      uBandSpan: { value: 1 },
      uBandTravel: { value: 1 },
      uExitProgress: { value: 0 },
    };
    const markMesh = new Mesh(gl, {
      geometry,
      program: programFor(markFragment, markUniforms),
    });

    const clear = () => {
      renderer.bindFramebuffer();
      renderer.setViewport(canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
    };
    const clearRipple = () => {
      if (ripple) {
        for (const target of [ripple.read, ripple.write]) {
          renderer.bindFramebuffer(target);
          renderer.setViewport(target.width, target.height);
          gl.clear(gl.COLOR_BUFFER_BIT);
        }
        renderer.bindFramebuffer();
      }
      rippleLive = false;
      rippleClock = 0;
    };
    const resize = (w: number, h: number, dpr: number) => {
      width = w;
      height = h;
      renderer.dpr = dpr;
      renderer.setSize(w, h);
      needsConfigure = true;
      const bands = getPatternWaveBands(canvas.width, canvas.height);
      markUniforms.uResolution.value = [canvas.width, canvas.height];
      markUniforms.uBandDirection.value = bands.direction;
      markUniforms.uBandNormal.value = bands.normal;
      markUniforms.uBandSpan.value = bands.span;
      markUniforms.uBandTravel.value = bands.travel;
      if (!floatTargets) return;
      const rw = clamp(Math.ceil(w / RIPPLE_CELL), 4, 512);
      const rh = clamp(Math.ceil(h / RIPPLE_CELL), 4, 512);
      if (ripple?.width === rw && ripple.height === rh) return;
      if (ripple) {
        disposeTarget(ripple.read);
        disposeTarget(ripple.write);
        ripple = null;
      }
      // Unsupported floating targets disable interaction, not the background.
      let read: RenderTarget | null = null;
      try {
        read = targetFor(rw, rh, true);
        const write = targetFor(rw, rh, true);
        ripple = { width: rw, height: rh, read, write };
        clearRipple();
      } catch {
        if (read) disposeTarget(read);
        floatTargets = false;
      }
    };
    const stepRipple = (
      field: Ripple,
      s: PatternWavesSettings,
      pointer: Pointer,
      dt: number,
    ) => {
      rippleClock = Math.min(rippleClock + dt * RIPPLE_RATE, 4);
      const strength = clamp(s.cursorStrength, 0, 1);
      const moved = Math.hypot(
        pointer.x - pointer.lastX,
        pointer.y - pointer.lastY,
      );
      let impulse =
        (pointer.inside ? Math.min(moved / 14, 1) * 0.35 * strength : 0) +
        pointer.burst * strength;
      if (rippleClock < 1) return;
      pointer.burst = 0;
      rippleUniforms.uTexel.value[0] = 1 / field.width;
      rippleUniforms.uTexel.value[1] = 1 / field.height;
      rippleUniforms.uSize.value[0] = width;
      rippleUniforms.uSize.value[1] = height;
      rippleUniforms.uFrom.value[0] = pointer.lastX;
      rippleUniforms.uFrom.value[1] = height - pointer.lastY;
      rippleUniforms.uTo.value[0] = pointer.x;
      rippleUniforms.uTo.value[1] = height - pointer.y;
      rippleUniforms.uRadius.value = clamp(s.cursorSize, 8, 400);
      while (rippleClock >= 1) {
        rippleClock -= 1;
        rippleUniforms.tState.value = field.read.texture;
        rippleUniforms.uImpulse.value = impulse;
        renderer.render({
          scene: rippleMesh,
          target: field.write,
          clear: false,
        });
        const next = field.read;
        field.read = field.write;
        field.write = next;
        impulse = 0;
      }
      pointer.lastX = pointer.x;
      pointer.lastY = pointer.y;
    };

    // Layout and appearance uniforms change only with options or dimensions.
    // The per-frame path below updates just time, ripple state and the exit.
    const configure = (
      s: PatternWavesSettings,
      color: Color,
      background: Color,
    ) => {
      const patternIndex = PATTERNS[s.pattern];
      if (patternIndex === 4 && atlasKey !== s.characters) {
        atlasKey = s.characters;
        const atlas = buildAtlas(s.characters);
        if (atlas) {
          atlasTexture.image = atlas.canvas;
          markUniforms.uAtlas.value = [atlas.columns, atlas.lines, atlas.count];
        }
      }
      const canvasW = canvas.width;
      const canvasH = canvas.height;
      const dpr = canvasW / width;
      const pitchY = Math.max(4, Math.round(clamp(s.spacing, 4, 120) * dpr));
      const pitchX =
        patternIndex === 3 ? Math.max(2, Math.round(pitchY / 4)) : pitchY;
      const cols = Math.min(4096, Math.ceil(canvasW / pitchX) + 1);
      const rows = Math.min(4096, Math.ceil(canvasH / pitchY) + 2);
      const origin = [
        Math.floor((canvasW - cols * pitchX) / 2),
        Math.floor((canvasH - rows * pitchY) / 2),
      ];
      if (fieldTarget.width !== cols || fieldTarget.height !== rows) {
        const next = targetFor(cols, rows);
        disposeTarget(fieldTarget);
        fieldTarget = next;
        markUniforms.tField.value = next.texture;
      }
      const heading = (s.direction * Math.PI) / 180;
      const lightAngle =
        ((s.direction + 180 + clamp(s.light, -90, 90)) * Math.PI) / 180;
      const luminance = (rgba: Color) =>
        0.2126 * rgba[0] + 0.7152 * rgba[1] + 0.0722 * rgba[2];
      const ink =
        background[3] > 0.02
          ? luminance(color) < luminance(background)
          : luminance(color) < 0.5;
      fieldUniforms.uSize.value = [width, height];
      fieldUniforms.uDpr.value = dpr;
      fieldUniforms.uOrigin.value = origin;
      fieldUniforms.uPitch.value = [pitchX, pitchY];
      fieldUniforms.uWave.value = WAVES[s.wave];
      fieldUniforms.uUnit.value = WAVE_UNIT * clamp(s.scale, 0.2, 5);
      fieldUniforms.uHeading.value = [Math.cos(heading), Math.sin(heading)];
      fieldUniforms.uDepth.value = clamp(s.depth, 0, 1.5);
      fieldUniforms.uLight.value = [
        Math.cos(lightAngle) * 0.78,
        Math.sin(lightAngle) * 0.78,
        0.62,
      ];
      fieldUniforms.uShine.value = clamp(s.shine, 0, 2);
      fieldUniforms.uContrast.value = clamp(s.contrast, 0.3, 3);
      fieldUniforms.uInk.value = ink ? 1 : 0;
      fieldUniforms.uOpacity.value = clamp(s.opacity, 0, 1);
      fieldUniforms.uFade.value = FADES[s.fade];
      fieldUniforms.uFadeSize.value = clamp(s.fadeSize, 0.05, 1);

      markUniforms.uOrigin.value = origin;
      markUniforms.uPitch.value = [pitchX, pitchY];
      markUniforms.uGrid.value = [cols, rows];
      markUniforms.uPattern.value = patternIndex;
      markUniforms.uMarkSize.value = clamp(s.markSize, 0.05, 1);
      markUniforms.uStroke.value =
        patternIndex === 3 ? 0.9 * dpr : Math.max(1.1 * dpr, pitchY * 0.08);
      const tint = ink ? 0 : 1;
      const blend = ink ? 0.35 : 0.55;
      markUniforms.uColor.value = color.slice(0, 3);
      markUniforms.uAccent.value = color
        .slice(0, 3)
        .map((channel) => channel + (tint - channel) * blend);
      markUniforms.uBackground.value = background;
      configured = s;
      needsConfigure = false;
    };
    const draw = (
      s: PatternWavesSettings,
      color: Color,
      background: Color,
      time: number,
      intro: number,
      exit: number,
      pointer: Pointer,
      rippleActive: boolean,
      dt: number,
    ) => {
      const configurationChanged = needsConfigure || configured !== s;
      if (configurationChanged) configure(s, color, background);
      const hadRipples = rippleLive;
      if (rippleActive && ripple) {
        stepRipple(ripple, s, pointer, dt);
        rippleLive = true;
      } else if (rippleLive) clearRipple();
      if (
        configurationChanged ||
        time !== drawnTime ||
        intro !== drawnIntro ||
        rippleLive ||
        hadRipples
      ) {
        const appear = 1 - Math.pow(1 - clamp(intro / 0.75, 0, 1), 3);
        const rise = clamp((intro - 0.1) / 0.9, 0, 1);
        fieldUniforms.uTime.value = time;
        fieldUniforms.uAmp.value = rise * rise * (3 - 2 * rise);
        fieldUniforms.uAppear.value = appear;
        fieldUniforms.tRipple.value =
          ripple && rippleLive ? ripple.read.texture : blank;
        fieldUniforms.uRipple.value = rippleLive ? 0.32 : 0;
        renderer.render({ scene: fieldMesh, target: fieldTarget });
        drawnTime = time;
        drawnIntro = intro;
      }
      markUniforms.uExitProgress.value = exit;
      renderer.render({ scene: markMesh });
    };
    return { draw, resize, clear, destroy, hasRipples: () => !!ripple };
  } catch {
    destroy();
    return null;
  }
}

export function createPatternWaves(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  initial: PatternWavesOptions,
  initialExit = 0,
): PatternWavesController {
  let options = { ...initial };
  let settings = resolvePatternWaves(options);
  let color = parseColor(settings.color, [0.278, 0.612, 0.451, 1]);
  let background = parseColor(
    settings.backgroundColor,
    [0.894, 0.918, 0.91, 1],
  );
  let surface: ReturnType<typeof createSurface> = null;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = window.matchMedia("(pointer: coarse)");
  let width = 1;
  let height = 1;
  let dpr = 1;
  let hasArea = false;
  let visible = false;
  let exposed = true;
  let alive = true;
  let lost = false;
  let failed = false;
  let raf = 0;
  let last = 0;
  let time = 0;
  let intro = settings.intro && !motion.matches ? 0 : 1;
  let dirty = true;
  let needsResize = true;
  let exit = clamp(initialExit, 0, 1);
  let rippleUntil = 0;
  let pendingMove = false;
  let pointerClientX = 0;
  let pointerClientY = 0;
  const pointer: Pointer = {
    x: 0,
    y: 0,
    inside: false,
    placed: false,
    lastX: 0,
    lastY: 0,
    burst: 0,
  };
  const canDraw = () =>
    alive &&
    !lost &&
    !failed &&
    visible &&
    exposed &&
    hasArea &&
    settings.active &&
    exit < 1 &&
    !document.hidden;
  const pause = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  };
  const resetPointer = () => {
    pendingMove = false;
    pointer.inside = false;
    pointer.placed = false;
    pointer.burst = 0;
  };
  const fail = () => {
    pause();
    failed = true;
    surface?.destroy();
    surface = null;
    delete container.dataset.patternReady;
  };
  const frame = (now: number) => {
    raf = 0;
    if (!canDraw()) {
      last = 0;
      return;
    }
    const elapsed = last ? now - last : FRAME_MS;
    const moving = !motion.matches && !settings.paused && settings.speed !== 0;
    let rippleActive = false;
    if (dirty || elapsed >= FRAME_MS - 0.5) {
      try {
        surface ??= createSurface(canvas);
        if (!surface) {
          fail();
          return;
        }
        if (needsResize) {
          surface.resize(width, height, dpr);
          needsResize = false;
        }
        const dt = Math.min(0.05, Math.max(0, elapsed / 1000));
        if (moving) time += dt * settings.speed;
        intro =
          settings.intro && !motion.matches ? Math.min(1, intro + dt / 2) : 1;
        consumePointerMove();
        const rippling =
          settings.interactive &&
          !motion.matches &&
          settings.cursorStrength > 0 &&
          surface.hasRipples();
        if (rippling && pointer.inside && !pointer.placed) {
          pointer.lastX = pointer.x;
          pointer.lastY = pointer.y;
          pointer.placed = true;
        }
        if (rippling && (pointer.inside || pointer.burst > 0))
          rippleUntil = now + 5000;
        rippleActive = rippling && now < rippleUntil;
        surface.draw(
          settings,
          color,
          background,
          time,
          intro,
          exit,
          pointer,
          rippleActive,
          dt,
        );
        if (!("patternReady" in container.dataset))
          container.dataset.patternReady = "";
        dirty = false;
        last = now;
      } catch {
        fail();
        return;
      }
    } else rippleActive = !motion.matches && now < rippleUntil;
    if (canDraw() && (moving || intro < 1 || rippleActive))
      raf = requestAnimationFrame(frame);
    else last = 0;
  };
  const wake = () => {
    if (!raf && canDraw()) raf = requestAnimationFrame(frame);
  };
  const availability = () => {
    if (!canDraw()) {
      pause();
      resetPointer();
    } else {
      dirty = true;
      wake();
    }
  };
  const resize = () => {
    const nextW = container.clientWidth;
    const nextH = container.clientHeight;
    const nextArea = nextW > 0 && nextH > 0;
    const nextWidth = Math.max(1, nextW);
    const nextHeight = Math.max(1, nextH);
    const nextDpr = Math.min(
      window.devicePixelRatio || 1,
      coarse.matches ? 1.5 : 1.75,
      Math.sqrt(PIXEL_BUDGET / (nextWidth * nextHeight)),
    );
    if (
      width === nextWidth &&
      height === nextHeight &&
      dpr === nextDpr &&
      hasArea === nextArea
    )
      return;
    hasArea = nextArea;
    width = nextWidth;
    height = nextHeight;
    dpr = nextDpr;
    needsResize = true;
    dirty = true;
    resetPointer();
    if (!canDraw()) pause();
    else wake();
  };
  const acceptPointer = () =>
    canDraw() && exit === 0 && settings.interactive && !motion.matches;
  const locate = (clientX: number, clientY: number) => {
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return {
      x: (x * width) / Math.max(1, rect.width),
      y: (y * height) / Math.max(1, rect.height),
      inside: x >= 0 && y >= 0 && x <= rect.width && y <= rect.height,
    };
  };
  const consumePointerMove = () => {
    if (!pendingMove) return;
    pendingMove = false;
    const spot = locate(pointerClientX, pointerClientY);
    if (spot.inside !== pointer.inside) pointer.placed = false;
    Object.assign(pointer, spot);
  };
  const onMove = (event: PointerEvent) => {
    if (!acceptPointer()) return;
    // High-frequency pointer events share one geometry read per rendered frame.
    pointerClientX = event.clientX;
    pointerClientY = event.clientY;
    pendingMove = true;
    dirty = true;
    wake();
  };
  const onDown = (event: PointerEvent) => {
    if (
      !acceptPointer() ||
      (event.pointerType === "mouse" && event.button !== 0)
    )
      return;
    pendingMove = false;
    const spot = locate(event.clientX, event.clientY);
    if (!spot.inside) return;
    if (!pointer.inside) {
      pointer.lastX = spot.x;
      pointer.lastY = spot.y;
    }
    Object.assign(pointer, spot);
    pointer.burst = 1.2;
    dirty = true;
    wake();
  };
  const onLeave = () => {
    resetPointer();
    wake();
  };
  const onOut = (event: PointerEvent) => {
    if (!event.relatedTarget) onLeave();
  };
  const onUp = (event: PointerEvent) => {
    if (event.pointerType === "touch") onLeave();
  };
  const onMotion = () => {
    pause();
    resetPointer();
    rippleUntil = 0;
    dirty = true;
    wake();
  };
  const onContextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    pause();
    surface?.destroy();
    surface = null;
    delete container.dataset.patternReady;
  };
  const onContextRestored = () => {
    lost = false;
    failed = false;
    needsResize = true;
    dirty = true;
    availability();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersection = new IntersectionObserver(([entry]) => {
    if (visible === entry.isIntersecting) return;
    visible = entry.isIntersecting;
    availability();
  });
  intersection.observe(container);
  // Hero's aria-hidden can change before its visual exit has finished.
  const exposure = observeEffectVisibility(container, (next) => {
    exposed = next;
    availability();
  });
  document.addEventListener("visibilitychange", availability);
  motion.addEventListener("change", onMotion);
  coarse.addEventListener("change", resize);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("pointerout", onOut, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });
  window.addEventListener("pointercancel", onLeave, { passive: true });
  window.addEventListener("blur", onLeave);
  if (exit === 1) container.dataset.patternExited = "";
  resize();
  availability();

  return {
    update(next) {
      if (!alive) return;
      if (
        !Object.keys(next).some(
          (key) =>
            next[key as keyof PatternWavesOptions] !==
            options[key as keyof PatternWavesOptions],
        )
      )
        return;
      options = { ...options, ...next };
      const previous = settings;
      settings = resolvePatternWaves(options);
      if (previous.color !== settings.color)
        color = parseColor(settings.color, color);
      if (previous.backgroundColor !== settings.backgroundColor)
        background = parseColor(settings.backgroundColor, background);
      dirty = true;
      if (!canDraw()) {
        pause();
        resetPointer();
      } else wake();
    },
    setExitProgress(progress) {
      if (!alive) return;
      const next = clamp(progress, 0, 1);
      if (next === exit) return;
      exit = next;
      dirty = true;
      if (exit > 0) resetPointer();
      if (exit === 1) {
        // Clear synchronously even if active=false arrives in the same frame.
        // Hiding also covers a lost/unavailable context without a stale last frame.
        pause();
        container.dataset.patternExited = "";
        if (surface && !lost) surface.clear();
      } else {
        delete container.dataset.patternExited;
        wake();
      }
    },
    destroy() {
      alive = false;
      pause();
      resizeObserver.disconnect();
      intersection.disconnect();
      exposure.destroy();
      document.removeEventListener("visibilitychange", availability);
      motion.removeEventListener("change", onMotion);
      coarse.removeEventListener("change", resize);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerout", onOut);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onLeave);
      window.removeEventListener("blur", onLeave);
      surface?.destroy();
      surface = null;
      delete container.dataset.patternReady;
      delete container.dataset.patternExited;
      // React Strict Mode reuses this canvas: never force WEBGL_lose_context.
    },
  };
}
