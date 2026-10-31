"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import type { Project } from "@/data/projects";
import { getProjectPreviewRect } from "@/lib/project-preview";
import styles from "./ProjectPreview.module.css";

export interface ProjectPreviewHandle {
  setProgress(progress: number): void;
}

/** The atlas selection's anime.js clock owns the reveals, including their reverse. */
export const ProjectPreview = forwardRef<
  ProjectPreviewHandle,
  { project: Project; visible: boolean }
>(function ProjectPreview({ project, visible }, ref) {
  const root = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const reduced = useRef(false);
  const paint = useCallback(() => {
    const host = root.current;
    if (!host) return;
    const reveals = [
      {
        selector: "[data-preview-problem]",
        start: 0.3,
        duration: 0.5,
        x: -18,
        y: 0,
      },
      {
        selector: "[data-preview-contribution]",
        start: 0.36,
        duration: 0.5,
        x: 18,
        y: 0,
      },
      {
        selector: "[data-preview-technologies]",
        start: 0.66,
        duration: 0.34,
        x: 0,
        y: 12,
      },
    ];
    reveals.forEach(({ selector, start, duration, x, y }) => {
      const element = host.querySelector<HTMLElement>(selector);
      if (!element) return;
      const value = Math.max(
        0,
        Math.min(1, (progress.current - start) / duration),
      );
      const eased = 1 - Math.pow(1 - value, 3);
      element.style.opacity = String(eased);
      element.style.visibility = value > 0 ? "visible" : "hidden";
      element.style.transform = reduced.current
        ? "none"
        : `translate3d(${x * (1 - eased)}px, ${y * (1 - eased)}px, 0)`;
    });
  }, []);
  useImperativeHandle(
    ref,
    () => ({
      setProgress(value) {
        progress.current = value;
        paint();
      },
    }),
    [paint],
  );
  useLayoutEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reduced.current = preference.matches;
      paint();
    };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, [paint]);
  useLayoutEffect(() => {
    const host = root.current;
    if (!host) return;
    const layout = () => {
      const rect = getProjectPreviewRect(
        host.clientWidth,
        host.clientHeight,
        project.preview.width / project.preview.height,
      );
      host.style.setProperty("--preview-x", `${rect.x}px`);
      host.style.setProperty("--preview-bottom", `${rect.y + rect.height}px`);
    };
    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(host);
    return () => observer.disconnect();
  }, [project.preview.width, project.preview.height]);

  return (
    <div
      ref={root}
      className={styles.preview}
      data-project-preview
      inert={!visible}
      aria-hidden={!visible || undefined}
    >
      <div className={styles.problem} data-project-corner="left">
        <div data-preview-problem>
          <h3>Qué resuelve</h3>
          <p>{project.problem}</p>
        </div>
      </div>
      <div className={styles.contribution} data-project-corner="right">
        <div data-preview-contribution>
          <h3>Mi aportación</h3>
          <p>{project.contribution}</p>
        </div>
        <div className={styles.technologyBlock} data-preview-technologies>
          {project.technologies.length > 0 && (
            <ul aria-label="Tecnologías">
              {project.technologies.map((technology) => (
                <li key={technology}>{technology}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
});
