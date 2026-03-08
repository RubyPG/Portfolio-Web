import React, { useEffect } from "react";

type RevealNode = HTMLElement | SVGElement;

const TARGET_SELECTORS = [
  ".stagger-children > *",
  ".grid > *",
  ".space-y-4 > *",
  ".space-y-5 > *",
  ".space-y-6 > *",
  ".space-y-8 > *",
  "form > *",
  "ul > li",
  ".max-w-2xl > *",
  ".max-w-lg > *",
  ".max-w-md > *",
  ".text-center > *",
  "h1",
  "h2",
  "h3",
  "p",
].join(", ");

const getRevealProfile = (node: RevealNode) => {
  if (
    node.classList.contains("motion-surface") ||
    node.matches(".grid > *") ||
    node.matches(".stagger-children > *")
  ) {
    return {
      distance: 24,
      scale: 0.982,
      blur: 10,
      duration: 820,
    };
  }

  if (node.matches("h1")) {
    return {
      distance: 32,
      scale: 0.972,
      blur: 14,
      duration: 920,
    };
  }

  if (node.matches("h2, h3")) {
    return {
      distance: 24,
      scale: 0.98,
      blur: 10,
      duration: 860,
    };
  }

  return {
    distance: 18,
    scale: 0.992,
    blur: 7,
    duration: 760,
  };
};

const ScrollRevealController: React.FC = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;

    let activeObserver: IntersectionObserver | null = null;
    let trackedNodes: RevealNode[] = [];

    const hasAnimationClass = (node: RevealNode) =>
      Array.from(node.classList).some((className) =>
        className.startsWith("animate-"),
      );

    const clearPrevious = () => {
      activeObserver?.disconnect();
      activeObserver = null;
      trackedNodes.forEach((node) => {
        node.classList.remove("sr-reveal", "sr-reveal-visible");
        node.style.removeProperty("--sr-delay");
        node.style.removeProperty("--sr-distance");
        node.style.removeProperty("--sr-scale");
        node.style.removeProperty("--sr-blur");
        node.style.removeProperty("--sr-duration");
      });
      trackedNodes = [];
    };

    const initReveal = () => {
      clearPrevious();

      const root = document.querySelector(
        "main[data-scroll-reveal='true']",
      ) as HTMLElement | null;

      if (!root) return;

      // Clear stale classes from prior navigations before selecting new targets.
      root
        .querySelectorAll<RevealNode>(".sr-reveal, .sr-reveal-visible")
        .forEach((node) => {
          node.classList.remove("sr-reveal", "sr-reveal-visible");
          node.style.removeProperty("--sr-delay");
          node.style.removeProperty("--sr-distance");
          node.style.removeProperty("--sr-scale");
          node.style.removeProperty("--sr-blur");
          node.style.removeProperty("--sr-duration");
        });

      const uniqueNodes = new Set<RevealNode>();
      root.querySelectorAll<RevealNode>(TARGET_SELECTORS).forEach((node) => {
        if (node.closest("[data-no-reveal]")) {
          node.classList.remove("sr-reveal", "sr-reveal-visible");
          node.style.removeProperty("--sr-delay");
          node.style.removeProperty("--sr-distance");
          node.style.removeProperty("--sr-scale");
          node.style.removeProperty("--sr-blur");
          node.style.removeProperty("--sr-duration");
          return;
        }
        if (hasAnimationClass(node)) return;
        if (node.classList.contains("motion-chip")) return;
        const parentMotionSurface = node.closest(".motion-surface");
        if (parentMotionSurface && parentMotionSurface !== node) return;
        const rect = node.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        uniqueNodes.add(node);
      });

      const nodes = Array.from(uniqueNodes);
      trackedNodes = nodes;
      nodes.forEach((node, index) => {
        const profile = getRevealProfile(node);
        node.classList.add("sr-reveal");
        node.style.setProperty(
          "--sr-delay",
          `${Math.min((index % 6) * 65, 325)}ms`,
        );
        node.style.setProperty("--sr-distance", `${profile.distance}px`);
        node.style.setProperty("--sr-scale", `${profile.scale}`);
        node.style.setProperty("--sr-blur", `${profile.blur}px`);
        node.style.setProperty("--sr-duration", `${profile.duration}ms`);
      });

      activeObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const node = entry.target as RevealNode;
            node.classList.add("sr-reveal-visible");
            activeObserver?.unobserve(node);
          });
        },
        {
          threshold: 0.16,
          rootMargin: "0px 0px -8% 0px",
        },
      );

      nodes.forEach((node) => activeObserver?.observe(node));
    };

    initReveal();
    document.addEventListener("astro:page-load", initReveal);

    return () => {
      document.removeEventListener("astro:page-load", initReveal);
      clearPrevious();
    };
  }, []);

  return null;
};

export default ScrollRevealController;
