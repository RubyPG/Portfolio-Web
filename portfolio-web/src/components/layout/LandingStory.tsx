"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
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
import { createPortraitParticles } from "@/components/animations/portrait-particles";
import type { DitherVeilHandle } from "@/components/ui/DitherVeil";
import type { PatternWavesHandle } from "@/components/ui/PatternWaves";
import { projects } from "@/data/projects";
import {
  getProjectCardBackground,
  getProjectCardHeight,
} from "@/lib/project-card";
import { createSceneInput } from "@/lib/scene-input";
import styles from "./LandingStory.module.css";

gsap.registerPlugin(useGSAP);

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
  const canvas = useRef<HTMLCanvasElement>(null);
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
  const carouselReady = useRef(false);
  const syncScene = useRef<() => void>(() => {});
  const detailMode = useRef<(open: boolean) => void>(() => {});
  const detailIsOpen = useRef(false);
  const selectedProject = useRef(0);
  const setParticleProject = useRef<(index: number) => void>(() => {});

  useGSAP(
    () => {
      if (!ready || !root.current || !stage.current || !canvas.current) return;
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
      const photo = portrait.querySelector<HTMLImageElement>("img")!;
      // The loader's real ready state also covers fallback and reduced motion.
      waves.current?.setExitProgress(0);
      waves.current?.setActive(true);
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const particles =
          photo.complete && photo.naturalWidth
            ? createPortraitParticles(
                canvas.current!,
                photo,
                projects.map((project) => ({
                  src: project.image,
                  background: getProjectCardBackground(project.slug),
                })),
              )
            : null;
        setParticleProject.current = (index) => particles?.setProject(index);
        setParticleProject.current(selectedProject.current);
        container.dataset.scrollStory = "";
        const gallery = container.querySelector<HTMLElement>(
          "[data-project-gallery]",
        )!;
        const header = container.querySelector<HTMLElement>(
          "[data-project-header]",
        )!;
        const footer = container.querySelector<HTMLElement>(
          "[data-project-footer]",
        )!;
        // The collected card is a transition frame, never a resting stage.
        type SceneStage = 0 | 2 | 3 | 4 | 5;
        const names = {
          0: "hero",
          2: "expanded",
          3: "stack",
          4: "about",
          5: "contact",
        };
        let settled: SceneStage = 0;
        let target: SceneStage = 0;
        let busy = false;
        let enabled = false;
        let zoom = 1;
        let portraitY = 0;
        let scrollStart = 0;
        let scrollRange = 1;
        let desiredScroll = 0;
        let measuredWidth = 0;
        let measuredHeight = 0;
        let measuredWindowHeight = 0;
        let resizeFrame = 0;
        let focusFrame = 0;
        let restoreSceneFocus = false;
        let menuAnimation: gsap.core.Timeline | null = null;
        let resolveMenu: (() => void) | null = null;
        let queuedMenuFocus: HTMLElement | null = null;
        let renderedBusy: boolean | undefined;
        let renderedSection: SceneStage | undefined;
        let radarPrepared = false;
        const menuSections: Record<SceneStage, MenuSection> = {
          0: "hero",
          2: "projects",
          3: "stack",
          4: "about",
          5: "contact",
        };
        gsap.set(surface.current, { y: 0, opacity: 1 });
        const state = {
          reveal: 0,
          gather: 0,
          resolve: 0,
          deal: 0,
          orbit: 0,
          backgroundExit: 0,
        };
        const measure = () => {
          const height = viewport.clientHeight;
          const width = viewport.clientWidth;
          measuredWidth = width;
          measuredHeight = height;
          measuredWindowHeight = window.innerHeight;
          zoom = (height * 0.98) / portrait.offsetHeight;
          const composition = portrait.parentElement!;
          portraitY =
            height / 2 -
            (composition.offsetTop +
              portrait.offsetTop +
              portrait.offsetHeight / 2);
          const square = height * getProjectCardHeight(width, height);
          particles?.resize({
            width,
            height,
            portraitWidth: portrait.offsetWidth * zoom,
            portraitHeight: portrait.offsetHeight * zoom,
            square,
          });
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
        gsap.set(projectLayer, { autoAlpha: detailIsOpen.current ? 1 : 0 });
        gsap.set(canvas.current, { autoAlpha: 0 });
        gsap.set([header, footer], { autoAlpha: 0, y: 24 });
        gsap.set(stackLayer, {
          yPercent: 100,
          xPercent: 0,
        });
        gsap.set(stackLayer.querySelector("[data-stack-heading]"), {
          y: 48,
          opacity: 0,
        });
        gsap.set(stackLayer.querySelectorAll("[data-stack-group]"), {
          y: 28,
          opacity: 0,
        });
        gsap.set(personalLayer, {
          xPercent: 100,
        });
        gsap.set([aboutLayer, contactLayer], {
          transformPerspective: viewport.clientHeight * 2,
          transformOrigin: "50% 65%",
        });
        // Register every animated property for matchMedia's full style restore.
        const initialOrbit = getContactTransition(0);
        gsap.set(aboutLayer, initialOrbit.about);
        gsap.set(contactLayer, initialOrbit.contact);
        const setAboutPlane = gsap.quickSetter(aboutLayer, "css");
        const setContactPlane = gsap.quickSetter(contactLayer, "css");
        const setProjectVisibility = gsap.quickSetter(projectLayer, "css");
        let renderedOrbit = NaN;
        let renderedHeading: boolean | undefined;
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
        radar.current?.setView(HORIZON_VIEW);
        const aboutCopy = aboutLayer.querySelectorAll("[data-about-copy]");
        const aboutCopyStart = {
          x: () => Math.min(64, viewport.clientWidth * 0.05),
        };
        gsap.set(aboutCopy, aboutCopyStart);
        showcase.current?.setIntroProgress(0);

        const syncScroll = () => {
          if (detailIsOpen.current) return;
          desiredScroll = Math.round(
            scrollStart +
              scrollRange * (timeline.progress() * 0.6 + state.deal * 0.4),
          );
          if (Math.abs(window.scrollY - desiredScroll) > 0.5)
            window.scrollTo({ top: desiredScroll, behavior: "instant" });
        };
        const renderScene = () => {
          if (detailIsOpen.current) return;
          if (!radarPrepared && target >= 3) {
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
          const progress = timeline.progress();
          const showCard = progress === 1 && carouselReady.current;
          const showHeading = progress >= 0.7;
          const personalVisible = aboutAnimation.progress() > 0;
          const aboutVisible = personalVisible && state.orbit < 1;
          const contactVisible = personalVisible && state.orbit > 0;
          const stackVisible =
            stackAnimation.progress() > 0 && aboutAnimation.progress() < 1;
          const stackSettled = !busy && settled === 3;
          const aboutSettled = !busy && settled === 4;
          const contactSettled = !busy && settled === 5;
          const galleryCovered = settled >= 3 && target >= 3;
          const backgroundVisible = state.backgroundExit < 1;
          setVisibility(
            backgroundLayer,
            backgroundVisible ? "visible" : "hidden",
          );
          waves.current?.setExitProgress(state.backgroundExit);
          waves.current?.setActive(backgroundVisible);
          // Other scene transitions must not rewrite the inactive camera/planes
          // or trigger their visibility observers on every animation frame.
          if (renderedOrbit !== state.orbit) {
            const orbit = getContactTransition(state.orbit);
            setAboutPlane(orbit.about);
            setContactPlane(orbit.contact);
            radarSurface.style.setProperty(
              "--radar-top-alpha",
              String(orbit.maskTopAlpha),
            );
            radar.current?.setView(orbit.radar);
            renderedOrbit = state.orbit;
          }
          setVisibility(personalLayer, personalVisible ? "visible" : "hidden");
          setAttribute(personalLayer, "aria-hidden", String(!personalVisible));
          setAttribute(radarSurface, "aria-hidden", String(!personalVisible));
          radar.current?.setActive(personalVisible);
          dither.current?.setRevealProgress(state.reveal);
          showcase.current?.setIntroProgress(state.deal);
          showcase.current?.setActive(
            !galleryCovered && (progress >= 0.64 || state.deal > 0),
          );
          if (renderedHeading !== showHeading) {
            setProjectVisibility({ autoAlpha: showHeading ? 1 : 0 });
            renderedHeading = showHeading;
          }
          setVisibility(stackLayer, stackVisible ? "visible" : "hidden");
          setInert(stackLayer, !stackSettled);
          setAttribute(stackLayer, "aria-hidden", String(!stackSettled));
          setVisibility(aboutLayer, aboutVisible ? "visible" : "hidden");
          setInert(aboutLayer, !aboutSettled);
          setAttribute(aboutLayer, "aria-hidden", String(!aboutSettled));
          setVisibility(contactLayer, contactVisible ? "visible" : "hidden");
          setInert(contactLayer, !contactSettled);
          setAttribute(contactLayer, "aria-hidden", String(!contactSettled));
          // Header arrives before the deal; the identical card textures swap only at resolution.
          setVisibility(gallery, showCard ? "" : "hidden");
          setVisibility(canvas.current!, showCard ? "hidden" : "visible");
          particles?.setProgress(
            state.gather,
            state.resolve,
            !showCard && progress >= 0.18,
          );
          setInert(
            projectLayer,
            !showHeading || busy || stackVisible || personalVisible,
          );
          setAttribute(
            projectLayer,
            "aria-hidden",
            String(
              !showHeading || stackSettled || aboutSettled || contactSettled,
            ),
          );
          setAttribute(heroLayer, "aria-hidden", String(progress > 0.5));
          setData(
            projectLayer,
            "carouselState",
            state.deal === 1
              ? "open"
              : state.deal === 0
                ? "closed"
                : target === 2
                  ? "opening"
                  : "closing",
          );
          setData(
            container,
            "sceneStage",
            busy ? "transitioning" : names[settled],
          );
          setData(container, "sceneTarget", names[target]);
          setEnabled(
            !busy &&
              !menuOpen.current &&
              settled === 2 &&
              carouselReady.current,
          );
          syncScroll();
        };
        const finish = (next: SceneStage) => {
          settled = target = next;
          busy = false;
          const hash =
            next === 5
              ? "#contacto"
              : next === 4
                ? "#sobre-mi"
                : next === 3
                  ? "#stack"
                  : next === 2
                    ? "#proyectos"
                    : "";
          window.history.replaceState(
            window.history.state,
            "",
            `${window.location.pathname}${window.location.search}${hash}`,
          );
          renderScene();
          if (restoreSceneFocus || next >= 3) {
            restoreSceneFocus = false;
            // React removes inert before the destination receives keyboard focus.
            focusFrame = requestAnimationFrame(() => {
              if (busy || settled !== next) return;
              const focusTarget =
                next === 5
                  ? contactContent
                  : next === 4
                    ? aboutContent
                    : next === 3
                      ? stackContent
                      : next === 2
                        ? gallery.querySelector<HTMLElement>('[role="region"]')
                        : container;
              if (menuOpen.current) queuedMenuFocus = focusTarget;
              else focusTarget?.focus({ preventScroll: true });
            });
          }
        };
        const timeline = gsap.timeline({
          paused: true,
          defaults: { ease: "none" },
          onUpdate: renderScene,
          onComplete: () => dealAnimation.play(),
          onReverseComplete: () => finish(0),
        });
        const dealAnimation = gsap
          .timeline({
            paused: true,
            onUpdate: renderScene,
            onComplete: () => finish(2),
            onReverseComplete: () => timeline.reverse(),
          })
          .to(state, { deal: 1, duration: 0.9, ease: "none" }, 0)
          .to(
            footer,
            { autoAlpha: 1, y: 0, duration: 0.9, ease: "sine.inOut" },
            0,
          );
        // A separate sheet covers the already-open gallery; its deal never resets.
        const stackAnimation = gsap
          .timeline({
            paused: true,
            onUpdate: renderScene,
            onComplete: () => finish(3),
            onReverseComplete: () => finish(2),
          })
          .to(
            stackLayer,
            { yPercent: 0, duration: 1.1, ease: "power3.inOut" },
            0,
          )
          .to(
            projectLayer,
            { scale: 0.94, yPercent: -3, duration: 1.1, ease: "power3.inOut" },
            0,
          )
          .to(
            stackLayer.querySelector("[data-stack-heading]"),
            {
              y: 0,
              opacity: 1,
              duration: 0.7,
              ease: "power3.out",
            },
            0.35,
          )
          .to(
            stackLayer.querySelectorAll("[data-stack-group]"),
            {
              y: 0,
              opacity: 1,
              duration: 0.55,
              stagger: 0.065,
              ease: "power3.out",
            },
            0.4,
          );
        // A single lateral page turn: the paper and its radar share one plane.
        // The outgoing sheet remains opaque so the gallery never shows through.
        const aboutAnimation = gsap
          .timeline({
            paused: true,
            onUpdate: renderScene,
            onComplete: () => finish(4),
            onReverseComplete: () => finish(3),
          })
          .fromTo(
            stackLayer,
            { xPercent: 0 },
            {
              xPercent: -16,
              duration: 1.08,
              ease: "power3.inOut",
              immediateRender: false,
            },
            0,
          )
          .to(
            personalLayer,
            {
              xPercent: 0,
              duration: 1.08,
              ease: "power3.inOut",
            },
            0,
          )
          .fromTo(
            aboutCopy,
            aboutCopyStart,
            {
              x: 0,
              duration: 1.08,
              ease: "power3.inOut",
              immediateRender: false,
            },
            0,
          );
        const contactAnimation = gsap
          .timeline({
            paused: true,
            onUpdate: renderScene,
            onComplete: () => finish(5),
            onReverseComplete: () => finish(4),
          })
          .to(state, { orbit: 1, duration: 1.25, ease: "power2.inOut" });
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
            settled === 2 &&
            direction === 1 &&
            showcase.current?.hasSelection()
          )
            return;
          if (
            settled === 3 &&
            !explicitNavigation &&
            (direction === 1
              ? !atBottom(stackContent)
              : stackContent.scrollTop > 1)
          )
            return;
          if (
            settled === 4 &&
            !explicitNavigation &&
            (direction === 1
              ? !atBottom(aboutContent)
              : aboutContent.scrollTop > 1)
          )
            return;
          if (
            settled === 5 &&
            (direction === 1 ||
              (!explicitNavigation && contactContent.scrollTop > 1))
          )
            return;
          // Up from a selected card returns to the open gallery first.
          // A later, fresh gesture can take the gallery back to the Hero.
          if (
            settled === 2 &&
            direction === -1 &&
            showcase.current?.closeFocus()
          )
            return;
          const next: SceneStage =
            settled === 5
              ? 4
              : settled === 4
                ? direction === 1
                  ? 5
                  : 3
                : settled === 3
                  ? direction === 1
                    ? 4
                    : 2
                  : direction === 1
                    ? settled === 0
                      ? 2
                      : 3
                    : 0;
          if (next === settled) return;
          restoreSceneFocus =
            focusDestination || container.contains(document.activeElement);
          target = next;
          busy = true;
          setEnabled(false);
          renderScene();
          if (settled === 0) timeline.play();
          else if (next === 0) dealAnimation.reverse();
          else if (next === 5) {
            contactContent.scrollTop = 0;
            contactAnimation.play();
          } else if (settled === 5) contactAnimation.reverse();
          else if (next === 4) {
            aboutContent.scrollTop = 0;
            aboutAnimation.play();
          } else if (settled === 4) aboutAnimation.reverse();
          else if (next === 3) {
            stackContent.scrollTop = 0;
            stackAnimation.play();
          } else stackAnimation.reverse();
        };
        timeline
          .to(
            state,
            { backgroundExit: 1, duration: 0.34, ease: "power2.inOut" },
            0.02,
          )
          .to(
            '[data-hero-layer="fullstack"]',
            {
              x: () => viewport.clientWidth * 1.1,
              autoAlpha: 0,
              duration: 0.23,
              ease: "power2.in",
            },
            0,
          )
          .to(
            '[data-hero-layer="developer"]',
            {
              x: () => -viewport.clientWidth * 1.1,
              autoAlpha: 0,
              duration: 0.25,
              ease: "power2.in",
            },
            0.02,
          )
          .to(
            '[data-hero-layer="signature"]',
            {
              y: () => viewport.clientHeight * 0.5,
              autoAlpha: 0,
              duration: 0.18,
              ease: "power2.in",
            },
            0,
          )
          .to(state, { reveal: 1, duration: 0.15 }, 0)
          .to(
            portrait,
            {
              scale: () => zoom,
              y: () => portraitY,
              duration: 0.2,
              ease: "power1.inOut",
            },
            0,
          )
          .to(
            canvas.current,
            { opacity: particles ? 1 : 0, duration: 0.14 },
            0.2,
          )
          .to(portrait, { autoAlpha: 0, duration: 0.14 }, 0.23)
          .to(state, { gather: 1, duration: 0.24 }, 0.34)
          .to(state, { resolve: 1, duration: 0.17 }, 0.55)
          .to(
            header,
            { autoAlpha: 1, y: 0, duration: 0.16, ease: "sine.inOut" },
            0.56,
          )
          .to({}, { duration: 0.04 }, 0.72);
        timeline.timeScale(timeline.duration() / 1.65);
        const input = createSceneInput({
          element: container,
          isBlocked: () =>
            busy ||
            menuOpen.current ||
            Boolean(showcase.current?.isTransitioning()),
          isDetailOpen: () => detailIsOpen.current,
          handlesDirection: (direction) => {
            if (settled === 5)
              return direction === -1 && contactContent.scrollTop <= 1;
            if (settled === 4)
              return direction === 1
                ? atBottom(aboutContent)
                : aboutContent.scrollTop <= 1;
            if (settled === 3)
              return direction === 1
                ? atBottom(stackContent)
                : stackContent.scrollTop <= 1;
            return !(
              settled === 2 &&
              direction === 1 &&
              showcase.current?.hasSelection()
            );
          },
          onStep: step,
        });
        menuGate.current = (open) => {
          input.resetGesture();
          setEnabled(!open && !busy && settled === 2 && carouselReady.current);
          if (!open && queuedMenuFocus && !busy) {
            queuedMenuFocus.focus({ preventScroll: true });
            queuedMenuFocus = null;
          }
        };
        const placeScene = (next: SceneStage) => {
          // Jump only while the independent scene surface is fully transparent.
          // Reset in reverse order because adjacent timelines share sheet transforms.
          showcase.current?.resetForNavigation();
          contactAnimation.pause().progress(0, true);
          aboutAnimation.pause().progress(0, true);
          stackAnimation.pause().progress(0, true);
          dealAnimation.pause().progress(0, true);
          timeline.pause().progress(0, true);
          if (next >= 2) {
            timeline.progress(1, true);
            dealAnimation.progress(1, true);
          }
          if (next >= 3) stackAnimation.progress(1, true);
          if (next >= 4) aboutAnimation.progress(1, true);
          if (next === 5) contactAnimation.progress(1, true);
          if (next === 3) stackContent.scrollTop = 0;
          if (next === 4) aboutContent.scrollTop = 0;
          if (next === 5) contactContent.scrollTop = 0;
          settled = target = next;
          renderedOrbit = NaN;
          renderScene();
        };
        menuNavigate.current = (section) => {
          const next = (
            { hero: 0, projects: 2, stack: 3, about: 4, contact: 5 } as const
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
            menuAnimation?.kill();
            menuAnimation = gsap
              .timeline({
                onComplete: () => {
                  menuAnimation = null;
                  finish(next);
                  input.resetGesture();
                  resolveMenu?.();
                  resolveMenu = null;
                },
              })
              .to(
                surface.current,
                {
                  y: -32 * direction,
                  opacity: 0,
                  duration: 0.24,
                  ease: "power2.in",
                },
                0,
              )
              .call(() => placeScene(next), undefined, 0.24)
              .fromTo(
                surface.current,
                { y: 32 * direction, opacity: 0 },
                {
                  y: 0,
                  opacity: 1,
                  duration: 0.5,
                  ease: "power3.out",
                  immediateRender: false,
                },
                0.3,
              );
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
          if (link.hasAttribute("data-stack-open") && settled === 2)
            step(1, true);
          else if (link.hasAttribute("data-stack-back") && settled === 3)
            step(-1, true, true);
          else if (link.hasAttribute("data-about-open") && settled === 3)
            step(1, true, true);
          else if (link.hasAttribute("data-about-back") && settled === 4)
            step(-1, true, true);
          else if (link.hasAttribute("data-contact-open") && settled === 4)
            step(1, true, true);
          else if (link.hasAttribute("data-contact-back") && settled === 5)
            step(-1, true, true);
        };
        container.addEventListener("click", navigateSection);
        syncScene.current = renderScene;
        detailMode.current = (open) => {
          input.resetGesture();
          if (!open) renderScene();
        };
        // Scrollbar/assistive navigation requests the same complete transition.
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
          // These sections own native inner scrollports. Focus or resize must
          // not turn a document adjustment into a request to leave the section.
          if (settled >= 3) return;
          if (!nativeGesture.consumed) {
            nativeGesture.consumed = true;
            step(direction);
          }
        };
        const scheduleResize = () => {
          cancelAnimationFrame(resizeFrame);
          resizeFrame = requestAnimationFrame(() => {
            const progress = timeline.progress();
            measure();
            timeline.progress(0, true).invalidate().progress(progress, true);
            const aboutProgress = aboutAnimation.progress();
            if (aboutProgress > 0)
              aboutAnimation
                .progress(0, true)
                .invalidate()
                .progress(aboutProgress, true);
            else aboutAnimation.invalidate();
            gsap.set([aboutLayer, contactLayer], {
              transformPerspective: viewport.clientHeight * 2,
            });
            renderedOrbit = NaN;
            renderScene();
          });
        };
        const resize = new ResizeObserver(scheduleResize);
        resize.observe(viewport);
        window.addEventListener("resize", scheduleResize);
        window.addEventListener("scroll", nativeScroll, { passive: true });
        if (
          detailIsOpen.current ||
          ["#proyectos", "#stack", "#sobre-mi", "#contacto"].includes(
            window.location.hash,
          )
        ) {
          timeline.progress(1, true);
          dealAnimation.progress(1, true);
          settled = target = 2;
          if (
            ["#stack", "#sobre-mi", "#contacto"].includes(
              window.location.hash,
            ) &&
            !detailIsOpen.current
          ) {
            stackAnimation.progress(1, true);
            settled = target = 3;
            if (["#sobre-mi", "#contacto"].includes(window.location.hash)) {
              aboutAnimation.progress(1, true);
              settled = target = 4;
            }
            if (window.location.hash === "#contacto") {
              contactAnimation.progress(1, true);
              settled = target = 5;
            }
            focusFrame = requestAnimationFrame(() =>
              (settled === 5
                ? contactContent
                : settled === 4
                  ? aboutContent
                  : stackContent
              ).focus({
                preventScroll: true,
              }),
            );
          }
        }
        renderScene();
        return () => {
          menuAnimation?.kill();
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
          dealAnimation.kill();
          stackAnimation.kill();
          aboutAnimation.kill();
          contactAnimation.kill();
          particles?.destroy();
          syncScene.current = () => {};
          detailMode.current = () => {};
          setParticleProject.current = () => {};
          delete container.dataset.scrollStory;
          delete container.dataset.sceneStage;
          delete container.dataset.sceneTarget;
          delete projectLayer.dataset.carouselState;
          projectLayer.inert = false;
          projectLayer.removeAttribute("aria-hidden");
          heroLayer.removeAttribute("aria-hidden");
          backgroundLayer.style.visibility = "";
          waves.current?.setExitProgress(0);
          waves.current?.setActive(true);
          stackLayer.inert = false;
          stackLayer.removeAttribute("aria-hidden");
          stackLayer.style.visibility = "";
          aboutLayer.inert = false;
          aboutLayer.removeAttribute("aria-hidden");
          aboutLayer.style.visibility = "";
          contactLayer.inert = false;
          contactLayer.removeAttribute("aria-hidden");
          contactLayer.style.visibility = "";
          personalLayer.removeAttribute("aria-hidden");
          personalLayer.style.visibility = "";
          radarSurface.removeAttribute("aria-hidden");
          radarSurface.style.removeProperty("--radar-top-alpha");
          radar.current?.setView(OVERHEAD_VIEW);
          radar.current?.setActive(true);
          gallery.style.visibility = "";
          dither.current?.setRevealProgress(0);
          showcase.current?.setIntroProgress(1);
          showcase.current?.setInteractionEnabled(true);
        };
      });
      return () => media.revert();
    },
    { scope: root, dependencies: [ready], revertOnUpdate: true },
  );

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
          <canvas
            ref={canvas}
            className={styles.particles}
            aria-hidden="true"
          />
          <div className={styles.projects} data-project-layer>
            <ProjectShowcase
              ref={showcase}
              onProjectChange={(index) => {
                selectedProject.current = index;
                setParticleProject.current(index);
              }}
              onDetailChange={(open) => {
                detailIsOpen.current = open;
                detailMode.current(open);
              }}
              onReady={() => {
                carouselReady.current = true;
                syncScene.current();
              }}
            />
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
