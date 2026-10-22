"use client";

import { useId, useRef } from "react";
import type { Ref } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { assetPath } from "@/lib/asset-path";
import { DitherVeil } from "@/components/ui/DitherVeil";
import type { DitherVeilHandle } from "@/components/ui/DitherVeil";
import {
  PatternWaves,
  type PatternWavesHandle,
} from "@/components/ui/PatternWaves";
import styles from "./Hero.module.css";

gsap.registerPlugin(useGSAP);

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

  useGSAP(
    () => {
      if (!ready || window.scrollY > 8) return;

      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline({
          defaults: { duration: 1.2, ease: "power3.out" },
        });

        timeline
          .fromTo(
            "[data-hero-background]",
            { opacity: 0 },
            { opacity: 1, duration: 1, clearProps: "opacity" },
            0,
          )
          .fromTo(
            '[data-hero-enter="portrait"]',
            { autoAlpha: 0 },
            {
              autoAlpha: 1,
              duration: 1,
              ease: "power2.out",
              clearProps: "opacity,visibility",
            },
            0,
          )
          .fromTo(
            '[data-hero-enter="fullstack"]',
            { x: () => -(hero.current?.clientWidth ?? 0), autoAlpha: 0 },
            { x: 0, autoAlpha: 1, clearProps: "transform,opacity,visibility" },
            0,
          )
          .fromTo(
            '[data-hero-enter="developer"]',
            { x: () => hero.current?.clientWidth ?? 0, autoAlpha: 0 },
            { x: 0, autoAlpha: 1, clearProps: "transform,opacity,visibility" },
            0.15,
          )
          .fromTo(
            '[data-hero-enter="signature"]',
            { y: 100, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.9,
              clearProps: "transform,opacity,visibility",
            },
            0.6,
          );
      });

      return () => media.revert();
    },
    { scope: hero, dependencies: [ready], revertOnUpdate: true },
  );

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
