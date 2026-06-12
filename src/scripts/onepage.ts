/* GSAP engine for the one-page home.
   Everything is idempotent (guarded by data flags) so astro:page-load
   re-runs don't double-bind. Reduced motion gets content with no tricks. */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { SplitText } from "gsap/SplitText";
import { TextPlugin } from "gsap/TextPlugin";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, SplitText, TextPlugin);

// Mobile URL-bar show/hide fires resize events; ignoring them avoids
// expensive ScrollTrigger refreshes (and visible jank) mid-scroll.
ScrollTrigger.config({ ignoreMobileResize: true });

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
    /* desktop-only: delay the wipe to a later point of the cover zone */
    coverStart?: string;
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
    // Revealed behind the giant companion spark (see initScrollCompanion):
    // a circle opens while the screen is covered by the grown spark.
    stack: {
        from: "circle(0% at 50% 50%)",
        to: "circle(150% at 50% 50%)",
        coverStart: "top 45%",
    },
    // Vertical doors opening onto the terminal room.
    ia: {
        from: "inset(0% 50% 0% 50%)",
        to: "inset(0% 0% 0% 0%)",
    },
    // Slanted sweep left → right, like the timeline advancing.
    experiencia: {
        from: "polygon(0% 0%, 16% 0%, 1% 100%, 0% 100%)",
        to: "polygon(0% 0%, 116% 0%, 101% 100%, 0% 100%)",
    },
    // Diagonal light-beam widening until it fills the frame.
    proyectos: {
        from: "polygon(82% 0%, 100% 0%, 18% 100%, 0% 100%)",
        to: "polygon(-100% 0%, 200% 0%, 100% 100%, -200% 100%)",
    },
    // Cut to black, then a widescreen letterbox opens on the finale.
    contacto: {
        from: "inset(49.8% 0% 49.8% 0%)",
        to: "inset(0% 0% 0% 0%)",
        coverStart: "top 65%",
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
                    anticipatePin: 1,
                    // Resting mid-cut finishes the edit, like a video.
                    snap: {
                        snapTo: [0, 1],
                        duration: { min: 0.5, max: 1 },
                        ease: "power3.inOut",
                        delay: 0.06,
                    },
                });

                // The frozen frame sinks into black under the new scene.
                // A SOLID black veil on top — never element opacity, which
                // would let older stacked scenes show through.
                // Before the finale it goes fully black: cut → letterbox.
                let veil = scene.querySelector<HTMLElement>(".scene-veil");
                if (!veil) {
                    veil = document.createElement("div");
                    veil.className = "scene-veil";
                    veil.setAttribute("aria-hidden", "true");
                    scene.appendChild(veil);
                }
                gsap.fromTo(
                    veil,
                    { opacity: 0 },
                    {
                        opacity: next.id === "contacto" ? 1 : 0.82,
                        ease: "none",
                        scrollTrigger: {
                            trigger: next,
                            start: "top bottom",
                            end:
                                next.id === "contacto"
                                    ? "top 55%"
                                    : "top top",
                            scrub: 0.6,
                        },
                    },
                );
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
                            start: wipe.coverStart ?? "top bottom",
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

/* ── Scroll companion: a spark that travels the page with intent ──
   It rests at a meaningful spot per scene (beside the hero title, by the
   tech counter, at the terminal, along the timeline…), glides between
   them as scenes change, and — for the hero→stack cut — IT becomes the
   transition: flies to centre, swells until it swallows the screen while
   shifting colour, the next scene opens beneath it, and it pops back out
   of the "34" counter. */

const BUDDY_COLOR = "#FFFF00";

/* Viewport-fraction anchor per scene */
const BUDDY_ANCHORS: Record<string, { x: number; y: number }> = {
    inicio: { x: 0.16, y: 0.24 }, // escorting the headline
    stack: { x: 0.88, y: 0.165 }, // sitting on the tech counter
    ia: { x: 0.685, y: 0.165 }, // perched on the terminal
    experiencia: { x: 0.1, y: 0.3 }, // riding the timeline
    proyectos: { x: 0.86, y: 0.26 }, // hovering by the title
    contacto: { x: 0.5, y: 0.14 }, // crowning "Hablemos."
};

function initScrollCompanion() {
    if (!document.querySelector("[data-onepage]")) return;
    if (document.querySelector(".scroll-buddy")) return;

    const buddy = document.createElement("div");
    buddy.className = "scroll-buddy";
    buddy.setAttribute("aria-hidden", "true");
    buddy.innerHTML = `
        <div class="scroll-buddy-trail"></div>
        <div class="scroll-buddy-core">
            <svg viewBox="0 0 24 24" fill="none"><path fill="currentColor" d="M12 1.5l1.91 6.16a2 2 0 0 0 1.32 1.32l6.16 1.91a1.16 1.16 0 0 1 0 2.22l-6.16 1.91a2 2 0 0 0-1.32 1.32L12 22.5a1.16 1.16 0 0 1-2.22 0l-1.91-6.16a2 2 0 0 0-1.32-1.32L.39 13.11a1.16 1.16 0 0 1 0-2.22l6.16-1.91a2 2 0 0 0 1.32-1.32L9.78 1.5a1.16 1.16 0 0 1 2.22 0Z"/></svg>
        </div>`;
    document.body.appendChild(buddy);
    const core = buddy.querySelector<HTMLElement>(".scroll-buddy-core");

    const xTo = gsap.quickTo(buddy, "x", { duration: 0.7, ease: "power2.out" });
    const yTo = gsap.quickTo(buddy, "y", { duration: 0.7, ease: "power2.out" });
    const rotTo = gsap.quickTo(buddy, "rotation", {
        duration: 0.45,
        ease: "power2.out",
    });
    const sxTo = gsap.quickTo(buddy, "scaleX", {
        duration: 0.35,
        ease: "power2.out",
    });
    const syTo = gsap.quickTo(buddy, "scaleY", {
        duration: 0.35,
        ease: "power2.out",
    });
    const waveTweens = [xTo, yTo, rotTo, sxTo, syTo];

    // Keeps dancing on its own while you rest (separate percent channel).
    gsap.to(buddy, {
        yPercent: 16,
        duration: 1.7,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
    });
    if (core) {
        gsap.to(core, { rotation: 360, duration: 16, ease: "none", repeat: -1 });
    }

    /* Scene anchor stops in document space (recomputed on refresh) */
    interface Stop {
        top: number;
        x: number;
        y: number;
    }
    let stops: Stop[] = [];
    const computeStops = () => {
        stops = SCENE_ORDER.flatMap((id) => {
            const el = document.getElementById(id);
            const anchor = BUDDY_ANCHORS[id];
            if (!el || !anchor) return [];
            const rect = el.getBoundingClientRect();
            return [{ top: rect.top + window.scrollY, x: anchor.x, y: anchor.y }];
        });
    };
    computeStops();
    ScrollTrigger.addEventListener("refresh", computeStops);

    // Hold the anchor for most of the scene, glide near the boundary.
    const glideEase = gsap.parseEase("power2.inOut");
    const glide = (t: number) =>
        glideEase(gsap.utils.clamp(0, 1, (t - 0.55) / 0.45));

    const place = (scroll: number) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (stops.length === 0) return { x: vw / 2, y: vh * 0.2 };

        let index = 0;
        while (index < stops.length - 1 && scroll >= stops[index + 1].top) {
            index++;
        }
        const current = stops[index];
        const next = stops[Math.min(index + 1, stops.length - 1)];
        const span = Math.max(next.top - current.top, 1);
        const t = glide((scroll - current.top) / span);

        // Anchored position + a gentle living wobble.
        const x =
            gsap.utils.interpolate(current.x, next.x, t) * vw +
            Math.sin(scroll * 0.011) * vw * 0.018;
        const y =
            gsap.utils.interpolate(current.y, next.y, t) * vh +
            Math.cos(scroll * 0.009) * vh * 0.02;
        return { x, y };
    };

    // Settle back to calm when scrolling stops.
    const settle = gsap.delayedCall(0.18, () => {
        rotTo(0);
        sxTo(1);
        syTo(1);
    });

    let busy = false; // true while the spark IS the hero→stack transition

    ScrollTrigger.create({
        trigger: document.body,
        start: "top top",
        end: "max",
        onUpdate: (self) => {
            if (busy) return;
            const { x, y } = place(self.scroll());
            const velocity = gsap.utils.clamp(-3000, 3000, self.getVelocity());
            const speed = Math.min(Math.abs(velocity) / 3200, 1);
            const lean = (velocity >= 0 ? 1 : -1) * speed;
            xTo(x);
            yTo(y);
            rotTo(lean * 24);
            sxTo(1 + speed * 0.45);
            syTo(1 - speed * 0.26);
            settle.restart(true);
        },
    });

    /* The hero→stack cut: the spark swallows the screen (desktop, where
       the cover system runs; mobile keeps the simple anchor glide). */
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
        const stack = document.getElementById("stack");
        if (!stack || !core) return;

        const stackAnchor = () => ({
            x: BUDDY_ANCHORS.stack.x * window.innerWidth,
            y: BUDDY_ANCHORS.stack.y * window.innerHeight,
        });

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: stack,
                start: "top bottom",
                end: "top top",
                scrub: 0.6,
                invalidateOnRefresh: true,
                onToggle: (self) => {
                    busy = self.isActive;
                    if (busy) {
                        settle.pause();
                        waveTweens.forEach((fn) => fn.tween?.pause());
                    }
                },
            },
        });

        tl
            // 1 · fly to centre stage, charging up
            .to(
                buddy,
                {
                    x: () => window.innerWidth / 2,
                    y: () => window.innerHeight * 0.46,
                    scale: 5,
                    rotation: 200,
                    duration: 0.4,
                    ease: "power2.in",
                },
                0,
            )
            .to(core, { color: "#60A5FA", duration: 0.3 }, 0.08)
            // 2 · swell until it swallows the screen, darkening to the bg
            .to(
                buddy,
                {
                    scale: 200,
                    rotation: 380,
                    duration: 0.38,
                    ease: "power3.in",
                },
                0.4,
            )
            .to(core, { color: "#101114", duration: 0.22 }, 0.5)
            // 3 · the new scene is open beneath — the giant fades away
            .to(buddy, { autoAlpha: 0, duration: 0.08, ease: "none" }, 0.78)
            // 4 · rebirth: pops out of the "34" tech counter, yellow again
            .set(core, { color: BUDDY_COLOR }, 0.86)
            .set(
                buddy,
                {
                    scale: 0,
                    rotation: -240,
                    x: () => stackAnchor().x,
                    y: () => stackAnchor().y,
                },
                0.86,
            )
            .to(
                buddy,
                {
                    autoAlpha: 1,
                    scale: 1,
                    rotation: 0,
                    duration: 0.14,
                    ease: "back.out(2.2)",
                },
                0.86,
            );
    });

    // Start escorting the headline, fade in.
    const start = place(0);
    gsap.set(buddy, { x: start.x, y: start.y, autoAlpha: 0 });
    gsap.to(buddy, { autoAlpha: 1, duration: 1.2, delay: 0.8 });
}

/* ── 3D tilt cards (project teasers) ── */
function initTilt() {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((card) => {
        if (card.dataset.tiltBound === "true") return;
        card.dataset.tiltBound = "true";

        gsap.set(card, { transformPerspective: 900 });
        const rotX = gsap.quickTo(card, "rotationX", {
            duration: 0.5,
            ease: "power3",
        });
        const rotY = gsap.quickTo(card, "rotationY", {
            duration: 0.5,
            ease: "power3",
        });
        const scale = gsap.quickTo(card, "scale", {
            duration: 0.4,
            ease: "power3",
        });

        card.addEventListener("mousemove", (event) => {
            const rect = card.getBoundingClientRect();
            const px = (event.clientX - rect.left) / rect.width;
            const py = (event.clientY - rect.top) / rect.height;
            rotY((px - 0.5) * 10);
            rotX((0.5 - py) * 10);
            scale(1.02);
            card.style.setProperty("--px", `${px * 100}%`);
            card.style.setProperty("--py", `${py * 100}%`);
        });
        card.addEventListener("mouseleave", () => {
            rotX(0);
            rotY(0);
            scale(1);
        });
    });
}

/* ── Magnetic buttons ── */
function initMagnetic() {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
        if (el.dataset.magneticBound === "true") return;
        el.dataset.magneticBound = "true";

        // xPercent/yPercent: separate GSAP channels from the x/y used by the
        // entrance reveals, so hovering never hijacks a pending reveal.
        const strength = 10;
        const xTo = gsap.quickTo(el, "xPercent", {
            duration: 0.25,
            ease: "power2.out",
        });
        const yTo = gsap.quickTo(el, "yPercent", {
            duration: 0.25,
            ease: "power2.out",
        });

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
    initTilt();
    initScrollCompanion();

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
