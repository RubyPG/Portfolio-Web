"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import type { Project } from "@/data/projects";
import { getProjectPreviewRect } from "@/lib/project-preview";
import styles from "./ProjectPreview.module.css";

gsap.registerPlugin(useGSAP);

export interface ProjectPreviewHandle {
  setProgress(progress: number): void;
}

/** The carousel's focus clock owns these reveals, including a reversed gesture. */
export const ProjectPreview = forwardRef<
  ProjectPreviewHandle,
  { project: Project; visible: boolean }
>(function ProjectPreview({ project, visible }, ref) {
  const root = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const progress = useRef(0);

  useImperativeHandle(
    ref,
    () => ({
      setProgress(value) {
        progress.current = value;
        timeline.current?.progress(value);
      },
    }),
    [],
  );

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add(
        {
          reduced: "(prefers-reduced-motion: reduce)",
          motion: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const reduced = Boolean(context.conditions?.reduced);
          const animation = gsap.timeline({ paused: true });
          animation
            .fromTo(
              "[data-preview-problem]",
              { x: reduced ? 0 : -18, autoAlpha: 0 },
              { x: 0, autoAlpha: 1, duration: 0.5, ease: "power2.out" },
              0.3,
            )
            .fromTo(
              "[data-preview-contribution]",
              { x: reduced ? 0 : 18, autoAlpha: 0 },
              { x: 0, autoAlpha: 1, duration: 0.5, ease: "power2.out" },
              0.36,
            )
            .fromTo(
              "[data-preview-technologies]",
              { y: reduced ? 0 : 12, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.34, ease: "power2.out" },
              0.66,
            );
          timeline.current = animation;
          animation.progress(progress.current);
          return () => {
            timeline.current = null;
          };
        },
      );
      return () => media.revert();
    },
    { scope: root },
  );

  useGSAP(
    () => {
      const host = root.current!;
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
    },
    {
      scope: root,
      dependencies: [project.preview.width, project.preview.height],
    },
  );

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
