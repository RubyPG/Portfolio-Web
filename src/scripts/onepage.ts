/* GSAP engine for the one-page home.
   Everything is idempotent (guarded by data flags) so astro:page-load
   re-runs don't double-bind. Reduced motion gets content with no tricks. */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { SplitText } from "gsap/SplitText";
import { TextPlugin } from "gsap/TextPlugin";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, SplitText, TextPlugin);

const NAV_OFFSET = 64;
const prefersReduced = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Make everything visible immediately (no-JS fallback is handled by the
   inline script only adding the hiding class when JS runs). */
function revealAll() {
    document
        .querySelectorAll<HTMLElement>("[data-fouc]")
        .forEach((el) => gsap.set(el, { clearProps: "all", autoAlpha: 1 }));
}

/* SplitText pieces inherit color:transparent from gradient-clipped parents
   but not the background, leaving invisible text. Re-apply the gradient on
   every piece so per-char/word animation keeps the clip effect. */
function inheritTextGradient(parent: HTMLElement, pieces: Element[]) {
    const cs = getComputedStyle(parent);
    const clipsText =
        cs.getPropertyValue("-webkit-background-clip") === "text" ||
        cs.getPropertyValue("background-clip") === "text";
    if (!clipsText || cs.backgroundImage === "none") return;

    pieces.forEach((piece) => {
        if (!(piece instanceof HTMLElement)) return;
        piece.style.backgroundImage = cs.backgroundImage;
        piece.style.setProperty("-webkit-background-clip", "text");
        piece.style.setProperty("background-clip", "text");
        piece.style.color = "transparent";
    });
}

/* ── Smooth anchor navigation (works on every page) ── */
function initAnchorNav() {
    document
        .querySelectorAll<HTMLAnchorElement>("a[href*='#']")
        .forEach((link) => {
            if (link.dataset.anchorBound === "true") return;
            link.dataset.anchorBound = "true";

            link.addEventListener("click", (event) => {
                const url = new URL(link.href, window.location.href);
                if (
                    url.pathname !== window.location.pathname ||
                    !url.hash ||
                    url.hash === "#"
                ) {
                    return;
                }
                const target = document.querySelector(url.hash);
                if (!target) return;

                event.preventDefault();
                history.pushState(null, "", url.hash);
                gsap.to(window, {
                    duration: prefersReduced() ? 0 : 1.1,
                    ease: "power3.inOut",
                    scrollTo: { y: target, offsetY: NAV_OFFSET },
                });
            });
        });
}

/* ── Scrollspy: highlight nav + chapter links for the section in view ── */
function initScrollSpy() {
    const links = Array.from(
        document.querySelectorAll<HTMLAnchorElement>("[data-spy-link]"),
    );
    if (links.length === 0) return;

    const setActive = (id: string | null) => {
        links.forEach((link) => {
            const match = link.dataset.spyLink === id;
            link.classList.toggle("nav-link-active", match);
            link.setAttribute("aria-current", match ? "true" : "false");
        });
    };

    document
        .querySelectorAll<HTMLElement>("[data-spy-section]")
        .forEach((section) => {
            ScrollTrigger.create({
                trigger: section,
                start: "top 45%",
                end: "bottom 45%",
                onToggle: (self) => {
                    if (self.isActive) setActive(section.id);
                },
            });
        });
}

/* ── Cinematic scene system ──
   Desktop: every section is a full-viewport "scene". When you scroll on,
   the current scene freezes in place (pin without spacing) and the next
   one covers it through its own unique wipe; a scroll snap completes
   half-finished cuts, so the page reads as a sequence of edits, not a
   scroll. Mobile keeps the wipes as lightweight entrance reveals. */

interface SceneWipe {
    from: string;
    to: string;
}

const SCENE_ORDER = [
    "inicio",
    "stack",
    "ia",
    "experiencia",
    "proyectos",
    "contacto",
];

const SCENE_WIPES: Record<string, SceneWipe> = {
    // Card rising over the frozen hero, corners rounding away.
    stack: {
        from: "inset(8% 7% 14% 7% round 2.5rem)",
        to: "inset(0% 0% 0% 0% round 0rem)",
    },
    // Vertical doors opening onto the terminal room.
    ia: {
        from: "inset(0% 50% 0% 50%)",
        to: "inset(0% 0% 0% 0%)",
    },
    // Iris opening from the start of the timeline.
    experiencia: {
        from: "circle(7% at 18% 14%)",
        to: "circle(142% at 18% 14%)",
    },
    // Diagonal sweep, like a film wipe.
    proyectos: {
        from: "polygon(0% 120%, 100% 100%, 100% 120%, 0% 140%)",
        to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    },
    // Widescreen letterbox opening for the finale.
    contacto: {
        from: "inset(49.8% 0% 49.8% 0%)",
        to: "inset(0% 0% 0% 0%)",
    },
};

function initCinematicTransitions() {
    const scenes = SCENE_ORDER.map((id) => document.getElementById(id)).filter(
        (el): el is HTMLElement => el !== null,
    );
    const hero = document.getElementById("inicio");
    const mm = gsap.matchMedia();

    if (scenes.length > 1) {
        mm.add("(min-width: 1024px)", () => {
            scenes.forEach((scene, index) => {
                const next = scenes[index + 1];
                if (!next) return;

                // Freeze the outgoing scene while the next covers it.
                ScrollTrigger.create({
                    trigger: next,
                    start: "top bottom",
                    end: "top top",
                    pin: scene,
                    pinSpacing: false,
                    // Resting mid-cut finishes the edit, like a video.
                    snap: {
                        snapTo: [0, 1],
                        duration: { min: 0.4, max: 0.85 },
                        ease: "power3.inOut",
                        delay: 0.06,
                    },
                });

                // The frozen frame sinks into black under the new scene.
                gsap.to(scene, {
                    opacity: 0.22,
                    ease: "none",
                    scrollTrigger: {
                        trigger: next,
                        start: "top bottom",
                        end: "top top",
                        scrub: 0.6,
                    },
                });
            });

            // Unique entrance wipe per scene, spanning the exact cover zone
            // so the previous frame stays visible through the mask.
            scenes.forEach((scene) => {
                const wipe = SCENE_WIPES[scene.id];
                if (!wipe) return;
                gsap.fromTo(
                    scene,
                    { clipPath: wipe.from },
                    {
                        clipPath: wipe.to,
                        ease: "none",
                        scrollTrigger: {
                            trigger: scene,
                            start: "top bottom",
                            end: "top top",
                            scrub: 0.6,
                        },
                    },
                );
            });

            // Hero flourish while being covered.
            if (hero) {
                const content = hero.querySelector("[data-hero-content]");
                const bg = hero.querySelector("[data-hero-bg]");
                const cover = {
                    ease: "none" as const,
                    scrollTrigger: {
                        trigger: "#stack",
                        start: "top bottom",
                        end: "top top",
                        scrub: 0.6,
                    },
                };
                if (content) {
                    gsap.to(content, { yPercent: -10, scale: 0.95, ...cover });
                }
                if (bg) {
                    gsap.to(bg, { scale: 1.12, ...cover });
                }
            }
        });

        mm.add("(max-width: 1023px)", () => {
            scenes.forEach((scene) => {
                const wipe = SCENE_WIPES[scene.id];
                if (!wipe) return;
                gsap.fromTo(
                    scene,
                    { clipPath: wipe.from },
                    {
                        clipPath: wipe.to,
                        ease: "none",
                        scrollTrigger: {
                            trigger: scene,
                            start: "top 95%",
                            end: "top 25%",
                            scrub: 0.7,
                        },
                    },
                );
            });

            if (hero) {
                const content = hero.querySelector("[data-hero-content]");
                if (content) {
                    gsap.to(content, {
                        yPercent: -14,
                        autoAlpha: 0.18,
                        ease: "none",
                        scrollTrigger: {
                            trigger: hero,
                            start: "top top",
                            end: "bottom 35%",
                            scrub: 0.6,
                        },
                    });
                }
            }
        });
    }

    // Film-style progress bar under the navbar (every page).
    if (!document.querySelector(".page-progress")) {
        const bar = document.createElement("div");
        bar.className = "page-progress";
        bar.setAttribute("aria-hidden", "true");
        document.body.appendChild(bar);
        gsap.to(bar, {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
                trigger: document.body,
                start: "top top",
                end: "max",
                scrub: 0.4,
            },
        });
    }
}

/* ── Hero: split-text intro and counters ── */
function initHero() {
    const hero = document.querySelector<HTMLElement>("#inicio");
    if (!hero) return;

    const lines = hero.querySelectorAll<HTMLElement>("[data-hero-line]");
    const intro = gsap.timeline({ defaults: { ease: "power4.out" } });

    lines.forEach((line) => {
        const split = new SplitText(line, { type: "chars" });
        inheritTextGradient(line, split.chars);
        gsap.set(line, { autoAlpha: 1 });
        intro.from(
            split.chars,
            {
                yPercent: 120,
                rotateX: -75,
                autoAlpha: 0,
                stagger: 0.028,
                duration: 1.05,
            },
            "<0.12",
        );
    });

    intro.from(
        hero.querySelectorAll("[data-hero-item]"),
        { y: 28, autoAlpha: 0, stagger: 0.09, duration: 0.8 },
        "-=0.55",
    );

    // Counters
    hero.querySelectorAll<HTMLElement>("[data-count-to]").forEach((el) => {
        const target = Number(el.dataset.countTo ?? "0");
        const suffix = el.dataset.countSuffix ?? "";
        const proxy = { value: 0 };
        intro.to(
            proxy,
            {
                value: target,
                duration: 1.4,
                ease: "power2.out",
                onUpdate: () => {
                    el.textContent = `${Math.round(proxy.value)}${suffix}`;
                },
            },
            "-=0.8",
        );
    });
}

/* ── Section titles: split words on enter ── */
function initSectionTitles() {
    document.querySelectorAll<HTMLElement>("[data-st-title]").forEach((el) => {
        const split = new SplitText(el, { type: "words" });
        inheritTextGradient(el, split.words);
        gsap.set(el, { autoAlpha: 1 });
        gsap.from(split.words, {
            yPercent: 110,
            autoAlpha: 0,
            stagger: 0.05,
            duration: 0.9,
            ease: "power4.out",
            scrollTrigger: { trigger: el, start: "top 88%" },
        });
    });
}

/* ── Generic reveals: [data-reveal] staggered within [data-reveal-group] ── */
function initReveals() {
    document
        .querySelectorAll<HTMLElement>("[data-reveal-group]")
        .forEach((group) => {
            const items = group.querySelectorAll("[data-reveal]");
            if (items.length === 0) return;
            gsap.from(items, {
                y: 34,
                autoAlpha: 0,
                stagger: 0.1,
                duration: 0.85,
                ease: "power3.out",
                scrollTrigger: { trigger: group, start: "top 85%" },
            });
        });

    document
        .querySelectorAll<HTMLElement>(
            "[data-reveal]:not([data-reveal-group] [data-reveal])",
        )
        .forEach((el) => {
            gsap.from(el, {
                y: 34,
                autoAlpha: 0,
                duration: 0.85,
                ease: "power3.out",
                scrollTrigger: { trigger: el, start: "top 88%" },
            });
        });
}

/* ── Stack: pinned horizontal rail on desktop ── */
function initStackRail() {
    const section = document.querySelector<HTMLElement>("#stack");
    const pin = section?.querySelector<HTMLElement>("[data-stack-pin]");
    const track = section?.querySelector<HTMLElement>("[data-stack-track]");
    if (!section || !pin || !track) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px)", () => {
        const distance = () => track.scrollWidth - pin.clientWidth;
        if (distance() <= 0) return;

        const tween = gsap.to(track, {
            x: () => -distance(),
            ease: "none",
            scrollTrigger: {
                trigger: section,
                start: "top top",
                end: () => `+=${distance()}`,
                pin,
                // The section keeps a clip-path from its entrance wipe, which
                // would hijack position:fixed — reparent the pin to <body>.
                pinReparent: true,
                scrub: 1,
                invalidateOnRefresh: true,
                anticipatePin: 1,
                onUpdate: (self) => {
                    const bar = section.querySelector<HTMLElement>(
                        "[data-stack-progress]",
                    );
                    if (bar) bar.style.transform = `scaleX(${self.progress})`;
                },
            },
        });

        // Slight per-panel parallax for depth
        track
            .querySelectorAll<HTMLElement>("[data-stack-panel-inner]")
            .forEach((inner, index) => {
                gsap.fromTo(
                    inner,
                    { x: index === 0 ? 0 : 60 },
                    {
                        x: 0,
                        ease: "none",
                        scrollTrigger: {
                            containerAnimation: tween,
                            trigger: inner,
                            start: "left right",
                            end: "left center",
                            scrub: true,
                        },
                    },
                );
            });
    });

    mm.add("(max-width: 1023px)", () => {
        gsap.from(track.querySelectorAll("[data-stack-panel]"), {
            y: 44,
            autoAlpha: 0,
            stagger: 0.12,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: track, start: "top 85%" },
        });
    });
}

/* ── AI terminal: type lines when the section enters ── */
function initTerminal() {
    const terminal = document.querySelector<HTMLElement>("[data-terminal]");
    if (!terminal || terminal.dataset.typed === "true") return;
    terminal.dataset.typed = "true";

    const lines = Array.from(
        terminal.querySelectorAll<HTMLElement>("[data-terminal-line]"),
    );
    const tl = gsap.timeline({
        scrollTrigger: { trigger: terminal, start: "top 78%" },
    });

    lines.forEach((line) => {
        const text = line.dataset.text ?? "";
        const target = line.querySelector<HTMLElement>("[data-terminal-text]");
        if (!target) return;
        const isPrompt = line.dataset.prompt === "true";
        tl.set(line, { autoAlpha: 1 });
        tl.to(target, {
            text,
            duration: isPrompt ? Math.min(text.length * 0.028, 1.6) : 0.35,
            ease: "none",
        });
        tl.to({}, { duration: isPrompt ? 0.25 : 0.4 });
    });
}

/* ── Experience timeline: draw line + reveal entries ── */
function initTimeline() {
    const wrap = document.querySelector<HTMLElement>("[data-timeline]");
    if (!wrap) return;

    const line = wrap.querySelector<HTMLElement>("[data-timeline-line]");
    if (line) {
        gsap.fromTo(
            line,
            { scaleY: 0 },
            {
                scaleY: 1,
                transformOrigin: "top center",
                ease: "none",
                scrollTrigger: {
                    trigger: wrap,
                    start: "top 75%",
                    end: "bottom 55%",
                    scrub: 0.8,
                },
            },
        );
    }

    wrap.querySelectorAll<HTMLElement>("[data-timeline-item]").forEach(
        (item) => {
            gsap.from(item, {
                x: -36,
                autoAlpha: 0,
                duration: 0.8,
                ease: "power3.out",
                scrollTrigger: { trigger: item, start: "top 85%" },
            });
        },
    );
}

/* ── Giant scrub marquees (outline display text) ── */
function initMarquees() {
    document.querySelectorAll<HTMLElement>("[data-marquee]").forEach((el) => {
        const direction = el.dataset.marquee === "right" ? 1 : -1;
        gsap.fromTo(
            el,
            { xPercent: direction * 8 },
            {
                xPercent: direction * -8,
                ease: "none",
                scrollTrigger: {
                    trigger: el,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 0.8,
                },
            },
        );
    });
}

/* ── Magnetic buttons ── */
function initMagnetic() {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
        if (el.dataset.magneticBound === "true") return;
        el.dataset.magneticBound = "true";

        const strength = 22;
        const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3" });
        const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3" });

        el.addEventListener("mousemove", (event) => {
            const rect = el.getBoundingClientRect();
            const relX = event.clientX - (rect.left + rect.width / 2);
            const relY = event.clientY - (rect.top + rect.height / 2);
            xTo((relX / rect.width) * strength);
            yTo((relY / rect.height) * strength);
        });
        el.addEventListener("mouseleave", () => {
            xTo(0);
            yTo(0);
        });
    });
}

function init() {
    if (prefersReduced()) {
        revealAll();
        document
            .querySelectorAll<HTMLElement>("[data-terminal-line]")
            .forEach((line) => {
                const target = line.querySelector<HTMLElement>(
                    "[data-terminal-text]",
                );
                if (target) target.textContent = line.dataset.text ?? "";
                gsap.set(line, { autoAlpha: 1 });
            });
        initAnchorNav();
        return;
    }

    initAnchorNav();
    initMagnetic();

    // Lift the CSS FOUC guard with inline styles BEFORE building tweens, so
    // gsap.from() captures visible end states. from() re-hides them instantly.
    gsap.set("[data-fouc]", { autoAlpha: 1 });

    // Each init is a no-op when its elements aren't on the page.
    initHero();
    initStackRail();
    initCinematicTransitions();
    initSectionTitles();
    initReveals();
    initTerminal();
    initTimeline();
    initMarquees();
    initScrollSpy();

    // Recompute pin distances once everything (fonts, WebGL canvas) settles.
    window.addEventListener("load", () => ScrollTrigger.refresh(), {
        once: true,
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
    init();
}
