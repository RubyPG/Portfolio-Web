import { Renderer, Program, Mesh, Triangle, Texture, RenderTarget } from "ogl";

// Adapted from the user-supplied React Bits DitherVeil: Floyd diffusion and
// pointer trail, with source alpha preserved instead of an opaque backdrop.
interface VeilOptions {
  inkColor: string;
  paperColor: string;
  pixelSize: number;
  revealRadius: number;
  softness: number;
  linger: number;
  onReady: () => void;
  onFallback: () => void;
}

export interface DitherVeilController {
  destroy: () => void;
  setRevealProgress: (progress: number) => void;
}

const inactiveController: DitherVeilController = {
  destroy: () => {},
  setRevealProgress: () => {},
};

const VERTEX = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0., 1.); }
`;

const MASK = `#version 300 es
precision highp float;
uniform sampler2D tPrev;
uniform vec2 uSize, uFrom, uTo;
uniform float uRadius, uSoftness, uStrength, uFade;
in vec2 vUv;
out vec4 fragColor;
void main() {
  vec2 p = vec2(vUv.x, 1. - vUv.y) * uSize;
  vec2 ab = uTo - uFrom;
  float h = clamp(dot(p - uFrom, ab) / max(dot(ab, ab), .0001), 0., 1.);
  float d = length(p - uFrom - ab * h);
  float trail = max(texture(tPrev, vUv).r - uFade, 0.);
  float band = max(uRadius * uSoftness, 1.) * 1.6;
  trail = max(trail, clamp((uRadius - d) / band, 0., 1.) * uStrength);
  fragColor = vec4(trail, 0., 0., 1.);
}
`;

const VIEW = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D tImage, tDiffused, tMask;
uniform vec2 uResolution, uSize;
uniform float uCell, uBurstWidth, uRevealProgress;
uniform vec3 uInk, uPaper;
uniform vec4 uBursts[4];
in vec2 vUv;
out vec4 fragColor;
float bayer(vec2 cell) {
  ivec2 p = ivec2(mod(cell, 8.));
  int v = p.x ^ p.y;
  int m = ((v & 1) << 5) | ((p.y & 1) << 4) | ((v & 2) << 2)
    | ((p.y & 2) << 1) | ((v & 4) >> 1) | ((p.y & 4) >> 2);
  return (float(m) + .5) / 64.;
}
void main() {
  vec2 px = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 cell = floor(px / uCell);
  vec2 center = (cell + .5) * uCell;
  vec2 cellUv = vec2(center.x / uResolution.x, 1. - center.y / uResolution.y);
  vec4 photo = texture(tImage, vUv);
  // Every rendered pixel keeps the alpha of the untouched source PNG.
  if (photo.a <= .001) { fragColor = vec4(0.); return; }
  vec3 color = mix(uInk, uPaper, texelFetch(tDiffused, ivec2(cell), 0).r);
  float shown = clamp(texture(tMask, cellUv).r * 1.6, 0., 1.);
  vec2 point = vec2(cellUv.x, 1. - cellUv.y) * uSize;
  for (int i = 0; i < 4; i++) {
    vec4 burst = uBursts[i];
    if (burst.w <= 0.) continue;
    float offset = distance(point, burst.xy) - burst.z;
    float edge = offset > 0. ? offset / (uBurstWidth * .35) : -offset / uBurstWidth;
    shown = max(shown, clamp(1. - edge, 0., 1.) * burst.w);
  }
  shown *= 1. - uRevealProgress;
  color = mix(color, photo.rgb, step(bayer(cell.yx), shown));
  fragColor = vec4(color, photo.a);
}
`;

const rgb = (hex: string) => {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
};

function diffuse(pixels: Uint8ClampedArray, cols: number, rows: number) {
  const values = new Float32Array(cols * rows);
  const output = new Uint8Array(cols * rows * 4);
  for (let i = 0; i < values.length; i++) {
    const luminance =
      (pixels[i * 4] * 0.2126 +
        pixels[i * 4 + 1] * 0.7152 +
        pixels[i * 4 + 2] * 0.0722) /
      255;
    // Lift the dark fabric just enough to retain a visible paper-dot texture;
    // the darker ink carries the silhouette while midtones retain facial detail.
    const tone = Math.pow(luminance, 0.65);
    values[i] = 0.28 + tone * 0.66;
  }
  for (let y = 0; y < rows; y++) {
    const direction = y & 1 ? -1 : 1;
    for (let i = 0; i < cols; i++) {
      const x = direction > 0 ? i : cols - 1 - i;
      const p = y * cols + x;
      if (!pixels[p * 4 + 3]) continue;
      const quantized = values[p] >= 0.5 ? 1 : 0;
      const error = values[p] - quantized;
      output[p * 4] = output[p * 4 + 1] = output[p * 4 + 2] = quantized * 255;
      output[p * 4 + 3] = pixels[p * 4 + 3];
      // Preserve Floyd's exact update order without an iterator per source cell.
      const ahead = x + direction;
      const behind = x - direction;
      const hasAhead = ahead >= 0 && ahead < cols;
      if (hasAhead && pixels[(p + direction) * 4 + 3])
        values[p + direction] += error * (7 / 16);
      if (y + 1 >= rows) continue;
      const below = p + cols;
      if (behind >= 0 && behind < cols && pixels[(below - direction) * 4 + 3])
        values[below - direction] += error * (3 / 16);
      if (pixels[below * 4 + 3]) values[below] += error * (5 / 16);
      if (hasAhead && pixels[(below + direction) * 4 + 3])
        values[below + direction] += error * (1 / 16);
    }
  }
  return output;
}

export function createDitherVeil(
  host: HTMLElement,
  photo: HTMLImageElement,
  options: VeilOptions,
): DitherVeilController {
  const canvas = document.createElement("canvas");
  // Check WebGL2 before constructing OGL: its fallback cannot run GLSL 300.
  const context = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: false,
    depth: false,
    antialias: false,
  });
  if (!context) return inactiveController;
  const renderer = new Renderer({
    canvas,
    dpr: Math.min(devicePixelRatio || 1, 2),
    alpha: true,
    premultipliedAlpha: false,
    depth: false,
    antialias: false,
  });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);
  const geometry = new Triangle(gl);
  const imageTexture = new Texture(gl, {
    image: photo,
    minFilter: gl.LINEAR,
    generateMipmaps: false,
  });
  const diffusedTexture = new Texture(gl, {
    image: new Uint8Array(4),
    width: 1,
    height: 1,
    flipY: false,
    generateMipmaps: false,
    minFilter: gl.NEAREST,
    magFilter: gl.NEAREST,
  });
  const floatMask = !!gl.getExtension("EXT_color_buffer_float");
  const createMask = (width: number, height: number) =>
    new RenderTarget(gl, {
      width,
      height,
      depth: false,
      type: floatMask ? context.HALF_FLOAT : gl.UNSIGNED_BYTE,
      internalFormat: floatMask ? context.RGBA16F : gl.RGBA,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
    });
  const deleteMask = (target: RenderTarget) => {
    gl.deleteFramebuffer(target.buffer);
    gl.deleteTexture(target.texture.texture);
  };
  let masks = [createMask(2, 2), createMask(2, 2)];
  const maskUniforms = {
    tPrev: { value: masks[0].texture },
    uSize: { value: [1, 1] },
    uFrom: { value: [0, 0] },
    uTo: { value: [0, 0] },
    uRadius: { value: options.revealRadius },
    uSoftness: { value: Math.max(0, options.softness) },
    uStrength: { value: 0 },
    uFade: { value: 1 },
  };
  const viewUniforms = {
    tImage: { value: imageTexture },
    tDiffused: { value: diffusedTexture },
    tMask: { value: masks[0].texture },
    uResolution: { value: [1, 1] },
    uSize: { value: [1, 1] },
    uCell: { value: Math.max(1, Math.round(options.pixelSize * renderer.dpr)) },
    uInk: { value: rgb(options.inkColor) },
    uPaper: { value: rgb(options.paperColor) },
    // OGL resolves GLSL array uniforms through ordinary arrays.
    uBursts: { value: Array<number>(16).fill(0) },
    uBurstWidth: { value: Math.max(60, options.revealRadius * 0.9) },
    uRevealProgress: { value: 0 },
  };
  const maskProgram = new Program(gl, {
    vertex: VERTEX,
    fragment: MASK,
    uniforms: maskUniforms,
    depthTest: false,
    depthWrite: false,
  });
  // Blending stays off: write straight RGBA into the transparent canvas once,
  // letting the browser composite the PNG alpha exactly once with the page.
  const viewProgram = new Program(gl, {
    vertex: VERTEX,
    fragment: VIEW,
    uniforms: viewUniforms,
    depthTest: false,
    depthWrite: false,
  });
  const maskMesh = new Mesh(gl, { geometry, program: maskProgram });
  const viewMesh = new Mesh(gl, { geometry, program: viewProgram });
  const sampler = document.createElement("canvas");
  const sample = sampler.getContext("2d", { willReadFrequently: true });
  if (
    !sample ||
    !gl.getProgramParameter(viewProgram.program, gl.LINK_STATUS) ||
    !gl.getProgramParameter(maskProgram.program, gl.LINK_STATUS)
  ) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return inactiveController;
  }

  let width = 1,
    height = 1,
    raf = 0,
    last = 0,
    activeUntil = 0;
  let visible = true,
    destroyed = false,
    presence = 0,
    resetTrail = false,
    hasLayout = false,
    announcedReady = false;
  const pointer = { x: 0, y: 0, inside: false, fresh: true };
  const brush = { x: 0, y: 0 };
  const bursts: { x: number; y: number; start: number }[] = [];

  const frame = (now: number) => {
    raf = 0;
    if (destroyed) return;
    try {
      const elapsed = Math.max(0, (now - last) / 1000);
      const dt = Math.min(0.05, elapsed);
      last = now;
      presence +=
        ((pointer.inside ? 1 : 0) - presence) * (1 - Math.exp(-elapsed / 0.16));
      const previous = [brush.x, brush.y];
      if (pointer.fresh) {
        brush.x = pointer.x;
        brush.y = pointer.y;
        previous[0] = brush.x;
        previous[1] = brush.y;
        pointer.fresh = false;
      } else {
        const follow = 1 - Math.exp(-dt / 0.035);
        brush.x += (pointer.x - brush.x) * follow;
        brush.y += (pointer.y - brush.y) * follow;
      }
      maskUniforms.tPrev.value = masks[0].texture;
      maskUniforms.uFrom.value = previous;
      maskUniforms.uTo.value = [brush.x, brush.y];
      maskUniforms.uRadius.value =
        Math.min(options.revealRadius, width * 0.65) * (0.45 + 0.55 * presence);
      maskUniforms.uStrength.value = presence;
      maskUniforms.uFade.value = resetTrail
        ? 1
        : Math.max(
            options.linger > 0 ? elapsed / options.linger : 1,
            floatMask ? 0 : 1.5 / 255,
          );
      renderer.render({ scene: maskMesh, target: masks[1] });
      masks.reverse();
      resetTrail = false;
      viewUniforms.tMask.value = masks[0].texture;
      const data = viewUniforms.uBursts.value;
      data.fill(0);
      for (let i = bursts.length - 1; i >= 0; i--)
        if (now - bursts[i].start >= 1200) bursts.splice(i, 1);
      bursts.forEach((burst, i) => {
        const k = Math.max(0, (now - burst.start) / 1200);
        const reach =
          Math.hypot(
            Math.max(burst.x, width - burst.x),
            Math.max(burst.y, height - burst.y),
          ) + viewUniforms.uBurstWidth.value;
        data[i * 4] = burst.x;
        data[i * 4 + 1] = burst.y;
        data[i * 4 + 2] = reach * Math.sin((k * Math.PI) / 2);
        data[i * 4 + 3] = 1 - k ** 3;
      });
      renderer.render({ scene: viewMesh });
      if (!announcedReady) {
        announcedReady = true;
        options.onReady();
      }
      if (now < activeUntil || bursts.length) wake();
    } catch {
      destroy();
    }
  };
  const wake = () => {
    if (raf || destroyed || !visible || document.hidden) return;
    if (!last) last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const layout = () => {
    const nextWidth = Math.max(1, host.clientWidth);
    const nextHeight = Math.max(1, host.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (
      hasLayout &&
      width === nextWidth &&
      height === nextHeight &&
      renderer.dpr === dpr
    )
      return;
    hasLayout = true;
    width = nextWidth;
    height = nextHeight;
    renderer.dpr = dpr;
    pointer.inside = false;
    pointer.fresh = true;
    presence = 0;
    bursts.length = 0;
    renderer.setSize(width, height);
    viewUniforms.uCell.value = Math.max(1, Math.round(options.pixelSize * dpr));
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    viewUniforms.uResolution.value = [canvas.width, canvas.height];
    viewUniforms.uSize.value = maskUniforms.uSize.value = [width, height];
    masks.forEach(deleteMask);
    masks = [
      createMask(
        Math.max(2, Math.round(width * 0.5)),
        Math.max(2, Math.round(height * 0.5)),
      ),
      createMask(
        Math.max(2, Math.round(width * 0.5)),
        Math.max(2, Math.round(height * 0.5)),
      ),
    ];
    const cols = Math.ceil(canvas.width / viewUniforms.uCell.value);
    const rows = Math.ceil(canvas.height / viewUniforms.uCell.value);
    sampler.width = cols;
    sampler.height = rows;
    sample.drawImage(
      photo,
      0,
      0,
      canvas.width / viewUniforms.uCell.value,
      canvas.height / viewUniforms.uCell.value,
    );
    diffusedTexture.image = diffuse(
      sample.getImageData(0, 0, cols, rows).data,
      cols,
      rows,
    );
    diffusedTexture.width = cols;
    diffusedTexture.height = rows;
    diffusedTexture.needsUpdate = true;
    wake();
  };

  // Listen on the Hero so overlaid headings cannot interrupt the reveal.
  const target =
    host.closest<HTMLElement>("[data-hero]") ?? host.parentElement!;
  const locate = (event: PointerEvent) => {
    if (viewUniforms.uRevealProgress.value > 0.001) return;
    const rect = host.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    const inside =
      pointer.x >= 0 &&
      pointer.x <= width &&
      pointer.y >= 0 &&
      pointer.y <= height;
    if (!inside && !pointer.inside) return;
    if (inside && !pointer.inside) pointer.fresh = true;
    pointer.inside = inside;
    activeUntil = performance.now() + 600 + Math.max(0, options.linger) * 1000;
    wake();
  };
  const leave = () => {
    if (viewUniforms.uRevealProgress.value > 0.001 || !pointer.inside) return;
    pointer.inside = false;
    activeUntil = performance.now() + 700 + Math.max(0, options.linger) * 1000;
    wake();
  };
  const down = (event: PointerEvent) => {
    if (viewUniforms.uRevealProgress.value > 0.001) return;
    locate(event);
    if (
      !pointer.inside ||
      (event.pointerType === "mouse" && event.button !== 0)
    )
      return;
    bursts.push({ x: pointer.x, y: pointer.y, start: performance.now() });
    if (bursts.length > 4) bursts.shift();
  };
  const up = (event: PointerEvent) => {
    if (viewUniforms.uRevealProgress.value > 0.001) return;
    if (event.pointerType !== "mouse") leave();
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  };
  const visibility = () => {
    if (document.hidden) stop();
    else wake();
  };
  const onResize = () => {
    try {
      layout();
    } catch {
      destroy();
    }
  };
  const resize = new ResizeObserver(onResize);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
    else stop();
  });
  const contextLost = (event: Event) => {
    event.preventDefault();
    destroy();
  };
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    stop();
    resize.disconnect();
    intersection.disconnect();
    target.removeEventListener("pointermove", locate);
    target.removeEventListener("pointerdown", down);
    target.removeEventListener("pointerleave", leave);
    target.removeEventListener("pointercancel", leave);
    target.removeEventListener("pointerup", up);
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("resize", onResize);
    canvas.removeEventListener("webglcontextlost", contextLost);
    options.onFallback();
    masks.forEach(deleteMask);
    gl.deleteTexture(imageTexture.texture);
    gl.deleteTexture(diffusedTexture.texture);
    maskProgram.remove();
    viewProgram.remove();
    geometry.remove();
    canvas.remove();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };

  try {
    host.appendChild(canvas);
    layout();
    resize.observe(host);
    intersection.observe(host);
    target.addEventListener("pointermove", locate, { passive: true });
    target.addEventListener("pointerdown", down, { passive: true });
    target.addEventListener("pointerleave", leave, { passive: true });
    target.addEventListener("pointercancel", leave, { passive: true });
    target.addEventListener("pointerup", up, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("resize", onResize);
    canvas.addEventListener("webglcontextlost", contextLost);
  } catch {
    destroy();
  }
  return {
    destroy,
    setRevealProgress(progress) {
      if (destroyed) return;
      const next = Number.isFinite(progress)
        ? Math.min(1, Math.max(0, progress))
        : 0;
      const previous = viewUniforms.uRevealProgress.value;
      if (next === previous) return;
      viewUniforms.uRevealProgress.value = next;
      if (previous <= 0.001 !== next <= 0.001) {
        pointer.inside = false;
        pointer.fresh = true;
        presence = 0;
        bursts.length = 0;
        activeUntil = 0;
        resetTrail = true;
      }
      wake();
    },
  };
}
