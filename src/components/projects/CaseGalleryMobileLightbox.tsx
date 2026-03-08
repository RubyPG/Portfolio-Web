import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import type { CaseGalleryItem } from './CaseGallery';

interface CaseGalleryMobileLightboxProps {
  item: CaseGalleryItem;
  items: CaseGalleryItem[];
  currentIndex: number;
  projectTitle: string;
  totalSlidesLabel: string;
  lightboxZoom: number;
  lightboxPan: { x: number; y: number };
  isLightboxDragging: boolean;
  isZoomInModifierActive: boolean;
  isZoomOutModifierActive: boolean;
  reduceMotion: boolean;
  lightboxFrameRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
  onResetZoom: () => void;
  onAdjustZoom: (direction: -1 | 1) => void;
  onFrameClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onFrameWheel: (event: React.WheelEvent<HTMLDivElement>) => void;
  onFramePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onFramePointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onFramePointerUp: (event?: React.PointerEvent<HTMLDivElement>) => void;
  formatSlideNumber: (value: number) => string;
}

const transitionCurve = [0.22, 1, 0.36, 1] as const;

const MobileIconButton = ({
  label,
  onClick,
  children,
  className
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className={cn(
      'inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/55 text-text-primary transition hover:border-secondary/55 hover:bg-secondary/12 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70',
      className
    )}
  >
    {children}
  </button>
);

const MobileArrow = ({ direction }: { direction: 'left' | 'right' }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="h-4 w-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d={direction === 'left' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
    />
  </svg>
);

const MobileClose = () => (
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
);

const CaseGalleryMobileLightbox = ({
  item,
  items,
  currentIndex,
  projectTitle,
  totalSlidesLabel,
  lightboxZoom,
  lightboxPan,
  isLightboxDragging,
  isZoomInModifierActive,
  isZoomOutModifierActive,
  reduceMotion,
  lightboxFrameRef,
  onClose,
  onPrev,
  onNext,
  onSelect,
  onResetZoom,
  onAdjustZoom,
  onFrameClick,
  onFrameWheel,
  onFramePointerDown,
  onFramePointerMove,
  onFramePointerUp,
  formatSlideNumber
}: CaseGalleryMobileLightboxProps) => (
  <motion.div
    role="dialog"
    aria-modal="true"
    aria-label={`Galeria ampliada de ${projectTitle}`}
    className="relative w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.2),transparent_32%),linear-gradient(180deg,#03060b,#070b11_58%,#020407)] lg:hidden"
    initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
    transition={{ duration: reduceMotion ? 0.18 : 0.32, ease: transitionCurve }}
    onClick={(event) => event.stopPropagation()}
  >
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,0,0.08),transparent_22%),radial-gradient(circle_at_20%_18%,rgba(59,130,246,0.22),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_24%)]" />
    <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:100%_28px]" />

    <div
      className="relative flex min-h-[100dvh] flex-col"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 0.85rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 0.85rem)'
      }}
    >
      <div className="flex items-start justify-between gap-4 px-4">
        <div className="min-w-0">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.3em] text-secondary/72">
            Modo detalle
          </p>
          <p className="mt-2 truncate text-sm font-semibold text-text-primary">
            {projectTitle}
          </p>
        </div>

        <MobileIconButton label="Cerrar galeria" onClick={onClose}>
          <MobileClose />
        </MobileIconButton>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 px-4">
        <span className="rounded-full border border-white/12 bg-black/50 px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-accent">
          {item.label ?? 'Vista ampliada'}
        </span>
        <span className="rounded-full border border-white/12 bg-black/50 px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-text-secondary">
          {formatSlideNumber(currentIndex)} / {totalSlidesLabel}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-text-muted">
          {lightboxZoom > 1 ? `Zoom ${Math.round(lightboxZoom * 100)}%` : 'Tap para zoom'}
        </span>
      </div>

      <div className="mt-4 px-3">
        <div className="relative h-[52svh] min-h-[320px] max-h-[460px] overflow-hidden rounded-[2.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(9,12,18,0.98),rgba(2,4,8,0.96))] shadow-[0_40px_120px_rgba(0,0,0,0.5)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_bottom,rgba(255,255,0,0.08),transparent_28%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(0,0,0,0.42),transparent)]" />

          <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-text-muted backdrop-blur-md">
            {lightboxZoom > 1 ? 'Arrastra para explorar' : 'Toca para ampliar'}
          </div>

          <div className="h-full p-3 pt-12 pb-20">
            <div
              ref={lightboxFrameRef}
              className={cn(
                'relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.7rem] border border-white/8 bg-black/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
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
              onClick={onFrameClick}
              onWheel={onFrameWheel}
              onPointerDown={onFramePointerDown}
              onPointerMove={onFramePointerMove}
              onPointerUp={onFramePointerUp}
              onPointerCancel={onFramePointerUp}
              onPointerLeave={onFramePointerUp}
              style={{ touchAction: lightboxZoom > 1 ? 'none' : 'auto' }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(255,255,255,0.06),transparent_42%)]" />

              <AnimatePresence mode="wait">
                <motion.div
                  key={item.image}
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
                    src={item.image}
                    alt={item.alt}
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

          {items.length > 1 ? (
            <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/55 px-2 py-2 shadow-[0_12px_36px_rgba(0,0,0,0.38)] backdrop-blur-xl">
              <MobileIconButton
                label="Captura anterior"
                onClick={onPrev}
                className="h-9 w-9 border-white/10 bg-white/[0.04]"
              >
                <MobileArrow direction="left" />
              </MobileIconButton>
              <span className="min-w-18 px-2 text-center text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-text-secondary">
                {formatSlideNumber(currentIndex)} / {totalSlidesLabel}
              </span>
              <MobileIconButton
                label="Siguiente captura"
                onClick={onNext}
                className="h-9 w-9 border-white/10 bg-white/[0.04]"
              >
                <MobileArrow direction="right" />
              </MobileIconButton>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex-1 min-h-0 px-3">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,11,18,0.96),rgba(3,5,9,0.98))] shadow-[0_22px_60px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4 border-b border-white/8 px-4 py-4">
            <div className="min-w-0">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-secondary/78">
                Captura activa
              </p>
              <h3 className="mt-2 text-[1.9rem] font-black leading-[0.98] tracking-[-0.05em] text-text-primary">
                {item.title}
              </h3>
            </div>

            <div className="flex shrink-0 gap-2">
              <MobileIconButton label="Reducir zoom" onClick={() => onAdjustZoom(-1)}>
                <span className="text-lg leading-none">-</span>
              </MobileIconButton>
              <button
                type="button"
                onClick={onResetZoom}
                aria-label="Resetear zoom"
                className="inline-flex h-10 min-w-14 items-center justify-center rounded-full border border-white/12 bg-black/45 px-3 text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-text-primary transition hover:border-secondary/55 hover:bg-secondary/12 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
              >
                Reset
              </button>
              <MobileIconButton label="Aumentar zoom" onClick={() => onAdjustZoom(1)}>
                <span className="text-lg leading-none">+</span>
              </MobileIconButton>
            </div>
          </div>

          <div className="px-4 pt-3">
            <p className="text-sm leading-relaxed text-text-secondary">
              {item.description}
            </p>
          </div>

          <div className="mt-4 border-t border-white/8 pt-3">
            <div className="flex items-center justify-between px-4 pb-3">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-text-muted">
                Recorrido rapido
              </p>
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-text-muted">
                {totalSlidesLabel} vistas reales
              </p>
            </div>

            <div className="case-gallery-scroll overflow-x-auto px-4 pb-4">
              <div className="flex gap-3">
                {items.map((galleryItem, index) => {
                  const isCurrent = index === currentIndex;

                  return (
                    <button
                      key={`${galleryItem.image}-lightbox-mobile`}
                      type="button"
                      onClick={() => onSelect(index)}
                      className={cn(
                        'group w-32 shrink-0 overflow-hidden rounded-[1.35rem] border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70',
                        isCurrent
                          ? 'border-accent/45 bg-[linear-gradient(180deg,rgba(255,255,0,0.12),rgba(255,255,255,0.02))] shadow-[0_0_0_1px_rgba(255,255,0,0.08)]'
                          : 'border-white/8 bg-black/20 hover:border-white/16 hover:bg-white/[0.03]'
                      )}
                    >
                      <div className="relative aspect-[4/5] overflow-hidden">
                        <img
                          src={galleryItem.image}
                          alt={galleryItem.alt}
                          className={cn(
                            'h-full w-full object-cover transition duration-300',
                            isCurrent ? 'scale-[1.04]' : 'group-hover:scale-[1.03]'
                          )}
                          loading="lazy"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.52))]" />
                      </div>

                      <div className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-accent/85">
                            {formatSlideNumber(index)}
                          </span>
                          {galleryItem.label ? (
                            <span className="truncate text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
                              {galleryItem.label}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 line-clamp-2 text-[0.82rem] font-semibold leading-snug text-text-primary">
                          {galleryItem.title}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

export default CaseGalleryMobileLightbox;
