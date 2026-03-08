import React, { useEffect, useRef, useState } from "react";

type ValuePropItem = {
  icon: string;
  text: string;
};

interface ValuePropsBandProps {
  items: ValuePropItem[];
}

const ValuePropsBand: React.FC<ValuePropsBandProps> = ({ items }) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion) {
      setVisible(true);
      return;
    }

    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      {
        threshold: 0.25,
        rootMargin: "0px 0px -10% 0px",
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      data-no-reveal
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4"
    >
      {items.map((item, idx) => (
        <article
          key={`${item.text}-${idx}`}
          className={`group relative rounded-xl border px-4 py-3.5 transition-all duration-700 ease-out ${
            visible
              ? "opacity-100 translate-y-0 blur-0"
              : "opacity-0 translate-y-8 blur-sm"
          } bg-linear-to-br from-bg-secondary/85 to-bg-tertiary/45 border-ui-border/70 hover:border-secondary/45 hover:shadow-[0_0_22px_rgba(59,130,246,0.12)]`}
          style={{ transitionDelay: `${Math.min(idx * 120, 540)}ms` }}
        >
          <div className="flex items-center gap-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-secondary/35 bg-secondary/10 text-secondary shadow-[0_0_18px_rgba(59,130,246,0.08)] [&>svg]:block [&>svg]:h-[1.05rem] [&>svg]:w-[1.05rem]">
              <span
                className="inline-flex"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: item.icon }}
              />
            </span>

            <p className="text-sm leading-[1.45] text-text-secondary transition-colors duration-250 group-hover:text-text-primary">
              {item.text}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
};

export default ValuePropsBand;
