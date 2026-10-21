export const PROJECT_LOGO_SCALE = 0.76;
export const PROJECT_CARD_RADIUS = 4;

export interface ProjectCardBackground {
  kind: "radial" | "linear";
  stops: readonly { at: number; color: string }[];
  halo?: readonly { at: number; color: string }[];
}

const projectBackgrounds: Record<string, ProjectCardBackground> = {
  sophos: {
    kind: "linear",
    stops: [
      { at: 0, color: "#e3d473" },
      { at: 0.52, color: "#bea8f2" },
      { at: 1, color: "#e9defa" },
    ],
    halo: [
      { at: 0, color: "#ffffff" },
      { at: 0.45, color: "#ffffff" },
      { at: 0.72, color: "rgba(255, 255, 255, 0.82)" },
      { at: 1, color: "rgba(255, 255, 255, 0)" },
    ],
  },
  "loops-grooves": {
    kind: "radial",
    stops: [
      { at: 0, color: "#ffffff" },
      { at: 0.38, color: "#ffffff" },
      { at: 0.55, color: "#e8f2fc" },
      { at: 0.76, color: "#83b3e2" },
      { at: 1, color: "#0057b7" },
    ],
  },
};
const whiteBackground: ProjectCardBackground = {
  kind: "radial",
  stops: [
    { at: 0, color: "#ffffff" },
    { at: 1, color: "#ffffff" },
  ],
};

/** One size calculation for the particle bridge, WebGL and HTML fallback. */
export function getProjectCardHeight(width: number, height: number) {
  return (
    Math.min(height * (width < 700 ? 0.36 : 0.44), width * 0.72) /
    Math.max(height, 1)
  );
}

export function getProjectCardBackground(slug: string) {
  return projectBackgrounds[slug] ?? whiteBackground;
}

/** Match the canvas geometry and color stops in the HTML fallback. */
export function getProjectCardBackgroundCss(background: ProjectCardBackground) {
  const stops = background.stops
    .map(({ at, color }) => `${color} ${at * 100}%`)
    .join(", ");
  const base =
    background.kind === "linear"
      ? `linear-gradient(135deg, ${stops})`
      : `radial-gradient(circle farthest-corner at 50% 50%, ${stops})`;
  if (!background.halo) return base;
  const halo = background.halo
    .map(({ at, color }) => `${color} ${at * 100}%`)
    .join(", ");
  return `radial-gradient(circle farthest-corner at 50% 50%, ${halo}), ${base}`;
}

/** Match CSS gradients on both square cards and framed landscape previews. */
export function createProjectCardBackgroundTexture(
  background: ProjectCardBackground,
  width = 1024,
  height = width,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Project card canvas unavailable");
  const diagonal = (width + height) / 4;
  const gradient =
    background.kind === "linear"
      ? context.createLinearGradient(
          width / 2 - diagonal,
          height / 2 - diagonal,
          width / 2 + diagonal,
          height / 2 + diagonal,
        )
      : context.createRadialGradient(
          width / 2,
          height / 2,
          0,
          width / 2,
          height / 2,
          Math.hypot(width, height) / 2,
        );
  background.stops.forEach(({ at, color }) => gradient.addColorStop(at, color));
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  if (background.halo) {
    const halo = context.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      Math.hypot(width, height) / 2,
    );
    background.halo.forEach(({ at, color }) => halo.addColorStop(at, color));
    context.fillStyle = halo;
    context.fillRect(0, 0, width, height);
  }
  return canvas;
}

/** Compose SVG logos in code, keeping the original vector files untouched. */
export function createProjectCardTexture(
  image: HTMLImageElement,
  background: ProjectCardBackground,
  size = 1024,
) {
  const canvas = createProjectCardBackgroundTexture(background, size);
  const context = canvas.getContext("2d")!;
  const scale =
    (size * PROJECT_LOGO_SCALE) /
    Math.max(image.naturalWidth, image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(
    image,
    (size - width) / 2,
    (size - height) / 2,
    width,
    height,
  );
  return canvas;
}
