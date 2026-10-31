"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { animate } from "animejs";
import { projects } from "@/data/projects";
import { ProjectDetail, type ProjectDetailRect } from "./ProjectDetail";
import { ProjectPreview, type ProjectPreviewHandle } from "./ProjectPreview";
import {
  getProjectCardBackground,
  getProjectCardBackgroundCss,
} from "@/lib/project-card";
import {
  getProjectPreviewComposition,
  getProjectPreviewRect,
} from "@/lib/project-preview";
import styles from "./ProjectShowcase.module.css";

export interface ProjectShowcaseHandle {
  setIntroProgress(progress: number): void;
  setActive(active: boolean): void;
  setInteractionEnabled(enabled: boolean): void;
  isTransitioning(): boolean;
  hasSelection(): boolean;
  closeFocus(): boolean;
  resetForNavigation(): void;
}
interface InlineProject {
  index: number;
  rect: ProjectDetailRect;
}
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const mix = (a: number, b: number, progress: number) => a + (b - a) * progress;

/** Project locations share the landscape; choosing one opens the approved preview. */
export const ProjectShowcase = forwardRef<
  ProjectShowcaseHandle,
  {
    onReady?: () => void;
    onDetailChange?: (open: boolean) => void;
    onProjectChange?: (index: number) => void;
  }
>(function ProjectShowcase({ onReady, onDetailChange, onProjectChange }, ref) {
  const section = useRef<HTMLElement>(null);
  const atlas = useRef<HTMLDivElement>(null);
  const gallery = useRef<HTMLDivElement>(null);
  const selectedSurface = useRef<HTMLDivElement>(null);
  const selectedInterior = useRef<HTMLDivElement>(null);
  const selectedMedia = useRef<HTMLImageElement>(null);
  const selectedLogo = useRef<HTMLImageElement>(null);
  const preview = useRef<ProjectPreviewHandle>(null);
  const actions = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLButtonElement | null)[]>([]);
  const intro = useRef(1);
  const interactionEnabled = useRef(true);
  const focusProgress = useRef({ value: 0 });
  const focusAnimation = useRef<ReturnType<typeof animate> | null>(null);
  const focusBusy = useRef(false);
  const focusedIndex = useRef<number | null>(null);
  const sourceRect = useRef<ProjectDetailRect>({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
  const inlineProject = useRef<InlineProject | null>(null);
  const restoreFocusFrame = useRef(0);
  const wheelGesture = useRef({
    lastAt: -Infinity,
    canOpen: false,
    consumed: false,
    distance: 0,
  });
  const callbacks = useRef({ onReady, onDetailChange, onProjectChange });
  const [focused, setFocused] = useState<number | null>(null);
  const [summaryIndex, setSummaryIndex] = useState(0);
  const [focusSettled, setFocusSettled] = useState(false);
  const [interactive, setInteractive] = useState(true);
  const [detail, setDetail] = useState<InlineProject | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const detailMounted = detail !== null;
  const current = projects[summaryIndex];

  useLayoutEffect(() => {
    callbacks.current = { onReady, onDetailChange, onProjectChange };
  }, [onReady, onDetailChange, onProjectChange]);

  const readPreviewRect = useCallback(() => {
    const host = section.current;
    const project = projects[focusedIndex.current ?? 0];
    return host
      ? getProjectPreviewRect(
          host.clientWidth,
          host.clientHeight,
          project.preview.width / project.preview.height,
        )
      : null;
  }, []);

  const paint = useCallback(() => {
    if (!section.current) return;
    const progress = focusProgress.current.value;
    const index = focusedIndex.current;
    nodes.current.forEach((node, i) => {
      if (!node) return;
      const arrival = clamp((intro.current - i * 0.13) / (1 - i * 0.13));
      const visible = 1 - Math.pow(1 - arrival, 3);
      node.style.transform = `translate3d(0, ${(1 - visible) * 16}px, 0)`;
      node.style.opacity = String(visible);
      const image = node.querySelector("img");
      if (image)
        image.style.visibility = i === index && progress > 0 ? "hidden" : "";
    });
    if (atlas.current)
      atlas.current.style.opacity = String(1 - clamp(progress * 3));
    preview.current?.setProgress(progress);
    if (actions.current) {
      actions.current.style.opacity = String(clamp((progress - 0.6) / 0.4));
      actions.current.style.transform = `translateY(${(1 - progress) * 16}px)`;
    }
    if (index === null) return;
    const rect = readPreviewRect();
    if (!rect) return;
    const project = projects[index];
    const composition = getProjectPreviewComposition(
      rect.width,
      project.preview.width / project.preview.height,
    );
    const frameReveal = clamp((progress - 0.18) / 0.82);
    if (selectedSurface.current)
      Object.assign(selectedSurface.current.style, {
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        transform: `translate3d(${rect.x}px, ${rect.y}px, 0) scale(${0.86 + frameReveal * 0.14})`,
        opacity: String(frameReveal),
      });
    if (selectedInterior.current)
      Object.assign(selectedInterior.current.style, {
        left: `${composition.interior.x}px`,
        top: `${composition.interior.y}px`,
        width: `${composition.interior.width}px`,
        height: `${composition.interior.height}px`,
      });
    if (selectedMedia.current)
      Object.assign(selectedMedia.current.style, {
        left: `${composition.media.x}px`,
        top: `${composition.media.y}px`,
        width: `${composition.media.width}px`,
        height: `${composition.media.height}px`,
        opacity: String(clamp((progress - 0.36) / 0.64)),
      });
    if (selectedLogo.current) {
      const source = sourceRect.current;
      const size = mix(source.width, composition.logo.width, progress);
      Object.assign(selectedLogo.current.style, {
        width: `${source.width}px`,
        height: `${source.height}px`,
        opacity: String(progress > 0 ? 1 : 0),
        transform: `translate3d(${mix(source.x, rect.x + composition.logo.x, progress)}px, ${mix(source.y, rect.y + composition.logo.y, progress)}px, 0) scale(${size / source.width})`,
      });
    }
  }, [readPreviewRect]);

  const captureSource = useCallback((index: number) => {
    const host = section.current;
    const image = nodes.current[index]?.querySelector("img");
    if (!host || !image) return;
    const hostRect = host.getBoundingClientRect();
    const bounds = image.getBoundingClientRect();
    sourceRect.current = {
      x: bounds.left - hostRect.left,
      y: bounds.top - hostRect.top,
      width: bounds.width,
      height: bounds.height,
    };
  }, []);

  const closeFocus = useCallback(() => {
    const index = focusedIndex.current;
    if (index === null || inlineProject.current || focusBusy.current)
      return false;
    focusAnimation.current?.pause();
    focusBusy.current = true;
    setFocusSettled(false);
    wheelGesture.current.canOpen = false;
    const finish = () => {
      focusBusy.current = false;
      focusedIndex.current = null;
      setFocused(null);
      paint();
      cancelAnimationFrame(restoreFocusFrame.current);
      restoreFocusFrame.current = requestAnimationFrame(() =>
        nodes.current[index]?.focus({ preventScroll: true }),
      );
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      focusProgress.current.value = 0;
      paint();
      finish();
    } else {
      focusAnimation.current = animate(focusProgress.current, {
        value: 0,
        duration: 680,
        ease: "inOutCubic",
        onUpdate: paint,
        onComplete: finish,
      });
    }
    return true;
  }, [paint]);

  const chooseProject = useCallback(
    (index: number) => {
      if (
        !interactionEnabled.current ||
        intro.current < 1 ||
        focusedIndex.current !== null ||
        focusBusy.current
      )
        return;
      captureSource(index);
      focusedIndex.current = index;
      focusBusy.current = true;
      setSummaryIndex(index);
      setFocusSettled(false);
      setFocused(index);
      callbacks.current.onProjectChange?.(index);
    },
    [captureSource],
  );

  useLayoutEffect(() => {
    if (focused === null) return;
    focusProgress.current.value = 0;
    paint();
    const finish = () => {
      focusBusy.current = false;
      setFocusSettled(true);
      cancelAnimationFrame(restoreFocusFrame.current);
      restoreFocusFrame.current = requestAnimationFrame(() => {
        if (
          focusedIndex.current !== focused ||
          inlineProject.current ||
          !interactionEnabled.current ||
          intro.current < 1
        )
          return;
        actions.current
          ?.querySelector<HTMLButtonElement>("button")
          ?.focus({ preventScroll: true });
      });
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      focusProgress.current.value = 1;
      paint();
      finish();
      return;
    }
    const animation = animate(focusProgress.current, {
      value: 1,
      duration: 820,
      ease: "inOutCubic",
      onUpdate: paint,
      onComplete: finish,
    });
    focusAnimation.current = animation;
    return () => {
      animation.pause();
    };
  }, [focused, paint]);

  const openDetail = useCallback(() => {
    const index = focusedIndex.current;
    if (
      index === null ||
      !interactionEnabled.current ||
      intro.current < 1 ||
      inlineProject.current ||
      focusBusy.current ||
      focusProgress.current.value < 1
    )
      return false;
    const rect = readPreviewRect();
    if (!rect) return false;
    const next = { index, rect };
    inlineProject.current = next;
    wheelGesture.current.consumed = true;
    callbacks.current.onDetailChange?.(true);
    setDetail(next);
    setDetailOpen(true);
    return true;
  }, [readPreviewRect]);

  const exitDetail = useCallback(() => {
    inlineProject.current = null;
    setDetail(null);
    cancelAnimationFrame(restoreFocusFrame.current);
    restoreFocusFrame.current = requestAnimationFrame(() => {
      if (inlineProject.current) return;
      callbacks.current.onDetailChange?.(false);
      actions.current
        ?.querySelector<HTMLButtonElement>("button")
        ?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    const host = section.current;
    if (!host) return;
    let resizeFrame = 0;
    const measure = () => {
      resizeFrame = 0;
      if (focusedIndex.current !== null) captureSource(focusedIndex.current);
      paint();
      if (inlineProject.current) {
        const rect = readPreviewRect();
        if (rect) {
          inlineProject.current = { ...inlineProject.current, rect };
          setDetail(inlineProject.current);
        }
      }
    };
    const resize = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(measure);
    });
    resize.observe(host);
    callbacks.current.onReady?.();
    return () => {
      resize.disconnect();
      cancelAnimationFrame(resizeFrame);
      cancelAnimationFrame(restoreFocusFrame.current);
      focusAnimation.current?.pause();
    };
  }, [captureSource, paint, readPreviewRect]);

  useEffect(() => {
    if (!detailMounted) return;
    const documentRoot = document.documentElement;
    const overflow = documentRoot.style.overflow;
    const gutter = documentRoot.style.scrollbarGutter;
    documentRoot.style.scrollbarGutter = "stable";
    documentRoot.style.overflow = "hidden";
    return () => {
      documentRoot.style.overflow = overflow;
      documentRoot.style.scrollbarGutter = gutter;
    };
  }, [detailMounted]);

  useEffect(() => {
    const container = section.current;
    if (!container) return;
    let touch: {
      x: number;
      y: number;
      canOpen: boolean;
      consumed: boolean;
    } | null = null;
    const canOpen = () =>
      !inlineProject.current &&
      interactionEnabled.current &&
      intro.current === 1 &&
      focusedIndex.current !== null &&
      !focusBusy.current &&
      focusProgress.current.value === 1;
    const consume = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      const gesture = wheelGesture.current;
      const now = performance.now();
      if (now - gesture.lastAt > 200) {
        gesture.canOpen = canOpen();
        gesture.consumed = false;
        gesture.distance = 0;
      }
      gesture.lastAt = now;
      if (
        inlineProject.current ||
        !interactionEnabled.current ||
        intro.current < 1
      ) {
        gesture.canOpen = false;
        return;
      }
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (focusBusy.current) {
        gesture.canOpen = false;
        gesture.consumed = true;
      }
      if (gesture.consumed) {
        consume(event);
        return;
      }
      if (event.deltaY <= 0) {
        gesture.canOpen = false;
        gesture.distance = 0;
        return;
      }
      if (focusedIndex.current === null) return;
      consume(event);
      gesture.distance +=
        event.deltaY *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? container.clientHeight
            : 1);
      if (gesture.canOpen && gesture.distance >= 24 && openDetail())
        gesture.consumed = true;
    };
    const startTouch = (event: TouchEvent) => {
      const start = event.touches[0];
      touch = start
        ? {
            x: start.clientX,
            y: start.clientY,
            canOpen: canOpen(),
            consumed: Boolean(inlineProject.current || focusBusy.current),
          }
        : null;
    };
    const moveTouch = (event: TouchEvent) => {
      const point = event.touches[0];
      if (
        !point ||
        !touch ||
        inlineProject.current ||
        !interactionEnabled.current ||
        intro.current < 1
      )
        return;
      const dy = touch.y - point.clientY;
      if (Math.abs(dy) <= Math.abs(touch.x - point.clientX) * 1.25) return;
      if (focusBusy.current) {
        touch.canOpen = false;
        touch.consumed = true;
      }
      if (touch.consumed) {
        consume(event);
        return;
      }
      if (dy > 24 && focusedIndex.current !== null) {
        consume(event);
        if (touch.canOpen && openDetail()) touch.consumed = true;
      }
    };
    const endTouch = () => {
      touch = null;
    };
    const key = (event: KeyboardEvent) => {
      if (
        inlineProject.current ||
        !interactionEnabled.current ||
        intro.current < 1
      )
        return;
      if (event.key === "Escape" && focusedIndex.current !== null) {
        consume(event);
        if (!event.repeat) closeFocus();
      } else if (
        (event.key === "PageDown" || event.key === "ArrowDown") &&
        focusedIndex.current !== null
      ) {
        consume(event);
        if (!event.repeat) openDetail();
      }
    };
    container.addEventListener("wheel", wheel, {
      capture: true,
      passive: false,
    });
    container.addEventListener("touchstart", startTouch, {
      capture: true,
      passive: true,
    });
    container.addEventListener("touchmove", moveTouch, {
      capture: true,
      passive: false,
    });
    container.addEventListener("keydown", key, true);
    window.addEventListener("touchend", endTouch);
    window.addEventListener("touchcancel", endTouch);
    return () => {
      container.removeEventListener("wheel", wheel, true);
      container.removeEventListener("touchstart", startTouch, true);
      container.removeEventListener("touchmove", moveTouch, true);
      container.removeEventListener("keydown", key, true);
      window.removeEventListener("touchend", endTouch);
      window.removeEventListener("touchcancel", endTouch);
    };
  }, [closeFocus, openDetail]);

  useImperativeHandle(
    ref,
    () => ({
      setIntroProgress(progress) {
        intro.current = clamp(progress);
        paint();
      },
      setActive(active) {
        if (section.current) section.current.dataset.active = String(active);
      },
      setInteractionEnabled(enabled) {
        interactionEnabled.current = enabled;
        if (gallery.current)
          gallery.current.inert = !enabled || Boolean(inlineProject.current);
        setInteractive(enabled);
        if (!enabled) wheelGesture.current.canOpen = false;
      },
      isTransitioning: () => focusBusy.current,
      hasSelection: () => focusedIndex.current !== null,
      closeFocus,
      resetForNavigation() {
        focusAnimation.current?.pause();
        cancelAnimationFrame(restoreFocusFrame.current);
        const hadDetail = inlineProject.current !== null;
        inlineProject.current = null;
        focusBusy.current = false;
        focusedIndex.current = null;
        focusProgress.current.value = 0;
        setDetail(null);
        setDetailOpen(false);
        setFocused(null);
        setFocusSettled(false);
        wheelGesture.current.canOpen = false;
        wheelGesture.current.consumed = true;
        paint();
        if (hadDetail) callbacks.current.onDetailChange?.(false);
      },
    }),
    [closeFocus, paint],
  );

  return (
    <section
      ref={section}
      className={styles.section}
      aria-labelledby="projects-title"
      id="proyectos"
      data-focused={focused !== null || undefined}
      data-detail-open={detailMounted || undefined}
      data-project-atlas
    >
      <header
        className={styles.header}
        data-project-chrome
        data-project-header
        inert={!interactive || detailMounted}
        aria-hidden={detailMounted || undefined}
      >
        <h2 id="projects-title" data-project-corner="left">
          PROYECTOS
        </h2>
        <div className={styles.index} data-project-corner="up">
          <a
            href="#stack"
            className={styles.stackLink}
            data-stack-open
            inert={focused !== null}
            aria-hidden={focused !== null || undefined}
          >
            Mi stack <span aria-hidden="true">↘</span>
          </a>
        </div>
      </header>
      <div
        ref={gallery}
        className={styles.gallery}
        data-project-gallery
        tabIndex={-1}
        inert={!interactive || detailMounted}
        aria-hidden={!interactive || detailMounted || undefined}
      >
        <div
          ref={atlas}
          className={styles.atlas}
          role="group"
          aria-label="Elige un proyecto"
          inert={focused !== null}
          aria-hidden={focused !== null || undefined}
        >
          {projects.map((project, index) => (
            <button
              key={project.slug}
              ref={(node) => {
                nodes.current[index] = node;
              }}
              className={styles.location}
              type="button"
              data-project-location={project.slug}
              onClick={() => chooseProject(index)}
              aria-label={`Explorar ${project.title}`}
              aria-controls="project-selection"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.image}
                alt=""
                width="256"
                height="256"
                draggable={false}
                onContextMenu={(event) => event.preventDefault()}
              />
              <span className={styles.locationTitle}>
                {project.title}
                <span aria-hidden="true">↗</span>
              </span>
              <span className={styles.locationCategory}>
                {project.category}
              </span>
            </button>
          ))}
        </div>
        <div
          className={styles.selection}
          id="project-selection"
          data-project-selection
          hidden={focused === null}
        >
          <div
            ref={selectedSurface}
            className={styles.selectedSurface}
            style={{
              background: getProjectCardBackgroundCss(
                getProjectCardBackground(current.slug),
              ),
            }}
          >
            <div ref={selectedInterior} className={styles.selectedInterior} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={selectedMedia}
              className={styles.selectedMedia}
              src={current.preview.src}
              alt={current.preview.alt}
              draggable={false}
            />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={selectedLogo}
            className={styles.selectedLogo}
            src={current.image}
            alt={current.imageAlt}
            draggable={false}
          />
        </div>
      </div>
      <ProjectPreview
        ref={preview}
        project={current}
        visible={focused !== null && interactive && !detailMounted}
      />
      <footer
        className={styles.footer}
        data-project-chrome
        data-project-footer
        inert={!interactive || detailMounted}
        aria-hidden={!interactive || detailMounted || undefined}
      >
        <p
          className={styles.hint}
          hidden={focused !== null}
          data-project-corner="down"
        >
          Elige un proyecto para explorarlo.
        </p>
        <div
          className={styles.projectCopy}
          hidden={focused === null}
          data-project-corner="down"
        >
          <span className={styles.category}>{current.category}</span>
          <h3>{current.title}</h3>
        </div>
        <div
          className={styles.actionsCorner}
          hidden={focused === null}
          data-project-corner="right"
        >
          <div ref={actions} className={styles.actions}>
            <button
              type="button"
              className={styles.projectLink}
              onClick={openDetail}
              disabled={!focusSettled}
              aria-expanded={detailOpen}
              aria-controls="inline-project-detail"
            >
              Ver proyecto <span aria-hidden="true">↓</span>
            </button>
            <button
              type="button"
              className={styles.close}
              onClick={closeFocus}
              disabled={!focusSettled}
            >
              Cerrar <span aria-hidden="true">×</span>
            </button>
          </div>
        </div>
      </footer>
      {detail && (
        <ProjectDetail
          project={projects[detail.index]}
          sourceRect={detail.rect}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          onEntered={() =>
            section.current
              ?.querySelector<HTMLElement>("[data-detail-heading]")
              ?.focus({ preventScroll: true })
          }
          onExited={exitDetail}
        />
      )}
    </section>
  );
});
