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
                    // Resting mid-cut finishes the edit, like a video — but
                    // NOT on the finale: the lens scan + zoom is meant to be
                    // savoured at the reader's own scroll pace.
                    snap:
                        next.id === "contacto"
                            ? undefined
                            : {
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
                // The finale veil waits for the lupa's card inspection to
                // finish (bright cards while it scans), then darkness
                // falls as the glass takes centre stage for the zoom.
                gsap.fromTo(
                    veil,
                    { opacity: 0 },
                    {
                        opacity: next.id === "contacto" ? 1 : 0.82,
                        ease: "none",
                        scrollTrigger: {
                            trigger: next,
                            start:
                                next.id === "contacto"
                                    ? "top 50%"
                                    : "top bottom",
                            end:
                                next.id === "contacto"
                                    ? "top 28%"
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

/* Bridge: the stack rail (created in initStackRail) drives the companion's
   card-hopping while it is pinned; handlers attach in initScrollCompanion. */
const companionRail: {
    trigger?: ScrollTrigger; // the rail's pin ScrollTrigger (desktop only)
    reset?: () => void;
} = {};

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
        // The companion reads this trigger's progress/isActive every frame
        // to decide its rail perch — no imperative, order-dependent calls.
        companionRail.trigger = tween.scrollTrigger;

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

    mm.add("(min-width: 1024px)", () => {
        // teardown: crossing below 1024px mid-rail must release the buddy
        return () => {
            companionRail.trigger = undefined;
            companionRail.reset?.();
        };
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
    stack: "#D97757", // Claude orange — matches the AI icon it is born from
    ia: "#ff7043", // Claude orange (matches the burst SVG)
    experiencia: "#60A5FA", // secondary-hover blue
    proyectos: "#4DFF88", // state-success green
    contacto: "#FFFF00", // back to accent for the landing
};

const BUDDY_SVG = `
<svg viewBox="0 0 48 48" fill="none">
    <path fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round" d="M25.875 3.944L29.39 17.23a1.94 1.94 0 0 0 1.38 1.379l13.287 3.515c1.924.51 1.924 3.24 0 3.75L30.769 29.39a1.94 1.94 0 0 0-1.379 1.38l-3.515 13.287c-.51 1.924-3.24 1.924-3.75 0L18.61 30.769a1.94 1.94 0 0 0-1.38-1.379L3.944 25.875c-1.924-.51-1.924-3.24 0-3.75l13.288-3.515a1.94 1.94 0 0 0 1.379-1.38l3.515-13.287c.51-1.924 3.24-1.924 3.75 0"/>
    <circle cx="24" cy="24" r="3" fill="#0A0A0A" opacity="0.45"/>
</svg>`;

/* Claude burst — worn while in the AI scene */
const BUDDY_IA_SVG = `
<svg viewBox="0 0 16 16" fill="none"><g fill="currentColor"><path d="m14.375 6.48l.49.28v.209l-.14.489l-5.937 1.397l-.558-1.387zm0 0"/><path d="m12.155 2.373l.683.143l.182.224l.173.535l-.072.342l-3.983 5.447L7.81 7.737l3.673-4.82z"/><path d="m8.719 1.522l.419-.28l.349.14l.349.49l-.957 5.748l-.65-.441l-.279-.769l.49-4.33z"/><path d="m4.239 1.614l.43-.55L4.95 1l.558.081l.275.216l2.004 4.442l.724 2.11l-.848.471l-3.231-5.864z"/><path d="m2.154 4.665l-.14-.56l.42-.488l.488.07h.14l2.933 2.165l.908.698l1.257.978l-.698 1.187l-.629-.489l-.419-.419l-4.05-2.863z"/><path d="M1.316 8.296L1 7.946v-.31l.316-.108l3.562.21l3.491.279l-.113.695l-6.66-.346z"/><path d="M3.411 11.931h-.698l-.278-.32v-.382l1.186-.838l4.82-3.068l.487.833z"/><path d="m4.738 13.883l-.28.07l-.418-.21l.07-.35l4.12-5.446l.558.768l-3.072 4.05z"/><path d="m8.23 14.581l-.21.28l-.419.14l-.349-.28l-.21-.42L8.09 8.646l.629.07z"/><path d="M11.791 13.045v.558l-.07.21l-.279.14l-.489-.066l-3.356-4.996l1.331-1.014l1.117 2.025l.105.733z"/><path d="m13.398 12.207l.07.349l-.21.279l-.21-.07l-1.187-.838l-1.815-1.606l-1.397-.978l.419-1.326l.698.419l.42.768z"/><path d="m12.49 8.645l1.746.14l.419.28l.279.418v.302l-.768.327l-3.911-.978l-1.606-.07l.419-1.466l1.117.838z"/></g></svg>`;

/* Magnifying glass — worn while browsing the projects scene */
const BUDDY_LUPA_SVG = `
<svg viewBox="0 0 512 512" fill="none" style="overflow:visible"><path transform="translate(64,64)" fill="currentColor" d="m479.6 399.716l-81.084-81.084l-62.368-25.767A175 175 0 0 0 368 192c0-97.047-78.953-176-176-176S16 94.953 16 192s78.953 176 176 176a175.03 175.03 0 0 0 101.619-32.377l25.7 62.2l81.081 81.088a56 56 0 1 0 79.2-79.195M48 192c0-79.4 64.6-144 144-144s144 64.6 144 144s-64.6 144-144 144S48 271.4 48 192m408.971 264.284a24.03 24.03 0 0 1-33.942 0l-76.572-76.572l-23.894-57.835l57.837 23.894l76.573 76.572a24.03 24.03 0 0 1-.002 33.941"/></svg>`;

/* Headset — landed on the contact finale */
const BUDDY_CONTACT_SVG = `
<svg viewBox="0 0 14 14" fill="none"><g stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 6h1a.5.5 0 0 1 .5.5V9a.5.5 0 0 1-.5.5h-1a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm11 3.5h-1A.5.5 0 0 1 11 9V6.5a.5.5 0 0 1 .5-.5h1a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1Zm-3 2.75a2 2 0 0 0 2-2h0V9.5"/><path d="M8.25 11a1.25 1.25 0 0 1 0 2.5h-1.5a1.25 1.25 0 0 1 0-2.5ZM2.5 6V5a4.5 4.5 0 0 1 9 0v1m-6-2v1.5m3-1.5v1.5m-3 2c0 1.33 3 1.33 3 0"/></g></svg>`;

/* Shape per scene (anything missing falls back to the spark) */
const BUDDY_SHAPES: Record<string, string> = {
    ia: BUDDY_IA_SVG,
    proyectos: BUDDY_LUPA_SVG,
    contacto: BUDDY_CONTACT_SVG,
};

/* Shapes that look good spinning idly */
const BUDDY_SPINS: Record<string, boolean> = {
    spark: true,
    ia: true,
    proyectos: false,
    contacto: false,
};

function initScrollCompanion() {
    if (!document.querySelector("[data-onepage]")) return;
    if (document.querySelector(".scroll-buddy")) return;

    const buddy = document.createElement("div");
    buddy.className = "scroll-buddy";
    buddy.setAttribute("aria-hidden", "true");
    buddy.innerHTML = `
        <div class="scroll-buddy-trail"></div>
        <div class="scroll-buddy-ring"></div>
        <div class="scroll-buddy-core">${BUDDY_SVG}</div>`;
    document.body.appendChild(buddy);
    const core = buddy.querySelector<HTMLElement>(".scroll-buddy-core");

    // Keeps a gentle life of its own while perched (percent channel).
    const bob = gsap.to(buddy, {
        yPercent: 14,
        duration: 1.7,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
    });
    const spin = core
        ? gsap.to(core, { rotation: 360, duration: 18, ease: "none", repeat: -1 })
        : null;

    /* Shape morph: shrink, swap the SVG, pop back — smooth, no jump cuts. */
    let currentShape = "spark";
    const applyShape = (next: string) => {
        if (!core) return;
        core.innerHTML = BUDDY_SHAPES[next] ?? BUDDY_SVG;
        if (BUDDY_SPINS[next]) {
            spin?.play();
        } else {
            spin?.pause();
            gsap.set(core, { rotation: 0 });
        }
    };
    const morphShape = (id: string, instant = false) => {
        const next = BUDDY_SHAPES[id] ? id : "spark";
        if (next === currentShape || !core) return;
        currentShape = next;
        if (instant) {
            // Mid-zoom swaps must not run the shrink/pop mini-anim: at
            // giant scales a half-morphed shape reads as a glitch.
            gsap.killTweensOf(core, "scale");
            gsap.set(core, { scale: 1 });
            applyShape(next);
            return;
        }
        gsap.timeline({ overwrite: "auto" })
            .to(core, { scale: 0, duration: 0.22, ease: "power2.in" })
            .add(() => applyShape(next))
            .to(core, { scale: 1, duration: 0.34, ease: "back.out(1.9)" });
    };

    /* ── Perches: every [data-buddy-stop], in scroll order ──
       scrollAt thresholds are cached on "refresh" while no pin is active
       (spacers included, matching live scroll); live positions use
       getBoundingClientRect so the companion stays glued to pinned and
       sliding content. */
    interface Stop {
        el: HTMLElement;
        at: string;
        lift: number;
        scrollAt: number;
    }
    let stops: Stop[] = [];

    const computeStops = () => {
        const vh = window.innerHeight;
        stops = Array.from(
            document.querySelectorAll<HTMLElement>("[data-buddy-stop]"),
        )
            .filter((el) => el.getClientRects().length > 0)
            .map((el) => {
                const at = el.dataset.buddyStop || "right";
                const lift = parseFloat(el.dataset.buddyOffset ?? "30");
                const rect = el.getBoundingClientRect();
                const anchorDocY =
                    at === "top"
                        ? rect.top + window.scrollY - lift
                        : rect.top + window.scrollY + rect.height / 2;
                return { el, at, lift, scrollAt: anchorDocY - vh * 0.48 };
            })
            .sort((a, b) => a.scrollAt - b.scrollAt);
    };
    const noPinActive = () =>
        !ScrollTrigger.getAll().some((t) => t.pin && t.isActive);
    const safeComputeStops = () => {
        if (noPinActive()) computeStops();
    };
    computeStops();
    // "refresh" (NOT refreshInit: gsap dispatches that BEFORE reverting
    // pins) — after refresh the spacers are in place, matching the live
    // scroll coordinates the thresholds are compared against.
    ScrollTrigger.addEventListener("refresh", safeComputeStops);

    /* Live viewport point for a perch — gBCR on purpose: we want the
       VISUAL position, pins and rail transforms included. */
    const livePoint = (s: { el: HTMLElement; at: string; lift: number }) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const rect = s.el.getBoundingClientRect();
        let x: number;
        let y: number;
        if (s.at === "left") {
            x = gsap.utils.clamp(24, vw - 24, rect.left + 7);
            y = rect.top + 18; // at the entry's top marker, not mid-line
        } else if (s.at === "top") {
            x = gsap.utils.clamp(24, vw - 24, rect.left + rect.width / 2);
            y = rect.top - s.lift;
        } else if (s.at === "center") {
            x = gsap.utils.clamp(24, vw - 24, rect.left + rect.width / 2);
            y = rect.top + rect.height / 2;
        } else {
            x = Math.min(vw - 24, rect.right + 34);
            y = rect.top + rect.height / 2;
        }
        return { x, y: gsap.utils.clamp(NAV_OFFSET + 22, vh - 70, y) };
    };

    /* ── Movement engine ──
       ONE owned position `pos`, advanced every frame by a single
       gsap.ticker loop. There is no quickTo and no gsap.getProperty read
       of x/y anywhere, so a hop always starts EXACTLY where the buddy is
       (the old quickTo pause/resume leaked a stale value → snap-back, the
       "1-2-1-3" jitter). The companion never glides between perches: it
       JUMPS (arc + squash & stretch + elastic landing), but resting and
       triggering are frame-rate-independent and perfectly smooth. */
    const ringEl = buddy.querySelector<HTMLElement>(".scroll-buddy-ring");

    const pos = { x: window.innerWidth / 2, y: window.innerHeight * 0.3 };
    let target: (() => { x: number; y: number }) | null = null;
    let manualXY = false; // the finale fly/zoom writes x/y itself
    let busy = false; // the finale owns the companion
    let alive = false; // born at scene 2, never in the hero banner
    let currentKey = ""; // which perch is currently selected

    let hopping = false;
    let hopT = 0;
    let hopDur = 0.5;
    let hopArc = 0;
    let hopDir = 1;
    const hopFrom = { x: 0, y: 0 };
    const hopEase = gsap.parseEase("power1.inOut");

    const landPulse = () => {
        if (!ringEl) return;
        gsap.fromTo(
            ringEl,
            { scale: 0.55, autoAlpha: 0.85 },
            {
                scale: 2.3,
                autoAlpha: 0,
                duration: 0.55,
                ease: "power2.out",
                overwrite: true,
            },
        );
    };

    const settleScale = () =>
        gsap.fromTo(
            buddy,
            { scaleX: 1.14, scaleY: 0.86 },
            {
                scaleX: 1,
                scaleY: 1,
                rotation: 0,
                duration: 0.42,
                ease: "elastic.out(1.05, 0.55)",
                overwrite: "auto",
            },
        );

    /* Aim at a (live) perch. Same spot → just re-attach the rest target;
       otherwise launch a single clean jump FROM the true current pos. */
    const startHop = (
        getTarget: () => { x: number; y: number },
        tint?: string,
    ) => {
        target = getTarget;
        if (tint) {
            gsap.to(buddy, {
                color: tint,
                duration: 0.45,
                ease: "power2.out",
                overwrite: "auto",
            });
        }
        const probe = getTarget();
        const dist = Math.hypot(probe.x - pos.x, probe.y - pos.y);
        if (dist < 14) {
            if (!hopping) settleScale();
            return;
        }
        hopFrom.x = pos.x;
        hopFrom.y = pos.y;
        hopArc = gsap.utils.clamp(34, 150, dist * 0.32);
        hopDir = probe.x >= pos.x ? 1 : -1;
        hopDur = gsap.utils.clamp(0.34, 0.78, 0.26 + dist / 1300);
        hopT = 0;
        hopping = true;
    };

    const cancelHop = () => {
        hopping = false;
    };

    // GSAP ticker passes (time[s], deltaTime[ms]) — use deltaTime directly.
    const tick = (_time: number, deltaTime: number) => {
        const dt = Math.min(0.05, (deltaTime || 16.7) / 1000); // clamp tab gaps
        if (!alive || manualXY) return;

        // Perch selection is a PURE FUNCTION of scroll, evaluated every
        // frame — never set imperatively from a callback. However you reach
        // a scroll position (slow, fling, anchor warp, reverse), the buddy
        // self-corrects to the exact right perch. The finale (busy) owns
        // selection itself via scanTick.
        if (!busy) {
            const d = desiredPerch();
            if (d.key !== currentKey) {
                currentKey = d.key;
                const inStack = d.kind === "rail";
                panels.forEach((pnl, i) =>
                    pnl.classList.toggle(
                        "stack-panel-active",
                        inStack && i === d.idx,
                    ),
                );
                if (d.kind === "rail") {
                    clearProyInspect();
                    // born orange on card 0 (matching the AI icon), shifting
                    // to blue from card 1 on — "naranja → poco a poco azul"
                    const tint = d.idx === 0 ? "#D97757" : "#60A5FA";
                    startHop(railPerch(panels[d.idx]), tint);
                } else if (d.kind === "proy") {
                    // become the lupa and light the card being inspected,
                    // right then — not only during the finale zoom.
                    morphShape("proyectos");
                    proyCards.forEach((c, i) =>
                        c?.classList.toggle("card-inspected", i === d.idx),
                    );
                    const title = proyTitles[d.idx];
                    if (title) startHop(rightOfTitle(title), "#4DFF88");
                } else {
                    clearProyInspect();
                    const st = stops[d.idx];
                    if (st) startHop(() => livePoint(st));
                }
            }
        }

        if (hopping) {
            hopT = Math.min(1, hopT + dt / hopDur);
            const e = hopEase(hopT);
            const tgt = target ? target() : pos;
            const air = Math.sin(hopT * Math.PI);
            pos.x = gsap.utils.interpolate(hopFrom.x, tgt.x, e);
            pos.y =
                gsap.utils.interpolate(hopFrom.y, tgt.y, e) - air * hopArc;
            gsap.set(buddy, {
                x: pos.x,
                y: pos.y,
                scaleX: 1 - air * 0.12,
                scaleY: 1 + air * 0.16,
                rotation: hopDir * air * 16,
            });
            if (hopT >= 1) {
                hopping = false;
                settleScale();
                landPulse();
            }
        } else if (target) {
            // INSTANT 1:1 glue to the perch — no smoothing, so it tracks
            // the scroll exactly with zero phantom drift between hops.
            const tgt = target();
            pos.x = tgt.x;
            pos.y = tgt.y;
            gsap.set(buddy, { x: pos.x, y: pos.y });
        }
    };
    gsap.ticker.add(tick);

    const indexFor = (scroll: number) => {
        let i = 0;
        while (i < stops.length - 1 && scroll >= stops[i + 1].scrollAt) i++;
        return i;
    };

    const panels = Array.from(
        document.querySelectorAll<HTMLElement>("[data-stack-panel]"),
    );
    const railPerch = (panel: HTMLElement) => () => {
        const perch =
            panel.querySelector<HTMLElement>("[data-rail-perch]") ?? panel;
        const rect = perch.getBoundingClientRect();
        return {
            x: gsap.utils.clamp(
                40,
                window.innerWidth - 40,
                rect.left + rect.width / 2,
            ),
            y: Math.max(NAV_OFFSET + 22, rect.top + rect.height / 2),
        };
    };

    /* The 3 project-teaser cards/titles — the lupa scans them right-of-title. */
    const proyTitles = Array.from(
        document.querySelectorAll<HTMLElement>("#proyectos .pc-title"),
    );
    const proyCards = proyTitles.map((t) => t.closest(".project-card"));
    const clearProyInspect = () =>
        proyCards.forEach((c) => c?.classList.remove("card-inspected"));
    const rightOfTitle = (el: HTMLElement) => () => {
        const r = el.getBoundingClientRect();
        return {
            x: gsap.utils.clamp(40, window.innerWidth - 40, r.right + 30),
            y: gsap.utils.clamp(
                NAV_OFFSET + 22,
                window.innerHeight - 70,
                r.top + r.height / 2,
            ),
        };
    };

    /* The single source of perch truth: derived purely from scroll. While
       the stack rail is pinned, the active card index drives it; otherwise
       the scroll-threshold wave index does. */
    interface Desired {
        key: string;
        idx: number;
        kind: "rail" | "proy" | "wave";
    }
    const desiredPerch = (): Desired => {
        const vh = window.innerHeight;
        // STACK rail — ONLY while the rail's own pin is active. (Gating on
        // the #stack rect was wrong: the scene-cover system keeps #stack
        // pinned under the next sections, so it still spanned the viewport
        // in IA → the companion stayed stuck in rail mode, tinted pink.)
        const rail = companionRail.trigger;
        if (rail && rail.isActive && panels.length > 0) {
            const cx = window.innerWidth / 2;
            let idx = 0;
            let best = Infinity;
            panels.forEach((pnl, i) => {
                const r = pnl.getBoundingClientRect();
                const d = Math.abs(r.left + r.width / 2 - cx);
                if (d < best) {
                    best = d;
                    idx = i;
                }
            });
            return { key: "rail:" + idx, idx, kind: "rail" };
        }
        // PROYECTOS — while the card row is on screen the lupa scans the 3
        // cards (right of each title), advancing with the vertical scroll.
        if (proyTitles.length > 0) {
            const row = proyTitles[0].getBoundingClientRect();
            if (row.top < vh * 0.92 && row.bottom > vh * 0.08) {
                const prog = gsap.utils.clamp(
                    0,
                    0.999,
                    (vh * 0.6 - row.top) / (vh * 0.4),
                );
                const idx = Math.min(
                    proyTitles.length - 1,
                    Math.floor(prog * proyTitles.length),
                );
                return { key: "proy:" + idx, idx, kind: "proy" };
            }
        }
        const idx = indexFor(window.scrollY);
        return { key: "wave:" + idx, idx, kind: "wave" };
    };

    companionRail.reset = () => {
        currentKey = ""; // force a fresh perch evaluation next frame
        panels.forEach((pnl) => pnl.classList.remove("stack-panel-active"));
        clearProyInspect();
    };

    (window as unknown as { __buddyXY?: () => object }).__buddyXY = () => ({
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        key: currentKey,
        hopping,
    });

    /* Debug handle for the runtime test-suite */
    (window as unknown as { __buddy?: () => object }).__buddy = () => ({
        alive,
        busy,
        currentKey,
        hopping,
        manualXY,
        shape: currentShape,
    });

    /* Birth: the companion EMERGES from the AI-Engineering card's spark
       icon — the very same glyph — as if the card released it. It rides
       the icon until the rail seats it on the card numbers. */
    const origin = document.querySelector<HTMLElement>("[data-buddy-origin]");
    gsap.set(buddy, { autoAlpha: 0, scale: 0 });
    ScrollTrigger.create({
        // Born only once the stack scene has settled (well past the cover
        // wipe), so it never flashes over a half-transitioned hero.
        trigger: "#stack",
        start: "top 35%",
        onEnter: () => {
            if (alive) return;
            const originIdx = origin
                ? stops.findIndex((stop) => stop.el === origin)
                : -1;
            const idx = originIdx >= 0 ? originIdx : indexFor(window.scrollY);
            const s = stops[idx];
            if (!s) return;
            // Seed pos AT the icon and pre-select its perch, THEN go alive —
            // it emerges already in place, never "lands" from afar, and the
            // ticker won't re-hop (currentKey already matches).
            const at = livePoint(s);
            pos.x = at.x;
            pos.y = at.y;
            target = () => livePoint(s);
            currentKey = "wave:" + idx;
            hopping = false;
            alive = true;
            gsap.set(buddy, { x: pos.x, y: pos.y });
            if (origin) {
                // the icon "releases" the spark with a quick pulse
                gsap.fromTo(
                    origin,
                    { scale: 1 },
                    {
                        scale: 1.3,
                        duration: 0.18,
                        yoyo: true,
                        repeat: 1,
                        ease: "power2.out",
                    },
                );
            }
            gsap.fromTo(
                buddy,
                { autoAlpha: 0, scale: 0, rotation: -90 },
                {
                    autoAlpha: 1,
                    scale: 1,
                    rotation: 0,
                    duration: 0.55,
                    delay: 0.12,
                    ease: "back.out(1.9)",
                    overwrite: "auto",
                    onComplete: landPulse,
                },
            );
        },
        onLeaveBack: () => {
            alive = false;
            cancelHop();
            target = null;
            currentKey = "";
            gsap.to(buddy, {
                autoAlpha: 0,
                scale: 0,
                duration: 0.3,
                ease: "power2.in",
                overwrite: "auto",
            });
        },
    });

    /* Tint. TWO separate colour tracks:
       - the chapter-nav / progress bar (--scene-color) shows each section's
         IDENTITY colour — orange ONLY in the AI section, never elsewhere.
       - the companion takes the per-section accent (and, in the stack, the
         per-card accent driven by the rail). */
    const SCENE_NAV_COLORS: Record<string, string> = {
        inicio: "#FFFF00",
        stack: "#FFFF00",
        ia: "#ff7043", // Claude orange — the ONLY orange section
        experiencia: "#60A5FA",
        proyectos: "#4DFF88",
        contacto: "#FFFF00",
    };
    gsap.set(buddy, { color: BUDDY_SECTION_COLORS.stack });
    gsap.set(document.documentElement, { "--scene-color": "#FFFF00" });
    SCENE_ORDER.forEach((id) => {
        const section = document.getElementById(id);
        if (!section) return;
        const navColor = SCENE_NAV_COLORS[id];
        const buddyColor = BUDDY_SECTION_COLORS[id];
        ScrollTrigger.create({
            trigger: section,
            start: "top 45%",
            end: "bottom 45%",
            onToggle: (self) => {
                if (!self.isActive) return;
                if (navColor) {
                    gsap.to(document.documentElement, {
                        "--scene-color": navColor,
                        duration: 0.9,
                        ease: "power2.out",
                    });
                }
                if (buddyColor && !busy) {
                    gsap.to(buddy, {
                        color: buddyColor,
                        duration: 0.9,
                        ease: "power2.out",
                        overwrite: "auto",
                    });
                }
                if (!busy) morphShape(id);
            },
        });
    });

    /* FINALE (desktop): zoom THROUGH the magnifying glass.
       The very lupa you have been following scans each project card
       title, flies to centre stage and grows; the contact scene is
       revealed by a clip-path circle synced to the lens radius — you
       are literally looking through the glass. No overlays, nothing
       appears out of nowhere; the ring simply outgrows the screen. */
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
        const contacto = document.getElementById("contacto");
        const proyectos = document.getElementById("proyectos");
        const finale = document.querySelector<HTMLElement>(
            "[data-buddy-finale]",
        );
        if (!contacto || !proyectos || !finale || !core) return;

        const layoutTop = (el: HTMLElement) => {
            let y = 0;
            let node: HTMLElement | null = el;
            while (node) {
                y += node.offsetTop;
                node = node.offsetParent as HTMLElement | null;
            }
            return y;
        };
        /* The landing tip is CACHED only while nothing is pinned: a
           pinned section is position:fixed, which truncates offsetTop
           chains and skews getBoundingClientRect — measuring mid-zone
           gives garbage. */
        let tipCache = { x: 0, y: 0 };
        // The wave perch the companion resumes on after the finale (the
        // contacto title stop). land() places the buddy exactly here so
        // the forward hand-off to the ticker is a zero-distance no-op.
        const landPoint = () => {
            const fs = stops.find((st) => st.el === finale);
            return fs ? livePoint(fs) : tipCache;
        };

        const computeFinaleTargets = () => {
            const rect = finale.getBoundingClientRect();
            tipCache = {
                x: rect.left + rect.width / 2,
                y: layoutTop(finale) - layoutTop(contacto) - 120,
            };
        };
        const safeComputeFinaleTargets = () => {
            if (noPinActive()) computeFinaleTargets();
        };
        computeFinaleTargets();
        ScrollTrigger.addEventListener("refresh", safeComputeFinaleTargets);


        // Lens inner radius of the lupa SVG at buddy scale 1
        // (circle r=144 in a 512 viewBox rendered in a 36px box).
        const LENS_R = (144 / 512) * 36;

        const contactoBlocks = Array.from(
            contacto.querySelectorAll<HTMLElement>(":scope > div"),
        );
        gsap.set(contacto, { clipPath: "circle(0px at 50% 50%)" });

        const flyEase = gsap.parseEase("power1.inOut");
        const zoomEase = gsap.parseEase("power2.in");

        /* One continuous parametric drive — scale, lens-synced clip and
           visibility all derive from raw progress every tick. No
           scrubbed alpha/scale tweens, no stale-state flashes. */
        const maxScale = () =>
            (Math.hypot(window.innerWidth, window.innerHeight) / 2 + 24) /
            LENS_R;
        const buddyScale = (p: number) => {
            if (p < FLY_START) return 1;
            if (p < FLY_END)
                return 1 + flyEase((p - FLY_START) / (FLY_END - FLY_START)) * 5;
            return (
                6 +
                zoomEase(gsap.utils.clamp(0, 1, (p - FLY_END) / 0.28)) *
                    (maxScale() - 6)
            );
        };

        /* ── The lupa INSPECTS the projects: progress thresholds fire
           real hops (same engine as the rail) onto each card, and the
           card under the glass lights up — conic border + spotlight — as
           if the magnifier revealed it. ── */
        const cards = Array.from(
            proyectos.querySelectorAll<HTMLElement>(".project-card"),
        );
        const SCAN_AT = [0.02, 0.2, 0.38];
        const FLY_START = 0.52;
        const FLY_END = 0.66;
        let scanIdx = -1;
        let lastClip = "";
        let lastBlockAlpha = -1;

        // The lupa sits to the RIGHT of each card's title as it scans.
        const cardPerch = (card: HTMLElement) => () => {
            const title = card.querySelector<HTMLElement>(".pc-title") ?? card;
            const rect = title.getBoundingClientRect();
            return {
                x: gsap.utils.clamp(
                    24,
                    window.innerWidth - 24,
                    rect.right + 30,
                ),
                y: gsap.utils.clamp(
                    NAV_OFFSET + 22,
                    window.innerHeight - 70,
                    rect.top + rect.height / 2,
                ),
            };
        };

        const inspect = (idx: number) => {
            cards.forEach((card, i) => {
                card.classList.toggle("card-inspected", i === idx);
                if (i === idx) {
                    card.style.setProperty("--px", "50%");
                    card.style.setProperty("--py", "18%");
                }
            });
        };

        const scanTick = (p: number) => {
            let idx = -1;
            for (let i = 0; i < SCAN_AT.length; i += 1) {
                if (p >= SCAN_AT[i]) idx = i;
            }
            idx = Math.min(idx, cards.length - 1);
            if (idx === scanIdx) return;
            scanIdx = idx;
            inspect(idx);
            if (idx >= 0 && cards[idx]) startHop(cardPerch(cards[idx]));
        };

        const flyFrom = () =>
            cards.length > 0
                ? cardPerch(cards[cards.length - 1])()
                : { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };

        /* Landing: once the scene is fully revealed, the companion fades
           in ALREADY PLACED on the tip - it never travels there. */
        let landed = false;
        const land = () => {
            if (landed) return;
            landed = true;
            // Scoped kill ONLY: killTweensOf(buddy) without filters used to
            // gut the scrubbed timeline's scan/fly tweens (and the idle
            // bob) forever — reversing left the glass stuck mid-screen.
            gsap.killTweensOf(buddy, "scale,autoAlpha");
            const lp = landPoint();
            gsap.set(buddy, {
                x: lp.x,
                y: lp.y,
                width: 36,
                height: 36,
                marginLeft: -18,
                marginTop: -18,
                scale: 0.6,
                rotation: 0,
                autoAlpha: 0,
                color: BUDDY_SECTION_COLORS.contacto,
            });
            buddy.classList.remove("buddy-zooming");
            morphShape("contacto", true);
            bob.play();
            gsap.to(buddy, {
                autoAlpha: 1,
                scale: 1,
                duration: 0.7,
                delay: 0.35,
                ease: "power2.out",
                overwrite: "auto",
            });
        };

        const applyFinale = (p: number) => {
            // Past the reveal the landing sequence owns the companion —
            // but the scene endgame (clip release to true corner coverage
            // + final fade to 1) still follows the scroll.
            if (p >= 0.94) {
                manualXY = true; // land() owns x/y; keep the ticker off
                const releaseT = gsap.utils.clamp(0, 1, (p - 0.94) / 0.012);
                if (p >= 0.97) {
                    gsap.set(contacto, { clipPath: "none" });
                } else {
                    const cy = (p - 0.5) * window.innerHeight;
                    const fromR = LENS_R * buddyScale(0.94) - 6;
                    const coverR =
                        Math.hypot(window.innerWidth, window.innerHeight) /
                            2 +
                        12;
                    const radius = gsap.utils.interpolate(
                        fromR,
                        coverR,
                        releaseT,
                    );
                    gsap.set(contacto, {
                        clipPath: `circle(${radius.toFixed(1)}px at 50% ${cy.toFixed(1)}px)`,
                    });
                }
                gsap.set(contactoBlocks, {
                    autoAlpha: gsap.utils.interpolate(
                        0.78,
                        1,
                        gsap.utils.clamp(0, 1, (p - 0.94) / 0.012),
                    ),
                });
                land();
                return;
            }
            if (landed) {
                landed = false;
                gsap.killTweensOf(buddy, "scale,autoAlpha");
                morphShape("proyectos", true); // back to the glass, unseen
            }

            const scale = buddyScale(p);
            const visible = p < 0.92 && (p >= 0.02 || alive);

            // Phase ownership of x/y — deterministic in BOTH directions:
            // scan hops < parametric flight < centre assert (zoom).
            if (p < FLY_START) {
                // scan: the ticker drives the hops (startHop via scanTick)
                manualXY = false;
                scanTick(p);
            } else {
                // fly + zoom: applyFinale writes x/y itself
                manualXY = true;
                cancelHop();
                if (scanIdx !== -1) {
                    scanIdx = -1;
                    inspect(-1);
                }
                if (p < FLY_END) {
                    const t = flyEase((p - FLY_START) / (FLY_END - FLY_START));
                    const from = flyFrom();
                    gsap.set(buddy, {
                        x: gsap.utils.interpolate(
                            from.x,
                            window.innerWidth / 2,
                            t,
                        ),
                        y: gsap.utils.interpolate(
                            from.y,
                            window.innerHeight / 2,
                            t,
                        ),
                        rotation: 0,
                    });
                }
            }

            // The idle bob is a % of the element height: at lens size it
            // shoves the glass ~80px off-centre. Freeze it while zooming.
            if (scale > 1.2) {
                bob.pause();
                gsap.set(buddy, { yPercent: 0 });
            } else if (bob.paused()) {
                bob.play();
            }
            // Resize the element (vector re-raster = crisp), but cap the
            // raster at 1440px and bridge the rest with transform scale:
            // re-rasterising a 3240px layer per tick was the #1 jank
            // source, and past ~1440px only a huge smooth arc is visible.
            const px = 36 * scale;
            const rasterPx = Math.min(px, 1440);
            const sizing: gsap.TweenVars = {
                width: rasterPx,
                height: rasterPx,
                marginLeft: -rasterPx / 2,
                marginTop: -rasterPx / 2,
                autoAlpha: visible ? 1 : 0,
            };
            if (scale > 1.001) {
                // zoom phases own the transform; during the scan the hop
                // engine keeps its squash & stretch untouched
                sizing.scaleX = px / rasterPx;
                sizing.scaleY = px / rasterPx;
            }
            gsap.set(buddy, sizing);

            // The glass stays a magnifier for the whole zoom; the headset
            // only appears on landing. Giant glow would wash the screen.
            if (p > 0.05 && p < 0.92) morphShape("proyectos", scale > 3);
            buddy.classList.toggle("buddy-zooming", scale > 3);

            // During the zoom the parametric drive also owns the position:
            // scrolling back up from the landing used to leave the giant
            // glass stuck at the tip (no tween reasserts x/y up there).
            if (p >= FLY_END) {
                gsap.set(buddy, {
                    x: window.innerWidth / 2,
                    y: window.innerHeight / 2,
                });
            }

            // Contact revealed exactly through the lens — but only once
            // the glass has taken centre stage (a quick iris-in, then it
            // tracks the lens radius). The clip is element-relative while
            // the section still rises, so the centre is computed back from
            // the viewport lens position. Redundant writes are skipped.
            const cy = (p - 0.5) * window.innerHeight;
            const iris = gsap.utils.clamp(0, 1, (p - 0.68) / 0.06);
            const radius = Math.max(0, LENS_R * scale - 6) * iris;
            const clip = `circle(${radius.toFixed(1)}px at 50% ${cy.toFixed(1)}px)`;
            if (clip !== lastClip) {
                lastClip = clip;
                gsap.set(contacto, { clipPath: clip });
            }

            // Visible fade-in: silhouette through the glass, then the
            // whole scene fades up before the companion lands.
            const blockAlpha =
                p < 0.86
                    ? 0.35
                    : 0.35 + 0.65 * gsap.utils.clamp(0, 1, (p - 0.86) / 0.12);
            if (Math.abs(blockAlpha - lastBlockAlpha) > 0.004) {
                lastBlockAlpha = blockAlpha;
                gsap.set(contactoBlocks, { autoAlpha: blockAlpha });
            }
        };

        ScrollTrigger.create({
            trigger: contacto,
            start: "top bottom",
            end: "top top",
            invalidateOnRefresh: true,
            onToggle: (self) => {
                busy = self.isActive;
                if (busy) {
                    cancelHop();
                    // onUpdate fires BEFORE onToggle in the same tick: let
                    // the scan re-claim immediately if it just started.
                    scanIdx = -1;
                    inspect(-1);
                    scanTick(self.progress);
                } else {
                    scanIdx = -1;
                    inspect(-1);
                    manualXY = false;
                    // resync owned pos to wherever the finale left the
                    // buddy, so the ticker resumes without a jump.
                    pos.x = Number(gsap.getProperty(buddy, "x"));
                    pos.y = Number(gsap.getProperty(buddy, "y"));
                    // Either direction: clear the selection and the
                    // ticker self-corrects to the correct scroll-derived
                    // perch next frame (the contacto title stop coincides
                    // with the landing tip, so no extra hop forward).
                    currentKey = "";
                    if (self.direction < 0) target = null;
                }
            },
            onUpdate: (self) => applyFinale(self.progress),
            onLeave: () => {
                gsap.set(contacto, { clipPath: "none" });
                gsap.set(contactoBlocks, { autoAlpha: 1 });
                inspect(-1);
                land();
            },
        });

        // Teardown when leaving desktop: never strand busy/landed flags,
        // a giant lens, a clipped scene or the extra refresh listener.
        return () => {
            ScrollTrigger.removeEventListener(
                "refresh",
                safeComputeFinaleTargets,
            );
            busy = false;
            manualXY = false; // never strand the ticker gate on resize
            landed = false;
            currentKey = "";
            scanIdx = -1;
            inspect(-1);
            buddy.classList.remove("buddy-zooming");
            bob.play();
            gsap.set(buddy, {
                scale: 1,
                scaleX: 1,
                scaleY: 1,
                autoAlpha: alive ? 1 : 0,
                clearProps: "width,height,marginLeft,marginTop",
            });
            gsap.set(contacto, { clearProps: "clipPath,opacity,visibility" });
            gsap.set(contactoBlocks, { clearProps: "opacity,visibility" });
        };
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
