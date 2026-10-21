import {
  createProjectCardTexture,
  PROJECT_CARD_RADIUS,
  type ProjectCardBackground,
} from "@/lib/project-card";

interface Particle {
  x: number;
  y: number;
  tx: number;
  ty: number;
  alpha: number;
  bend: number;
  tile: number;
}

export interface ParticleLayout {
  width: number;
  height: number;
  portraitWidth: number;
  portraitHeight: number;
  square: number;
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => n * n * (3 - 2 * n);
const noise = (n: number) => {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};

/** Read the PNG once. All positions are deterministic, including on reverse. */
export function createPortraitParticles(
  canvas: HTMLCanvasElement,
  photo: HTMLImageElement,
  targets: { src: string; background: ProjectCardBackground }[],
) {
  const context = canvas.getContext("2d");
  const sample = document.createElement("canvas");
  const sampling = sample.getContext("2d", { willReadFrequently: true });
  if (!context || !sampling) return null;
  const cols = 150;
  const rows = Math.round((cols * photo.naturalHeight) / photo.naturalWidth);
  sample.width = cols;
  sample.height = rows;
  sampling.drawImage(photo, 0, 0, cols, rows);
  const pixels = sampling.getImageData(0, 0, cols, rows).data;
  const particles: Particle[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const u = (x + 0.5) / cols;
      const v = (y + 0.5) / rows;
      const luminance =
        (pixels[i * 4] * 0.2126 +
          pixels[i * 4 + 1] * 0.7152 +
          pixels[i * 4 + 2] * 0.0722) /
        255;
      const density = 1 - (0.28 + Math.pow(luminance, 0.65) * 0.66);
      // Match the CSS edge masks, including the very slight fade over the hair.
      const edge = clamp(u / 0.04) * clamp((1 - u) / 0.06);
      const top = 0.7 + 0.3 * clamp(v / 0.04);
      const bottom =
        v < 0.62
          ? 1
          : v < 0.76
            ? 1 - ((v - 0.62) / 0.14) * 0.3
            : clamp((0.96 - v) / 0.2) * 0.7;
      const alpha = (pixels[i * 4 + 3] / 255) * edge * top * bottom;
      if (alpha < 0.04 || noise(i) > density) continue;
      particles.push({
        x: u - 0.5,
        y: v - 0.5,
        tx: 0,
        ty: 0,
        alpha,
        bend: noise(i + 7) - 0.5,
        tile: 0,
      });
    }
  }
  // Complete every row so the resolved image never has a missing edge.
  const side = Math.ceil(Math.sqrt(particles.length));
  const sourceCount = particles.length;
  if (!sourceCount) return null;
  while (particles.length < side * side) {
    const source =
      particles[Math.floor(noise(particles.length + 71) * sourceCount)];
    particles.push({ ...source, alpha: 0 });
  }
  // Keep each source-to-tile assignment stable in both scroll directions.
  const orderKeys = particles.map((_, i) => noise(i + 19));
  const order = particles
    .map((_, i) => i)
    .sort((a, b) => orderKeys[a] - orderKeys[b]);
  order.forEach((index, i) => {
    particles[index].tx = ((i % side) + 0.5) / side - 0.5;
    particles[index].ty = (Math.floor(i / side) + 0.5) / side - 0.5;
    particles[index].tile = i;
  });
  let layout: ParticleLayout = {
    width: 1,
    height: 1,
    portraitWidth: 1,
    portraitHeight: 1,
    square: 1,
  };
  let progress = 0;
  let resolve = 0;
  let visible = false;
  let destroyed = false;
  let dirty = true;
  let pixelRatio = 0;
  let texture: HTMLCanvasElement | null = null;
  let colors: Uint8ClampedArray | null = null;
  let projectIndex = 0;
  const textures: (HTMLCanvasElement | null)[] = targets.map(() => null);
  const colorGrids: (Uint8ClampedArray | null)[] = targets.map(() => null);
  const draw = () => {
    if (!visible || destroyed || !dirty) return;
    dirty = false;
    const { width, height, portraitWidth, portraitHeight, square } = layout;
    context.clearRect(0, 0, width, height);
    const k = smooth(clamp(progress));
    const colorProgress = texture ? smooth(clamp(resolve)) : 0;
    const travel = Math.sin(k * Math.PI);
    const spacing = square / side;
    const size =
      Math.max(1.3, (portraitWidth / cols) * 0.62) * (1 - k) +
      spacing * (0.82 + colorProgress * 0.2) * k;
    const left = (width - square) / 2;
    const top = (height - square) / 2;
    context.save();
    if (k >= 0.999) {
      context.beginPath();
      context.roundRect(left, top, square, square, PROJECT_CARD_RADIUS);
      context.clip();
    }
    if (colorProgress >= 1 && texture) {
      context.drawImage(texture, left, top, square, square);
      context.restore();
      return;
    }
    context.fillStyle = "#479c73";
    particles.forEach((point) => {
      const x =
        width / 2 +
        point.x * portraitWidth * (1 - k) +
        point.tx * square * k +
        travel * point.bend * square * 0.3;
      const y =
        height / 2 +
        point.y * portraitHeight * (1 - k) +
        point.ty * square * k -
        travel * Math.abs(point.bend) * square * 0.2;
      context.globalAlpha = point.alpha + (1 - point.alpha) * k;
      if (colorProgress > 0 && colors) {
        const pixel = point.tile * 4;
        const r = Math.round(71 + (colors[pixel] - 71) * colorProgress);
        const g = Math.round(156 + (colors[pixel + 1] - 156) * colorProgress);
        const b = Math.round(115 + (colors[pixel + 2] - 115) * colorProgress);
        context.fillStyle = `rgb(${r} ${g} ${b})`;
      }
      context.fillRect(x - size / 2, y - size / 2, size, size);
    });
    context.globalAlpha = 1;
    // Resolve the same texture the carousel uses, after the cells have filled.
    // This removes the last pixelation without exchanging unrelated surfaces.
    const detail = smooth(clamp((colorProgress - 0.45) / 0.55));
    if (texture && detail > 0) {
      context.globalAlpha = detail;
      context.drawImage(texture, left, top, square, square);
    }
    context.restore();
  };
  // Decode each card once, so reversing from either project needs no async swap.
  targets.forEach((target, index) => {
    const image = new Image();
    image.src = target.src;
    void image
      .decode()
      .then(() => {
        if (destroyed) return;
        const card = createProjectCardTexture(image, target.background);
        textures[index] = card;
        const grid = document.createElement("canvas");
        grid.width = grid.height = side;
        const gridContext = grid.getContext("2d", { willReadFrequently: true });
        if (gridContext) {
          gridContext.drawImage(card, 0, 0, side, side);
          colorGrids[index] = gridContext.getImageData(0, 0, side, side).data;
        }
        if (projectIndex === index) {
          texture = card;
          colors = colorGrids[index];
          dirty = true;
          draw();
        }
      })
      .catch(() => {
        // Keep the green bridge if the project image cannot be decoded.
      });
  });
  return {
    setProject(index: number) {
      if (index === projectIndex || index < 0 || index >= targets.length)
        return;
      projectIndex = index;
      texture = textures[index];
      colors = colorGrids[index];
      dirty = true;
      draw();
    },
    resize(next: ParticleLayout) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (
        pixelRatio === dpr &&
        layout.width === next.width &&
        layout.height === next.height &&
        layout.portraitWidth === next.portraitWidth &&
        layout.portraitHeight === next.portraitHeight &&
        layout.square === next.square
      )
        return;
      if (
        pixelRatio !== dpr ||
        layout.width !== next.width ||
        layout.height !== next.height
      ) {
        canvas.width = Math.round(next.width * dpr);
        canvas.height = Math.round(next.height * dpr);
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      pixelRatio = dpr;
      layout = { ...next };
      dirty = true;
      draw();
    },
    setProgress(next: number, nextResolve: number, isVisible: boolean) {
      if (progress !== next || resolve !== nextResolve) dirty = true;
      progress = next;
      resolve = nextResolve;
      visible = isVisible;
      draw();
    },
    destroy() {
      context.clearRect(0, 0, layout.width, layout.height);
      particles.length = 0;
      destroyed = true;
      texture = null;
      colors = null;
      textures.length = 0;
      colorGrids.length = 0;
    },
  };
}
