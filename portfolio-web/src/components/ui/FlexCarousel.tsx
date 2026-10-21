"use client";

import Image from "next/image";
import {
  PROJECT_LOGO_SCALE,
  getProjectCardBackgroundCss,
} from "@/lib/project-card";
import {
  getProjectPreviewComposition,
  getProjectPreviewRect,
} from "@/lib/project-preview";
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type {
  FlexCarouselEngine,
  FlexCarouselCardRect,
  FlexCarouselEngineOptions,
  FlexCarouselFit,
  FlexCarouselIntro,
  FlexCarouselItem,
  FlexCarouselPreset,
} from "./flex-carousel-engine";
import styles from "./FlexCarousel.module.css";

export type {
  FlexCarouselItem,
  FlexCarouselCardRect,
} from "./flex-carousel-engine";

export interface FlexCarouselHandle {
  setIntroProgress(progress: number): void;
  closeFocus(): boolean;
  select(index: number): void;
  /** Project nearest the centre, including while a drag is settling. */
  getSelectedIndex(): number;
  /** True only after the selected card has finished its focus animation. */
  isFocusSettled(): boolean;
  /** Selection, return or active drag; scroll-driven intro is excluded. */
  isTransitioning(): boolean;
  /** Last rendered focused card bounds in CSS pixels local to this container. */
  getFocusedCardRect(): FlexCarouselCardRect | null;
}

export interface FlexCarouselProps {
  items: FlexCarouselItem[];
  preset?: FlexCarouselPreset;
  intro?: FlexCarouselIntro;
  fit?: FlexCarouselFit;
  cardHeight?: number;
  gap?: number;
  radius?: number;
  squeeze?: number;
  focusOnClick?: boolean;
  captions?: boolean;
  /** Opt in to wheel selection; otherwise all wheel gestures remain page scroll. */
  captureWheel?: boolean;
  /** Keep the deal gesture tied to setIntroProgress(), including reverse scroll. */
  controlledIntro?: boolean;
  /** Stop rendering while an enclosing scene is hidden. */
  active?: boolean;
  onChange?: (index: number, item: FlexCarouselItem) => void;
  onSelect?: (index: number, item: FlexCarouselItem) => void;
  onFocusChange?: (index: number | null) => void;
  onFocusProgress?: (index: number, progress: number) => void;
  onFocusSettledChange?: (settled: boolean) => void;
  onTransitionChange?: (transitioning: boolean) => void;
  /** The first real card is drawn, or the HTML fallback has finished decoding. */
  onReady?: () => void;
  className?: string;
  style?: CSSProperties;
}

/** React Bits FlexCarousel, with its original liquid lens and scroll-driven deal. */
const FlexCarousel = forwardRef<FlexCarouselHandle, FlexCarouselProps>(
  function FlexCarousel(
    {
      items,
      preset = "liquid",
      intro = "deal",
      fit = "square",
      cardHeight = 0.5,
      gap = 12,
      radius = 0,
      squeeze = 0.2,
      focusOnClick = true,
      captions = true,
      captureWheel = false,
      controlledIntro = false,
      active = true,
      onChange,
      onSelect,
      onFocusChange,
      onFocusProgress,
      onFocusSettledChange,
      onTransitionChange,
      onReady,
      className = "",
      style,
    },
    ref,
  ) {
    const root = useRef<HTMLDivElement>(null);
    const engine = useRef<FlexCarouselEngine | null>(null);
    const options = useRef<FlexCarouselEngineOptions | null>(null);
    const progress = useRef(controlledIntro ? 0 : 1);
    const focusedIndex = useRef<number | null>(null);
    const readyCallback = useRef(onReady);
    const announcedReady = useRef(false);
    const showFallback = useRef<(() => void) | null>(null);
    const [index, setIndex] = useState(0);
    const [focused, setFocused] = useState<number | null>(null);
    const [enhanced, setEnhanced] = useState(false);
    const [failedPreviews, setFailedPreviews] = useState<string[]>([]);
    const instructionsId = useId();
    const current = items[index] ?? items[0];
    const height = Math.min(Math.max(cardHeight, 0.05), 1);

    const announceReady = useCallback(() => {
      if (announcedReady.current) return;
      announcedReady.current = true;
      readyCallback.current?.();
    }, []);

    const selectFallback = (
      next: number,
      openDetails: boolean,
      moveFocus = false,
    ) => {
      if (!items.length) return;
      const selected = ((next % items.length) + items.length) % items.length;
      setIndex(selected);
      onChange?.(selected, items[selected]);
      if (openDetails) {
        onSelect?.(selected, items[selected]);
        const target =
          focusOnClick && focusedIndex.current !== selected ? selected : null;
        focusedIndex.current = target;
        setFocused(target);
        onFocusChange?.(target);
        onFocusProgress?.(selected, Number(target !== null));
        onFocusSettledChange?.(target !== null);
      } else if (focusedIndex.current !== null) {
        onFocusProgress?.(focusedIndex.current, 0);
        focusedIndex.current = null;
        setFocused(null);
        onFocusChange?.(null);
        onFocusSettledChange?.(false);
      }
      const button = root.current?.querySelector<HTMLButtonElement>(
        `[data-fallback-index="${selected}"]`,
      );
      if (moveFocus) button?.focus({ preventScroll: true });
      button?.scrollIntoView({ block: "nearest", inline: "center" });
    };

    useImperativeHandle(ref, () => ({
      setIntroProgress(value) {
        progress.current = Math.min(1, Math.max(0, value));
        engine.current?.setIntroProgress(progress.current);
      },
      closeFocus() {
        if (engine.current) return engine.current.closeFocus();
        else {
          if (focusedIndex.current === null) return false;
          if (focusedIndex.current !== null)
            onFocusProgress?.(focusedIndex.current, 0);
          focusedIndex.current = null;
          setFocused(null);
          onFocusChange?.(null);
          onFocusSettledChange?.(false);
          return true;
        }
      },
      select(selected) {
        if (engine.current) engine.current.select(selected);
        else selectFallback(selected, false);
      },
      getSelectedIndex() {
        if (engine.current) return engine.current.getSelectedIndex();
        const container = root.current;
        if (!container) return index;
        const bounds = container.getBoundingClientRect();
        const centre = bounds.left + bounds.width / 2;
        let nearestIndex = index;
        let distance = Infinity;
        container
          .querySelectorAll<HTMLButtonElement>("[data-fallback-index]")
          .forEach((button) => {
            const rect = button.getBoundingClientRect();
            const nextDistance = Math.abs(rect.left + rect.width / 2 - centre);
            if (nextDistance < distance) {
              distance = nextDistance;
              nearestIndex = Number(button.dataset.fallbackIndex);
            }
          });
        return nearestIndex;
      },
      isFocusSettled() {
        return engine.current
          ? engine.current.isFocusSettled()
          : focusedIndex.current !== null;
      },
      isTransitioning() {
        return engine.current?.isTransitioning() ?? false;
      },
      getFocusedCardRect() {
        if (engine.current) return engine.current.getFocusedCardRect();
        const container = root.current;
        const selected = focusedIndex.current;
        if (!container || selected === null) return null;
        const image = container.querySelector<HTMLElement>(
          `[data-fallback-index="${selected}"] [data-fallback-card]`,
        );
        if (!image) return null;
        const bounds = image.getBoundingClientRect();
        const containerBounds = container.getBoundingClientRect();
        if (
          bounds.width <= 0 ||
          bounds.height <= 0 ||
          containerBounds.width <= 0 ||
          containerBounds.height <= 0 ||
          container.clientWidth <= 0 ||
          container.clientHeight <= 0
        )
          return null;
        const scaleX = container.clientWidth / containerBounds.width;
        const scaleY = container.clientHeight / containerBounds.height;
        return {
          x: (bounds.left - containerBounds.left) * scaleX,
          y: (bounds.top - containerBounds.top) * scaleY,
          width: bounds.width * scaleX,
          height: bounds.height * scaleY,
        };
      },
    }));

    // The engine reads fresh callbacks without recreating its GPU resources.
    useEffect(() => {
      readyCallback.current = onReady;
      options.current = {
        items,
        initialProgress: progress.current,
        settings: {
          preset,
          intro,
          fit,
          cardHeight: height,
          gap,
          radius,
          squeeze,
          focusOnClick,
          captureWheel,
          controlledIntro,
          active,
        },
        callbacks: {
          onReady: () => {
            // Hide the HTML surface before handing the frame to the scroll scene.
            root.current?.setAttribute("data-enhanced", "true");
            setEnhanced(true);
            announceReady();
          },
          onFallback: () => {
            engine.current?.destroy();
            engine.current = null;
            showFallback.current?.();
          },
          onChange: (next, item) => {
            setIndex(next);
            onChange?.(next, item);
          },
          onSelect,
          onFocusSettledChange,
          onFocusProgress,
          onTransitionChange,
          onFocusChange: (next) => {
            focusedIndex.current = next;
            setFocused(next);
            onFocusChange?.(next);
          },
        },
      };
      engine.current?.update(options.current);
    });

    useEffect(() => {
      const container = root.current;
      if (!container) return;
      const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
      let generation = 0;
      showFallback.current = () => {
        const fallbackGeneration = generation;
        container.removeAttribute("data-enhanced");
        setEnhanced(false);
        const firstImage = container.querySelector<HTMLImageElement>(
          '[data-fallback-index="0"] img',
        );
        void (firstImage?.decode() ?? Promise.resolve())
          .catch(() => {
            // A missing thumbnail must not block the rest of the landing.
          })
          .then(() => {
            if (fallbackGeneration === generation) announceReady();
          });
      };
      const mount = async () => {
        const currentGeneration = ++generation;
        announcedReady.current = false;
        engine.current?.destroy();
        engine.current = null;
        container.removeAttribute("data-enhanced");
        setEnhanced(false);
        if (motion.matches || !options.current?.items.length) {
          showFallback.current?.();
          return;
        }
        try {
          const { createFlexCarousel } = await import("./flex-carousel-engine");
          if (generation !== currentGeneration || !options.current) return;
          engine.current = createFlexCarousel(container, {
            ...options.current,
            initialProgress: progress.current,
          });
          if (!engine.current) showFallback.current?.();
        } catch {
          // The server-rendered gallery remains usable without WebGL2.
          if (generation === currentGeneration) showFallback.current?.();
        }
      };
      void mount();
      const onMotionChange = () => void mount();
      motion.addEventListener("change", onMotionChange);
      return () => {
        generation++;
        motion.removeEventListener("change", onMotionChange);
        engine.current?.destroy();
        engine.current = null;
        showFallback.current = null;
      };
    }, [announceReady]);

    useEffect(() => {
      const container = root.current;
      if (!container || enhanced || captureWheel) return;
      const keepWheelOnPage = (event: WheelEvent) => {
        if (event.ctrlKey) return;
        const horizontal =
          Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey;
        // Native overflow is still draggable; a trackpad must not pick projects.
        if (horizontal) event.preventDefault();
      };
      container.addEventListener("wheel", keepWheelOnPage, { passive: false });
      return () => container.removeEventListener("wheel", keepWheelOnPage);
    }, [captureWheel, enhanced]);

    useEffect(() => {
      const container = root.current;
      if (!container) return;
      const previews = items.flatMap((item, itemIndex) => {
        const button = container.querySelector<HTMLElement>(
          `[data-fallback-index="${itemIndex}"]`,
        );
        return item.preview && button
          ? [
              {
                button,
                aspect: item.preview.width / Math.max(item.preview.height, 1),
              },
            ]
          : [];
      });
      let measuredWidth = -1;
      let measuredHeight = -1;
      const update = () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (width === measuredWidth && height === measuredHeight) return;
        measuredWidth = width;
        measuredHeight = height;
        previews.forEach(({ button, aspect }) => {
          const rect = getProjectPreviewRect(width, height, aspect);
          button.style.setProperty("--preview-x", `${rect.x}px`);
          button.style.setProperty("--preview-y", `${rect.y}px`);
          button.style.setProperty("--preview-width", `${rect.width}px`);
          button.style.setProperty("--preview-height", `${rect.height}px`);
          const composition = getProjectPreviewComposition(rect.width, aspect);
          for (const [name, area] of Object.entries({
            logo: composition.logo,
            media: composition.media,
            interior: composition.interior,
          })) {
            for (const [dimension, value] of Object.entries(area))
              button.style.setProperty(
                `--preview-${name}-${dimension}`,
                `${value}px`,
              );
          }
        });
      };
      update();
      const resize = new ResizeObserver(update);
      resize.observe(container);
      return () => resize.disconnect();
    }, [items]);

    const variables = {
      ...style,
      "--carousel-half": `${height * 50}%`,
      "--carousel-card-size": `${height * 100}cqh`,
      "--carousel-logo-padding": `${(1 - PROJECT_LOGO_SCALE) * 50}%`,
      "--carousel-card-radius": `${radius}px`,
    } as CSSProperties;

    return (
      <div
        ref={root}
        className={`${styles.root} ${className}`.trim()}
        style={variables}
        data-enhanced={enhanced || undefined}
        data-focus-open={focused !== null || undefined}
        role="region"
        aria-roledescription="carrusel"
        aria-label="Proyectos"
        aria-describedby={instructionsId}
        tabIndex={enhanced ? 0 : -1}
        onKeyDown={(event) => {
          if (enhanced || !items.length) return;
          const button =
            event.target instanceof HTMLElement
              ? event.target.closest<HTMLButtonElement>("[data-fallback-index]")
              : null;
          const origin = button ? Number(button.dataset.fallbackIndex) : index;
          let target: number | null = null;
          switch (event.key) {
            case "Home":
              target = 0;
              break;
            case "End":
              target = items.length - 1;
              break;
            case "ArrowRight":
              target = origin + 1;
              break;
            case "ArrowLeft":
              target = origin - 1;
              break;
          }
          if (target !== null) {
            event.preventDefault();
            selectFallback(target, false, true);
          } else if (event.key === "Escape") {
            event.preventDefault();
            if (focusedIndex.current !== null)
              onFocusProgress?.(focusedIndex.current, 0);
            focusedIndex.current = null;
            setFocused(null);
            onFocusChange?.(null);
            onFocusSettledChange?.(false);
          }
        }}
      >
        <p className={styles.srOnly} id={instructionsId}>
          Usa las flechas izquierda y derecha para elegir un proyecto, Enter
          para ampliar y Escape para cerrar. También puedes arrastrar las
          imágenes.
        </p>
        <ul className={styles.fallback} aria-label="Galería de proyectos">
          {items.map((item, itemIndex) => (
            <li key={item.src}>
              <button
                type="button"
                data-fallback-index={itemIndex}
                data-has-preview={Boolean(item.preview) || undefined}
                aria-expanded={focused === itemIndex}
                onClick={() => selectFallback(itemIndex, true)}
              >
                <span className={styles.fallbackFrame}>
                  <span
                    className={styles.fallbackMedia}
                    data-fallback-card
                    data-preview-failed={
                      (item.preview &&
                        failedPreviews.includes(item.preview.src)) ||
                      undefined
                    }
                    style={{
                      background: item.background
                        ? getProjectCardBackgroundCss(item.background)
                        : undefined,
                    }}
                  >
                    {item.preview && (
                      <span
                        className={styles.fallbackInterior}
                        aria-hidden="true"
                      />
                    )}
                    <Image
                      src={item.src}
                      alt={item.alt}
                      width={800}
                      height={800}
                      data-composed={Boolean(item.background) || undefined}
                      className={styles.fallbackLogo}
                      loading={
                        controlledIntro || itemIndex === 0 ? "eager" : "lazy"
                      }
                      unoptimized
                    />
                    {item.preview && (
                      <Image
                        src={item.preview.src}
                        alt={item.preview.alt}
                        width={item.preview.width}
                        height={item.preview.height}
                        className={styles.fallbackPreview}
                        aria-hidden={
                          focused !== itemIndex ||
                          failedPreviews.includes(item.preview.src) ||
                          undefined
                        }
                        onError={(event) => {
                          event.currentTarget.parentElement?.setAttribute(
                            "data-preview-failed",
                            "true",
                          );
                          const source = item.preview!.src;
                          setFailedPreviews((failed) =>
                            failed.includes(source)
                              ? failed
                              : [...failed, source],
                          );
                        }}
                        loading="eager"
                        unoptimized
                      />
                    )}
                  </span>
                </span>
                <span className={styles.fallbackCaption}>{item.title}</span>
              </button>
            </li>
          ))}
        </ul>
        {captions && current && enhanced && (
          <div className={styles.caption} aria-hidden="true">
            <span>{current.title}</span>
            {current.subtitle && <span>{current.subtitle}</span>}
            <span className={styles.count}>
              {String(index + 1).padStart(2, "0")} /{" "}
              {String(items.length).padStart(2, "0")}
            </span>
          </div>
        )}
        <p className={styles.srOnly} aria-live="polite" aria-atomic="true">
          {current ? `${current.title}, ${index + 1} de ${items.length}` : ""}
        </p>
      </div>
    );
  },
);

export default FlexCarousel;
