// Adapted from the user-supplied React Bits Radar. No runtime dependencies.
// Copyright (c) 2026 David Haz. See LICENSE-react-bits.md.
import {
  QUAD_VERTEX,
  SCENE,
  SPRITE_VERTEX,
  SPRITE_FRAGMENT,
  DOWN,
  UP,
  COMPOSITE,
} from "./radar-shaders";
import { observeEffectVisibility } from "./effect-visibility";
type Program = {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
};

type Target = {
  texture: WebGLTexture | null;
  framebuffer: WebGLFramebuffer | null;
  width: number;
  height: number;
};

type Echo = { x: number; y: number; time: number };

type Contact = {
  x: number;
  y: number;
  heading: number;
  velocity: number;
  turn: number;
  echoes: Echo[];
};

const TAU = Math.PI * 2;
const MAX_TARGETS = 16;
const HISTORY = 4;
const FOCAL = 2;
const BLOOM_LEVELS = 3;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const seeded = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};

const link = (
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
  attributes: string[],
): Program | null => {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    if (program) gl.deleteProgram(program);
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  attributes.forEach((name, index) =>
    gl.bindAttribLocation(program, index, name),
  );
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
};

const spawnTarget = (rng: () => number, inward: boolean) => {
  const angle = rng() * TAU;
  const radius = inward ? 0.94 : 0.2 + rng() * 0.68;
  const heading = inward ? angle + Math.PI + (rng() - 0.5) * 1.6 : rng() * TAU;
  return {
    x: Math.sin(angle) * radius,
    y: Math.cos(angle) * radius,
    heading,
    velocity: 0.012 + rng() * 0.03,
    turn: (rng() - 0.5) * 0.18,
  };
};

export interface RadarView {
  tilt: number;
  centerX: number;
  centerY: number;
  scale: number;
}

export interface RadarOptions extends RadarView {
  active: boolean;
  color: string;
  speed: number;
  glow: number;
  opacity: number;
}

export interface RadarController {
  update(options: Partial<RadarOptions>): void;
  destroy(): void;
}

type Settings = RadarOptions & {
  mode: "sweep" | "pulse";
  trail: number;
  ringCount: number;
  spokeCount: number;
  ticks: boolean;
  targets: number;
  clutter: number;
  brightness: number;
  gridOpacity: number;
  lineWidth: number;
  grain: number;
  fade: number;
  lightMode: boolean;
  backgroundColor: string;
};

const finite = (value: number, fallback: number) =>
  Number.isFinite(value) ? value : fallback;
const normalize = (options: RadarOptions): Settings => ({
  ...options,
  tilt: (clamp(finite(options.tilt, 64), 0, 80) * Math.PI) / 180,
  centerX: clamp(finite(options.centerX, 0.5), -1, 2),
  centerY: clamp(finite(options.centerY, 0.92), -1, 2),
  scale: clamp(finite(options.scale, 1.7), 0.1, 4),
  speed: clamp(finite(options.speed, 0.35), -2, 2),
  glow: clamp(finite(options.glow, 0.3), 0, 1),
  opacity: clamp(finite(options.opacity, 0.55), 0, 1),
  mode: "sweep",
  trail: 0.28,
  ringCount: 6,
  spokeCount: 12,
  ticks: true,
  targets: 4,
  clutter: 0.12,
  brightness: 0.7,
  gridOpacity: 0.9,
  lineWidth: 1,
  grain: 0,
  fade: 0.18,
  lightMode: true,
  backgroundColor: "transparent",
});

function createRenderer(
  gl: WebGL2RenderingContext,
  canvas: HTMLCanvasElement,
  getSettings: () => Settings,
) {
  const floatTargets = !!gl.getExtension("EXT_color_buffer_float");
  const range = floatTargets ? 1 : 0.25;
  const programs = {
    scene: link(gl, QUAD_VERTEX, SCENE, ["aPosition"]),
    sprite: link(gl, SPRITE_VERTEX, SPRITE_FRAGMENT, [
      "aCorner",
      "aSprite",
      "aStyle",
    ]),
    down: link(gl, QUAD_VERTEX, DOWN, ["aPosition"]),
    up: link(gl, QUAD_VERTEX, UP, ["aPosition"]),
    composite: link(gl, QUAD_VERTEX, COMPOSITE, ["aPosition"]),
  } as Record<string, Program>;
  if (Object.values(programs).some((entry) => !entry)) {
    for (const entry of Object.values(programs))
      if (entry) gl.deleteProgram(entry.program);
    return null;
  }

  const quadBuffer = gl.createBuffer();
  const quadVao = gl.createVertexArray();
  gl.bindVertexArray(quadVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const cornerBuffer = gl.createBuffer();
  const instanceBuffer = gl.createBuffer();
  const spriteVao = gl.createVertexArray();
  gl.bindVertexArray(spriteVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
  for (let attribute = 1; attribute <= 2; attribute++) {
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(
      attribute,
      4,
      gl.FLOAT,
      false,
      32,
      (attribute - 1) * 16,
    );
    gl.vertexAttribDivisor(attribute, 1);
  }
  gl.bindVertexArray(null);

  const createTarget = (): Target => ({
    texture: gl.createTexture(),
    framebuffer: gl.createFramebuffer(),
    width: 0,
    height: 0,
  });
  const sizeTarget = (target: Target, width: number, height: number) => {
    if (target.width === width && target.height === height) return;
    target.width = width;
    target.height = height;
    gl.bindTexture(gl.TEXTURE_2D, target.texture);
    if (floatTargets) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        width,
        height,
        0,
        gl.RGBA,
        gl.HALF_FLOAT,
        null,
      );
    } else {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      target.texture,
      0,
    );
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error("Radar framebuffer unavailable");
    }
  };
  const scene = createTarget();
  const down = Array.from({ length: BLOOM_LEVELS + 1 }, createTarget);
  const up = Array.from({ length: BLOOM_LEVELS }, createTarget);

  const probe = document
    .createElement("canvas")
    .getContext("2d", { willReadFrequently: true });
  const colorCache = new Map<string, number[]>();
  const parseColor = (value: string): number[] => {
    const cached = colorCache.get(value);
    if (cached) return cached;
    let rgba = [1, 1, 1, 1];
    if (probe) {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = "rgba(0, 0, 0, 0)";
      probe.fillStyle = value;
      probe.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
      rgba = a ? [r / 255, g / 255, b / 255, a / 255] : [0, 0, 0, 0];
    }
    colorCache.set(value, rgba);
    return rgba;
  };
  const linearCache = new Map<string, Float32Array>();
  const toLinear = (value: string) => {
    let linear = linearCache.get(value);
    if (!linear) {
      const rgba = parseColor(value);
      linear = new Float32Array([
        Math.pow(rgba[0], 2.2),
        Math.pow(rgba[1], 2.2),
        Math.pow(rgba[2], 2.2),
      ]);
      linearCache.set(value, linear);
    }
    return linear;
  };

  const rng = seeded(7919);
  const contacts: Contact[] = Array.from({ length: MAX_TARGETS }, () => ({
    ...spawnTarget(rng, false),
    echoes: [],
  }));
  const view = { width: 1, height: 1, ratio: 1 };
  const state = {
    time: 4,
    sweep: TAU * 0.14,
    swept: TAU,
    cycle: 1,
  };
  const instances = new Float32Array(8 * 160);
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, instances.byteLength, gl.DYNAMIC_DRAW);

  const fit = (s: Settings) =>
    (s.scale * Math.min(view.width, view.height)) / view.height;

  const period = (s: Settings) => (s.mode === "pulse" ? 3.2 : 6);

  const advance = (s: Settings, dt: number) => {
    const step = dt * Math.abs(s.speed);
    const pulse = s.mode === "pulse";
    const span = pulse ? 1.15 : TAU;
    const delta = (step / period(s)) * span;
    const direction = s.speed < 0 && !pulse ? -1 : 1;
    const previous = state.sweep;
    state.swept += delta;
    const record = (contact: { x: number; y: number; echoes: Echo[] }) => {
      contact.echoes.unshift({ x: contact.x, y: contact.y, time: state.time });
      if (contact.echoes.length > HISTORY) contact.echoes.length = HISTORY;
    };
    const passed = (x: number, y: number) => {
      if (pulse) {
        const radius = Math.hypot(x, y);
        const from = previous;
        const to = previous + delta;
        return (
          (radius > from && radius <= to) || (to > span && radius <= to - span)
        );
      }
      const bearing = Math.atan2(x, y);
      const gap = (((direction * (bearing - previous)) % TAU) + TAU) % TAU;
      return gap > 0 && gap <= delta;
    };
    for (let i = 0; i < s.targets; i++) {
      const contact = contacts[i];
      contact.heading += contact.turn * step;
      contact.x += Math.sin(contact.heading) * contact.velocity * step;
      contact.y += Math.cos(contact.heading) * contact.velocity * step;
      if (Math.hypot(contact.x, contact.y) > 0.96)
        Object.assign(contact, spawnTarget(rng, true));
      if (passed(contact.x, contact.y)) record(contact);
    }
    state.sweep += direction * delta;
    while (state.sweep >= span) {
      state.sweep -= span;
      state.cycle += 1;
    }
    while (state.sweep < 0) {
      state.sweep += span;
      state.cycle += 1;
    }
  };

  const buildSprites = (s: Settings) => {
    const unit = 2 / (fit(s) * view.height);
    const persist = (period(s) / Math.max(Math.abs(s.speed), 0.05)) * 1.1;
    let count = 0;
    const push = (
      x: number,
      y: number,
      radius: number,
      kind: number,
      intensity: number,
      core: number,
      angle: number,
    ) => {
      if (count * 8 + 8 > instances.length) return;
      const offset = count * 8;
      instances[offset] = x;
      instances[offset + 1] = y;
      instances[offset + 2] = radius;
      instances[offset + 3] = kind;
      instances[offset + 4] = intensity;
      instances[offset + 5] = core;
      instances[offset + 6] = 0;
      instances[offset + 7] = angle;
      count++;
    };
    const emit = (contact: { echoes: Echo[] }, strength: number) => {
      contact.echoes.forEach((echo, index) => {
        const age = state.time - echo.time;
        const fade = Math.exp(-age / persist) * (index === 0 ? 1 : 0.8);
        if (fade < 0.01) return;
        const angle = -Math.atan2(echo.x, echo.y);
        push(
          echo.x,
          echo.y,
          unit * (index === 0 ? 3.4 : 2.4),
          0,
          fade * strength * 2.2,
          index === 0 ? 1 : 0.3,
          angle,
        );
        if (index === 0 && age < 1.4) {
          const progress = age / 1.4;
          const eased = 1 - Math.pow(1 - progress, 3);
          push(
            echo.x,
            echo.y,
            unit * (4 + 26 * eased),
            1,
            (1 - progress) * (1 - progress) * strength * 1.4,
            0,
            0,
          );
        }
      });
    };
    for (let i = 0; i < s.targets; i++) emit(contacts[i], 1);
    return count;
  };

  const run = (
    entry: Program,
    target: Target | null,
    width: number,
    height: number,
  ) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
    gl.viewport(0, 0, width, height);
    gl.useProgram(entry.program);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const bindTexture = (
    entry: Program,
    name: string,
    unit: number,
    texture: WebGLTexture | null,
  ) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(entry.uniforms[name], unit);
  };

  const setCamera = (entry: Program, s: Settings) => {
    const u = entry.uniforms;
    gl.uniform2f(u.uResolution, canvas.width, canvas.height);
    gl.uniform2f(
      u.uCenter,
      s.centerX * canvas.width,
      (1 - s.centerY) * canvas.height,
    );
    gl.uniform1f(u.uViewHeight, canvas.height);
    gl.uniform1f(u.uFocal, FOCAL);
    gl.uniform1f(u.uDistance, (2 * FOCAL) / fit(s));
    gl.uniform1f(u.uTilt, s.tilt);
  };

  const render = () => {
    const s = getSettings();
    const accent = toLinear(s.color);
    const presence = 1;
    sizeTarget(scene, canvas.width, canvas.height);

    const sceneProgram = programs.scene;
    const u = sceneProgram.uniforms;
    gl.useProgram(sceneProgram.program);
    setCamera(sceneProgram, s);
    gl.uniform1f(u.uMode, s.mode === "pulse" ? 1 : 0);
    gl.uniform1f(u.uSweep, state.sweep);
    gl.uniform1f(u.uSwept, Math.min(state.swept, TAU + 1));
    gl.uniform1f(u.uDirection, s.speed < 0 && s.mode !== "pulse" ? -1 : 1);
    gl.uniform1f(u.uCycle, state.cycle);
    gl.uniform1f(
      u.uTrail,
      s.mode === "pulse" ? s.trail * 0.22 : s.trail * TAU * 0.5,
    );
    gl.uniform1f(u.uRings, s.ringCount);
    gl.uniform1f(u.uSpokes, s.spokeCount);
    gl.uniform1f(u.uTicks, s.ticks ? 1 : 0);
    gl.uniform1f(u.uGrid, s.gridOpacity);
    gl.uniform1f(u.uLine, s.lineWidth * view.ratio);
    gl.uniform1f(u.uClutter, s.clutter * (s.lightMode ? 0.6 : 1));
    gl.uniform1f(u.uTime, state.time);
    gl.uniform3fv(u.uAccent, accent);
    gl.uniform3f(u.uHeat, 0, 0, 0);
    gl.uniform1f(u.uIntro, presence);
    gl.uniform1f(u.uRange, range);
    gl.uniform1f(u.uPixel, view.ratio);
    gl.bindVertexArray(quadVao);
    run(sceneProgram, scene, canvas.width, canvas.height);

    const count = buildSprites(s);
    if (count > 0) {
      const sprite = programs.sprite;
      gl.useProgram(sprite.program);
      setCamera(sprite, s);
      gl.uniform3fv(sprite.uniforms.uAccent, accent);
      gl.uniform1f(sprite.uniforms.uRange, range * Math.min(1, presence * 2));
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(spriteVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, instances, 0, count * 8);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
      gl.disable(gl.BLEND);
    }

    gl.bindVertexArray(quadVao);
    let source = scene;
    for (
      let level = 0;
      floatTargets && s.glow > 0 && level <= BLOOM_LEVELS;
      level++
    ) {
      const target = down[level];
      const width =
        level === 0 ? Math.round(view.width / 2) : source.width >> 1;
      const height =
        level === 0 ? Math.round(view.height / 2) : source.height >> 1;
      sizeTarget(target, Math.max(1, width), Math.max(1, height));
      gl.useProgram(programs.down.program);
      gl.uniform2f(
        programs.down.uniforms.uTexel,
        1 / source.width,
        1 / source.height,
      );
      gl.uniform2f(programs.down.uniforms.uTarget, target.width, target.height);
      bindTexture(programs.down, "uSource", 0, source.texture);
      run(programs.down, target, target.width, target.height);
      source = target;
    }
    for (
      let level = BLOOM_LEVELS - 1;
      floatTargets && s.glow > 0 && level >= 0;
      level--
    ) {
      const from =
        level === BLOOM_LEVELS - 1 ? down[BLOOM_LEVELS] : up[level + 1];
      const target = up[level];
      sizeTarget(target, down[level].width, down[level].height);
      gl.useProgram(programs.up.program);
      gl.uniform2f(
        programs.up.uniforms.uTexel,
        1 / from.width,
        1 / from.height,
      );
      gl.uniform2f(programs.up.uniforms.uTarget, target.width, target.height);
      bindTexture(programs.up, "uSource", 0, from.texture);
      bindTexture(programs.up, "uBase", 1, down[level].texture);
      run(programs.up, target, target.width, target.height);
    }

    const composite = programs.composite;
    const c = composite.uniforms;
    gl.useProgram(composite.program);
    gl.uniform2f(c.uResolution, canvas.width, canvas.height);
    gl.uniform1f(c.uExposure, (1.5 * s.brightness) / range);
    gl.uniform1f(c.uGlow, floatTargets ? s.glow : 0);
    gl.uniform1f(c.uGrain, s.grain);
    gl.uniform1f(c.uFade, s.fade);
    gl.uniform1f(c.uOpacity, s.opacity);
    gl.uniform1f(c.uTime, state.time % 1000);
    gl.uniform1f(c.uLightMode, s.lightMode ? 1 : 0);
    const back = parseColor(s.backgroundColor);
    gl.uniform4f(c.uBackground, back[0], back[1], back[2], back[3]);
    bindTexture(composite, "uScene", 0, scene.texture);
    bindTexture(
      composite,
      "uBloom",
      1,
      floatTargets && s.glow > 0 ? up[0].texture : scene.texture,
    );
    run(composite, null, canvas.width, canvas.height);
  };

  const destroy = () => {
    for (const target of [scene, ...down, ...up]) {
      gl.deleteTexture(target.texture);
      gl.deleteFramebuffer(target.framebuffer);
    }
    for (const entry of Object.values(programs))
      gl.deleteProgram(entry.program);
    gl.deleteBuffer(quadBuffer);
    gl.deleteBuffer(cornerBuffer);
    gl.deleteBuffer(instanceBuffer);
    gl.deleteVertexArray(quadVao);
    gl.deleteVertexArray(spriteVao);
  };
  if (
    !quadBuffer ||
    !quadVao ||
    !cornerBuffer ||
    !instanceBuffer ||
    !spriteVao ||
    [scene, ...down, ...up].some(
      (target) => !target.texture || !target.framebuffer,
    )
  ) {
    destroy();
    return null;
  }
  contacts.forEach((contact, index) => {
    contact.echoes.push({
      x: contact.x,
      y: contact.y,
      time: state.time - index * 0.7,
    });
  });
  return {
    resize(width: number, height: number, ratio: number) {
      view.width = width;
      view.height = height;
      view.ratio = ratio;
      const pixelWidth = Math.max(1, Math.round(width * ratio));
      const pixelHeight = Math.max(1, Math.round(height * ratio));
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    },
    draw(dt: number) {
      if (dt > 0) {
        state.time += dt;
        advance(getSettings(), dt);
      }
      render();
    },
    destroy,
  };
}

/** Owns visibility and GPU lifetime; the surrounding section owns layout and motion. */
export function createRadar(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  initial: RadarOptions,
): RadarController {
  let options = { ...initial };
  let settings = normalize(options);
  let renderer: ReturnType<typeof createRenderer> = null;
  let gl: WebGL2RenderingContext | null = null;
  let alive = true;
  let lost = false;
  let failed = false;
  let visible = false;
  let exposed = false;
  let dirty = true;
  let needsResize = true;
  let raf = 0;
  let last = 0;
  let width = 1;
  let height = 1;
  let ratio = 1;
  let hasArea = false;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePointer = window.matchMedia("(pointer: coarse)");
  // Decorative wrappers may themselves be aria-hidden; only scene layers use
  // that attribute as a visibility state. Inert/hidden still apply everywhere.
  const sceneLayer = container.closest<HTMLElement>(
    "[data-about-layer], [data-stack-layer], [data-radar-layer]",
  );
  const canDraw = () =>
    alive &&
    !lost &&
    !failed &&
    visible &&
    exposed &&
    hasArea &&
    options.active &&
    !document.hidden;

  const pause = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  };

  const fail = () => {
    pause();
    failed = true;
    renderer?.destroy();
    renderer = null;
    delete container.dataset.radarReady;
  };

  const ensureRenderer = () => {
    if (renderer) return true;
    gl ??= canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    if (!gl || gl.isContextLost()) return false;
    renderer = createRenderer(gl, canvas, () => settings);
    if (!renderer) return false;
    needsResize = true;
    return true;
  };

  const frame = (now: number) => {
    raf = 0;
    if (!canDraw()) {
      last = 0;
      return;
    }
    const elapsed = last ? now - last : 1000 / 30;
    const moving = !motion.matches && Math.abs(settings.speed) > 0;
    // The background runs at 30 fps; camera updates can still render every frame.
    if (dirty || elapsed >= 1000 / 30 - 0.5) {
      try {
        if (!ensureRenderer()) {
          fail();
          return;
        }
        if (needsResize) {
          renderer!.resize(width, height, ratio);
          needsResize = false;
        }
        renderer!.draw(moving ? Math.min(0.05, elapsed / 1000) : 0);
        if (!("radarReady" in container.dataset))
          container.dataset.radarReady = "";
        dirty = false;
        last = now;
      } catch {
        // A decorative GPU failure never hides or blocks the section's content.
        fail();
        return;
      }
    }
    if (moving) raf = requestAnimationFrame(frame);
    else last = 0;
  };

  const wake = () => {
    if (!raf && canDraw()) raf = requestAnimationFrame(frame);
  };

  const availability = () => {
    if (!canDraw()) pause();
    else {
      dirty = true;
      wake();
    }
  };

  const resize = () => {
    const rawWidth = container.clientWidth;
    const rawHeight = container.clientHeight;
    const nextArea = rawWidth > 0 && rawHeight > 0;
    const nextWidth = Math.max(1, rawWidth);
    const nextHeight = Math.max(1, rawHeight);
    const cap = coarsePointer.matches ? 1.5 : 1.75;
    const base = Math.min(window.devicePixelRatio || 1, cap);
    const nextRatio = Math.min(base, 1920 / Math.max(nextWidth, nextHeight));
    if (
      width === nextWidth &&
      height === nextHeight &&
      ratio === nextRatio &&
      hasArea === nextArea
    )
      return;
    width = nextWidth;
    height = nextHeight;
    ratio = nextRatio;
    hasArea = nextArea;
    needsResize = true;
    dirty = true;
    if (!canDraw()) pause();
    else wake();
  };

  const onMotion = () => {
    pause();
    dirty = true;
    wake();
  };
  const onContextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    pause();
    renderer?.destroy();
    renderer = null;
    delete container.dataset.radarReady;
  };
  const onContextRestored = () => {
    lost = false;
    failed = false;
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
  const exposure = observeEffectVisibility(
    container,
    (next) => {
      exposed = next;
      availability();
    },
    sceneLayer,
  );
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  document.addEventListener("visibilitychange", availability);
  motion.addEventListener("change", onMotion);
  coarsePointer.addEventListener("change", resize);
  window.addEventListener("resize", resize, { passive: true });
  resize();
  availability();

  return {
    update(next) {
      if (!alive) return;
      if (
        !Object.keys(next).some(
          (key) =>
            next[key as keyof RadarOptions] !==
            options[key as keyof RadarOptions],
        )
      )
        return;
      options = { ...options, ...next };
      settings = normalize(options);
      dirty = true;
      if (!canDraw()) pause();
      else wake();
    },
    destroy() {
      alive = false;
      pause();
      resizeObserver.disconnect();
      intersection.disconnect();
      exposure.destroy();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      document.removeEventListener("visibilitychange", availability);
      motion.removeEventListener("change", onMotion);
      coarsePointer.removeEventListener("change", resize);
      window.removeEventListener("resize", resize);
      renderer?.destroy();
      renderer = null;
      delete container.dataset.radarReady;
      // Do not force context loss: React Strict Mode reuses this same canvas.
    },
  };
}
