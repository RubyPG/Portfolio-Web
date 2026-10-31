"use client";

import { useRef, useState, useLayoutEffect } from "react";
import { animate, eases } from "animejs";
import { createSceneClock } from "@/lib/scene-clock";
import { Hero } from "@/components/sections/Hero";
import { TechStack } from "@/components/sections/TechStack";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { Radar, type RadarHandle } from "@/components/ui/Radar";
import { StaggeredMenu, type MenuSection } from "@/components/ui/StaggeredMenu";
import { contactChannels } from "@/config/contact";
import {
  getContactTransition,
  HORIZON_VIEW,
  OVERHEAD_VIEW,
} from "@/lib/contact-transition";
import {
  ProjectShowcase,
  type ProjectShowcaseHandle,
} from "@/components/sections/ProjectShowcase";
import { createEnvironmentTransition } from "@/components/animations/environment-transition";
import type { DitherVeilHandle } from "@/components/ui/DitherVeil";
import type { PatternWavesHandle } from "@/components/ui/PatternWaves";
import { createSceneInput } from "@/lib/scene-input";
import styles from "./LandingStory.module.css";

const menuAnchors: Record<MenuSection, string> = {
  hero: "inicio",
  projects: "proyectos",
  stack: "stack",
  about: "sobre-mi",
  contact: "contacto",
};

export function LandingStory({
  ready,
  animateIntro,
}: {
  ready: boolean;
  animateIntro: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const menuOpen = useRef(false);
  const nativeMenuFocus = useRef<HTMLElement | null>(null);
  const menuGate = useRef<(open: boolean) => void>(() => {});
  const menuNavigate = useRef<((section: MenuSection) => Promise<void>) | null>(
    null,
  );
  const [menuSection, setMenuSection] = useState<MenuSection>("hero");
  const [sceneBusy, setSceneBusy] = useState(false);
  const world = useRef<HTMLDivElement>(null);
  const stack = useRef<HTMLDivElement>(null);
  const stackScroll = useRef<HTMLDivElement>(null);
  const about = useRef<HTMLDivElement>(null);
  const aboutScroll = useRef<HTMLDivElement>(null);
  const personal = useRef<HTMLDivElement>(null);
  const radarLayer = useRef<HTMLDivElement>(null);
  const radar = useRef<RadarHandle>(null);
  const contact = useRef<HTMLDivElement>(null);
  const contactScroll = useRef<HTMLDivElement>(null);
  const showcase = useRef<ProjectShowcaseHandle>(null);
  const dither = useRef<DitherVeilHandle>(null);
  const waves = useRef<PatternWavesHandle>(null);
  const projectsReady = useRef(false);
  const syncScene = useRef<() => void>(() => {});
  const detailMode = useRef<(open: boolean) => void>(() => {});
  const detailIsOpen = useRef(false);

  useLayoutEffect(() => {
    if (!ready || !root.current || !stage.current) return;
    const container = root.current;
    const viewport = stage.current;
    const stackLayer = stack.current!;
    const stackContent = stackScroll.current!;
    const aboutLayer = about.current!;
    const aboutContent = aboutScroll.current!;
    const personalLayer = personal.current!;
    const radarSurface = radarLayer.current!;
    const contactLayer = contact.current!;
    const contactContent = contactScroll.current!;
    const projectLayer = container.querySelector<HTMLElement>(
      "[data-project-layer]",
    )!;
    const heroLayer = container.querySelector<HTMLElement>("[data-hero]")!;
    const backgroundLayer = container.querySelector<HTMLElement>(
      "[data-hero-background]",
    )!;
    const portrait = container.querySelector<HTMLElement>(
      '[data-hero-layer="portrait"]',
    )!;
    waves.current?.setTerrainProgress(0);
    waves.current?.setActive(true);
    const media = window.matchMedia("(prefers-reduced-motion: no-preference)");

    const mountStory = () => {
      container.dataset.scrollStory = "";
      const gallery = container.querySelector<HTMLElement>(
        "[data-project-gallery]",
      )!;
      type SceneStage = 0 | 1 | 2 | 3 | 4;
      const names = {
        0: "hero",
        1: "projects",
        2: "stack",
        3: "about",
        4: "contact",
      };
      const menuSections: Record<SceneStage, MenuSection> = {
        0: "hero",
        1: "projects",
        2: "stack",
        3: "about",
        4: "contact",
      };
      let settled: SceneStage = 0;
      let target: SceneStage = 0;
      let busy = false;
      let enabled = false;
      let scrollStart = 0;
      let scrollRange = 1;
      let desiredScroll = 0;
      let measuredWidth = 0;
      let measuredHeight = 0;
      let measuredWindowHeight = 0;
      let resizeFrame = 0;
      let focusFrame = 0;
      let restoreSceneFocus = false;
      let menuAnimation: ReturnType<typeof animate> | null = null;
      let resolveMenu: (() => void) | null = null;
      let queuedMenuFocus: HTMLElement | null = null;
      let renderedBusy: boolean | undefined;
      let renderedSection: SceneStage | undefined;
      let radarPrepared = false;
      let renderedHero = NaN;
      let renderedOrbit = NaN;
      let renderedApproach = NaN;
      let renderedRadarOrbit = NaN;
      const fullstack = container.querySelector<HTMLElement>(
        '[data-hero-layer="fullstack"]',
      )!;
      const developer = container.querySelector<HTMLElement>(
        '[data-hero-layer="developer"]',
      )!;
      const signature = container.querySelector<HTMLElement>(
        '[data-hero-layer="signature"]',
      )!;
      const originalStyles = [
        surface.current!,
        fullstack,
        developer,
        signature,
        portrait,
        aboutLayer,
        contactLayer,
      ].map((element) => [element, element.getAttribute("style")] as const);
      surface.current!.style.transform = "none";
      surface.current!.style.opacity = "1";
      const measure = () => {
        const height = viewport.clientHeight;
        measuredWidth = viewport.clientWidth;
        measuredHeight = height;
        measuredWindowHeight = window.innerHeight;
        scrollStart = Math.round(
          container.getBoundingClientRect().top + window.scrollY,
        );
        scrollRange = Math.max(
          1,
          Math.min(
            container.offsetHeight - height,
            document.documentElement.scrollHeight -
              window.innerHeight -
              scrollStart,
          ),
        );
      };
      measure();
      const setEnabled = (next: boolean) => {
        if (enabled === next) return;
        enabled = next;
        showcase.current?.setInteractionEnabled(next);
      };
      showcase.current?.setInteractionEnabled(false);
      const setVisibility = (element: HTMLElement, value: string) => {
        if (element.style.visibility !== value)
          element.style.visibility = value;
      };
      const setAttribute = (
        element: HTMLElement,
        name: string,
        value: string,
      ) => {
        if (element.getAttribute(name) !== value)
          element.setAttribute(name, value);
      };
      const setInert = (element: HTMLElement, value: boolean) => {
        if (element.inert !== value) element.inert = value;
      };
      const setData = (element: HTMLElement, name: string, value: string) => {
        if (element.dataset[name] !== value) element.dataset[name] = value;
      };
      const setPlane = (
        element: HTMLElement,
        plane: ReturnType<typeof getContactTransition>["about"],
      ) => {
        element.style.transformOrigin = "50% 65%";
        element.style.transform = `perspective(${viewport.clientHeight * 2}px) translateY(${plane.yPercent}%) rotateX(${plane.rotationX}deg) scale(${plane.scale})`;
        element.style.opacity = String(plane.opacity);
      };
      radar.current?.setView(HORIZON_VIEW);
      const environment = createEnvironmentTransition({
        viewport,
        projectLayer: container.querySelector<HTMLElement>(
          "[data-project-environment]",
        )!,
        stackLayer,
        personalLayer,
        aboutLayer,
        world: world.current!,
      });
      showcase.current?.setIntroProgress(0);
      const syncScroll = () => {
        if (detailIsOpen.current) return;
        desiredScroll = Math.round(
          scrollStart + scrollRange * timeline.progress(),
        );
        if (Math.abs(window.scrollY - desiredScroll) > 0.5)
          window.scrollTo({ top: desiredScroll, behavior: "instant" });
      };
      const renderScene = () => {
        if (detailIsOpen.current) return;
        const progress = timeline.progress();
        const stackProgress = stackAnimation.progress();
        const aboutProgress = aboutAnimation.progress();
        const orbitProgress = eases.inOutCubic(contactAnimation.progress());
        if (renderedHero !== progress) {
          const exit = eases.inOutSine(Math.min(1, progress / 0.62));
          fullstack.style.transform = `translateX(${24 * exit}px)`;
          developer.style.transform = `translateX(${-24 * exit}px)`;
          signature.style.transform = `translateY(${16 * exit}px) rotate(-9deg)`;
          for (const element of [fullstack, developer, signature, portrait])
            element.style.opacity = String(1 - exit);
          portrait.style.transform = `translateX(-50%) scale(${1 + exit * 0.02})`;
          waves.current?.setTerrainProgress(progress);
          const arrival = eases.outCubic(Math.max(0, (progress - 0.52) / 0.48));
          projectLayer.style.opacity = String(arrival);
          showcase.current?.setIntroProgress(arrival);
          renderedHero = progress;
        }
        if (!radarPrepared && target >= 2) {
          radar.current?.prepare();
          radarPrepared = true;
        }
        if (renderedBusy !== busy) {
          setSceneBusy(busy);
          renderedBusy = busy;
        }
        if (renderedSection !== settled) {
          setMenuSection(menuSections[settled]);
          renderedSection = settled;
        }
        const projectsVisible = progress > 0.52 && stackProgress < 1;
        const stackVisible = stackProgress > 0 && aboutProgress < 1;
        const personalVisible = aboutProgress > 0;
        const aboutVisible = personalVisible && orbitProgress < 1;
        const contactVisible = personalVisible && orbitProgress > 0;
        const backgroundVisible = stackProgress < 1;
        setVisibility(
          backgroundLayer,
          backgroundVisible ? "visible" : "hidden",
        );
        waves.current?.setActive(backgroundVisible && !menuOpen.current);
        if (renderedOrbit !== orbitProgress) {
          const orbit = getContactTransition(orbitProgress);
          setPlane(aboutLayer, orbit.about);
          setPlane(contactLayer, orbit.contact);
          radarSurface.style.setProperty(
            "--radar-top-alpha",
            String(orbit.maskTopAlpha),
          );
          renderedOrbit = orbitProgress;
        }
        setVisibility(personalLayer, personalVisible ? "visible" : "hidden");
        setAttribute(personalLayer, "aria-hidden", String(!personalVisible));
        setAttribute(radarSurface, "aria-hidden", String(!personalVisible));
        radar.current?.setActive(personalVisible);
        radar.current?.setTechnologyProgress?.(aboutProgress);
        showcase.current?.setActive(projectsVisible);
        setVisibility(projectLayer, projectsVisible ? "visible" : "hidden");
        setVisibility(stackLayer, stackVisible ? "visible" : "hidden");
        setInert(stackLayer, busy || settled !== 2);
        setAttribute(stackLayer, "aria-hidden", String(busy || settled !== 2));
        setVisibility(aboutLayer, aboutVisible ? "visible" : "hidden");
        setInert(aboutLayer, busy || settled !== 3);
        setAttribute(aboutLayer, "aria-hidden", String(busy || settled !== 3));
        setVisibility(contactLayer, contactVisible ? "visible" : "hidden");
        setInert(contactLayer, busy || settled !== 4);
        setAttribute(
          contactLayer,
          "aria-hidden",
          String(busy || settled !== 4),
        );
        setInert(projectLayer, busy || settled !== 1);
        setAttribute(
          projectLayer,
          "aria-hidden",
          String(busy || settled !== 1),
        );
        setAttribute(heroLayer, "aria-hidden", String(progress > 0.5));
        setInert(heroLayer, progress > 0);
        setData(
          container,
          "sceneStage",
          busy ? "transitioning" : names[settled],
        );
        setData(container, "sceneTarget", names[target]);
        setEnabled(
          !busy && !menuOpen.current && settled === 1 && projectsReady.current,
        );
        environment.render(stackProgress, aboutProgress);
        if (
          renderedApproach !== aboutProgress ||
          renderedRadarOrbit !== orbitProgress
        ) {
          radar.current?.setView(
            aboutProgress < 1
              ? environment.getRadarView()
              : getContactTransition(orbitProgress).radar,
          );
          renderedApproach = aboutProgress;
          renderedRadarOrbit = orbitProgress;
        }
        syncScroll();
      };
      const finish = (next: SceneStage) => {
        settled = target = next;
        busy = false;
        const hash = next === 0 ? "" : `#${menuAnchors[menuSections[next]]}`;
        window.history.replaceState(
          window.history.state,
          "",
          `${window.location.pathname}${window.location.search}${hash}`,
        );
        renderScene();
        if (restoreSceneFocus || next >= 1) {
          restoreSceneFocus = false;
          focusFrame = requestAnimationFrame(() => {
            if (busy || settled !== next) return;
            const focusTarget =
              next === 4
                ? contactContent
                : next === 3
                  ? aboutContent
                  : next === 2
                    ? stackContent
                    : next === 1
                      ? gallery
                      : container;
            if (menuOpen.current) queuedMenuFocus = focusTarget;
            else focusTarget?.focus({ preventScroll: true });
          });
        }
      };
      const timeline = createSceneClock({
        duration: 1250,
        onUpdate: renderScene,
        onComplete: () => finish(1),
        onReverseComplete: () => finish(0),
      });
      const stackAnimation = createSceneClock({
        duration: 1000,
        onUpdate: renderScene,
        onComplete: () => finish(2),
        onReverseComplete: () => finish(1),
      });
      const aboutAnimation = createSceneClock({
        duration: 2100,
        onUpdate: renderScene,
        onComplete: () => finish(3),
        onReverseComplete: () => finish(2),
      });
      const contactAnimation = createSceneClock({
        duration: 1250,
        onUpdate: renderScene,
        onComplete: () => finish(4),
        onReverseComplete: () => finish(3),
      });
      const atBottom = (element: HTMLElement) =>
        element.scrollHeight - element.clientHeight - element.scrollTop <= 2;
      const step = (
        direction: -1 | 1,
        focusDestination = false,
        explicitNavigation = false,
      ) => {
        if (
          busy ||
          menuOpen.current ||
          detailIsOpen.current ||
          showcase.current?.isTransitioning()
        )
          return;
        if (
          settled === 1 &&
          direction === 1 &&
          showcase.current?.hasSelection()
        )
          return;
        if (
          settled === 2 &&
          !explicitNavigation &&
          (direction === 1
            ? !atBottom(stackContent)
            : stackContent.scrollTop > 1)
        )
          return;
        if (
          settled === 3 &&
          !explicitNavigation &&
          (direction === 1
            ? !atBottom(aboutContent)
            : aboutContent.scrollTop > 1)
        )
          return;
        if (
          settled === 4 &&
          (direction === 1 ||
            (!explicitNavigation && contactContent.scrollTop > 1))
        )
          return;
        if (settled === 1 && direction === -1 && showcase.current?.closeFocus())
          return;
        const next = Math.max(
          0,
          Math.min(4, settled + direction),
        ) as SceneStage;
        if (next === settled) return;
        restoreSceneFocus =
          focusDestination || container.contains(document.activeElement);
        target = next;
        busy = true;
        setEnabled(false);
        renderScene();
        if (settled === 0) timeline.play();
        else if (next === 0) timeline.reverse();
        else if (next === 4) {
          contactContent.scrollTop = 0;
          contactAnimation.play();
        } else if (settled === 4) contactAnimation.reverse();
        else if (next === 3) {
          aboutContent.scrollTop = 0;
          environment.measure();
          aboutAnimation.play();
        } else if (settled === 3) aboutAnimation.reverse();
        else if (next === 2) {
          stackContent.scrollTop = 0;
          environment.measure();
          stackAnimation.play();
        } else stackAnimation.reverse();
      };
      const input = createSceneInput({
        element: container,
        isBlocked: () =>
          busy ||
          menuOpen.current ||
          Boolean(showcase.current?.isTransitioning()),
        isDetailOpen: () => detailIsOpen.current,
        handlesDirection: (direction) => {
          if (settled === 4)
            return direction === -1 && contactContent.scrollTop <= 1;
          if (settled === 3)
            return direction === 1
              ? atBottom(aboutContent)
              : aboutContent.scrollTop <= 1;
          if (settled === 2)
            return direction === 1
              ? atBottom(stackContent)
              : stackContent.scrollTop <= 1;
          return !(
            settled === 1 &&
            direction === 1 &&
            showcase.current?.hasSelection()
          );
        },
        onStep: step,
      });
      menuGate.current = (open) => {
        input.resetGesture();
        setEnabled(!open && !busy && settled === 1 && projectsReady.current);
        waves.current?.setActive(
          !open && !detailIsOpen.current && stackAnimation.progress() < 1,
        );
        if (!open && queuedMenuFocus && !busy) {
          queuedMenuFocus.focus({ preventScroll: true });
          queuedMenuFocus = null;
        }
      };
      const placeScene = (next: SceneStage) => {
        showcase.current?.resetForNavigation();
        contactAnimation.pause().progress(0, true);
        aboutAnimation.pause().progress(0, true);
        stackAnimation.pause().progress(0, true);
        timeline.pause().progress(0, true);
        if (next >= 1) timeline.progress(1, true);
        if (next >= 2) stackAnimation.progress(1, true);
        if (next >= 3) aboutAnimation.progress(1, true);
        if (next === 4) contactAnimation.progress(1, true);
        if (next === 2) stackContent.scrollTop = 0;
        if (next === 3) aboutContent.scrollTop = 0;
        if (next === 4) contactContent.scrollTop = 0;
        environment.measure();
        settled = target = next;
        renderedHero = renderedOrbit = NaN;
        renderScene();
      };
      menuNavigate.current = (section) => {
        const next = (
          { hero: 0, projects: 1, stack: 2, about: 3, contact: 4 } as const
        )[section];
        if (busy || !surface.current) return Promise.resolve();
        const direction = next >= settled ? 1 : -1;
        target = next;
        busy = true;
        restoreSceneFocus = true;
        setSceneBusy(true);
        setEnabled(false);
        input.resetGesture();
        renderScene();
        return new Promise<void>((resolve) => {
          resolveMenu = resolve;
          menuAnimation?.cancel();
          const transition = { value: 0 };
          let placed = false;
          menuAnimation = animate(transition, {
            value: [0, 1],
            duration: 800,
            ease: "linear",
            onUpdate: () => {
              const p = transition.value;
              if (p >= 0.3 && !placed) {
                placed = true;
                placeScene(next);
              }
              const entering = p >= 0.3;
              const eased = entering
                ? eases.outCubic(Math.max(0, (p - 0.375) / 0.625))
                : eases.inQuad(p / 0.3);
              surface.current!.style.opacity = String(
                entering ? eased : 1 - eased,
              );
              surface.current!.style.transform = `translateY(${32 * direction * (entering ? 1 - eased : -eased)}px)`;
            },
            onComplete: () => {
              if (!placed) placeScene(next);
              menuAnimation = null;
              surface.current!.style.opacity = "1";
              surface.current!.style.transform = "none";
              finish(next);
              input.resetGesture();
              resolveMenu?.();
              resolveMenu = null;
            },
          });
        });
      };
      const navigateSection = (event: MouseEvent) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        const link =
          event.target instanceof Element
            ? event.target.closest(
                "[data-stack-open], [data-stack-back], [data-about-open], [data-about-back], [data-contact-open], [data-contact-back]",
              )
            : null;
        if (!link) return;
        event.preventDefault();
        if (link.hasAttribute("data-stack-open") && settled === 1)
          step(1, true, true);
        else if (link.hasAttribute("data-stack-back") && settled === 2)
          step(-1, true, true);
        else if (link.hasAttribute("data-about-open") && settled === 2)
          step(1, true, true);
        else if (link.hasAttribute("data-about-back") && settled === 3)
          step(-1, true, true);
        else if (link.hasAttribute("data-contact-open") && settled === 3)
          step(1, true, true);
        else if (link.hasAttribute("data-contact-back") && settled === 4)
          step(-1, true, true);
      };
      container.addEventListener("click", navigateSection);
      syncScene.current = renderScene;
      detailMode.current = (open) => {
        input.resetGesture();
        if (open) waves.current?.setActive(false);
        else renderScene();
      };
      const nativeGesture = { lastAt: -Infinity, consumed: false };
      const nativeScroll = () => {
        if (
          detailIsOpen.current ||
          viewport.clientWidth !== measuredWidth ||
          viewport.clientHeight !== measuredHeight ||
          window.innerHeight !== measuredWindowHeight ||
          Math.abs(window.scrollY - desiredScroll) <= 1
        )
          return;
        const direction = window.scrollY > desiredScroll ? 1 : -1;
        const now = performance.now();
        if (now - nativeGesture.lastAt > 220) nativeGesture.consumed = false;
        nativeGesture.lastAt = now;
        window.scrollTo({ top: desiredScroll, behavior: "instant" });
        if (settled >= 2) return;
        if (!nativeGesture.consumed) {
          nativeGesture.consumed = true;
          step(direction);
        }
      };
      const scheduleResize = () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
          measure();
          environment.measure();
          renderedHero = renderedOrbit = NaN;
          renderScene();
        });
      };
      const resize = new ResizeObserver(scheduleResize);
      resize.observe(viewport);
      window.addEventListener("resize", scheduleResize);
      window.addEventListener("scroll", nativeScroll, { passive: true });
      const initial = (
        {
          "#proyectos": 1,
          "#cubo": 1,
          "#stack": 2,
          "#sobre-mi": 3,
          "#contacto": 4,
        } as Record<string, SceneStage>
      )[window.location.hash];
      if (detailIsOpen.current) {
        timeline.progress(1, true);
        settled = target = 1;
      } else if (initial !== undefined) {
        placeScene(initial);
        focusFrame = requestAnimationFrame(() => {
          (initial === 4
            ? contactContent
            : initial === 3
              ? aboutContent
              : initial === 2
                ? stackContent
                : gallery
          ).focus({ preventScroll: true });
        });
      }
      renderScene();
      return () => {
        menuAnimation?.cancel();
        resolveMenu?.();
        menuNavigate.current = null;
        menuGate.current = () => {};
        queuedMenuFocus = null;
        setSceneBusy(false);
        input.destroy();
        container.removeEventListener("click", navigateSection);
        resize.disconnect();
        cancelAnimationFrame(resizeFrame);
        cancelAnimationFrame(focusFrame);
        window.removeEventListener("scroll", nativeScroll);
        window.removeEventListener("resize", scheduleResize);
        timeline.kill();
        stackAnimation.kill();
        aboutAnimation.kill();
        contactAnimation.kill();
        environment.destroy();
        syncScene.current = () => {};
        detailMode.current = () => {};
        delete container.dataset.scrollStory;
        delete container.dataset.sceneStage;
        delete container.dataset.sceneTarget;
        for (const layer of [
          projectLayer,
          heroLayer,
          stackLayer,
          aboutLayer,
          contactLayer,
        ]) {
          layer.inert = false;
          layer.removeAttribute("aria-hidden");
          layer.style.visibility = "";
        }
        projectLayer.style.removeProperty("opacity");
        backgroundLayer.style.visibility = "";
        waves.current?.setTerrainProgress(0);
        waves.current?.setActive(true);
        personalLayer.removeAttribute("aria-hidden");
        personalLayer.style.visibility = "";
        radarSurface.removeAttribute("aria-hidden");
        radarSurface.style.removeProperty("--radar-top-alpha");
        radar.current?.setView(OVERHEAD_VIEW);
        radar.current?.setTechnologyProgress?.(1);
        radar.current?.setActive(true);
        dither.current?.setRevealProgress(0);
        showcase.current?.setIntroProgress(1);
        showcase.current?.setActive(true);
        showcase.current?.setInteractionEnabled(true);
        originalStyles.forEach(([element, style]) => {
          if (style === null) element.removeAttribute("style");
          else element.setAttribute("style", style);
        });
      };
    };
    let dispose: (() => void) | undefined;
    const onMotionChange = () => {
      dispose?.();
      dispose = media.matches ? mountStory() : undefined;
    };
    onMotionChange();
    media.addEventListener("change", onMotionChange);
    return () => {
      media.removeEventListener("change", onMotionChange);
      dispose?.();
    };
  }, [ready]);

  return (
    <div ref={root} className={styles.story} tabIndex={-1}>
      <StaggeredMenu
        ready={ready}
        disabled={sceneBusy}
        currentSection={menuSection}
        onOpenChange={(open) => {
          if (open && !menuNavigate.current) {
            // Native scrolling can reach a section without a story callback.
            let current: MenuSection = "hero";
            for (const section of Object.keys(menuAnchors) as MenuSection[]) {
              const element = document.getElementById(menuAnchors[section]);
              if (
                element &&
                element.getBoundingClientRect().top <= window.innerHeight * 0.3
              )
                current = section;
            }
            setMenuSection(current);
          }
          menuOpen.current = open;
          if (surface.current) surface.current.inert = open;
          menuGate.current(open);
          if (!open && nativeMenuFocus.current) {
            nativeMenuFocus.current.focus({ preventScroll: true });
            nativeMenuFocus.current = null;
          }
        }}
        onNavigate={async (section) => {
          if (menuNavigate.current) return menuNavigate.current(section);
          // Reduced motion uses the real document and anchor destinations.
          showcase.current?.resetForNavigation();
          // Let an inline detail unmount and release its document scroll lock.
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          );
          const id = menuAnchors[section];
          const destination = document.getElementById(id);
          destination?.scrollIntoView({ behavior: "instant", block: "start" });
          if (destination) {
            destination.tabIndex = -1;
            if (menuOpen.current) nativeMenuFocus.current = destination;
            else destination.focus({ preventScroll: true });
          }
          window.history.replaceState(
            window.history.state,
            "",
            `${window.location.pathname}${window.location.search}#${id}`,
          );
          setMenuSection(section);
        }}
      />
      <div ref={stage} className={styles.stage}>
        <div ref={surface} className={styles.surface} data-scene-surface>
          <div className={styles.hero}>
            <Hero
              ready={animateIntro}
              portraitRef={dither}
              backgroundRef={waves}
            />
          </div>
          <div
            ref={world}
            className={styles.world}
            data-scene-world
            aria-hidden="true"
          />
          <div className={styles.projects} data-project-layer>
            <div data-project-environment>
              <ProjectShowcase
                ref={showcase}
                onDetailChange={(open) => {
                  detailIsOpen.current = open;
                  detailMode.current(open);
                }}
                onReady={() => {
                  projectsReady.current = true;
                  syncScene.current();
                }}
              />
            </div>
          </div>
          <div ref={stack} className={styles.stack} data-stack-layer>
            <div
              ref={stackScroll}
              className={styles.stackScroll}
              data-stack-scroll
              tabIndex={-1}
              role="region"
              aria-label="Contenido de Mi stack"
            >
              <TechStack />
            </div>
          </div>
          <div ref={personal} className={styles.personal} data-personal-layer>
            <div ref={radarLayer} className={styles.radar} data-radar-layer>
              <Radar
                ref={radar}
                tilt={OVERHEAD_VIEW.tilt}
                centerY={OVERHEAD_VIEW.centerY}
                scale={OVERHEAD_VIEW.scale}
              />
            </div>
            <div ref={about} className={styles.about} data-about-layer>
              <div
                ref={aboutScroll}
                className={styles.aboutScroll}
                data-about-scroll
                tabIndex={-1}
                role="region"
                aria-label="Contenido de Sobre mí"
              >
                <About />
              </div>
            </div>
            <div ref={contact} className={styles.contact} data-contact-layer>
              <div
                ref={contactScroll}
                className={styles.contactScroll}
                data-contact-scroll
                tabIndex={-1}
                role="region"
                aria-label="Contenido de Contacto"
              >
                <Contact contact={contactChannels} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
