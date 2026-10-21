/** One composition for the shader, HTML fallback and detail hand-off. */
export function getProjectPreviewComposition(width: number, aspect: number) {
  const frame = Math.min(14, Math.max(7, width * 0.022));
  const logoSize = Math.min(40, Math.max(24, width * 0.075));
  const header = logoSize + 12;
  const mediaWidth = Math.max(1, width - frame * 2);
  const mediaHeight = mediaWidth / Math.max(0.1, aspect);
  return {
    height: frame * 2 + header + mediaHeight,
    frame,
    logo: { x: frame + 8, y: frame + 6, width: logoSize, height: logoSize },
    media: {
      x: frame,
      y: frame + header,
      width: mediaWidth,
      height: mediaHeight,
    },
    interior: {
      x: frame,
      y: frame,
      width: mediaWidth,
      height: header + mediaHeight,
    },
  };
}

/** Shared selected-card geometry for WebGL, HTML and the inline detail. */
export function getProjectPreviewRect(
  width: number,
  height: number,
  aspect: number,
) {
  const safeAspect = Math.max(0.1, aspect);
  const landscape = height <= 550 && width > height;
  const lateral = width >= 900 || landscape;
  const compact = !lateral && height <= 650;
  // Short portrait screens reserve room for readable context and the actions.
  // Every renderer uses this rectangle, so the logo hand-off stays continuous.
  const compactHeight = height <= 520 ? 0.21 : 0.25;
  let previewWidth = landscape
    ? Math.min(width * 0.46, 760, height * 0.46 * safeAspect)
    : lateral
      ? Math.min(width * 0.5, 760, height * 0.55 * safeAspect)
      : compact
        ? Math.min(width * 0.84, 640, height * compactHeight * safeAspect)
        : Math.min(width * 0.88, 640, height * 0.34 * safeAspect);
  const maxHeight =
    height *
    (landscape ? 0.46 : lateral ? 0.55 : compact ? compactHeight : 0.34);
  if (
    getProjectPreviewComposition(previewWidth, safeAspect).height > maxHeight
  ) {
    let lower = 1;
    let upper = previewWidth;
    for (let step = 0; step < 16; step++) {
      const candidate = (lower + upper) / 2;
      if (
        getProjectPreviewComposition(candidate, safeAspect).height > maxHeight
      )
        upper = candidate;
      else lower = candidate;
    }
    previewWidth = lower;
  }
  const previewHeight = getProjectPreviewComposition(
    previewWidth,
    safeAspect,
  ).height;
  return {
    x: (width - previewWidth) / 2,
    y:
      height * (lateral ? 0.5 : compact ? (height <= 520 ? 0.3 : 0.34) : 0.39) -
      previewHeight / 2,
    width: previewWidth,
    height: previewHeight,
  };
}
