"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import FlexCarousel, {
  type FlexCarouselHandle,
} from "@/components/ui/FlexCarousel";
import { projects } from "@/data/projects";
import { ProjectDetail } from "./ProjectDetail";
import { ProjectPreview, type ProjectPreviewHandle } from "./ProjectPreview";
import { ProjectControls, type ProjectControlsHandle } from "./ProjectControls";
import {
  getProjectCardBackground,
  getProjectCardHeight,
  PROJECT_CARD_RADIUS,
} from "@/lib/project-card";
import styles from "./ProjectShowcase.module.css";

export interface ProjectShowcaseHandle {
  setIntroProgress(progress: number): void;
  setActive(active: boolean): void;
  setInteractionEnabled(enabled: boolean): void;
  isTransitioning(): boolean;
  hasSelection(): boolean;
  /** Consume a return gesture only when a project is selected. */
  closeFocus(): boolean;
  /** Clear a selection/detail while the menu transition covers the scene. */
  resetForNavigation(): void;
}

const items = projects.map((project) => ({
  src: project.image,
  alt: project.imageAlt,
  title: project.title,
  subtitle: project.category,
  background: getProjectCardBackground(project.slug),
  preview: project.preview,
}));

interface InlineProject {
  index: number;
  rect: { x: number; y: number; width: number; height: number };
}

export const ProjectShowcase = forwardRef<
  ProjectShowcaseHandle,
  {
    onReady?: () => void;
    onDetailChange?: (open: boolean) => void;
    onProjectChange?: (index: number) => void;
  }
>(function ProjectShowcase({ onReady, onDetailChange, onProjectChange }, ref) {
  const carousel = useRef<FlexCarouselHandle>(null);
  const section = useRef<HTMLElement>(null);
  const gallery = useRef<HTMLDivElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const controls = useRef<ProjectControlsHandle>(null);
  const preview = useRef<ProjectPreviewHandle>(null);
  const focusedIndex = useRef<number | null>(null);
  const introProgress = useRef(1);
  const interactionEnabled = useRef(true);
  const inlineProject = useRef<InlineProject | null>(null);
  const restoreFocusFrame = useRef(0);
  const wheelGesture = useRef({
    lastAt: -Infinity,
    canOpen: false,
    consumed: false,
    distance: 0,
  });
  const [selected, setSelected] = useState(0);
  const [focused, setFocused] = useState<number | null>(null);
  const [summaryIndex, setSummaryIndex] = useState(0);
  const [focusSettled, setFocusSettled] = useState(false);
  const [cardHeight, setCardHeight] = useState(0.36);
  const [active, setActive] = useState(false);
  const [interactive, setInteractive] = useState(true);
  const [detail, setDetail] = useState<InlineProject | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const detailMounted = detail !== null;
  const current = projects[focused ?? selected];

  const focusProject = useCallback((index: number | null) => {
    controls.current?.captureLayout();
    wheelGesture.current.canOpen = false;
    setFocusSettled(
      index !== null && Boolean(carousel.current?.isFocusSettled()),
    );
    focusedIndex.current = index;
    // Keep outgoing copy stable if the carousel moves during the reverse animation.
    if (index !== null) setSummaryIndex(index);
    setFocused(index);
  }, []);

  const readCardRect = useCallback(() => {
    const rect = carousel.current?.getFocusedCardRect();
    if (!rect || !gallery.current || !section.current) return null;
    const galleryRect = gallery.current.getBoundingClientRect();
    const sectionRect = section.current.getBoundingClientRect();
    return {
      ...rect,
      x: rect.x + galleryRect.left - sectionRect.left,
      y: rect.y + galleryRect.top - sectionRect.top,
    };
  }, []);

  const openDetail = useCallback(() => {
    const index = focusedIndex.current;
    if (
      index === null ||
      !interactionEnabled.current ||
      introProgress.current < 1 ||
      inlineProject.current ||
      !carousel.current?.isFocusSettled()
    )
      return false;
    const rect = readCardRect();
    if (!rect) return false;
    const next = { index, rect };
    inlineProject.current = next;
    wheelGesture.current.consumed = true;
    onDetailChange?.(true);
    setDetail(next);
    setDetailOpen(true);
    return true;
  }, [readCardRect, onDetailChange]);

  const closeDetail = useCallback(() => setDetailOpen(false), []);
  const exitDetail = useCallback(() => {
    const returnScrollY = window.scrollY;
    // Invalidate the detail before React removes it: a queued resize frame
    // must not read the old rect and mount the just-closed panel again.
    inlineProject.current = null;
    setDetail(null);
    // Wait for inert to be removed before restoring keyboard focus.
    cancelAnimationFrame(restoreFocusFrame.current);
    restoreFocusFrame.current = requestAnimationFrame(() => {
      if (inlineProject.current) return;
      window.scrollTo({ top: returnScrollY, behavior: "instant" });
      onDetailChange?.(false);
      gallery.current
        ?.querySelector<HTMLElement>('[role="region"]')
        ?.focus({ preventScroll: true });
    });
  }, [onDetailChange]);

  useEffect(() => {
    const container = section.current;
    if (!container) return;
    let touchStart: {
      x: number;
      y: number;
      canOpen: boolean;
      consumed: boolean;
    } | null = null;
    const canOpenFromGesture = () =>
      !inlineProject.current &&
      interactionEnabled.current &&
      introProgress.current === 1 &&
      Boolean(carousel.current?.isFocusSettled());
    const consume = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      const gesture = wheelGesture.current;
      const now = performance.now();
      const inSection = event.composedPath().includes(container);
      if (now - gesture.lastAt > 200) {
        gesture.canOpen = inSection && canOpenFromGesture();
        gesture.consumed = false;
        gesture.distance = 0;
      }
      gesture.lastAt = now;
      // Track the same gesture across inert layers and detail mount/unmount.
      // A gesture that started before readiness cannot become an open request.
      if (inlineProject.current) {
        gesture.canOpen = false;
        gesture.consumed = true;
        return;
      }
      if (!interactionEnabled.current) {
        gesture.canOpen = false;
        return;
      }
      if (!inSection) return;
      if (introProgress.current < 1) {
        gesture.canOpen = false;
        return;
      }
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (carousel.current?.isTransitioning()) {
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
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? container.clientHeight
            : 1;
      gesture.distance += event.deltaY * unit;
      if (gesture.canOpen && gesture.distance >= 24 && openDetail()) {
        gesture.consumed = true;
      }
    };
    const startTouch = (event: TouchEvent) => {
      const touch = event.touches[0];
      touchStart =
        touch && event.composedPath().includes(container)
          ? {
              x: touch.clientX,
              y: touch.clientY,
              canOpen: canOpenFromGesture(),
              consumed: Boolean(
                inlineProject.current || carousel.current?.isTransitioning(),
              ),
            }
          : null;
    };
    const moveTouch = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (
        !touch ||
        !touchStart ||
        inlineProject.current ||
        !interactionEnabled.current
      )
        return;
      const dy = touchStart.y - touch.clientY;
      const dx = touchStart.x - touch.clientX;
      if (Math.abs(dy) <= Math.abs(dx) * 1.25) return;
      if (introProgress.current < 1) {
        touchStart.canOpen = false;
        return;
      }
      if (carousel.current?.isTransitioning()) {
        touchStart.canOpen = false;
        touchStart.consumed = true;
      }
      if (touchStart.consumed) {
        consume(event);
        return;
      }
      if (dy > 24 && focusedIndex.current !== null) {
        consume(event);
        if (touchStart.canOpen && openDetail()) touchStart.consumed = true;
      }
    };
    const endTouch = () => {
      touchStart = null;
    };
    const key = (event: KeyboardEvent) => {
      if (
        inlineProject.current ||
        !interactionEnabled.current ||
        introProgress.current < 1
      )
        return;
      const down = event.key === "PageDown" || event.key === "ArrowDown";
      const up = event.key === "PageUp" || event.key === "ArrowUp";
      if (!down && !up) return;
      if (carousel.current?.isTransitioning()) {
        consume(event);
        return;
      }
      if (down && focusedIndex.current !== null) {
        consume(event);
        if (!event.repeat) openDetail();
      }
    };
    container.addEventListener("wheel", wheel, {
      capture: true,
      passive: false,
    });
    window.addEventListener("touchstart", startTouch, {
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
      window.removeEventListener("touchstart", startTouch, true);
      container.removeEventListener("touchmove", moveTouch, true);
      container.removeEventListener("keydown", key, true);
      window.removeEventListener("touchend", endTouch);
      window.removeEventListener("touchcancel", endTouch);
      cancelAnimationFrame(restoreFocusFrame.current);
    };
  }, [openDetail]);

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
    if (!detailMounted) return;
    let resizeFrame = 0;
    const resize = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        const rect = readCardRect();
        const previous = inlineProject.current;
        if (!previous || !rect) return;
        if (
          Object.keys(rect).every(
            (key) =>
              rect[key as keyof typeof rect] ===
              previous.rect[key as keyof typeof rect],
          )
        )
          return;
        const next = { ...previous, rect };
        inlineProject.current = next;
        setDetail(next);
      });
    });
    if (gallery.current) resize.observe(gallery.current);
    return () => {
      resize.disconnect();
      cancelAnimationFrame(resizeFrame);
    };
  }, [detailMounted, readCardRect, cardHeight]);

  useEffect(() => {
    const container = gallery.current;
    if (!container) return;
    const update = () =>
      setCardHeight(
        getProjectCardHeight(container.clientWidth, container.clientHeight),
      );
    update();
    const resize = new ResizeObserver(update);
    resize.observe(container);
    return () => resize.disconnect();
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      setIntroProgress(progress) {
        if (inlineProject.current) return;
        if (introProgress.current >= 1 && progress < 1) {
          onProjectChange?.(carousel.current?.getSelectedIndex() ?? selected);
        }
        introProgress.current = progress;
        carousel.current?.setIntroProgress(progress);
      },
      setActive,
      setInteractionEnabled(enabled) {
        interactionEnabled.current = enabled;
        // Match the synchronous gesture gate before React commits accessibility state.
        if (gallery.current)
          gallery.current.inert = !enabled || Boolean(inlineProject.current);
        const footer = section.current?.querySelector<HTMLElement>(
          "[data-project-footer]",
        );
        if (footer) footer.inert = !enabled || Boolean(inlineProject.current);
        setInteractive(enabled);
        if (!enabled) wheelGesture.current.canOpen = false;
      },
      isTransitioning() {
        return carousel.current?.isTransitioning() ?? false;
      },
      hasSelection() {
        return focusedIndex.current !== null;
      },
      closeFocus() {
        if (inlineProject.current) return false;
        return carousel.current?.closeFocus() ?? false;
      },
      resetForNavigation() {
        cancelAnimationFrame(restoreFocusFrame.current);
        const hadDetail = inlineProject.current !== null;
        inlineProject.current = null;
        setDetail(null);
        setDetailOpen(false);
        focusedIndex.current = null;
        setFocused(null);
        setFocusSettled(false);
        wheelGesture.current.canOpen = false;
        wheelGesture.current.consumed = true;
        carousel.current?.closeFocus();
        carousel.current?.setIntroProgress(0);
        carousel.current?.setIntroProgress(1);
        if (hadDetail) onDetailChange?.(false);
      },
    }),
    [onProjectChange, onDetailChange, selected],
  );

  return (
    <section
      ref={section}
      className={styles.section}
      aria-labelledby="projects-title"
      id="proyectos"
      data-focused={focused !== null || undefined}
      data-detail-open={detailMounted || undefined}
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
        <span className={styles.index} data-project-corner="up">
          DESARROLLO & DISEÑO
          <br />
          {String(selected + 1).padStart(2, "0")} /{" "}
          {String(projects.length).padStart(2, "0")}
          <a
            href="#stack"
            className={styles.stackLink}
            data-stack-open
            inert={focused !== null}
            aria-hidden={focused !== null || undefined}
          >
            Mi stack
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M6 6 18 18M6 18h12V6" />
            </svg>
          </a>
        </span>
      </header>
      <div
        ref={gallery}
        className={styles.gallery}
        data-project-gallery
        inert={!interactive || detailMounted}
        aria-hidden={!interactive || detailMounted || undefined}
      >
        <FlexCarousel
          ref={carousel}
          items={items}
          preset="liquid"
          fit="square"
          intro="deal"
          cardHeight={cardHeight}
          gap={20}
          radius={PROJECT_CARD_RADIUS}
          squeeze={0.2}
          captions={false}
          captureWheel={false}
          controlledIntro
          active={active && !detailMounted}
          onChange={(index) => {
            setSelected(index);
            onProjectChange?.(index);
          }}
          onFocusChange={focusProject}
          onFocusProgress={(_, progress) =>
            preview.current?.setProgress(progress)
          }
          onFocusSettledChange={setFocusSettled}
          onReady={onReady}
        />
      </div>
      <ProjectPreview
        ref={preview}
        project={projects[summaryIndex]}
        visible={focused !== null && interactive && !detailMounted}
      />
      <footer
        className={styles.footer}
        data-project-chrome
        data-project-footer
        inert={!interactive || detailMounted}
        aria-hidden={!interactive || detailMounted || undefined}
      >
        <div className={styles.projectCopy} data-project-corner="down">
          <span className={styles.category}>{current.category}</span>
          <h3>{current.title}</h3>
          <div
            ref={summary}
            className={styles.summary}
            data-project-summary
            inert={focused === null}
            aria-hidden={focused === null || undefined}
          >
            <div className={styles.detail} id="project-summary">
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
            </div>
          </div>
        </div>
        <div className={styles.controls} data-project-corner="right">
          <ProjectControls
            ref={controls}
            summaryRef={summary}
            focused={focused !== null}
            onPrevious={() =>
              carousel.current?.select(
                (selected - 1 + projects.length) % projects.length,
              )
            }
            onNext={() =>
              carousel.current?.select((selected + 1) % projects.length)
            }
            onClose={() => {
              gallery.current
                ?.querySelector<HTMLElement>('[role="region"]')
                ?.focus({ preventScroll: true });
              carousel.current?.closeFocus();
            }}
          />
        </div>
      </footer>
      {detail && (
        <ProjectDetail
          project={projects[detail.index]}
          sourceRect={detail.rect}
          open={detailOpen}
          onClose={closeDetail}
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
