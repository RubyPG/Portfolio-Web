import React, { startTransition, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface CaseGalleryItem {
  image: string;
  alt: string;
  title: string;
  description: string;
  label?: string;
}

interface CaseGalleryProps {
  items: CaseGalleryItem[];
  projectTitle: string;
  title?: string;
  eyebrow?: string;
  className?: string;
}

const transitionCurve = [0.22, 1, 0.36, 1] as const;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const clampPanOffset = (
  pan: { x: number; y: number },
  zoom: number,
  width: number,
  height: number
) => {
  if (zoom <= 1) {
    return { x: 0, y: 0 };
  }

  const maxX = ((width * zoom) - width) / 2;
  const maxY = ((height * zoom) - height) / 2;

  return {
    x: clamp(pan.x, -maxX, maxX),
    y: clamp(pan.y, -maxY, maxY)
  };
};
const isInteractiveTarget = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest('button'));

const formatSlideNumber = (value: number) => String(value + 1).padStart(2, '0');

const ArrowIcon = ({
  direction = 'right',
  className
}: {
  direction?: 'left' | 'right';
  className?: string;
}) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className={cn('h-4 w-4', className)}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d={direction === 'left' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
    />
  </svg>
);

const ControlButton = ({
  label,
  onClick,
  direction,
  className
}: {
  label: string;
  onClick: () => void;
  direction: 'left' | 'right';
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className={cn(
      'inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/45 text-text-primary transition hover:border-secondary/55 hover:bg-secondary/12 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70',
      className
    )}
  >
    <ArrowIcon direction={direction} />
  </button>
);

const CaseGallery = ({
  items,
  projectTitle,
  title = 'Galeria del producto',
  eyebrow = 'Capturas reales',
  className
}: CaseGalleryProps) => {
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxPan, setLightboxPan] = useState({ x: 0, y: 0 });
  const [isLightboxDragging, setIsLightboxDragging] = useState(false);
  const [isZoomInModifierActive, setIsZoomInModifierActive] = useState(false);
  const [isZoomOutModifierActive, setIsZoomOutModifierActive] = useState(false);
  const [railHeight, setRailHeight] = useState<number | null>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const lightboxFrameRef = useRef<HTMLDivElement>(null);
  const lightboxDragPointerIdRef = useRef<number | null>(null);
  const lightboxDragStartRef = useRef({ x: 0, y: 0 });
  const lightboxPanStartRef = useRef({ x: 0, y: 0 });
  const totalSlidesLabel = String(items.length).padStart(2, '0');

  const resetLightboxView = () => {
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
    setIsLightboxDragging(false);
    lightboxDragPointerIdRef.current = null;
  };

  useEffect(() => {
    if (items.length === 0) return;
    if (activeIndex >= items.length) {
      setActiveIndex(0);
    }
    if (lightboxIndex !== null && lightboxIndex >= items.length) {
      setLightboxIndex(0);
    }
  }, [activeIndex, items.length, lightboxIndex]);

  useEffect(() => {
    if (lightboxIndex === null || typeof document === 'undefined') return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxIndex]);

  useEffect(() => {
    if (typeof window === 'undefined' || lightboxIndex === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setIsZoomInModifierActive(true);
      }

      if (event.key === 'Control') {
        setIsZoomOutModifierActive(true);
      }

      if (event.key === 'Escape') {
        setLightboxIndex(null);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextIndex = (lightboxIndex + 1) % items.length;
        startTransition(() => setActiveIndex(nextIndex));
        setLightboxIndex(nextIndex);
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const nextIndex = (lightboxIndex - 1 + items.length) % items.length;
        startTransition(() => setActiveIndex(nextIndex));
        setLightboxIndex(nextIndex);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setIsZoomInModifierActive(false);
      }

      if (event.key === 'Control') {
        setIsZoomOutModifierActive(false);
      }
    };

    const clearModifier = () => {
      setIsZoomInModifierActive(false);
      setIsZoomOutModifierActive(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearModifier);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearModifier);
    };
  }, [items.length, lightboxIndex]);

  useEffect(() => {
    if (lightboxIndex === null) {
      resetLightboxView();
      return;
    }

    resetLightboxView();
  }, [lightboxIndex]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const previewPanel = previewPanelRef.current;
    if (!previewPanel) return;

    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const updateRailHeight = () => {
      if (!desktopQuery.matches) {
        setRailHeight(null);
        return;
      }

      const nextHeight = Math.ceil(previewPanel.getBoundingClientRect().height);
      setRailHeight(nextHeight > 0 ? nextHeight : null);
    };

    updateRailHeight();

    const resizeObserver = new ResizeObserver(updateRailHeight);
    resizeObserver.observe(previewPanel);

    desktopQuery.addEventListener('change', updateRailHeight);
    window.addEventListener('resize', updateRailHeight);

    return () => {
      resizeObserver.disconnect();
      desktopQuery.removeEventListener('change', updateRailHeight);
      window.removeEventListener('resize', updateRailHeight);
    };
  }, []);

  if (items.length === 0) return null;

  const activeItem = items[activeIndex] ?? items[0];

  const selectSlide = (index: number) => {
    startTransition(() => setActiveIndex(index));
  };

  const openLightbox = (index: number) => {
    startTransition(() => setActiveIndex(index));
    setLightboxIndex(index);
  };

  const shiftPreview = (direction: -1 | 1) => {
    const nextIndex = (activeIndex + direction + items.length) % items.length;
    startTransition(() => setActiveIndex(nextIndex));
  };

  const shiftLightbox = (direction: -1 | 1) => {
    const currentIndex = lightboxIndex ?? activeIndex;
    const nextIndex = (currentIndex + direction + items.length) % items.length;
    startTransition(() => setActiveIndex(nextIndex));
    setLightboxIndex(nextIndex);
  };

  const updateLightboxZoomAtPoint = ({
    clientX,
    clientY,
    bounds,
    nextZoom
  }: {
    clientX: number;
    clientY: number;
    bounds: DOMRect;
    nextZoom: number;
  }) => {
    const previousZoom = lightboxZoom;

    if (nextZoom === previousZoom) return;

    const cursorX = clientX - (bounds.left + bounds.width / 2);
    const cursorY = clientY - (bounds.top + bounds.height / 2);

    setLightboxPan((currentPan) =>
      clampPanOffset(
        {
          x: nextZoom === 1
            ? 0
            : cursorX - ((nextZoom / previousZoom) * (cursorX - currentPan.x)),
          y: nextZoom === 1
            ? 0
            : cursorY - ((nextZoom / previousZoom) * (cursorY - currentPan.y))
        },
        nextZoom,
        bounds.width,
        bounds.height
      )
    );
    setLightboxZoom(nextZoom);
  };

  const handleLightboxWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    const bounds = event.currentTarget.getBoundingClientRect();
    const direction = event.deltaY < 0 ? 1 : -1;
    const nextZoom = clamp(lightboxZoom + direction * 0.18, 1, 3);

    updateLightboxZoomAtPoint({
      clientX: event.clientX,
      clientY: event.clientY,
      bounds,
      nextZoom
    });
  };

  const handleLightboxClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(event.target) || isLightboxDragging) return;

    const isZoomIn = event.shiftKey || isZoomInModifierActive;
    const bounds = event.currentTarget.getBoundingClientRect();
    const isZoomOut = event.ctrlKey || isZoomOutModifierActive;
    const shouldZoomIn = isZoomIn || lightboxZoom === 1;

    if (!shouldZoomIn && !isZoomOut) return;

    const nextZoom = isZoomOut
      ? clamp(lightboxZoom - 0.8, 1, 3)
      : clamp(lightboxZoom + 0.8, 1, 3);

    if (nextZoom === lightboxZoom) return;

    updateLightboxZoomAtPoint({
      clientX: event.clientX,
      clientY: event.clientY,
      bounds,
      nextZoom
    });
  };

  const handleLightboxPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (isInteractiveTarget(event.target)) return;
    if (event.shiftKey || event.ctrlKey || isZoomInModifierActive || isZoomOutModifierActive) {
      return;
    }
    if (lightboxZoom <= 1) return;

    event.preventDefault();
    lightboxDragPointerIdRef.current = event.pointerId;
    lightboxDragStartRef.current = { x: event.clientX, y: event.clientY };
    lightboxPanStartRef.current = lightboxPan;
    setIsLightboxDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleLightboxPointerMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (
      !isLightboxDragging ||
      lightboxDragPointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const nextPan = clampPanOffset(
      {
        x:
          lightboxPanStartRef.current.x +
          (event.clientX - lightboxDragStartRef.current.x),
        y:
          lightboxPanStartRef.current.y +
          (event.clientY - lightboxDragStartRef.current.y)
      },
      lightboxZoom,
      bounds.width,
      bounds.height
    );

    setLightboxPan(nextPan);
  };

  const finishLightboxDrag = (
    event?: React.PointerEvent<HTMLDivElement>
  ) => {
    if (
      event &&
      lightboxDragPointerIdRef.current === event.pointerId &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    lightboxDragPointerIdRef.current = null;
    setIsLightboxDragging(false);
  };

  const lightboxItem = lightboxIndex !== null ? items[lightboxIndex] : null;

  return (
    <>
      <section className={cn('not-prose mt-16', className)}>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-secondary/80">
              {eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-text-primary sm:text-3xl">
              {title}
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-text-muted">
            Navegacion visual del producto. Haz click en cualquier captura para verla
            a pantalla grande.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(18,18,18,0.98),rgba(10,10,10,0.86))] shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,0,0.16),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(59,130,246,0.20),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_38%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="grid items-start gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.95fr)] lg:p-6">
            <div ref={previewPanelRef} className="relative min-w-0 self-start">
              <motion.div
                layout
                className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-black/40 shadow-[0_24px_80px_rgba(0,0,0,0.34)]"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_34%),radial-gradient(circle_at_12%_88%,rgba(255,255,0,0.12),transparent_34%)]" />
                <div className="absolute left-4 top-4 z-20 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/12 bg-black/55 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-accent">
                    {activeItem.label ?? 'Vista'}
                  </span>
                  <span className="rounded-full border border-white/12 bg-black/55 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-text-secondary">
                    {formatSlideNumber(activeIndex)} / {totalSlidesLabel}
                  </span>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => openLightbox(activeIndex)}
                    className="group relative block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                    aria-label={`Abrir captura ${activeItem.title} de ${projectTitle}`}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeItem.image}
                          className="absolute inset-0"
                          initial={
                            reduceMotion
                              ? false
                              : { opacity: 0, y: 24, scale: 0.985, filter: 'blur(8px)' }
                          }
                          animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            filter: 'blur(0px)'
                          }}
                          exit={
                            reduceMotion
                              ? { opacity: 0 }
                              : { opacity: 0, y: -20, scale: 1.01, filter: 'blur(10px)' }
                          }
                          transition={{
                            duration: reduceMotion ? 0.18 : 0.55,
                            ease: transitionCurve
                          }}
                        >
                          <img
                            src={activeItem.image}
                            alt={activeItem.alt}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.018]"
                            loading="lazy"
                          />
                        </motion.div>
                      </AnimatePresence>

                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.16)_46%,rgba(0,0,0,0.48))]" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(circle_at_bottom,rgba(255,255,0,0.10),transparent_60%)]" />
                    </div>
                  </button>

                  <div className="border-t border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-secondary">
                            Seleccion actual
                          </span>
                          <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-text-muted">
                            Producto real en uso
                          </span>
                        </div>

                        <h3 className="text-xl font-black tracking-[-0.03em] text-white sm:text-[1.75rem]">
                          {activeItem.title}
                        </h3>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/78 sm:text-[0.98rem]">
                          {activeItem.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => openLightbox(activeIndex)}
                        className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-secondary/45 hover:bg-secondary/10 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                      >
                        Ver en grande
                        <ArrowIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            <aside
              className="flex min-w-0 flex-col gap-4 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              style={railHeight ? { height: `${railHeight}px` } : undefined}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-secondary/78">
                    Panel visual
                  </p>
                  <h3 className="mt-2 text-lg font-bold tracking-[-0.02em] text-text-primary">
                    Recorrido por pantallas clave
                  </h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-text-muted">
                    Navega por los modulos mas relevantes sin meter ruido encima de la captura.
                  </p>
                </div>

                {items.length > 1 ? (
                  <div className="flex shrink-0 gap-2">
                    <ControlButton
                      label="Captura anterior"
                      direction="left"
                      onClick={() => shiftPreview(-1)}
                    />
                    <ControlButton
                      label="Siguiente captura"
                      direction="right"
                      onClick={() => shiftPreview(1)}
                    />
                  </div>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                <div className="case-gallery-scroll h-full overflow-y-auto overscroll-contain pr-1">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    {items.map((item, index) => {
                      const isActive = index === activeIndex;

                      return (
                        <button
                          key={item.image}
                          type="button"
                          onClick={() => selectSlide(index)}
                          className={cn(
                            'group relative overflow-hidden rounded-[1.3rem] border text-left transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70',
                            isActive
                              ? 'border-secondary/55 bg-secondary/12 shadow-[0_0_0_1px_rgba(59,130,246,0.18),0_18px_45px_rgba(59,130,246,0.12)]'
                              : 'border-white/8 bg-black/24 hover:border-white/16 hover:bg-white/[0.03]'
                          )}
                        >
                          <div className="flex min-w-0 items-stretch gap-3 p-2.5">
                            <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-[1rem] border border-white/8 bg-black/35">
                              <img
                                src={item.image}
                                alt={item.alt}
                                className={cn(
                                  'h-full w-full object-cover transition duration-300',
                                  isActive ? 'scale-[1.05]' : 'group-hover:scale-[1.04]'
                                )}
                                loading="lazy"
                              />
                              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.45))]" />
                            </div>

                            <div className="min-w-0 py-1">
                              <div className="mb-1 flex items-center gap-2">
                                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-accent/85">
                                  {formatSlideNumber(index)}
                                </span>
                                {item.label ? (
                                  <span className="truncate text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-text-muted">
                                    {item.label}
                                  </span>
                                ) : null}
                              </div>

                              <p
                                className={cn(
                                  'truncate text-sm font-semibold transition-colors',
                                  isActive ? 'text-text-primary' : 'text-text-secondary'
                                )}
                              >
                                {item.title}
                              </p>
                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-muted">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-[1.35rem] border border-white/8 bg-black/30 p-3">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-text-muted">
                    Vistas
                  </p>
                  <p className="mt-1 text-2xl font-black tracking-[-0.03em] text-text-primary">
                    {totalSlidesLabel}
                  </p>
                </div>
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-text-muted">
                    Focus
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">
                    UX operativa + negocio
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {lightboxIndex !== null && lightboxItem ? (
          <motion.div
            className="fixed inset-0 z-[70] overflow-y-auto bg-black/88 px-4 py-5 backdrop-blur-md lg:px-6 lg:py-6"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.18 : 0.28 }}
            onClick={() => setLightboxIndex(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`Galeria ampliada de ${projectTitle}`}
              className="relative mx-auto w-full max-w-[1280px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(10,10,10,0.92))] shadow-[0_28px_120px_rgba(0,0,0,0.55)] lg:max-h-[calc(100dvh-3rem)]"
              initial={
                reduceMotion
                  ? { opacity: 1 }
                  : { opacity: 0, y: 18, scale: 0.985 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.99 }
              }
              transition={{ duration: reduceMotion ? 0.18 : 0.34, ease: transitionCurve }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div className="absolute left-4 top-4 z-20 flex flex-wrap gap-2 lg:left-5 lg:top-5">
                <span className="rounded-full border border-white/12 bg-black/60 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-accent">
                  {lightboxItem.label ?? 'Vista ampliada'}
                </span>
                <span className="rounded-full border border-white/12 bg-black/60 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-text-secondary">
                  {formatSlideNumber(lightboxIndex)} / {totalSlidesLabel}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                aria-label="Cerrar galeria"
                className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/55 text-text-primary transition hover:border-accent/65 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>

              <div className="grid lg:h-[min(84vh,860px)] lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="relative min-h-[320px] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.08))] lg:min-h-0">
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-[linear-gradient(180deg,rgba(0,0,0,0.38),transparent)]" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-[linear-gradient(0deg,rgba(0,0,0,0.42),transparent)]" />

                  {items.length > 1 ? (
                    <>
                      <ControlButton
                        label="Captura anterior"
                        direction="left"
                        onClick={() => shiftLightbox(-1)}
                        className="absolute left-4 top-1/2 z-20 -translate-y-1/2 lg:left-5"
                      />
                      <ControlButton
                        label="Siguiente captura"
                        direction="right"
                        onClick={() => shiftLightbox(1)}
                        className="absolute right-4 top-1/2 z-20 -translate-y-1/2 lg:right-5"
                      />
                    </>
                  ) : null}

                  <div className="flex aspect-[16/10] items-center justify-center p-4 sm:p-5 lg:h-full lg:aspect-auto lg:p-6">
                    <div
                      ref={lightboxFrameRef}
                      className={cn(
                        'relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.4rem] border border-white/8 bg-black/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
                        isLightboxDragging
                          ? 'cursor-grabbing'
                          : isZoomOutModifierActive && lightboxZoom > 1
                            ? 'cursor-zoom-out'
                          : isZoomInModifierActive || lightboxZoom === 1
                            ? 'cursor-zoom-in'
                          : lightboxZoom > 1
                            ? 'cursor-grab'
                            : 'cursor-default'
                      )}
                      onClick={handleLightboxClick}
                      onWheel={handleLightboxWheel}
                      onPointerDown={handleLightboxPointerDown}
                      onPointerMove={handleLightboxPointerMove}
                      onPointerUp={finishLightboxDrag}
                      onPointerCancel={finishLightboxDrag}
                      onPointerLeave={finishLightboxDrag}
                      style={{ touchAction: lightboxZoom > 1 ? 'none' : 'auto' }}
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(255,255,0,0.08),transparent_38%)]" />
                      {lightboxZoom > 1 ? (
                        <button
                          type="button"
                          onPointerDown={(event) => event.stopPropagation()}
                          onPointerUp={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            resetLightboxView();
                          }}
                          className="pointer-events-auto absolute bottom-4 right-4 z-[24] inline-flex items-center gap-2 rounded-full border border-white/14 bg-black/70 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-text-primary transition hover:border-accent/45 hover:bg-white/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                        >
                          Reset
                        </button>
                      ) : null}

                      <AnimatePresence mode="wait">
                        <motion.div
                          key={lightboxItem.image}
                          className="relative z-[1] flex h-full w-full items-center justify-center"
                          initial={
                            reduceMotion
                              ? false
                              : { opacity: 0, scale: 1.015, filter: 'blur(10px)' }
                          }
                          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.995 }}
                          transition={{
                            duration: reduceMotion ? 0.18 : 0.42,
                            ease: transitionCurve
                          }}
                        >
                          <img
                            src={lightboxItem.image}
                            alt={lightboxItem.alt}
                            className="h-full w-full object-contain transition-transform duration-150 ease-out"
                            style={{
                              transform: `translate3d(${lightboxPan.x}px, ${lightboxPan.y}px, 0) scale(${lightboxZoom})`,
                              transformOrigin: '50% 50%'
                            }}
                          />
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="flex min-h-0 flex-col border-t border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] lg:border-l lg:border-t-0">
                  <div className="border-b border-white/8 px-5 pb-5 pt-20 lg:px-6 lg:pb-6 lg:pt-22">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-secondary/78">
                      Captura activa
                    </p>
                    <h3 className="mt-3 text-2xl font-black tracking-[-0.03em] text-text-primary">
                      {lightboxItem.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                      {lightboxItem.description}
                    </p>
                  </div>

                  <div className="case-gallery-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 lg:px-6 lg:py-6">
                    <div className="space-y-3">
                      {items.map((item, index) => {
                        const isCurrent = index === lightboxIndex;

                        return (
                          <button
                            key={`${item.image}-lightbox`}
                            type="button"
                            onClick={() => openLightbox(index)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-[1rem] border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70',
                              isCurrent
                                ? 'border-accent/45 bg-[linear-gradient(90deg,rgba(255,255,0,0.14),rgba(255,255,255,0.02))] shadow-[0_0_0_1px_rgba(255,255,0,0.08)]'
                                : 'border-white/8 bg-black/20 hover:border-white/16 hover:bg-white/[0.03]'
                            )}
                          >
                            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-accent/85">
                              {formatSlideNumber(index)}
                            </span>
                            <span className="truncate text-sm font-medium text-text-primary">
                              {item.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default CaseGallery;
