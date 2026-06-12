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

// Debug handle (used by the smoke tests; negligible cost)
(window as unknown as { __ST?: typeof ScrollTrigger }).__ST = ScrollTrigger;

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

/* Create (once) a full-screen overlay element appended to <body> */
function ensureOverlay(className: string, html = ""): HTMLElement {
    let el = document.querySelector<HTMLElement>(`.${className}`);
    if (!el) {
        el = document.createElement("div");
        el.className = className;
        el.setAttribute("aria-hidden", "true");
        if (html) el.innerHTML = html;
        document.body.appendChild(el);
    }
    return el;
}

/* ── Anchor navigation ──
   Short hops scroll smoothly; long jumps (chapter nav) "warp": dip to
   black, land instantly, fade back in — instead of replaying every scene
   transition at full speed. */
function initAnchorNav() {
    const warpTo = (targetY: number, hash: string) => {
        const veil = ensureOverlay("warp-veil");
        gsap.timeline()
            .to(veil, { autoAlpha: 1, duration: 0.22, ease: "power1.in" })
            .add(() => {
                window.scrollTo(0, targetY);
                history.pushState(null, "", hash);
            })
            // hold black a beat so scrubbed scenes settle into place
            .to({}, { duration: 0.32 })
            .to(veil, { autoAlpha: 0, duration: 0.5, ease: "power1.out" });
    };

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

                // offsetTop chain ignores transforms — pinned scenes keep a
                // leftover translate that makes getBoundingClientRect lie.
                let layoutTop = 0;
                let node = target as HTMLElement | null;
                while (node) {
                    layoutTop += node.offsetTop;
                    node = node.offsetParent as HTMLElement | null;
                }
                // Scenes land exactly at their cover-zone end (snap-stable);
                // other anchors keep the navbar offset.
                const isScene = target.hasAttribute("data-spy-section");
                const targetY = Math.max(
                    0,
                    isScene ? layoutTop : layoutTop - NAV_OFFSET,
                );
                const distance = Math.abs(targetY - window.scrollY);

                if (prefersReduced()) {
                    window.scrollTo(0, targetY);
                    history.pushState(null, "", url.hash);
                    return;
                }

                if (distance > window.innerHeight * 1.6) {
                    warpTo(targetY, url.hash);
                    return;
                }

                history.pushState(null, "", url.hash);
                gsap.to(window, {
                    duration: 1.1,
                    ease: "power3.inOut",
                    scrollTo: { y: targetY, autoKill: false },
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
    // contacto has no clip wipe: the finale is driven by the companion
    // spark swallowing the screen (see initScrollCompanion).
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
                        directional: false,
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
            yPercent: 55,
            autoAlpha: 0,
            stagger: 0.03,
            duration: 1,
            ease: "power3.out",
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
                y: 18,
                autoAlpha: 0,
                stagger: 0.06,
                duration: 1,
                ease: "power2.out",
                scrollTrigger: { trigger: group, start: "top 85%" },
            });
        });

    document
        .querySelectorAll<HTMLElement>(
            "[data-reveal]:not([data-reveal-group] [data-reveal])",
        )
        .forEach((el) => {
            gsap.from(el, {
                y: 18,
                autoAlpha: 0,
                duration: 1,
                ease: "power2.out",
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
            y: 22,
            autoAlpha: 0,
            stagger: 0.07,
            duration: 0.9,
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
                x: -18,
                autoAlpha: 0,
                duration: 0.9,
                ease: "power2.out",
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

/* ── Scroll companion: a spark that guides the reader's eye ──
   Born when scene 2 arrives (never in the hero banner), it perches on
   titles, counters, the terminal and each timeline entry one by one,
   gliding between perches as you scroll. For the FINALE it becomes the
   transition itself: flies to centre, swells until it swallows the
   screen while shifting colour, "Hablemos." fades in beneath, and the
   spark reappears last, landing at the very tip of the title. */

/* Palette colour per scene — the spark tints itself smoothly to match
   where it is (Claude-orange in the AI section). */
const BUDDY_SECTION_COLORS: Record<string, string> = {
    stack: "#FFFF00", // accent
    ia: "#D97757", // Claude orange
    experiencia: "#60A5FA", // secondary-hover blue
    proyectos: "#4DFF88", // state-success green
    contacto: "#FFFF00", // back to accent for the landing
};

const BUDDY_SVG = `
<svg viewBox="0 0 48 48" fill="none">
    <path fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round" d="M25.875 3.944L29.39 17.23a1.94 1.94 0 0 0 1.38 1.379l13.287 3.515c1.924.51 1.924 3.24 0 3.75L30.769 29.39a1.94 1.94 0 0 0-1.379 1.38l-3.515 13.287c-.51 1.924-3.24 1.924-3.75 0L18.61 30.769a1.94 1.94 0 0 0-1.38-1.379L3.944 25.875c-1.924-.51-1.924-3.24 0-3.75l13.288-3.515a1.94 1.94 0 0 0 1.379-1.38l3.515-13.287c.51-1.924 3.24-1.924 3.75 0"/>
    <circle cx="24" cy="24" r="3" fill="#0A0A0A" opacity="0.45"/>
</svg>`;

/* Giant version used for the finale wipe: its LAYOUT size is huge, so
   the browser rasterises it at full resolution — crisp at any scale. */
const SPARK_WIPE_SVG = `
<svg viewBox="0 0 48 48" fill="none">
    <path fill="currentColor" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round" d="M25.875 3.944L29.39 17.23a1.94 1.94 0 0 0 1.38 1.379l13.287 3.515c1.924.51 1.924 3.24 0 3.75L30.769 29.39a1.94 1.94 0 0 0-1.379 1.38l-3.515 13.287c-.51 1.924-3.24 1.924-3.75 0L18.61 30.769a1.94 1.94 0 0 0-1.38-1.379L3.944 25.875c-1.924-.51-1.924-3.24 0-3.75l13.288-3.515a1.94 1.94 0 0 0 1.379-1.38l3.515-13.287c.51-1.924 3.24-1.924 3.75 0"/>
</svg>`;

function initScrollCompanion() {
    if (!document.querySelector("[data-onepage]")) return;
    if (document.querySelector(".scroll-buddy")) return;

    const buddy = document.createElement("div");
    buddy.className = "scroll-buddy";
    buddy.setAttribute("aria-hidden", "true");
    buddy.innerHTML = `
        <div class="scroll-buddy-trail"></div>
        <div class="scroll-buddy-core">${BUDDY_SVG}</div>`;
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
        yPercent: 14,
        duration: 1.7,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
    });
    if (core) {
        gsap.to(core, { rotation: 360, duration: 18, ease: "none", repeat: -1 });
    }

    /* Perches: every [data-buddy-stop] element, in document order. The
       spark rides each one (it moves WITH the content) and hops to the
       next as it approaches, guiding the reader's eye. */
    interface Stop {
        scrollAt: number; // scroll position where this perch becomes active
        docX: number;
        docY: number; // document-space coordinates of the perch
    }
    let stops: Stop[] = [];

    const perchPoint = (el: Element, at: string) => {
        const rect = el.getBoundingClientRect();
        const scrollY = window.scrollY;
        const vw = window.innerWidth;
        const PAD = 34;
        if (at === "left") {
            return {
                docX: Math.max(24, rect.left - PAD),
                docY: rect.top + scrollY + rect.height / 2,
            };
        }
        if (at === "top") {
            return {
                docX: gsap.utils.clamp(24, vw - 24, rect.left + rect.width / 2),
                docY: rect.top + scrollY - 30,
            };
        }
        // "right" (default)
        return {
            docX: Math.min(vw - 24, rect.right + PAD),
            docY: rect.top + scrollY + rect.height / 2,
        };
    };

    const computeStops = () => {
        const vh = window.innerHeight;
        stops = Array.from(
            document.querySelectorAll<HTMLElement>("[data-buddy-stop]"),
        )
            .filter((el) => el.getClientRects().length > 0) // skip display:none
            .map((el) => {
                const at = el.dataset.buddyStop || "right";
                const point = perchPoint(el, at);
                return {
                    scrollAt: point.docY - vh * 0.48,
                    docX: point.docX,
                    docY: point.docY,
                };
            })
            .sort((a, b) => a.scrollAt - b.scrollAt);
    };
    computeStops();
    ScrollTrigger.addEventListener("refresh", computeStops);

    // Rest on the perch most of the way, hop near the boundary.
    const glideEase = gsap.parseEase("power2.inOut");
    const glide = (t: number) =>
        glideEase(gsap.utils.clamp(0, 1, (t - 0.28) / 0.72));

    const place = (scroll: number) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (stops.length === 0) return { x: vw / 2, y: vh * 0.2 };

        let index = 0;
        while (
            index < stops.length - 1 &&
            scroll >= stops[index + 1].scrollAt
        ) {
            index++;
        }
        const current = stops[index];
        const next = stops[Math.min(index + 1, stops.length - 1)];
        const span = Math.max(next.scrollAt - current.scrollAt, 1);
        const t = glide((scroll - current.scrollAt) / span);

        // Perches live in document space: the spark rides the content.
        const x =
            gsap.utils.interpolate(current.docX, next.docX, t) +
            Math.sin(scroll * 0.01) * 8;
        const yDoc = gsap.utils.interpolate(current.docY, next.docY, t);
        const y = gsap.utils.clamp(
            NAV_OFFSET + 26,
            vh - 90,
            yDoc - scroll + Math.cos(scroll * 0.008) * 6,
        );
        return { x: gsap.utils.clamp(22, vw - 22, x), y };
    };

    // Settle back to calm when scrolling stops.
    const settle = gsap.delayedCall(0.18, () => {
        rotTo(0);
        sxTo(1);
        syTo(1);
    });

    let busy = false; // true while the spark IS the finale transition
    let alive = false; // born at scene 2, never in the hero banner

    ScrollTrigger.create({
        trigger: document.body,
        start: "top top",
        end: "max",
        onUpdate: (self) => {
            if (busy || !alive) return;
            const { x, y } = place(self.scroll());
            const velocity = gsap.utils.clamp(-3000, 3000, self.getVelocity());
            const speed = Math.min(Math.abs(velocity) / 3200, 1);
            const lean = (velocity >= 0 ? 1 : -1) * speed;
            xTo(x);
            yTo(y);
            rotTo(lean * 13);
            // subtle squash only: it should dance, not stretch like gum
            sxTo(1 + speed * 0.16);
            syTo(1 - speed * 0.1);
            settle.restart(true);
        },
    });

    /* Birth: pops in when scene 2 arrives; hides again back in the hero. */
    gsap.set(buddy, { autoAlpha: 0, scale: 0 });
    ScrollTrigger.create({
        trigger: "#stack",
        start: "top 80%",
        onEnter: () => {
            if (alive) return;
            alive = true;
            const at = place(window.scrollY);
            gsap.set(buddy, { x: at.x, y: at.y });
            gsap.fromTo(
                buddy,
                { autoAlpha: 0, scale: 0, rotation: -220 },
                {
                    autoAlpha: 1,
                    scale: 1,
                    rotation: 0,
                    duration: 0.6,
                    ease: "back.out(2)",
                    overwrite: "auto",
                },
            );
        },
        onLeaveBack: () => {
            alive = false;
            gsap.to(buddy, {
                autoAlpha: 0,
                scale: 0,
                duration: 0.3,
                ease: "power2.in",
                overwrite: "auto",
            });
        },
    });

    /* Tint: the spark smoothly takes each scene's palette colour
       (Claude-orange while in the AI section). */
    gsap.set(buddy, { color: BUDDY_SECTION_COLORS.stack });
    SCENE_ORDER.forEach((id) => {
        const section = document.getElementById(id);
        const color = BUDDY_SECTION_COLORS[id];
        if (!section || !color) return;
        ScrollTrigger.create({
            trigger: section,
            start: "top 45%",
            end: "bottom 45%",
            onToggle: (self) => {
                if (!self.isActive) return;
                gsap.to(buddy, {
                    color,
                    duration: 0.9,
                    ease: "power2.out",
                    overwrite: "auto",
                });
            },
        });
    });

    /* FINALE (desktop): the spark swallows the screen. Flying to centre
       it charges yellow to blue, the huge crisp wipe star takes over and
       swells past the frame while darkening, "Hablemos." fades in
       beneath, and the spark lands at the very tip - last of all. */
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
        const contacto = document.getElementById("contacto");
        const finale = document.querySelector<HTMLElement>(
            "[data-buddy-finale]",
        );
        if (!contacto || !finale || !core) return;

        const wipe = ensureOverlay("spark-wipe", SPARK_WIPE_SVG);

        const tip = () => {
            const rect = finale.getBoundingClientRect();
            const contactoTop =
                contacto.getBoundingClientRect().top + window.scrollY;
            const docY = rect.top + window.scrollY;
            return {
                x: rect.left + rect.width / 2,
                y: docY - contactoTop - 34,
            };
        };

        // The scene starts hidden and fades in mid-transition.
        gsap.set(contacto, { autoAlpha: 0 });

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: contacto,
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
                // Visibility lives HERE (instant, threshold-based), never in
                // scrubbed tweens — their lagging catch-up render would
                // re-show the spark after fast jumps out of the zone.
                onUpdate: (self) => {
                    const p = self.progress;
                    gsap.set(wipe, {
                        autoAlpha: p > 0.3 && p < 0.82 ? 1 : 0,
                    });
                    const visible = p >= 0.84 || (p < 0.36 && alive);
                    gsap.set(buddy, { autoAlpha: visible ? 1 : 0 });
                },
            },
        });

        tl
            // 1 - fly to centre stage (keeps its own colour, no extra morph)
            .to(
                buddy,
                {
                    x: () => window.innerWidth / 2,
                    y: () => window.innerHeight * 0.45,
                    scale: 3,
                    rotation: 160,
                    duration: 0.3,
                    ease: "power2.in",
                },
                0,
            )
            // 2 - hand over to the huge crisp star and swallow the frame
            .fromTo(
                wipe,
                {
                    scale: 0.028,
                    rotation: 20,
                    color: BUDDY_SECTION_COLORS.proyectos,
                },
                {
                    scale: 1,
                    rotation: 150,
                    duration: 0.45,
                    ease: "power3.in",
                    immediateRender: false,
                },
                0.3,
            )
            .to(wipe, { color: "#0b0c10", duration: 0.26 }, 0.42)
            // 3 - the finale fades in beneath the black star
            .to(contacto, { autoAlpha: 1, duration: 0.18, ease: "none" }, 0.62)
            // 4 - the spark appears LAST, landing on the very tip
            .set(buddy, { color: BUDDY_SECTION_COLORS.contacto }, 0.84)
            .set(
                buddy,
                {
                    scale: 0,
                    rotation: -200,
                    x: () => tip().x,
                    y: () => tip().y,
                },
                0.84,
            )
            .to(
                buddy,
                {
                    scale: 1,
                    rotation: 0,
                    duration: 0.16,
                    ease: "back.out(2.2)",
                },
                0.84,
            );
    });

    // Mobile finale: simple fade-in for the contact scene.
    mm.add("(max-width: 1023px)", () => {
        const contacto = document.getElementById("contacto");
        if (!contacto) return;
        gsap.from(contacto, {
            autoAlpha: 0,
            duration: 0.9,
            ease: "power2.out",
            scrollTrigger: { trigger: contacto, start: "top 80%" },
        });
    });
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

    // Lift the CSS FOUC guard with inline styles BEFORE building tweens, so
    // gsap.from() captures visible end states. from() re-hides them instantly.
    gsap.set("[data-fouc]", { autoAlpha: 1 });

    // Each init is a no-op when its elements aren't on the page.
    // Order matters: pins (rail, covers) must exist before the companion's
    // triggers so refresh measures positions with the spacers in place.
    initHero();
    initStackRail();
    initCinematicTransitions();
    initScrollCompanion();
    initSectionTitles();
    initReveals();
    initTerminal();
    initTimeline();
    initMarquees();
    initScrollSpy();

    // All triggers exist now — sort refresh order by page position and
    // recompute every start/end with the pin spacers in place.
    ScrollTrigger.sort();
    ScrollTrigger.refresh();

    // And again once everything (fonts, WebGL canvas) settles — guarding
    // against "load" having already fired before this module ran.
    if (document.readyState === "complete") {
        requestAnimationFrame(() => ScrollTrigger.refresh());
    } else {
        window.addEventListener("load", () => ScrollTrigger.refresh(), {
            once: true,
        });
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
    init();
}
