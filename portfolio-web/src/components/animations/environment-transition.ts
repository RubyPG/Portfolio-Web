import { createTimeline } from "animejs";
import { HORIZON_VIEW } from "@/lib/contact-transition";
import {
  getRadarTechnologyPoint,
  getRadarTechnologyPresence,
  getRadarTechnologySize,
  projectRadarTechnology,
} from "@/lib/radar-technologies";

interface EnvironmentElements {
  viewport: HTMLElement;
  projectLayer: HTMLElement;
  stackLayer: HTMLElement;
  personalLayer: HTMLElement;
  aboutLayer: HTMLElement;
  world: HTMLElement;
}

interface Point {
  x: number;
  y: number;
}

const clamp = (value: number) => {
  if (!Number.isFinite(value) || value < 1e-9) return 0;
  return value > 1 - 1e-9 ? 1 : value;
};
const mix = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;
const smooth = (progress: number) => progress * progress * (3 - 2 * progress);

/**
 * Two seekable Anime.js scenes share the real content and the same physical floor.
 * The navigation controller owns time; there is no competing ticker or scroll listener.
 */
export function createEnvironmentTransition({
  viewport,
  projectLayer,
  stackLayer,
  personalLayer,
  aboutLayer,
  world,
}: EnvironmentElements) {
  const technologies = Array.from(
    stackLayer.querySelectorAll<HTMLElement>("[data-technology]"),
  ).map((element, index) => ({
    element,
    index,
    icon: element.querySelector<HTMLElement>('[aria-hidden="true"] > span'),
    label: element.querySelector<HTMLElement>(
      ":scope > span:not([aria-hidden])",
    ),
    iconSize: 48,
    origin: "50% 50%",
    center: { x: 0, y: 0 } as Point,
    worldPoint: { x: 0, y: 0 } as Point,
    visible: true,
    gather: 0,
  }));
  technologies.forEach((technology, index) => {
    technology.worldPoint = getRadarTechnologyPoint(index, technologies.length);
  });
  const headings = Array.from(
    stackLayer.querySelectorAll<HTMLElement>(
      "[data-stack-heading], [data-stack-group] h3, [data-about-open]",
    ),
  );
  const copy = Array.from(
    aboutLayer.querySelectorAll<HTMLElement>("[data-about-copy]"),
  ).map((element) => ({ element, enter: 0 }));
  const moving = [
    projectLayer,
    stackLayer,
    world,
    ...technologies.map(({ element }) => element),
    ...headings,
    ...copy.map(({ element }) => element),
  ];
  const saved = new Map<
    HTMLElement,
    Map<string, { value: string; priority: string }>
  >();
  const rendered = new Map<HTMLElement, Map<string, string>>();
  function write(element: HTMLElement, property: string, value: string) {
    let last = rendered.get(element);
    if (!last) {
      last = new Map();
      rendered.set(element, last);
    }
    if (last.get(property) === value) return;
    let properties = saved.get(element);
    if (!properties) {
      properties = new Map();
      saved.set(element, properties);
    }
    if (!properties.has(property)) {
      properties.set(property, {
        value: element.style.getPropertyValue(property),
        priority: element.style.getPropertyPriority(property),
      });
    }
    // These properties belong to this renderer. Only the first write needs to
    // read the DOM; later frames compare their serialized value in memory.
    if (last.has(property) || properties.get(property)?.value !== value)
      element.style.setProperty(property, value);
    last.set(property, value);
  }

  let width = 1;
  let height = 1;
  let stackProgress = 0;
  let aboutProgress = 0;
  let disposed = false;
  let geometryChanged = true;
  const scene = {
    ink: 0,
    projectClear: 0,
    stackReveal: 0,
    clear: 0,
    personal: 0,
    camera: 0,
    headingExit: 0,
  };

  const stackTimeline = createTimeline({ autoplay: false })
    .add(scene, { ink: [0, 1], duration: 680, ease: "inOutSine" }, 80)
    .add(scene, { projectClear: [0, 1], duration: 420, ease: "inOutCubic" }, 0)
    .add(scene, { stackReveal: [0, 1], duration: 380, ease: "outCubic" }, 620);

  const aboutTimeline = createTimeline({ autoplay: false })
    .add(scene, { clear: [0, 1], duration: 850, ease: "inOutSine" }, 540)
    .add(scene, { personal: [0, 1], duration: 900, ease: "inOutSine" }, 300)
    // One angular clock for the floor and the radar: zero velocity at both ends.
    .add(scene, { camera: [0, 1], duration: 1800, ease: "inOutSine" }, 0)
    .add(scene, { headingExit: [0, 1], duration: 650, ease: "inOutSine" }, 0);
  technologies.forEach((technology, index) => {
    const delay = (index % 7) * 12;
    aboutTimeline.add(
      technology,
      // Every SVG lands before the shared radar crossfade starts at .45.
      { gather: [0, 1], duration: 720, ease: "inOutSine" },
      delay,
    );
  });
  copy.forEach((part, index) => {
    aboutTimeline.add(
      part,
      { enter: [0, 1], duration: 760, ease: "outSine" },
      900 + index * 100,
    );
  });
  aboutTimeline.add({ duration: 1800 }, 0);

  function render(nextStack: number, nextAbout: number) {
    if (disposed) return;
    const nextStackProgress = clamp(nextStack);
    const nextAboutProgress = clamp(nextAbout);
    if (
      !geometryChanged &&
      nextStackProgress === stackProgress &&
      nextAboutProgress === aboutProgress
    )
      return;
    const stackChanged = geometryChanged || nextStackProgress !== stackProgress;
    const aboutChanged = geometryChanged || nextAboutProgress !== aboutProgress;
    geometryChanged = false;
    stackProgress = nextStackProgress;
    aboutProgress = nextAboutProgress;
    if (stackChanged)
      stackTimeline.seek(stackProgress * stackTimeline.duration, true);
    if (aboutChanged)
      aboutTimeline.seek(aboutProgress * aboutTimeline.duration, true);
    const perspective = Math.max(900, height * 2.8);
    const inMotion = aboutProgress > 0 && aboutProgress < 1;
    const camera = getRadarView();

    // The project marks recede while the terrain settles into the Sangria floor.
    // The same layer then supports the preserved Stack-to-radar choreography.
    write(projectLayer, "transform", "none");
    write(projectLayer, "opacity", String(1 - scene.projectClear));

    // Keep the technical layout together while entering: icons and their labels
    // already occupy their reading positions instead of scattering from a point.
    const remaining = 1 - scene.stackReveal;
    write(stackLayer, "transform-origin", "50% 50%");
    write(
      stackLayer,
      "transform",
      remaining === 0
        ? "none"
        : `translate3d(0,${height * 0.025 * remaining}px,0)`,
    );
    write(stackLayer, "opacity", String(scene.stackReveal));

    // This is the floor of the environment, not an incoming section-sized sheet.
    // It tips down toward the radar's horizon and exposes the paper behind it.
    write(world, "transform-origin", "50% 94%");
    const floorWidth =
      1 +
      (height * 0.94 * Math.sin((camera.tilt * Math.PI) / 180)) / perspective;
    write(
      world,
      "transform",
      scene.camera === 0
        ? "none"
        : `perspective(${perspective}px) translate3d(0,${height * 0.06 * scene.camera}px,0) rotateX(${camera.tilt}deg) scaleX(${floorWidth})`,
    );
    write(world, "opacity", String(scene.ink * (1 - scene.clear)));
    write(personalLayer, "opacity", String(scene.personal));

    if (!aboutChanged) return;
    const presence = getRadarTechnologyPresence(aboutProgress);

    technologies.forEach((technology) => {
      const { element, center, worldPoint, visible, iconSize, origin, label } =
        technology;
      const gather = clamp(technology.gather);
      const alpha =
        (1 - presence) * (visible || aboutProgress === 0 ? 1 : 1 - gather);
      write(element, "transform-origin", origin);
      if (gather === 0 || alpha === 0) write(element, "transform", "none");
      else {
        const position = projectRadarTechnology(
          worldPoint,
          camera,
          width,
          height,
        );
        const x = (position.x - center.x) * gather;
        const y = (position.y - center.y) * gather;
        const scale = mix(1, getRadarTechnologySize(width) / iconSize, gather);
        // The radar receives screen-facing SVGs. Preserve that orientation for
        // the entire flight instead of pitching and abruptly flattening them.
        write(
          element,
          "transform",
          `translate3d(${x}px,${y}px,0) scale(${scale})`,
        );
      }
      write(element, "opacity", String(alpha));
      if (label)
        write(
          label,
          "opacity",
          String(1 - smooth(clamp((gather - 0.08) / 0.6))),
        );
      write(
        element,
        "will-change",
        inMotion && alpha > 0 ? "transform, opacity" : "auto",
      );
    });

    headings.forEach((element, index) => {
      const leave = clamp(scene.headingExit);
      const y = -leave * Math.min(64, height * 0.07);
      write(element, "transform-origin", "50% 65%");
      write(
        element,
        "transform",
        leave === 0 || leave === 1
          ? "none"
          : `perspective(${perspective}px) translate3d(0,${y}px,0) rotateX(${camera.tilt * leave * 0.25}deg)`,
      );
      write(element, "opacity", String(1 - leave));
      // Ensure grouped labels and the outgoing title do not obscure the forming orbit.
      write(
        element,
        "will-change",
        inMotion && leave < 1 && index < 8 ? "transform, opacity" : "auto",
      );
    });

    copy.forEach(({ element, enter: rawEnter }, index) => {
      const enter = clamp(rawEnter);
      const remaining = 1 - enter;
      write(element, "transform-origin", "50% 100%");
      write(
        element,
        "transform",
        remaining === 0
          ? "none"
          : `perspective(${perspective}px) translate3d(0,${Math.min(84, height * 0.1) * (1 + index * 0.12) * remaining}px,${-32 * remaining}px) rotateX(${-6 * remaining}deg)`,
      );
      write(element, "opacity", String(enter));
    });
  }

  function measure() {
    if (disposed) return;
    width = Math.max(1, viewport.clientWidth);
    height = Math.max(1, viewport.clientHeight);
    // Measure the readable document positions, including the current inner scroll.
    // No scroll reset, DOM reparenting or layout reads are needed while rendering.
    const transforms = moving.map((element) => ({
      element,
      value: element.style.getPropertyValue("transform"),
      priority: element.style.getPropertyPriority("transform"),
    }));
    transforms.forEach(({ element }) =>
      element.style.setProperty("transform", "none"),
    );
    const bounds = viewport.getBoundingClientRect();
    technologies.forEach((technology) => {
      const box = technology.element.getBoundingClientRect();
      const iconBox = technology.icon?.getBoundingClientRect() ?? box;
      technology.center = {
        x: iconBox.left + iconBox.width / 2 - bounds.left,
        y: iconBox.top + iconBox.height / 2 - bounds.top,
      };
      technology.iconSize = Math.max(
        1,
        Math.max(iconBox.width, iconBox.height),
      );
      technology.origin = `${iconBox.left + iconBox.width / 2 - box.left}px ${iconBox.top + iconBox.height / 2 - box.top}px`;
      technology.visible = box.bottom > bounds.top && box.top < bounds.bottom;
    });
    transforms.forEach(({ element, value, priority }) => {
      if (value) element.style.setProperty("transform", value, priority);
      else element.style.removeProperty("transform");
    });
    geometryChanged = true;
    render(stackProgress, aboutProgress);
  }

  measure();
  function getRadarView() {
    const camera = clamp(scene.camera);
    return {
      tilt: HORIZON_VIEW.tilt * camera,
      centerX: HORIZON_VIEW.centerX,
      centerY: mix(0.55, HORIZON_VIEW.centerY, camera),
      scale: mix(0.7, HORIZON_VIEW.scale, camera),
    };
  }
  return {
    render,
    measure,
    getRadarView,
    destroy() {
      if (disposed) return;
      disposed = true;
      stackTimeline.revert();
      aboutTimeline.revert();
      saved.forEach((properties, element) => {
        properties.forEach(({ value, priority }, property) => {
          if (value) element.style.setProperty(property, value, priority);
          else element.style.removeProperty(property);
        });
      });
      saved.clear();
      rendered.clear();
    },
  };
}
