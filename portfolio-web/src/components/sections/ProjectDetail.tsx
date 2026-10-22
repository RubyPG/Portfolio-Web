"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import type { Project } from "@/data/projects";
import { assetPath } from "@/lib/asset-path";
import {
  getProjectCardBackground,
  getProjectCardBackgroundCss,
  PROJECT_CARD_RADIUS,
} from "@/lib/project-card";
import { getProjectPreviewComposition } from "@/lib/project-preview";
import styles from "./ProjectDetail.module.css";

gsap.registerPlugin(useGSAP);

export interface ProjectDetailRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ProjectDetailProps {
  project: Project;
  /** Card bounds relative to the containing project section. */
  sourceRect: ProjectDetailRect;
  open: boolean;
  onClose: () => void;
  onEntered?: () => void;
  onExited: () => void;
}

export function ProjectDetail({
  project,
  sourceRect,
  open,
  onClose,
  onEntered,
  onExited,
}: ProjectDetailProps) {
  const root = useRef<HTMLElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const wash = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const logoSlot = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const progress = useRef(0);
  const exited = useRef(false);
  const callbacks = useRef({ open, onClose, onEntered, onExited });
  const sourceWidth = Math.max(1, sourceRect.width);
  const sourceHeight = Math.max(1, sourceRect.height);
  const composition = getProjectPreviewComposition(
    sourceWidth,
    project.preview.width / project.preview.height,
  );
  const sourceLogoSize = composition.logo.width;
  const sourceLogoX = sourceRect.x + composition.logo.x;
  const sourceLogoY = sourceRect.y + composition.logo.y;
  const titleId = `project-detail-${project.slug}`;

  useLayoutEffect(() => {
    callbacks.current = { open, onClose, onEntered, onExited };
  }, [open, onClose, onEntered, onExited]);

  useGSAP(
    () => {
      const host = root.current;
      const background = surface.current;
      const backgroundWash = wash.current;
      const image = logo.current;
      const destination = logoSlot.current;
      const copy = content.current;
      if (
        !host ||
        !background ||
        !backgroundWash ||
        !image ||
        !destination ||
        !copy
      )
        return;

      const setReadable = (readable: boolean) => {
        copy.inert = !readable;
        copy.setAttribute("aria-hidden", String(!readable));
        host.dataset.entered = String(readable);
      };
      const exit = () => {
        if (callbacks.current.open || exited.current) return;
        exited.current = true;
        callbacks.current.onExited();
      };
      const destinationRect = () => {
        const hostRect = host.getBoundingClientRect();
        const slotRect = destination.getBoundingClientRect();
        return {
          x: slotRect.left - hostRect.left,
          y: slotRect.top - hostRect.top,
          width: slotRect.width,
          height: slotRect.height,
        };
      };
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );

      const animation = gsap.timeline({
        paused: true,
        defaults: { duration: 0.8, ease: "power3.inOut" },
        onUpdate: () => {
          progress.current = animation.progress();
          // A resize can seek to zero with events suppressed. Closing is an
          // endpoint state, not dependent on receiving a single GSAP callback.
          if (!callbacks.current.open && progress.current === 0) {
            setReadable(false);
            exit();
          }
        },
        onComplete: () => {
          if (!callbacks.current.open) return;
          setReadable(true);
          callbacks.current.onEntered?.();
        },
        onReverseComplete: () => {
          setReadable(false);
          exit();
        },
      });
      timeline.current = animation;
      animation
        .fromTo(
          background,
          {
            x: sourceRect.x,
            y: sourceRect.y,
            scaleX: 1,
            scaleY: 1,
            borderRadius: PROJECT_CARD_RADIUS,
          },
          {
            x: 0,
            y: 0,
            scaleX: () => host.clientWidth / sourceWidth,
            scaleY: () => host.clientHeight / sourceHeight,
            borderRadius: 0,
          },
          0,
        )
        .fromTo(
          image,
          {
            x: sourceLogoX,
            y: sourceLogoY,
            scaleX: 1,
            scaleY: 1,
          },
          {
            x: () => destinationRect().x,
            y: () => destinationRect().y,
            scaleX: () => destinationRect().width / sourceLogoSize,
            scaleY: () => destinationRect().height / sourceLogoSize,
          },
          0,
        )
        .fromTo(
          backgroundWash,
          { opacity: 0 },
          { opacity: 0.96, duration: 0.52, ease: "power2.inOut" },
          0.24,
        )
        .fromTo(
          copy,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.32, ease: "power2.out" },
          0.48,
        );
      // Keep the same corner logo visible throughout the surface expansion.
      animation.fromTo(
        preview.current,
        { autoAlpha: 1 },
        { autoAlpha: 0, duration: 0.36, ease: "power2.inOut" },
        0,
      );

      // Animate the four corner groups independently. Their parent wrappers
      // remain owned by LandingStory, so returning to the Hero still scrubs.
      const showcase = host.parentElement;
      const corners = showcase?.querySelectorAll<HTMLElement>(
        "[data-project-corner]",
      );
      corners?.forEach((corner) => {
        const direction = corner.dataset.projectCorner;
        const horizontal = direction === "left" || direction === "right";
        const sign = direction === "left" || direction === "up" ? -1 : 1;
        animation.fromTo(
          corner,
          { x: 0, y: 0, xPercent: 0, yPercent: 0, autoAlpha: 1 },
          {
            x: () => (horizontal ? sign * host.clientWidth * 0.07 : 0),
            y: () => (horizontal ? 0 : sign * host.clientHeight * 0.07),
            xPercent: horizontal ? sign * 110 : 0,
            yPercent: horizontal ? 0 : sign * 110,
            autoAlpha: 0,
            duration: 0.38,
            ease: "power2.in",
          },
          0,
        );
      });
      const chrome = showcase?.querySelectorAll<HTMLElement>(
        "[data-project-chrome]",
      );
      if (chrome?.length) {
        animation.fromTo(
          chrome,
          { "--chrome-backdrop-opacity": 1 },
          { "--chrome-backdrop-opacity": 0, duration: 0.3, ease: "power2.in" },
          0,
        );
      }

      animation.progress(progress.current, true);
      setReadable(progress.current === 1 && callbacks.current.open);
      if (callbacks.current.open) {
        if (reducedMotion.matches) animation.progress(1);
        else animation.timeScale(1).play();
      } else if (progress.current > 0) {
        if (reducedMotion.matches) animation.progress(0);
        else animation.timeScale(1).reverse();
      } else {
        exit();
      }

      const refresh = () => {
        const currentProgress = animation.progress();
        // Force a fresh render even when the timeline was already at its end.
        animation
          .invalidate()
          .progress(0, true)
          .progress(currentProgress, true);
        if (!callbacks.current.open && currentProgress === 0) {
          setReadable(false);
          exit();
        }
      };
      let refreshFrame = 0;
      let disposed = false;
      const scheduleRefresh = () => {
        if (disposed || refreshFrame) return;
        refreshFrame = requestAnimationFrame(() => {
          refreshFrame = 0;
          if (!disposed) refresh();
        });
      };
      const resize = new ResizeObserver(scheduleRefresh);
      resize.observe(host);
      resize.observe(destination);
      const heading = destination.parentElement;
      if (heading) resize.observe(heading);
      // Font metrics can move the logo within an unchanged viewport.
      document.fonts.ready.then(scheduleRefresh, scheduleRefresh);
      document.fonts.addEventListener("loadingdone", scheduleRefresh);
      const updateMotionPreference = () => {
        if (!reducedMotion.matches) return;
        if (callbacks.current.open) animation.progress(1);
        else animation.progress(0);
      };
      reducedMotion.addEventListener("change", updateMotionPreference);

      return () => {
        // useGSAP has already reverted/killed the child tweens here. Reading
        // progress() now can report 1 for the emptied timeline; keep onUpdate's
        // last rendered progress so a source-rect resize cannot skip the reveal.
        timeline.current = null;
        disposed = true;
        cancelAnimationFrame(refreshFrame);
        resize.disconnect();
        document.fonts.removeEventListener("loadingdone", scheduleRefresh);
        reducedMotion.removeEventListener("change", updateMotionPreference);
      };
    },
    {
      scope: root,
      dependencies: [
        project.slug,
        sourceRect.x,
        sourceRect.y,
        sourceWidth,
        sourceHeight,
      ],
      revertOnUpdate: true,
    },
  );

  useGSAP(
    () => {
      const animation = timeline.current;
      const copy = content.current;
      if (!animation || !copy) return;
      if (open) {
        exited.current = false;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
          animation.progress(1);
        else animation.timeScale(1).play();
      } else {
        copy.inert = true;
        copy.setAttribute("aria-hidden", "true");
        if (animation.progress() === 0) {
          if (!exited.current) {
            exited.current = true;
            callbacks.current.onExited();
          }
        } else if (
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          animation.progress(0);
        } else animation.timeScale(1).reverse();
      }
    },
    { dependencies: [open], scope: root },
  );

  useEffect(() => {
    const host = root.current;
    const scroller = body.current;
    if (!host || !scroller) return;
    let requestedClose = false;
    let lastWheelAt = 0;
    let wheelStartedAtTop = false;
    let wheelDistance = 0;
    let touchStart: { x: number; y: number; atTop: boolean } | null = null;

    const requestClose = () => {
      if (requestedClose || !callbacks.current.open) return;
      requestedClose = true;
      callbacks.current.onClose();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || host.closest("[inert]")) return;
      event.preventDefault();
      event.stopPropagation();
      requestClose();
    };
    const handleWheel = (event: WheelEvent) => {
      event.stopPropagation();
      if (progress.current < 0.999 || !callbacks.current.open) {
        event.preventDefault();
        return;
      }
      const now = performance.now();
      if (now - lastWheelAt > 180) {
        wheelStartedAtTop = scroller.scrollTop <= 1;
        wheelDistance = 0;
      }
      lastWheelAt = now;
      if (event.deltaY >= 0 || !wheelStartedAtTop) {
        wheelDistance = 0;
        return;
      }
      const delta =
        event.deltaY *
        (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 320 : 1);
      wheelDistance -= delta;
      if (scroller.scrollTop <= 1 && wheelDistance > 24) {
        event.preventDefault();
        requestClose();
      }
    };
    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      touchStart = touch
        ? { x: touch.clientX, y: touch.clientY, atTop: scroller.scrollTop <= 1 }
        : null;
    };
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch || !touchStart?.atTop || progress.current < 0.999) return;
      const down = touch.clientY - touchStart.y;
      const sideways = Math.abs(touch.clientX - touchStart.x);
      if (down > 36 && down > sideways && scroller.scrollTop <= 1) {
        event.preventDefault();
        event.stopPropagation();
        requestClose();
      }
    };

    window.addEventListener("keydown", handleKey, true);
    host.addEventListener("wheel", handleWheel, { passive: false });
    host.addEventListener("touchstart", handleTouchStart, { passive: true });
    host.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      window.removeEventListener("keydown", handleKey, true);
      host.removeEventListener("wheel", handleWheel);
      host.removeEventListener("touchstart", handleTouchStart);
      host.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  return (
    <section
      ref={root}
      id="inline-project-detail"
      className={styles.panel}
      aria-labelledby={titleId}
      data-project-detail={project.slug}
    >
      <div
        ref={surface}
        className={styles.surface}
        aria-hidden="true"
        style={{
          width: sourceWidth,
          height: sourceHeight,
          transform: `translate(${sourceRect.x}px, ${sourceRect.y}px)`,
          background: getProjectCardBackgroundCss(
            getProjectCardBackground(project.slug),
          ),
        }}
      >
        <div ref={wash} className={styles.wash} />
      </div>
      <div
        ref={logo}
        className={styles.logo}
        aria-hidden="true"
        style={{
          width: sourceLogoSize,
          height: sourceLogoSize,
          transform: `translate(${sourceLogoX}px, ${sourceLogoY}px)`,
        }}
      >
        {/* The original vector stays independent from the expanding surface. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={project.image} alt="" draggable={false} />
      </div>
      <div
        ref={preview}
        className={styles.preview}
        aria-hidden="true"
        style={{
          width: sourceWidth,
          height: sourceHeight,
          transform: `translate(${sourceRect.x}px, ${sourceRect.y}px)`,
        }}
      >
        <div
          className={styles.previewInterior}
          style={{
            left: composition.interior.x,
            top: composition.interior.y,
            width: composition.interior.width,
            height: composition.interior.height,
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={project.preview.src}
          alt=""
          draggable={false}
          style={{
            left: composition.media.x,
            top: composition.media.y,
            width: composition.media.width,
            height: composition.media.height,
          }}
          onError={({ currentTarget }) => {
            const placeholder = assetPath(
              "/images/projects/capturas/sin-captura.svg",
            );
            if (currentTarget.getAttribute("src") !== placeholder)
              currentTarget.src = placeholder;
          }}
        />
      </div>
      <div ref={content} className={styles.content} inert aria-hidden="true">
        <nav className={styles.navigation} aria-label="Navegación del proyecto">
          <button className={styles.back} type="button" onClick={onClose}>
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5m7 7-7-7 7-7" />
            </svg>
            Volver a proyectos
          </button>
        </nav>
        <header className={styles.header}>
          <div ref={logoSlot} className={styles.logoSlot} aria-hidden="true" />
          <h2 id={titleId} tabIndex={-1} data-detail-heading>
            {project.title}
          </h2>
        </header>
        <div ref={body} className={styles.body} data-detail-scroll tabIndex={0}>
          <p className={styles.description}>{project.description}</p>
          {project.technologies.length > 0 && (
            <div className={styles.technologyBlock}>
              <h3>Tecnologías</h3>
              <ul className={styles.technologies}>
                {project.technologies.map((technology) => (
                  <li key={technology}>{technology}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
