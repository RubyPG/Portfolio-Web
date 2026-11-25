"use client";

import { useEffect, useRef, useState } from "react";
import type { ProjectMedia } from "@/lib/project-media";
import { isViewportZoomed } from "@/lib/scene-input";
import styles from "./ProjectMediaGallery.module.css";

interface ProjectMediaGalleryProps {
  title: string;
  logo: string;
  items: ProjectMedia[];
  active: boolean;
}

function Arrow({ forward = false }: { forward?: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={forward ? "M5 12h14m-7-7 7 7-7 7" : "M19 12H5m7 7-7-7 7-7"} />
    </svg>
  );
}

/** One mounted slide: changing media also releases the previous video. */
function MediaSlide({
  item,
  title,
  active,
}: {
  item: ProjectMedia;
  title: string;
  active: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const player = video.current;
    if (!player) return;
    const pauseIfHidden = () => {
      if (
        !active ||
        document.hidden ||
        player.closest('[inert], [aria-hidden="true"]')
      )
        player.pause();
    };
    pauseIfHidden();
    document.addEventListener("visibilitychange", pauseIfHidden);
    const observer = new MutationObserver(pauseIfHidden);
    let ancestor: HTMLElement | null = player.parentElement;
    while (ancestor) {
      observer.observe(ancestor, {
        attributes: true,
        attributeFilter: ["inert", "aria-hidden"],
      });
      ancestor = ancestor.parentElement;
    }
    return () => {
      player.pause();
      observer.disconnect();
      document.removeEventListener("visibilitychange", pauseIfHidden);
    };
  }, [active]);

  if (failed) {
    return (
      <div className={styles.message} role="status">
        <p>No se ha podido cargar este archivo.</p>
        <a href={item.src} target="_blank" rel="noreferrer">
          Abrir archivo <span aria-hidden="true">↗</span>
        </a>
      </div>
    );
  }

  return item.type === "video" ? (
    <video
      ref={video}
      src={item.src}
      controls
      playsInline
      preload="metadata"
      aria-label={`Vídeo de ${title}: ${item.name}`}
      onError={() => setFailed(true)}
    />
  ) : (
    // Public folder media keep their original aspect ratio and need no image service.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.src}
      alt={`${title} — ${item.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ")}`}
      draggable={false}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export function ProjectMediaGallery({
  title,
  logo,
  items,
  active,
}: ProjectMediaGalleryProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const gesture = useRef<{ x: number; y: number; id: number } | null>(null);
  const selectedIndex = items.findIndex((item) => item.src === selected);
  const index = selectedIndex < 0 ? 0 : selectedIndex;
  const item = items[index];
  const multiple = items.length > 1;
  const move = (direction: number) => {
    if (!multiple) return;
    setSelected(items[(index + direction + items.length) % items.length].src);
  };

  return (
    <section
      className={styles.gallery}
      aria-label={`Galería de ${title}`}
      aria-roledescription="carrusel"
      data-project-media
      tabIndex={multiple ? 0 : undefined}
      onKeyDown={(event) => {
        if (
          event.target instanceof HTMLVideoElement ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        )
          return;
        if (
          !multiple ||
          !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        if (event.key === "Home") setSelected(items[0].src);
        else if (event.key === "End") setSelected(items[items.length - 1].src);
        else move(event.key === "ArrowLeft" ? -1 : 1);
      }}
    >
      <div
        className={styles.stage}
        data-media-type={item?.type ?? "empty"}
        onPointerDown={(event) => {
          if (
            !event.isPrimary ||
            event.button !== 0 ||
            item?.type === "video" ||
            isViewportZoomed()
          ) {
            gesture.current = null;
            return;
          }
          gesture.current = {
            x: event.clientX,
            y: event.clientY,
            id: event.pointerId,
          };
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
        onPointerUp={(event) => {
          const start = gesture.current;
          gesture.current = null;
          if (!start || start.id !== event.pointerId || isViewportZoomed())
            return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3)
            move(dx < 0 ? 1 : -1);
        }}
      >
        {item ? (
          <MediaSlide
            key={item.src}
            item={item}
            title={title}
            active={active}
          />
        ) : (
          <div className={styles.empty}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" draggable={false} />
            <p>Imágenes y vídeos próximamente.</p>
          </div>
        )}
      </div>
      {item && (
        <div className={styles.controls}>
          <p className={styles.caption} aria-live="polite" aria-atomic="true">
            {item.type === "video" ? "Vídeo" : "Imagen"}
            <span className={styles.counter}>
              {index + 1} / {items.length}
            </span>
          </p>
          {multiple && (
            <div className={styles.arrows}>
              <button
                type="button"
                aria-label="Archivo anterior"
                onClick={() => move(-1)}
              >
                <Arrow />
              </button>
              <button
                type="button"
                aria-label="Archivo siguiente"
                onClick={() => move(1)}
              >
                <Arrow forward />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
