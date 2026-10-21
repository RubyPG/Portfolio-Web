"use client";

import { forwardRef, useImperativeHandle, useRef, type RefObject } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import styles from "./ProjectControls.module.css";

gsap.registerPlugin(useGSAP);

export interface ProjectControlsHandle {
  captureLayout(): void;
}

interface ProjectControlsProps {
  focused: boolean;
  summaryRef: RefObject<HTMLDivElement | null>;
  onPrevious(): void;
  onNext(): void;
  onClose(): void;
}

/** Persistent controls: their two outlines join before becoming one close button. */
export const ProjectControls = forwardRef<
  ProjectControlsHandle,
  ProjectControlsProps
>(function ProjectControls(
  { focused, summaryRef, onPrevious, onNext, onClose },
  ref,
) {
  const root = useRef<HTMLDivElement>(null);
  const positioner = useRef<HTMLDivElement>(null);
  const previousBounds = useRef<DOMRect | null>(null);
  const focusedRef = useRef(focused);
  const move = useRef<gsap.core.Tween | null>(null);
  const play = useRef<(selected: boolean) => void>(() => {});

  useImperativeHandle(
    ref,
    () => ({
      captureLayout() {
        previousBounds.current =
          positioner.current?.getBoundingClientRect() ?? null;
      },
    }),
    [],
  );

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const reduced = Boolean(context.conditions?.reduced);
          const halfGap = () => {
            const width = root.current!.clientWidth;
            const button = root.current!.querySelector<HTMLButtonElement>(
              "[data-control-previous]",
            )!;
            return (width - button.offsetWidth * 2) / 2;
          };
          const joinedScale = () => {
            const width = root.current!.clientWidth;
            return (width - halfGap() * 2) / width;
          };
          const animation = gsap.timeline({ paused: true });
          const summary = summaryRef.current!;
          const summaryContent = summary.firstElementChild as HTMLElement;
          // The copy shares the controls' clock, including interruptions and reverse.
          // Height only manages its real layout space; the visible entrance uses transforms.
          animation
            .fromTo(
              summary,
              { height: 0 },
              {
                height: () => summaryContent.offsetHeight,
                duration: 0.64,
                ease: "power2.inOut",
              },
              0,
            )
            .fromTo(
              summaryContent.children,
              { y: 22, autoAlpha: 0 },
              {
                y: 0,
                autoAlpha: 1,
                duration: 0.4,
                stagger: 0.06,
                ease: "power2.out",
              },
              0.18,
            );
          animation
            .fromTo(
              "[data-control-hint]",
              { y: 0, autoAlpha: 1 },
              { y: 22, autoAlpha: 0, duration: 0.3, ease: "power2.in" },
              0,
            )
            .fromTo(
              "[data-control-previous]",
              { x: 0, autoAlpha: 1 },
              { x: halfGap, duration: 0.36, ease: "power2.inOut" },
              0.04,
            )
            .fromTo(
              "[data-control-next]",
              { x: 0, autoAlpha: 1 },
              { x: () => -halfGap(), duration: 0.36, ease: "power2.inOut" },
              0.04,
            )
            .fromTo(
              "[data-control-arrow]",
              { autoAlpha: 1, scale: 1 },
              { autoAlpha: 0, scale: 0.65, duration: 0.2, ease: "power2.in" },
              0.12,
            )
            .to(
              "[data-control-previous], [data-control-next]",
              { autoAlpha: 0, duration: 0.16, ease: "sine.inOut" },
              0.36,
            )
            .fromTo(
              "[data-control-close]",
              { autoAlpha: 0, scaleX: joinedScale },
              { autoAlpha: 1, scaleX: 1, duration: 0.24, ease: "power2.out" },
              0.36,
            )
            .fromTo(
              "[data-control-label]",
              { y: 7, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.22, ease: "power2.out" },
              0.42,
            )
            .fromTo(
              "[data-control-cross]",
              { rotation: -45, scale: 0.65, autoAlpha: 0 },
              {
                rotation: 0,
                scale: 1,
                autoAlpha: 1,
                duration: 0.22,
                ease: "power2.out",
              },
              0.42,
            );

          play.current = (selected) => {
            if (reduced) animation.progress(Number(selected)).pause();
            else if (selected) animation.play();
            else animation.reverse();
          };
          animation.progress(Number(focusedRef.current)).pause();
          const resize = new ResizeObserver(() => {
            // Recompute the small join distance when switching between phone and desktop.
            const progress = animation.progress();
            animation.invalidate().progress(progress, true);
          });
          resize.observe(root.current!);
          resize.observe(summaryContent);
          return () => {
            resize.disconnect();
            play.current = () => {};
          };
        },
      );
      return () => media.revert();
    },
    { scope: root },
  );

  useGSAP(
    () => {
      focusedRef.current = focused;
      play.current(focused);
      const before = previousBounds.current;
      previousBounds.current = null;
      if (!before || !root.current || !positioner.current) return;
      const after = root.current.getBoundingClientRect();
      move.current?.kill();
      move.current = gsap.fromTo(
        positioner.current,
        {
          x: before.x - after.x,
          y: before.y - after.y,
        },
        {
          x: 0,
          y: 0,
          duration: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? 0
            : 0.64,
          ease: "power2.inOut",
          overwrite: "auto",
        },
      );
    },
    { scope: root, dependencies: [focused] },
  );

  return (
    <div
      ref={root}
      className={styles.controls}
      data-selection-controls
      data-selected={focused}
    >
      <div ref={positioner} className={styles.positioner}>
        <span
          className={styles.hint}
          data-control-hint
          aria-hidden={focused || undefined}
        >
          Arrastra o pulsa una imagen
        </span>
        <div
          className={styles.arrows}
          inert={focused}
          aria-hidden={focused || undefined}
        >
          <button
            type="button"
            className={styles.previous}
            data-control-previous
            aria-label="Proyecto anterior"
            onClick={onPrevious}
          >
            <span data-control-arrow aria-hidden="true">
              ←
            </span>
          </button>
          <button
            type="button"
            className={styles.next}
            data-control-next
            aria-label="Proyecto siguiente"
            onClick={onNext}
          >
            <span data-control-arrow aria-hidden="true">
              →
            </span>
          </button>
        </div>
        <button
          type="button"
          className={styles.close}
          data-control-close
          inert={!focused}
          aria-hidden={!focused || undefined}
          aria-label="Cerrar detalle del proyecto"
          onClick={onClose}
        >
          <span data-control-label>Cerrar</span>
          <span className={styles.cross} data-control-cross aria-hidden="true">
            ×
          </span>
        </button>
      </div>
    </div>
  );
});
