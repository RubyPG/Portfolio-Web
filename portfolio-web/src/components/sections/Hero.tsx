"use client";

import { useId, useRef, useLayoutEffect } from "react";
import type { Ref } from "react";
import { createTimeline } from "animejs";
import { assetPath } from "@/lib/asset-path";
import { DitherVeil } from "@/components/ui/DitherVeil";
import type { DitherVeilHandle } from "@/components/ui/DitherVeil";
import {
  PatternWaves,
  type PatternWavesHandle,
} from "@/components/ui/PatternWaves";
import styles from "./Hero.module.css";

export function Hero({
  ready = true,
  portraitRef,
  backgroundRef,
}: {
  ready?: boolean;
  portraitRef?: Ref<DitherVeilHandle>;
  backgroundRef?: Ref<PatternWavesHandle>;
}) {
  const hero = useRef<HTMLElement>(null);
  const portraitFilterId = useId();

  useLayoutEffect(() => {
    if (!ready || window.scrollY > 8 || !hero.current) return;
    const container = hero.current;
    const media = window.matchMedia("(prefers-reduced-motion: no-preference)");
    let timeline: ReturnType<typeof createTimeline> | undefined;
    const run = () => {
      timeline?.revert();
      if (!media.matches) return;
      const layer = (name: string) =>
        container.querySelector<HTMLElement>(`[data-hero-enter="${name}"]`)!;
      timeline = createTimeline({
        defaults: { duration: 1200, ease: "outCubic" },
      })
        .add(
          container.querySelector("[data-hero-background]")!,
          { opacity: [0, 1], duration: 1000 },
          0,
        )
        .add(layer("portrait"), { opacity: [0, 1], duration: 1000 }, 0)
        .add(
          layer("fullstack"),
          { translateX: [-container.clientWidth, 0], opacity: [0, 1] },
          0,
        )
        .add(
          layer("developer"),
          { translateX: [container.clientWidth, 0], opacity: [0, 1] },
          150,
        )
        .add(
          layer("signature"),
          { translateY: [100, 0], opacity: [0, 1], duration: 900 },
          600,
        );
    };
    run();
    media.addEventListener("change", run);
    return () => {
      media.removeEventListener("change", run);
      timeline?.revert();
    };
  }, [ready]);

  return (
    <section
      ref={hero}
      id="inicio"
      className={styles.hero}
      aria-labelledby="hero-fullstack hero-developer"
      data-hero
    >
      <div
        className={styles.background}
        data-hero-background
        aria-hidden="true"
      >
        <PatternWaves ref={backgroundRef} active={false} />
      </div>
      <svg className={styles.filters} width="0" height="0" aria-hidden="true">
        <defs>
          <filter
            id={portraitFilterId}
            x="-2%"
            y="-2%"
            width="104%"
            height="104%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur
              in="SourceAlpha"
              stdDeviation="0.65"
              result="softAlpha"
            />
            <feComposite in="SourceGraphic" in2="softAlpha" operator="in" />
          </filter>
        </defs>
      </svg>
      <div className={styles.composition}>
        <h1
          id="hero-fullstack"
          className={`${styles.title} ${styles.fullstack}`}
          data-hero-layer="fullstack"
        >
          <span className={styles.enter} data-hero-enter="fullstack">
            FULLSTACK
          </span>
        </h1>
        <div
          className={styles.portrait}
          data-hero-layer="portrait"
          style={{ filter: `url(#${portraitFilterId})` }}
        >
          <DitherVeil
            ref={portraitRef}
            className={styles.portraitContent}
            data-hero-enter="portrait"
            src={assetPath("/images/ruben-hero.png")}
            alt="Retrato de Rubén"
            width={1086}
            height={1448}
          />
        </div>
        <h1
          id="hero-developer"
          className={`${styles.title} ${styles.developer}`}
          data-hero-layer="developer"
        >
          <span className={styles.enter} data-hero-enter="developer">
            DEVELOPER
          </span>
        </h1>
        <p className={styles.signature} data-hero-layer="signature">
          <span className={styles.enter} data-hero-enter="signature">
            RubenPG
          </span>
        </p>
      </div>
    </section>
  );
}
