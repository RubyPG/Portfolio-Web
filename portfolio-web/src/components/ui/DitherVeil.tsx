"use client";

import { useEffect, useImperativeHandle, useRef } from "react";
import type { HTMLAttributes, Ref } from "react";
import Image from "next/image";
import type { DitherVeilController } from "./dither-veil";
import styles from "./DitherVeil.module.css";

export interface DitherVeilHandle {
  setRevealProgress: (progress: number) => void;
}

interface DitherVeilProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<DitherVeilHandle>;
  src: string;
  alt: string;
  width: number;
  height: number;
  inkColor?: string;
  paperColor?: string;
  pixelSize?: number;
  revealRadius?: number;
  softness?: number;
  linger?: number;
}

// Transparent portrait adaptation of the supplied React Bits DitherVeil.
export function DitherVeil({
  ref,
  src,
  alt,
  width,
  height,
  inkColor = "#27563f",
  paperColor = "#e4eae8",
  pixelSize = 1,
  revealRadius = 200,
  softness = 0.6,
  linger = 1,
  className,
  ...attributes
}: DitherVeilProps) {
  const root = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const controller = useRef<DitherVeilController | null>(null);
  const revealProgress = useRef(0);

  useImperativeHandle(
    ref,
    () => ({
      setRevealProgress(progress) {
        const next = Number.isFinite(progress)
          ? Math.min(1, Math.max(0, progress))
          : 0;
        revealProgress.current = next;
        controller.current?.setRevealProgress(next);
      },
    }),
    [],
  );

  useEffect(() => {
    const container = root.current;
    const photo = image.current;
    const host = surface.current;
    if (!container || !photo || !host) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let generation = 0;

    const update = async () => {
      const current = ++generation;
      controller.current?.destroy();
      controller.current = null;
      delete container.dataset.ditherReady;
      if (motion.matches) return;

      try {
        const [{ createDitherVeil }] = await Promise.all([
          import("./dither-veil"),
          photo.decode(),
        ]);
        if (current !== generation) return;
        controller.current = createDitherVeil(host, photo, {
          inkColor,
          paperColor,
          pixelSize,
          revealRadius,
          softness,
          linger,
          onReady: () => {
            if (!container.hasAttribute("data-dither-ready")) {
              container.dataset.ditherReady = "";
            }
          },
          onFallback: () => {
            delete container.dataset.ditherReady;
          },
        });
        controller.current.setRevealProgress(revealProgress.current);
      } catch {
        // Keep the original PNG if image decoding or WebGL is unavailable.
        if (current === generation) delete container.dataset.ditherReady;
      }
    };

    const onMotionChange = () => {
      void update();
    };
    void update();
    motion.addEventListener("change", onMotionChange);
    return () => {
      generation++;
      motion.removeEventListener("change", onMotionChange);
      controller.current?.destroy();
      controller.current = null;
      delete container.dataset.ditherReady;
    };
  }, [src, inkColor, paperColor, pixelSize, revealRadius, softness, linger]);

  return (
    <div
      {...attributes}
      ref={root}
      className={`${styles.root} ${className ?? ""}`}
    >
      <Image
        ref={image}
        className={styles.image}
        src={src}
        alt={alt}
        width={width}
        height={height}
        preload
        unoptimized
      />
      <div ref={surface} className={styles.surface} aria-hidden="true" />
    </div>
  );
}
