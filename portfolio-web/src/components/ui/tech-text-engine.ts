/**
 * Adapted from the TechText source supplied by the user (React Bits).
 * Keeps its dashed glyphs, selection frame, seeded specks and spring ripple.
 * DOM text owns layout; no idle sweep, drag, metrics or extra entrance timeline.
 */
type Elements = {
  root: HTMLSpanElement;
  source: HTMLSpanElement;
  baseline: HTMLSpanElement;
  canvas: HTMLCanvasElement;
};

type Glyph = {
  x: number;
  top: number;
  right: number;
  bottom: number;
  fill: HTMLCanvasElement;
  outline: HTMLCanvasElement;
  spriteX: number;
  spriteY: number;
  y: number;
  velocity: number;
  reveal: number;
};

const approach = (
  current: number,
  target: number,
  dt: number,
  seconds: number,
) => current + (target - current) * (1 - Math.exp(-dt / seconds));

const noise = (...values: number[]) => {
  let hash = 2166136261;
  for (const value of values) {
    hash = Math.imul(hash ^ (value | 0), 16777619);
    hash ^= hash >>> 13;
  }
  return (hash >>> 0) / 4294967296;
};

export function createTechText({ root, source, baseline, canvas }: Elements) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const layer = root.closest<HTMLElement>("[data-stack-layer]");
  const frame = { x1: 0, y1: 0, x2: 0, y2: 0, alpha: 0, index: -1 };
  const pointer = { x: 0, y: 0, inside: false };
  const press = { x: 0, y: 0, time: 0, index: -1 };
  let glyphs: Glyph[] = [];
  let kicks: { index: number; at: number; velocity: number }[] = [];
  let alive = true;
  let visible = false;
  let ready = false;
  let fontsReady = false;
  let needsLayout = true;
  let painted = false;
  let raf = 0;
  let last = 0;
  let clock = 0;
  let dpr = 1;
  let padding = 24;
  let fontSize = 100;
  let accent = "#479C73";

  const available = () =>
    alive &&
    visible &&
    !document.hidden &&
    !motion.matches &&
    !layer?.inert &&
    layer?.getAttribute("aria-hidden") !== "true";
  const enabled = () => ready && available();

  const reset = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    pointer.inside = false;
    press.index = -1;
    frame.index = -1;
    frame.alpha = 0;
    kicks = [];
    glyphs.forEach((glyph) => {
      glyph.y = glyph.velocity = glyph.reveal = 0;
    });
    if (painted) {
      root.removeAttribute("data-effect-active");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      painted = false;
    }
  };

  const hit = () =>
    glyphs.findIndex(
      (glyph) =>
        pointer.x >= glyph.x - 4 &&
        pointer.x <= glyph.right + 4 &&
        pointer.y >= glyph.top - 8 &&
        pointer.y <= glyph.bottom + 8,
    );

  const blit = (glyph: Glyph, outline: boolean, y: number, alpha: number) => {
    if (alpha < 0.001) return;
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      outline ? glyph.outline : glyph.fill,
      Math.round((glyph.spriteX + padding) * dpr),
      Math.round((glyph.spriteY + padding + y) * dpr),
    );
  };

  const drawFrame = () => {
    if (frame.alpha < 0.005) return;
    ctx.setTransform(dpr, 0, 0, dpr, padding * dpr, padding * dpr);
    ctx.lineWidth = 1;
    ctx.strokeStyle = accent;
    ctx.fillStyle = accent;
    ctx.globalAlpha = frame.alpha * 0.6;
    ctx.strokeRect(
      frame.x1,
      frame.y1,
      frame.x2 - frame.x1,
      frame.y2 - frame.y1,
    );
    ctx.globalAlpha = frame.alpha;
    for (const [x, y] of [
      [frame.x1, frame.y1],
      [frame.x2, frame.y1],
      [frame.x2, frame.y2],
      [frame.x1, frame.y2],
    ]) {
      ctx.fillRect(Math.round(x) - 1.5, Math.round(y) - 1.5, 3, 3);
    }
    // Six small, deterministic particles keep the technical accent restrained.
    for (let i = 0; i < 6; i++) {
      const phase = clock / (0.7 + noise(i, 17)) + noise(i, frame.index);
      const life = phase % 1;
      if (life > 0.65) continue;
      const seed = Math.floor(phase);
      const side = noise(i, seed, frame.index) > 0.5;
      const x =
        (side ? frame.x2 : frame.x1) +
        (side ? 1 : -1) * (7 + noise(i, seed) * 8);
      const y = frame.y1 + (frame.y2 - frame.y1) * noise(seed, i, 2);
      ctx.globalAlpha = frame.alpha * Math.sin((life / 0.65) * Math.PI) * 0.7;
      ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  const tick = (now: number) => {
    raf = 0;
    if (!enabled()) {
      reset();
      return;
    }
    const dt = Math.min(0.032, Math.max(0.001, (now - last) / 1000));
    last = now;
    clock += dt;
    const focus = pointer.inside ? hit() : -1;
    for (let i = kicks.length - 1; i >= 0; i--) {
      const kick = kicks[i];
      if (kick.at > clock) continue;
      if (glyphs[kick.index]) glyphs[kick.index].velocity -= kick.velocity;
      kicks.splice(i, 1);
    }

    let moving = false;
    glyphs.forEach((glyph, index) => {
      glyph.velocity += (-320 * glyph.y - 30 * glyph.velocity) * dt;
      glyph.y += glyph.velocity * dt;
      if (Math.abs(glyph.y) < 0.025 && Math.abs(glyph.velocity) < 0.2) {
        glyph.y = glyph.velocity = 0;
      } else moving = true;
      const target = focus === index ? 1 : 0;
      glyph.reveal = approach(glyph.reveal, target, dt, 0.11);
      if (Math.abs(glyph.reveal - target) < 0.002) glyph.reveal = target;
      else moving = true;
    });

    if (focus >= 0) {
      const glyph = glyphs[focus];
      const target = {
        x1: glyph.x - 5,
        y1: glyph.top + glyph.y - 5,
        x2: glyph.right + 5,
        y2: glyph.bottom + glyph.y + 5,
      };
      for (const key of ["x1", "y1", "x2", "y2"] as const) {
        frame[key] =
          frame.index < 0
            ? target[key]
            : approach(frame[key], target[key], dt, 0.08);
      }
      frame.index = focus;
    }
    frame.alpha = approach(frame.alpha, focus >= 0 ? 1 : 0, dt, 0.12);
    if (focus < 0 && frame.alpha < 0.005) frame.alpha = 0;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const glyph of glyphs) {
      if (Math.abs(glyph.y) > 0.5)
        blit(glyph, true, 0, Math.min(0.35, Math.abs(glyph.y) / 24));
      blit(glyph, false, glyph.y, 1 - glyph.reveal);
      blit(glyph, true, glyph.y, glyph.reveal);
    }
    ctx.globalAlpha = 1;
    drawFrame();
    if (!painted) root.setAttribute("data-effect-active", "");
    painted = true;

    if (focus >= 0 || moving || kicks.length || frame.alpha > 0) {
      raf = requestAnimationFrame(tick);
    } else reset();
  };

  const wake = () => {
    if (raf || !enabled()) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };

  const layout = () => {
    needsLayout = true;
    if (!fontsReady || !available()) return;
    reset();
    const node = source.firstChild;
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const style = getComputedStyle(source);
    fontSize = parseFloat(style.fontSize);
    padding = Math.ceil(Math.max(24, fontSize * 0.16));
    dpr = Math.min(devicePixelRatio || 1, 2);
    accent = style.getPropertyValue("--accent").trim() || "#479C73";
    const rect = root.getBoundingClientRect();
    const baseY = baseline.getBoundingClientRect().top - rect.top;
    canvas.width = Math.ceil((rect.width + padding * 2) * dpr);
    canvas.height = Math.ceil((rect.height + padding * 2) * dpr);
    canvas.style.width = `${rect.width + padding * 2}px`;
    canvas.style.height = `${rect.height + padding * 2}px`;
    canvas.style.left = `${-padding}px`;
    canvas.style.top = `${-padding}px`;
    const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.font = font;
    const range = document.createRange();
    let offset = 0;
    glyphs = Array.from(node.textContent || "").flatMap((char): Glyph[] => {
      range.setStart(node, offset);
      offset += char.length;
      range.setEnd(node, offset);
      if (!char.trim()) return [];
      const x = range.getBoundingClientRect().left - rect.left;
      const metrics = ctx.measureText(char);
      const left = x - metrics.actualBoundingBoxLeft;
      const right = x + metrics.actualBoundingBoxRight;
      const top = baseY - metrics.actualBoundingBoxAscent;
      const bottom = baseY + metrics.actualBoundingBoxDescent;
      const spriteX = left - 4;
      const spriteY = top - 4;
      const sprite = (outline: boolean) => {
        const image = document.createElement("canvas");
        image.width = Math.ceil((right - left + 8) * dpr);
        image.height = Math.ceil((bottom - top + 8) * dpr);
        const c = image.getContext("2d");
        if (!c) return image;
        c.setTransform(dpr, 0, 0, dpr, -spriteX * dpr, -spriteY * dpr);
        c.font = font;
        c.fillStyle = style.color;
        if (outline) {
          c.strokeStyle = style.color;
          c.lineWidth = 2.5;
          c.lineJoin = "round";
          c.setLineDash([4, 2]);
          c.strokeText(char, x, baseY);
          c.globalCompositeOperation = "destination-out";
        }
        c.fillText(char, x, baseY);
        return image;
      };
      return [
        {
          x: left,
          right,
          top,
          bottom,
          spriteX,
          spriteY,
          fill: sprite(false),
          outline: sprite(true),
          y: 0,
          velocity: 0,
          reveal: 0,
        },
      ];
    });
    ready = glyphs.length > 0;
    needsLayout = false;
  };

  const locate = (event: PointerEvent) => {
    const rect = root.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
  };
  const onMove = (event: PointerEvent) => {
    if (!finePointer.matches || event.pointerType === "touch") return;
    locate(event);
    pointer.inside = true;
    wake();
  };
  const onLeave = () => {
    pointer.inside = false;
    press.index = -1;
    wake();
  };
  const onDown = (event: PointerEvent) => {
    if (!enabled() || (event.pointerType === "mouse" && event.button !== 0))
      return;
    locate(event);
    Object.assign(press, {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
      index: hit(),
    });
  };
  const onUp = (event: PointerEvent) => {
    if (!enabled() || press.index < 0) return;
    if (
      performance.now() - press.time < 450 &&
      Math.hypot(event.clientX - press.x, event.clientY - press.y) < 6
    ) {
      // A restrained 6–12 px lift; neighbours follow with the original ripple timing.
      glyphs.forEach((_, index) => {
        const distance = Math.abs(index - press.index);
        kicks.push({
          index,
          at: clock + distance * 0.055,
          velocity: Math.min(450, fontSize * 2.1) * Math.pow(0.62, distance),
        });
      });
      wake();
    }
    press.index = -1;
  };
  const onCancel = () => {
    press.index = -1;
    onLeave();
  };
  const onAvailability = () => {
    if (!available()) reset();
    else if (needsLayout) layout();
  };

  const resizeObserver = new ResizeObserver(() => {
    layout();
  });
  resizeObserver.observe(root);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    onAvailability();
  });
  intersectionObserver.observe(root);
  const layerObserver = new MutationObserver(onAvailability);
  if (layer)
    layerObserver.observe(layer, {
      attributes: true,
      attributeFilter: ["aria-hidden", "inert"],
    });

  const events = {
    pointerenter: onMove,
    pointermove: onMove,
    pointerleave: onLeave,
    pointerdown: onDown,
    pointerup: onUp,
    pointercancel: onCancel,
  };
  for (const [name, listener] of Object.entries(events))
    root.addEventListener(name, listener as EventListener, { passive: true });
  motion.addEventListener("change", onAvailability);
  finePointer.addEventListener("change", reset);
  document.addEventListener("visibilitychange", onAvailability);
  document.fonts.addEventListener("loadingdone", layout);
  void document.fonts.ready.then(() => {
    fontsReady = true;
    layout();
  });

  return () => {
    alive = false;
    reset();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    layerObserver.disconnect();
    motion.removeEventListener("change", onAvailability);
    finePointer.removeEventListener("change", reset);
    document.removeEventListener("visibilitychange", onAvailability);
    document.fonts.removeEventListener("loadingdone", layout);
    for (const [name, listener] of Object.entries(events))
      root.removeEventListener(name, listener as EventListener);
  };
}
