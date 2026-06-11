import React, { useMemo } from "react";
import LogoLoop, { type LogoItem } from "../LogoLoop";
import type { ProjectTechLogo } from "../../data/project-tech-logos";

interface ProjectTechLogoLoopProps {
  items: ProjectTechLogo[];
  ariaLabel?: string;
  /* compact: bare loop without section chrome, for embedding inside scenes */
  compact?: boolean;
}

const ProjectTechLogoLoop: React.FC<ProjectTechLogoLoopProps> = ({
  items,
  ariaLabel = "Project technologies",
  compact = false,
}) => {
  const logos = useMemo<LogoItem[]>(
    () =>
      items.map((item) => {
        const iconNode =
          item.icon.kind === "svg" ? (
            <span
              className="[&>svg]:block [&>svg]:h-[1em] [&>svg]:w-[1em]"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: item.icon.value }}
            />
          ) : (
            <img
              src={item.icon.value}
              alt=""
              aria-hidden="true"
              className="h-[1em] w-[1em] object-contain"
              loading="lazy"
              decoding="async"
            />
          );

        return {
          title: item.title,
          ariaLabel: item.title,
          node: (
            <span
              className="inline-flex h-[1.65em] w-[1.65em] items-center justify-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
              title={item.title}
            >
              {iconNode}
            </span>
          ),
        };
      }),
    [items],
  );

  if (logos.length === 0) {
    return null;
  }

  const loop = (
    <LogoLoop
      logos={logos}
      speed={55}
      direction="left"
      logoHeight={compact ? 28 : 34}
      gap={18}
      hoverSpeed={18}
      scaleOnHover={false}
      fadeOut
      fadeOutColor={compact ? "#111111" : "#0a0a0a"}
      ariaLabel={ariaLabel}
    />
  );

  if (compact) {
    return (
      <div
        data-no-reveal
        className="w-full overflow-hidden"
        aria-label={ariaLabel}
      >
        {loop}
      </div>
    );
  }

  return (
    <section
      data-no-reveal
      className="relative isolate overflow-x-clip overflow-y-hidden border-y border-ui-border/45 bg-linear-to-b from-bg-secondary/40 via-bg-primary to-bg-primary py-10 sm:py-12"
      aria-label={ariaLabel}
    >
      <div className="w-full overflow-hidden px-4 sm:px-6 lg:px-8">{loop}</div>
    </section>
  );
};

export default ProjectTechLogoLoop;
