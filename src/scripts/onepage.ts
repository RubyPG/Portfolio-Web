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

/* True while a chapter-nav / anchor jump owns the scroll. The smooth-scroll
   yields entirely (so wheel can't fight the jump) and the companion holds
   hidden, then re-appears with its section's entrance the moment the jump
   lands — instead of the two scroll drivers fighting ("se rompe todo"). */
let navScrolling = false;
const companionNav: { hide?: () => void } = {};

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
        navScrolling = true;
        companionNav.hide?.();
        const veil = ensureOverlay("warp-veil");
        gsap.timeline({
            onComplete: () => {
                navScrolling = false;
            },
        })
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
                // other anchors keep the navbar offset. The offsetTop chain
                // LIES for a scene that is pinned RIGHT NOW (position:fixed →
                // offsetParent null → layoutTop ≈ 0; clicking "#proyectos"
                // from contacto warped to the page top and killed the lupa).
                // The previous scene's cover-trigger end IS the rest scroll
                // of the clicked scene, pin-state-independent — prefer it.
                const isScene = target.hasAttribute("data-spy-section");
                const prevScene =
                    SCENE_ORDER[SCENE_ORDER.indexOf(target.id) - 1];
                const cover =
                    prevScene && window.matchMedia("(min-width: 1024px)").matches
                        ? sceneCovers[prevScene]
                        : undefined;
                const targetY = Math.max(
                    0,
                    isScene
                        ? (cover?.end ?? layoutTop)
                        : layoutTop - NAV_OFFSET,
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
                navScrolling = true;
                companionNav.hide?.();
                gsap.to(window, {
                    duration: 1.1,
                    ease: "power3.inOut",
                    scrollTo: { y: targetY, autoKill: false },
                    onComplete: () => {
                        navScrolling = false;
                    },
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

    const sections = Array.from(
        document.querySelectorAll<HTMLElement>("[data-spy-section]"),
    );
    if (sections.length === 0) return;

    // Idempotent like the rest of the file: a future astro:page-load re-run
    // must not stack a second permanent ticker pick-loop (the rewrite traded
    // GSAP-managed triggers for a bare ticker that nothing would tear down).
    if (document.documentElement.dataset.spyBound === "true") return;
    document.documentElement.dataset.spyBound = "true";

    let activeId: string | null = null;
    const setActive = (id: string | null) => {
        if (id === activeId) return;
        activeId = id;
        links.forEach((link) => {
            const match = link.dataset.spyLink === id;
            link.classList.toggle("nav-link-active", match);
            link.setAttribute("aria-current", match ? "true" : "false");
        });
    };

    // ONE active chapter, identical up or down. The active scene is the one
    // whose visual box has MOST RECENTLY crossed the viewport midline (the
    // largest top <= mid; on a tie the later scene — the one revealing on
    // top — wins, because we scan in document order with >=). gBCR is read
    // live so pinned / clip-wiped cinematic scenes report their true on-
    // screen box, which the old per-section "top 45% / bottom 45%" triggers
    // could not — they double-activated across the pinned overlaps (05 + 06
    // lit together) and stranded the wrong dot at the page foot.
    const pick = () => {
        const mid = window.innerHeight / 2;
        let best = sections[0];
        let bestTop = -Infinity;
        for (const section of sections) {
            const rect = section.getBoundingClientRect();
            if (rect.height === 0) continue;
            if (rect.top <= mid && rect.top >= bestTop) {
                bestTop = rect.top;
                best = section;
            }
        }
        setActive(best.id);
    };

    let lastY = -1;
    let lastH = -1;
    // After an instant jump (chapter-nav warp) the landing frame can still
    // see a stale pinned scene (position:fixed, top 0) that wins the midline
    // tie; the pin releases a frame later but the scroll no longer changes,
    // so the dot stayed stuck (contacto → ia left "proyectos" lit). Re-pick
    // for a couple of frames after the scroll settles.
    let settleFrames = 0;
    gsap.ticker.add(() => {
        const y = window.scrollY;
        const h = window.innerHeight;
        if (y === lastY && h === lastH) {
            if (settleFrames === 0) return;
            settleFrames -= 1;
        } else {
            lastY = y;
            lastH = h;
            settleFrames = 2;
        }
        pick();
    });
    pick();
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

// The companion reads these to leave a scene THE MOMENT the next one starts
// to peek over it (keyed by the OUTGOING scene id), instead of waiting for a
// perch threshold deep into the cover — so it never gets caught half-on-screen
// by the incoming section sliding up underneath it.
const sceneCovers: Record<string, ScrollTrigger> = {};

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
    // Diagonal light-beam widening until it fills the frame. Held back to
    // "top 60%" so experiencia keeps scrolling — letting the companion reach
    // its LAST dot — before proyectos is allowed to rise and cover.
    proyectos: {
        from: "polygon(82% 0%, 100% 0%, 18% 100%, 0% 100%)",
        to: "polygon(-100% 0%, 200% 0%, 100% 100%, -200% 100%)",
        coverStart: "top 60%",
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

                // Freeze the outgoing scene while the next covers it. The pin
                // honours the next scene's coverStart so a delayed wipe (e.g.
                // proyectos, held to "top 60%") also delays the freeze and the
                // companion's exit — the spark finishes its perches first.
                sceneCovers[scene.id] = ScrollTrigger.create({
                    trigger: next,
                    start: SCENE_WIPES[next.id]?.coverStart ?? "top bottom",
                    end: "top top",
                    pin: scene,
                    pinSpacing: false,
                    anticipatePin: 1,
                    // Resting mid-cut finishes the edit, like a video — but
                    // NOT on the finale: the lens scan + zoom is meant to be
                    // savoured at the reader's own scroll pace.
                    // directional:true — only ever completes the cut in the
                    // way you're already scrolling, never yanks you BACKWARD
                    // to the nearer edge (that back-pull, fighting the smooth
                    // scroll, was the up-down "ta-ta-ta" judder).
                    snap:
                        next.id === "contacto"
                            ? undefined
                            : {
                                  snapTo: [0, 1],
                                  duration: { min: 0.3, max: 0.7 },
                                  ease: "power2.inOut",
                                  delay: 0.08,
                                  directional: true,
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

    // debug: live cover-trigger progress per outgoing scene
    (window as unknown as { __covers?: () => object }).__covers = () =>
        Object.fromEntries(
            Object.entries(sceneCovers).map(([k, v]) => [
                k,
                +v.progress.toFixed(3),
            ]),
        );
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
    slide?: () => number; // 0→1 fraction of the card-slide (excludes the hold)
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
        // Extra scroll AFTER the cards finish sliding: the companion holds
        // on card 05 here while nothing below moves (IA is pushed down by
        // this spacer), then the next section is allowed to appear.
        const hold = () => window.innerHeight * 0.3;

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: section,
                start: "top top",
                end: () => `+=${distance() + hold()}`,
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
        // 1:1 slide over `distance` px, then a `hold` px pause on card 05.
        tl.to(track, { x: () => -distance(), ease: "none", duration: 1 }, 0);
        tl.to({}, { duration: () => hold() / Math.max(distance(), 1) });

        // The companion reads this trigger + the slide fraction every frame.
        companionRail.trigger = tl.scrollTrigger;
        companionRail.slide = () => {
            const d = distance();
            return d > 0
                ? gsap.utils.clamp(0, 1, -Number(gsap.getProperty(track, "x")) / d)
                : 0;
        };

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
                            containerAnimation: tl,
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

/* ── IA: hold the scene on screen for extra scroll ──
   Without this the scene got exactly its own height of scroll before
   experiencia started covering it ("dura muy poco"). Pinning the inner
   frame adds a spacer that pushes everything below down, so the terminal
   room stays on screen almost a full extra viewport. */
function initIAHold() {
    const section = document.querySelector<HTMLElement>("#ia");
    const pin = section?.querySelector<HTMLElement>("[data-ia-pin]");
    if (!section || !pin) return;

    gsap.matchMedia().add("(min-width: 1024px)", () => {
        ScrollTrigger.create({
            trigger: section,
            start: "top top",
            end: () => `+=${window.innerHeight * 0.9}`,
            pin,
            // The section keeps a clip-path from its entrance wipe, which
            // would hijack position:fixed — reparent the pin to <body>.
            pinReparent: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
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

    // The temporal rail is drawn in FULL by default — it does NOT draw itself
    // down on scroll (that read as the line "growing" as you went).

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

    // Make the rail span EXACTLY from the first node's centre to the last
    // node's centre (no tail poking past the top or bottom circle). The
    // opaque nodes then hide it wherever it would cross one, so it never
    // shows inside a circle. Recomputed on refresh (natural layout only).
    const railSpans = Array.from(
        wrap.querySelectorAll<HTMLElement>(":scope > span"),
    );
    const fitRail = () => {
        const dots = wrap.querySelectorAll<HTMLElement>(
            '[data-buddy-stop="center"]',
        );
        if (dots.length < 2 || railSpans.length === 0) return;
        const wrapTop = wrap.getBoundingClientRect().top;
        const r0 = dots[0].getBoundingClientRect();
        const rN = dots[dots.length - 1].getBoundingClientRect();
        const top = r0.top + r0.height / 2 - wrapTop;
        // +150 tail past the LAST node: the gradient's faded foot trails on
        // below Loops n' Grooves, reading as "there's more to come".
        const height =
            rN.top + rN.height / 2 - (r0.top + r0.height / 2) + 150;
        railSpans.forEach((s) => {
            s.style.top = `${top}px`;
            s.style.bottom = "auto";
            s.style.height = `${height}px`;
        });
    };
    fitRail();
    ScrollTrigger.addEventListener("refresh", () => {
        if (!ScrollTrigger.getAll().some((t) => t.pin && t.isActive)) fitRail();
    });

    // Desktop: the rail just FADES OUT (in place) as proyectos rises to cover
    // experiencia. It must NOT translate — the rail is taller than the
    // viewport, so sliding it would drag its hidden upper half into view and
    // read as the line "lengthening" on the way out.
    const proyectos = document.getElementById("proyectos");
    if (proyectos && railSpans.length) {
        gsap.matchMedia().add("(min-width: 1024px)", () => {
            gsap.to(railSpans, {
                autoAlpha: 0,
                ease: "power2.in",
                scrollTrigger: {
                    trigger: proyectos,
                    start: "top 70%",
                    end: "top 40%",
                    scrub: 0.5,
                    invalidateOnRefresh: true,
                },
            });
        });
    }
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
    experiencia: "#FACC15", // yellow — the spark stands out on the blue rail
    proyectos: "#4DFF88", // green — the magnifying glass
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
    let appliedShape = "spark";
    let shapeTransition: gsap.core.Timeline | null = null;
    const applyShape = (next: string) => {
        if (!core) return;
        core.innerHTML = BUDDY_SHAPES[next] ?? BUDDY_SVG;
        appliedShape = next;
        if (BUDDY_SPINS[next]) {
            spin?.play();
        } else {
            spin?.pause();
            gsap.set(core, { rotation: 0 });
        }
    };
    const morphShape = (id: string, instant = false) => {
        const next = BUDDY_SHAPES[id] ? id : "spark";
        if (!core) return;
        if (next === currentShape) {
            const needsApply = appliedShape !== next;
            if (
                (instant && (shapeTransition !== null || needsApply)) ||
                (!shapeTransition && needsApply)
            ) {
                shapeTransition?.kill();
                shapeTransition = null;
                gsap.killTweensOf(core, "scale");
                gsap.set(core, { scale: 1 });
                applyShape(next);
            }
            return;
        }
        currentShape = next;
        // Kill the whole timeline, including its deferred SVG-swap callback.
        // Killing only the scale tween lets an older callback overwrite the
        // new shape later while currentShape already points at this request.
        shapeTransition?.kill();
        shapeTransition = null;
        if (instant) {
            // Mid-zoom swaps must not run the shrink/pop mini-anim: at
            // giant scales a half-morphed shape reads as a glitch.
            gsap.killTweensOf(core, "scale");
            gsap.set(core, { scale: 1 });
            applyShape(next);
            return;
        }
        const transition = gsap.timeline({
            onComplete: () => {
                if (shapeTransition === transition) shapeTransition = null;
            },
        });
        shapeTransition = transition;
        transition
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
        advance: number;
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
                // Pull a perch's activation EARLIER (px of scroll) — used for
                // tall perches (the IA card grid) so the buddy is already
                // resting at its centre while the whole section is on screen,
                // not only once the next section starts covering it.
                const advance = parseFloat(el.dataset.buddyAdvance ?? "0");
                const rect = el.getBoundingClientRect();
                const anchorDocY =
                    at === "top"
                        ? rect.top + window.scrollY - lift
                        : rect.top + window.scrollY + rect.height / 2;
                return {
                    el,
                    at,
                    lift,
                    advance,
                    scrollAt: anchorDocY - vh * 0.48 - advance,
                };
            })
            .sort((a, b) => a.scrollAt - b.scrollAt);
    };

    /* The active wave perch, decided from LIVE positions (gBCR) instead of
       cached scroll thresholds: the index is the last stop whose live anchor
       has crossed the 0.48-viewport line (+ its advance). This is the exact
       same rule as the cached scrollAt, but immune to the pinSpacing:false
       flow-shifts that desynced the cache and made the buddy overshoot a
       perch then teleport back to correct itself. */
    const PERCH_LINE = 0.48;
    const liveAnchorY = (s: Stop) => {
        const r = s.el.getBoundingClientRect();
        return s.at === "top" ? r.top - s.lift : r.top + r.height / 2;
    };
    const waveIndexLive = () => {
        const line = window.innerHeight * PERCH_LINE;
        let idx = 0;
        for (let i = 0; i < stops.length; i++) {
            if (liveAnchorY(stops[i]) <= line + stops[i].advance) idx = i;
        }
        return idx;
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
            x = Math.max(24, rect.left - 34);
            y = rect.top + rect.height / 2;
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

    // Scroll velocity (px/s), sampled every tick. Fast scrolling compresses
    // the hop so the companion keeps pace with its perch instead of trailing
    // behind and snapping into place when the fling stops.
    let lastScrollY = window.scrollY;
    let scrollVel = 0;
    let lastScrollDir = 1; // 1 = descending, -1 = ascending (last real move)

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
        // Velocity-adaptive: the faster the scroll, the shorter and flatter
        // the hop, so chained perch changes read as one fluid track instead
        // of a stuttering "ta-ta-ta" of half-finished arcs. At rest (vf≈1) it
        // keeps the full playful jump.
        const vf = gsap.utils.clamp(0.28, 1, 1 - scrollVel / 5000);
        hopDur *= vf;
        hopArc *= gsap.utils.clamp(0.45, 1, vf + 0.12);
        hopT = 0;
        hopping = true;
    };

    const cancelHop = () => {
        hopping = false;
    };

    // GSAP ticker passes (time[s], deltaTime[ms]) — use deltaTime directly.
    const tick = (_time: number, deltaTime: number) => {
        const dt = Math.min(0.05, (deltaTime || 16.7) / 1000); // clamp tab gaps
        const sy = window.scrollY;
        const scrollDelta = sy - lastScrollY; // <0 = ascending
        scrollVel = Math.abs(scrollDelta) / dt;
        if (scrollDelta !== 0) lastScrollDir = scrollDelta < 0 ? -1 : 1;
        lastScrollY = sy;
        if (!alive || manualXY) return;
        // Hold still (hidden) while a chapter-nav jump flies the scroll past
        // many sections — then re-appear with the landing section's entrance.
        if (navScrolling) return;

        // Perch selection is a PURE FUNCTION of scroll, evaluated every
        // frame — never set imperatively from a callback. However you reach
        // a scroll position (slow, fling, anchor warp, reverse), the buddy
        // self-corrects to the exact right perch. The finale (busy) owns
        // selection itself via scanTick.
        if (!busy && !transitioning) {
            const d = desiredPerch();
            if (d.key !== currentKey) {
                currentKey = d.key;
                if (d.kind === "none") {
                    // leaving a section into a perch-less gap: spin away and
                    // wait, hidden, until the next real perch arrives
                    panels.forEach((pnl) =>
                        pnl.classList.remove("stack-panel-active"),
                    );
                    if (visible) exitHide(curSection, d.toIcon);
                } else {
                    const sec = sectionOf(d);
                    const getter = perchGetter(d);
                    const tint = tintOf(d, sec);
                    panels.forEach((pnl, i) =>
                        pnl.classList.toggle(
                            "stack-panel-active",
                            d.rail && i === d.idx,
                        ),
                    );
                    if (!visible) {
                        // re-entering from a hidden gap. IA gets the orbit
                        // around the terminal; everywhere else, a clean drop.
                        if (sec === "ia") orbitInTo(getter, tint);
                        else enterAt(getter, tint);
                    } else if (curSection && sec && sec !== curSection) {
                        // contiguous section change → spin across
                        playTransition(getter, tint, curSection);
                    } else {
                        startHop(getter, tint);
                    }
                    curSection = sec;
                }
            }
        }

        // Stack rail colour, ASCENDING ONLY: a pure function of the slide
        // progress, written every frame so the way UP repaints the exact card
        // accents and the buddy never strands on a stale orange (the IA
        // residual). The descent is deliberately left to the discrete per-card
        // startHop tint — its loved "rest on each accent" steps stay untouched.
        if (
            scrollDelta < 0 &&
            !busy &&
            !transitioning &&
            railTint &&
            companionRail.trigger?.isActive
        ) {
            gsap.set(buddy, {
                color: railTint(
                    companionRail.slide ? companionRail.slide() : 0,
                ),
            });
        }

        if (transitioning) return; // the transition timeline owns the buddy

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
            // INSTANT 1:1 glue to the perch — no smoothing, so it tracks the
            // scroll exactly with zero phantom drift. BUT if the perch's live
            // point leaps in a single frame (a pin engaging/releasing shifts
            // the whole layout — e.g. the IA pin releasing as experiencia
            // settles), don't teleport with it: arc over with a quick hop so
            // it reads as a deliberate move, never a snap-back.
            const tgt = target();
            if (Math.hypot(tgt.x - pos.x, tgt.y - pos.y) > 80) {
                startHop(target);
            } else {
                pos.x = tgt.x;
                pos.y = tgt.y;
                gsap.set(buddy, { x: pos.x, y: pos.y });
            }
        }
    };
    gsap.ticker.add(tick);

    let busy = false; // the finale owns the companion
    let alive = false; // born at scene 2, never in the hero banner
    let currentKey = ""; // which perch is currently selected
    let transitioning = false; // playing a between-sections spin transition
    let curSection = ""; // section of the current perch
    let visible = false; // shown, vs hidden in a between-sections gap
    let railEngaged = false; // the stack rail has owned the buddy at least once
    let railCompleted = false; // the rail slide reached the last card (05)
    // the in-flight between-sections animation (tween or timeline) — tracked
    // so a sudden death (scroll back to the hero mid-transition) can kill it
    // and never strand the `transitioning` flag.
    let activeTransition: gsap.core.Animation | null = null;

    const indexFor = (scroll: number) => {
        let i = 0;
        while (i < stops.length - 1 && scroll >= stops[i + 1].scrollAt) i++;
        return i;
    };

    const panels = Array.from(
        document.querySelectorAll<HTMLElement>("[data-stack-panel]"),
    );

    // The buddy's colour through the stack rail is interpolated across the
    // per-card accents by the slide progress — a PURE FUNCTION of scroll,
    // applied every frame (see tick). The old discrete per-card tint (a tween
    // fired only on index change) left a stale orange on the way UP because
    // the section-colour onToggle and the IA residual won the race. Driving
    // it parametrically makes the ascent repaint the exact same colours as
    // the descent, and slide 0 always resolves to card 01's clean accent.
    const railAccents = panels.map((p) => p.dataset.accent || "#D97757");
    const railTint: ((prog: number) => string) | null =
        railAccents.length >= 2
            ? (prog) => {
                  const seg =
                      gsap.utils.clamp(0, 1, prog) * (railAccents.length - 1);
                  const i = Math.min(railAccents.length - 2, Math.floor(seg));
                  return gsap.utils.interpolate(
                      railAccents[i],
                      railAccents[i + 1],
                      seg - i,
                  ) as string;
              }
            : railAccents.length === 1
              ? () => railAccents[0]
              : null;

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

    /* The single source of perch truth: derived purely from scroll. While
       the stack rail's OWN pin is active the card index drives it; otherwise
       the scroll-threshold wave index does. (Gating on the #stack rect was
       wrong — the scene-cover system keeps #stack pinned under IA, so the
       companion got stuck on a rail card all through the AI section.) */
    const desiredPerch = (): Desired => {
        const railST = companionRail.trigger;
        if (railST && railST.isActive && panels.length > 0) {
            railEngaged = true;
            // Index from the card-SLIDE fraction (excludes the hold at the
            // end): slide 0 → card 01 (orange, during the banner→stack
            // transition), … slide 1 → card 05, then it stays on card 05
            // through the hold (the IA section is gated behind that pause).
            const prog = companionRail.slide ? companionRail.slide() : 0;
            if (prog >= 0.92) railCompleted = true; // reached card 05
            const idx = gsap.utils.clamp(
                0,
                panels.length - 1,
                Math.round(prog * (panels.length - 1)),
            );
            return { key: "rail:" + idx, idx, rail: true, kind: "rail" };
        }
        const idx = waveIndexLive();
        // stops[0] is the spark icon — a BIRTH perch only.
        if (railEngaged && idx === 0) {
            // BELOW the rail zone this is the post-rail (stack→IA) gap →
            // hidden, always. Decided by SCROLL POSITION, not railCompleted:
            // a fast fling leaves the scrubbed track lagging, so the rail
            // could go inactive with railCompleted stale-false — the card-01
            // hold below then parked the buddy, visible, on card 01's perch
            // (slid off-screen → clamped to the left edge) instead of hiding
            // it, and coming back it re-entered at that wrong spot.
            if (railST && window.scrollY >= railST.end) {
                return { key: "none", idx: -1, rail: false, kind: "none" };
            }
            // The pin's anticipatePin briefly toggles the rail trigger OFF
            // right after it engages (slide still ~0). If we treated THAT as
            // "between sections" the buddy hid and re-appeared (the birth→01
            // disappear-reappear). Only once the rail has actually COMPLETED
            // (reached card 05) is idx 0 the real post-rail gap → hide. Before
            // that, hold on card 01.
            if (!railCompleted && panels.length > 0) {
                return { key: "rail:0", idx: 0, rail: true, kind: "rail" };
            }
            // Reached card 01 and still scrolling UP → leave the rail by
            // retracting INTO the spark icon (mirror of the birth), not the
            // downward spin-away. Distinct key so the change is detected.
            return {
                key: "none:icon",
                idx: -1,
                rail: false,
                kind: "none",
                toIcon: true,
            };
        }
        // The MOMENT the next scene starts to peek over the one this perch
        // belongs to, leave — don't wait for a perch threshold deep in the
        // cover (the buddy was getting caught half-on-screen by the section
        // sliding up underneath it). EXIT_PEEK is early in the cover zone.
        const sec =
            stops[idx]?.el.closest<HTMLElement>("[data-spy-section]")?.id ?? "";
        // Stay hidden until IA has all but finished covering the stack — the
        // orbit around the terminal must play on a CLEAN IA, not over the
        // half-wiped stack/IA overlap.
        if (sec === "ia") {
            const iaCov = sceneCovers["stack"];
            if (iaCov && iaCov.progress < 0.85) {
                return { key: "none", idx: -1, rail: false, kind: "none" };
            }
        }
        const coverT = sceneCovers[sec];
        // 0.22 (not 0.18): a directional:false snap rebounding back toward 0
        // can briefly overshoot ~0.19, which at 0.18 made the buddy hide then
        // re-show (a flicker) as the cut settled. 0.22 clears that overshoot.
        // Experiencia leaves EARLY (0.08) so it slips under the rising
        // proyectos wipe instead of riding on top of it; and it stays hidden
        // for the WHOLE proyectos cover (no upper bound) — proyectos has no
        // wave perches (the finale lupa owns it), so re-showing at the last
        // experiencia dot once cover hits 1 was the "yellow lupa over the
        // proyectos title" bug.
        const isExp = sec === "experiencia";
        const exitT = isExp ? 0.08 : 0.22;
        if (coverT && coverT.progress > exitT && (isExp || coverT.progress < 1)) {
            return { key: "none", idx: -1, rail: false, kind: "none" };
        }
        return { key: "wave:" + idx, idx, rail: false, kind: "wave" };
    };

    interface Desired {
        key: string;
        idx: number;
        rail: boolean;
        kind: string; // "rail" | "wave" | "none"
        toIcon?: boolean; // a "none" exit that retracts INTO the spark icon
    }
    const sectionOf = (d: Desired) =>
        d.rail
            ? "stack"
            : (stops[d.idx]?.el.closest("[data-spy-section]")?.id ?? "");
    const perchGetter = (d: Desired) =>
        d.rail
            ? railPerch(panels[d.idx])
            : () => livePoint(stops[d.idx]);
    const tintOf = (d: Desired, sec: string) =>
        d.rail
            ? panels[d.idx]?.dataset.accent ?? "#D97757"
            : BUDDY_SECTION_COLORS[sec] ?? "#FFFF00";

    /* The companion LEAVES a scene into a perch-less gap (then waits, hidden,
       for the next one). Two flavours:
       • from the stack → the spin-away the user liked.
       • from any later scene → it streaks DOWN into the rising next section
         (stretch + dive + fade, a ring left behind) — NOT a rotate-and-shrink,
         which the user disliked. */
    /* Every between-sections transition brackets itself with these so the
       idle bob (an infinite yPercent tween) can't add vertical wobble on top
       of the transition's own y motion, and so a fresh transition never
       stacks on a half-finished one. */
    const beginTransition = () => {
        transitioning = true;
        activeTransition?.kill();
        bob.pause(0); // freeze the breathing AT yPercent 0
        gsap.set(buddy, { yPercent: 0 });
        gsap.killTweensOf(buddy, "rotation,scaleX,scaleY,autoAlpha,x,y");
    };
    const endTransition = () => {
        transitioning = false;
        activeTransition = null;
        bob.play(); // resume the idle breathing
    };

    const exitHide = (fromSec: string, toIcon = false) => {
        beginTransition();
        const done = () => {
            visible = false;
            hopping = false;
            target = null; // nothing to glue to while hidden
            gsap.set(buddy, { scaleX: 1, scaleY: 1, rotation: 0 });
            endTransition();
        };
        // Top of the rail, scrolling UP: the spark retracts INTO the very SVG
        // icon it was born from — the exact mirror of the birth emerge ("se
        // esconde dentro del SVG de donde sale") — instead of the downward
        // spin-away kept for the stack→IA exit below.
        if (toIcon && origin) {
            // Track the LIVE icon every frame: the page keeps scrolling during
            // the retract, so a one-shot snapshot landed the spark where the
            // icon WAS — desyncing the fade from the SVG. Position, scale AND
            // opacity all ride the SAME eased progress, so the spark reaches
            // opacity 0 exactly as it arrives at the centre of the card-01 SVG
            // — the precise inverse of the birth emerge.
            const liveIcon = () => {
                const r = origin.getBoundingClientRect();
                return {
                    x: gsap.utils.clamp(
                        24,
                        window.innerWidth - 24,
                        r.left + r.width / 2,
                    ),
                    y: gsap.utils.clamp(
                        NAV_OFFSET + 22,
                        window.innerHeight - 24,
                        r.top + r.height / 2,
                    ),
                };
            };
            const from = { x: pos.x, y: pos.y };
            // the icon pulses as it reabsorbs the spark (mirror of release)
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
            const prog = { t: 0 };
            activeTransition = gsap.to(prog, {
                t: 1,
                duration: 0.46,
                ease: "power2.in",
                onUpdate: () => {
                    const e = prog.t;
                    const ic = liveIcon();
                    pos.x = gsap.utils.interpolate(from.x, ic.x, e);
                    pos.y = gsap.utils.interpolate(from.y, ic.y, e);
                    const sc = gsap.utils.interpolate(1, 0.1, e);
                    gsap.set(buddy, {
                        x: pos.x,
                        y: pos.y,
                        scaleX: sc,
                        scaleY: sc,
                        rotation: -200 * e,
                        autoAlpha: 1 - e,
                    });
                },
                onComplete: done,
            });
            return;
        }
        if (fromSec === "stack") {
            activeTransition = gsap.to(buddy, {
                y: pos.y - 80,
                rotation: "+=540",
                scaleX: 0.1,
                scaleY: 0.1,
                autoAlpha: 0,
                duration: 0.48,
                ease: "power2.in",
                onComplete: done,
            });
            return;
        }
        // ia ASCENDING (ia → stack) joins the neutral shrink too: the
        // generic branch below dives DOWNWARD, which on the way up dropped
        // the buddy below where it stood before re-entering the rail.
        if (
            fromSec === "experiencia" ||
            fromSec === "proyectos" ||
            (fromSec === "ia" && lastScrollDir < 0)
        ) {
            // experiencia: fires EARLY (cover 0.08) and just shrinks away in
            // place, so the rising proyectos wipe sweeps over where it was — it
            // reads as covered, not as flying off; the lupa re-emerges behind
            // 01. proyectos: the same neutral shrink-away when the finale hands
            // back UP into experiencia (no downward dive, which would point the
            // wrong way on the ascent).
            activeTransition = gsap.to(buddy, {
                scaleX: 0.5,
                scaleY: 0.5,
                autoAlpha: 0,
                duration: 0.3,
                ease: "power2.in",
                onComplete: done,
            });
            return;
        }
        landPulse(); // a ring blooms where it dives off
        activeTransition = gsap.to(buddy, {
            y: pos.y + 130,
            scaleY: 2,
            scaleX: 0.5,
            autoAlpha: 0,
            duration: 0.4,
            ease: "power2.in",
            onComplete: done,
        });
    };

    /* The companion DROPS IN at a perch — used when it (re)enters a section
       from a hidden gap. It pops in scaled-up, tinted to the section. */
    const enterAt = (
        getter: () => { x: number; y: number },
        tint: string,
    ) => {
        beginTransition();
        const t = getter();
        pos.x = t.x;
        pos.y = t.y;
        target = getter;
        hopping = false;
        visible = true;
        gsap.set(buddy, { x: t.x, y: t.y, rotation: 0, color: tint });
        activeTransition = gsap.fromTo(
            buddy,
            { scaleX: 0.1, scaleY: 0.1, autoAlpha: 0 },
            {
                scaleX: 1,
                scaleY: 1,
                autoAlpha: 1,
                duration: 0.5,
                ease: "back.out(1.7)",
                onComplete: endTransition,
            },
        );
    };

    /* IA entrance: the spark ORBITS the "claude — sesión real" terminal —
       emerging small & dim from behind it, looping around (a depth pulse
       fakes the going-behind since a global fixed element can't truly be
       occluded), then spiralling inward to settle dead-centre of the 4
       cards. Time-based one-shot; the ticker is yielded while it plays. */
    const orbitInTo = (
        getter: () => { x: number; y: number },
        tint: string,
    ) => {
        beginTransition();
        const term = document.querySelector<HTMLElement>("[data-terminal]");
        // Centre is read LIVE each frame: while IA is still sliding into
        // place the terminal keeps moving, and the orbit must hug it the
        // whole time (a one-shot snapshot orbited a stale, low position).
        const termCentre = () => {
            const tr = term?.getBoundingClientRect();
            return tr
                ? { x: tr.left + tr.width / 2, y: tr.top + tr.height / 2 }
                : { x: window.innerWidth * 0.72, y: window.innerHeight * 0.42 };
        };
        const tr0 = term?.getBoundingClientRect();
        // A snug orbit that hugs the terminal box (not a screen-wide swing).
        const R = tr0
            ? gsap.utils.clamp(80, 140, Math.min(tr0.width, tr0.height) * 0.4)
            : 130;
        const turns = 1.2;
        const startA = -Math.PI / 2; // emerge at the terminal's top edge
        const o = { t: 0 };
        visible = true;
        hopping = false;
        target = getter;
        gsap.set(buddy, { color: tint, rotation: 0 });
        activeTransition = gsap.timeline({
            onComplete: () => {
                const f = getter();
                pos.x = f.x;
                pos.y = f.y;
                gsap.set(buddy, { scaleX: 1, scaleY: 1, autoAlpha: 1 });
                endTransition();
            },
        }).to(o, {
            t: 1,
            duration: 0.95,
            ease: "power2.inOut",
            onUpdate: () => {
                // killed/orphaned if the buddy died mid-orbit (scrolled back
                // to the hero) — never paint a dead companion.
                if (!alive) return;
                const t = o.t;
                const ang = startA + t * turns * Math.PI * 2;
                // hold the orbit radius for the first ~55% (a clear loop or
                // so around the box), THEN spiral inward to the grid centre.
                const spiral = Math.max(0, (t - 0.45) / 0.55);
                const r = R * (1 - spiral);
                const tc = termCentre();
                const dest = getter();
                const cx = gsap.utils.interpolate(tc.x, dest.x, spiral);
                const cy = gsap.utils.interpolate(tc.y, dest.y, spiral);
                pos.x = cx + Math.cos(ang) * r;
                pos.y = cy + Math.sin(ang) * r;
                // depth: dimmer/smaller on the far (upper) arc — reads as
                // passing BEHIND the terminal, brighter as it comes round.
                const front = (Math.sin(ang) + 1) / 2; // 0 = behind/top, 1 = front
                const grow = gsap.utils.interpolate(0.4, 1, t);
                const sc = grow * gsap.utils.interpolate(0.78, 1.04, front);
                gsap.set(buddy, {
                    x: pos.x,
                    y: pos.y,
                    scaleX: sc,
                    scaleY: sc,
                    autoAlpha:
                        Math.min(1, t * 3.5) *
                        gsap.utils.interpolate(0.72, 1, front),
                });
            },
        });
    };

    /* Between two CONTIGUOUS sections (no hidden gap, e.g. IA → experiencia):
       spin away then drop straight in at the next section's first perch. */
    const playTransition = (
        getter: () => { x: number; y: number },
        tint: string,
        fromSec: string,
    ) => {
        beginTransition();
        const fast = fromSec === "ia";
        activeTransition = gsap
            .timeline({ onComplete: endTransition })
            .to(buddy, {
                y: pos.y - 70,
                rotation: `+=${fast ? 1080 : 520}`,
                scaleX: 0.05,
                scaleY: 0.05,
                autoAlpha: 0,
                duration: fast ? 0.32 : 0.46,
                ease: "power2.in",
            })
            // a beat fully gone before it drops back in (the user wants the
            // IA→experiencia exit to clearly VANISH, not bounce straight back)
            .to({}, { duration: fast ? 0.16 : 0.04 })
            .add(() => {
                const t = getter();
                pos.x = t.x;
                pos.y = t.y;
                target = getter;
                hopping = false;
                gsap.set(buddy, {
                    x: t.x,
                    y: t.y,
                    rotation: 0,
                    color: tint,
                });
            })
            .to(buddy, {
                scaleX: 1,
                scaleY: 1,
                autoAlpha: 1,
                duration: 0.52,
                ease: "back.out(1.7)",
            });
    };

    companionRail.reset = () => {
        currentKey = ""; // force a fresh perch evaluation next frame
    };

    // A chapter-nav jump hides the companion; once the jump lands and the
    // tick resumes, desiredPerch + the !visible branch re-play the landing
    // section's own entrance (orbit / lupa focus / drop-in). The finale owns
    // itself, so don't touch it there.
    companionNav.hide = () => {
        if (busy) return;
        cancelHop();
        activeTransition?.kill();
        activeTransition = null;
        transitioning = false;
        visible = false;
        currentKey = "";
        curSection = "";
        target = null;
        gsap.killTweensOf(buddy, "x,y,scaleX,scaleY,autoAlpha,rotation");
        gsap.set(buddy, { autoAlpha: 0 });
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
        transitioning,
        visible,
        railEngaged,
        railCompleted,
        navScrolling,
        hasTarget: target !== null,
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
            curSection = "stack";
            hopping = false;
            alive = true;
            visible = true;
            // Born on card 01 → its clean accent, so a fresh descent never
            // inherits a stale colour from a previous trip down the page.
            gsap.set(buddy, {
                x: pos.x,
                y: pos.y,
                color: BUDDY_SECTION_COLORS.stack,
            });
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
            // Snappy: pops out of the icon and is handed straight to the rail
            // (card 01) with no wait — "del SVG al 01, pum".
            gsap.fromTo(
                buddy,
                { autoAlpha: 0, scale: 0, rotation: -90 },
                {
                    autoAlpha: 1,
                    scale: 1,
                    rotation: 0,
                    duration: 0.3,
                    ease: "back.out(2)",
                    overwrite: "auto",
                    onComplete: landPulse,
                },
            );
        },
        onLeaveBack: () => {
            alive = false;
            // Kill any in-flight transition so its onUpdate stops painting a
            // now-dead buddy and `transitioning` never stays stuck true.
            activeTransition?.kill();
            activeTransition = null;
            transitioning = false;
            cancelHop();
            target = null;
            currentKey = "";
            curSection = "";
            visible = false;
            railEngaged = false; // a fresh descent is born on the icon again
            railCompleted = false;
            bob.play(); // ensure the idle bob is live for the next birth
            gsap.set(buddy, { yPercent: 0 });
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

        // The lupa sits squarely OVER each card's big 01 / 02 / 0X numeral.
        const cardPerch = (card: HTMLElement) => () => {
            const numEl =
                card.querySelector<HTMLElement>("[data-card-number]") ?? card;
            const rect = numEl.getBoundingClientRect();
            return {
                x: gsap.utils.clamp(
                    24,
                    window.innerWidth - 24,
                    rect.left + rect.width / 2,
                ),
                y: gsap.utils.clamp(
                    NAV_OFFSET + 22,
                    window.innerHeight - 24,
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
            pos.x = tipCache.x;
            pos.y = tipCache.y;
            gsap.set(buddy, {
                x: pos.x,
                y: pos.y,
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
                // These writes bypass the cached setters below. Invalidate
                // both caches so reversing below 0.94 restores the exact
                // progress-derived clip and content alpha immediately.
                lastClip = "";
                lastBlockAlpha = -1;
                land();
                return;
            }
            if (landed) {
                landed = false;
                gsap.killTweensOf(buddy, "scale,autoAlpha");
                morphShape("proyectos", true); // back to the glass, unseen
            }

            const lensScale = buddyScale(p);
            const scale = lensScale;
            // Visibility follows progress, not scroll direction. On the way
            // back up the shape has already changed from the headset to the
            // magnifier, so using the same gate makes its SVG reappear at the
            // exact point where it disappeared during the descent.
            const shouldShowBuddy = p < 0.92 && (p >= 0.02 || alive);
            const buddyAlpha = shouldShowBuddy ? 1 : 0;

            // The blue lupa shifts to the contacto YELLOW as it flies in and
            // zooms — the next scene's colour arrives through the glass. The
            // glow rides currentColor, so it is never lost, just recoloured.
            if (p >= FLY_START && p < 0.94) {
                const ct = gsap.utils.clamp(
                    0,
                    1,
                    (p - FLY_START) / (0.86 - FLY_START),
                );
                gsap.set(buddy, {
                    color: gsap.utils.interpolate(
                        BUDDY_SECTION_COLORS.proyectos,
                        BUDDY_SECTION_COLORS.contacto,
                        ct,
                    ),
                });
            }

            // Position is a pure function of progress, so scrolling upward
            // retraces the exact same card → centre path in reverse.
            if (p < FLY_START) {
                if (manualXY) {
                    // Hand the ticker the exact visible position reached by
                    // the reversed flight. A stale `pos` made startHop() jump
                    // back to the centre and repeat the trip to card 03.
                    pos.x = Number(gsap.getProperty(buddy, "x"));
                    pos.y = Number(gsap.getProperty(buddy, "y"));
                    gsap.killTweensOf(
                        buddy,
                        "scaleX,scaleY,rotation,color",
                    );
                    gsap.set(buddy, {
                        scaleX: 1,
                        scaleY: 1,
                        rotation: 0,
                        color: BUDDY_SECTION_COLORS.proyectos,
                    });
                }
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
                    pos.x = gsap.utils.interpolate(
                        from.x,
                        window.innerWidth / 2,
                        t,
                    );
                    pos.y = gsap.utils.interpolate(
                        from.y,
                        window.innerHeight / 2,
                        t,
                    );
                    gsap.set(buddy, {
                        x: pos.x,
                        y: pos.y,
                        rotation: 0,
                    });
                } else {
                    pos.x = window.innerWidth / 2;
                    pos.y = window.innerHeight / 2;
                    gsap.set(buddy, {
                        x: pos.x,
                        y: pos.y,
                    });
                }
            }

            // A time-based bob cannot be reversed by scroll. Freeze it for the
            // whole scrubbed finale so equal progress always means equal Y.
            bob.pause(0);
            gsap.set(buddy, { yPercent: 0 });
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
                autoAlpha: buddyAlpha,
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
            // The finale is scrubbed, so its shape must be deterministic too:
            // never leave a deferred morph callback between two scroll frames.
            if (p > 0.05 && p < 0.92) morphShape("proyectos", true);
            // Keep the glow through the visible part of the zoom (the user
            // wants it kept while it recolours to yellow); only drop it once
            // the glass is huge enough that the blur would wash the frame.
            buddy.classList.toggle("buddy-zooming", scale > 9);

            // Contact revealed exactly through the lens — but only once
            // the glass has taken centre stage (a quick iris-in, then it
            // tracks the lens radius). The clip is element-relative while
            // the section still rises, so the centre is computed back from
            // the viewport lens position. Redundant writes are skipped.
            const cy = (p - 0.5) * window.innerHeight;
            const iris = gsap.utils.clamp(0, 1, (p - 0.68) / 0.06);
            const radius = Math.max(0, LENS_R * lensScale - 6) * iris;
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
            // The lupa must SHOW UP the instant proyectos is entered (nav snap
            // or natural scroll), not after scrolling to the section's foot.
            // "top bottom" fired only when contacto's top reached the viewport
            // bottom — i.e. when proyectos' foot was already at the fold, a
            // ~182px gap past the snap. Pulling the start down by
            // (proyectosHeight - viewport + NAV_OFFSET) lands the activation
            // exactly on the proyectos snap, so the scan begins on arrival.
            start: () =>
                `top bottom+=${Math.max(0, proyectos.offsetHeight - window.innerHeight + NAV_OFFSET)}`,
            end: "top top",
            invalidateOnRefresh: true,
            onToggle: (self) => {
                busy = self.isActive;
                if (busy) {
                    // The finale takes exclusive control. A still-running
                    // section transition would otherwise keep overwriting its
                    // progress-derived x/y/alpha/color on the first frames.
                    activeTransition?.kill();
                    activeTransition = null;
                    transitioning = false;
                    gsap.killTweensOf(buddy, "color");
                    cancelHop();
                    // onUpdate fires BEFORE onToggle in the same tick: let
                    // the scan re-claim immediately if it just started.
                    scanIdx = -1;
                    inspect(-1);
                    // The lupa SHOWS UP already placed on card 01's numeral —
                    // it pops in from behind the first card, not travelling in
                    // from the experiencia rail. Gated on the SCAN zone (not
                    // scroll direction): the focus-in pop belongs to the fresh
                    // top-entry only; re-entering from below lands at high
                    // progress (the zoom), where applyFinale owns placement.
                    if (cards[0] && self.progress < FLY_START) {
                        const c0 = cardPerch(cards[0])();
                        pos.x = c0.x;
                        pos.y = c0.y;
                        // back on top (it dipped under the wipe leaving exp),
                        // BLUE, popping out from behind card 01's numeral.
                        buddy.style.zIndex = "";
                        gsap.set(buddy, {
                            x: c0.x,
                            y: c0.y,
                            color: BUDDY_SECTION_COLORS.proyectos,
                        });
                        // Lens FOCUS-IN: swoops in big, rotated and blurred,
                        // then snaps sharp onto the 01 with a ring bloom — like
                        // a magnifier finding focus.
                        gsap.fromTo(
                            buddy,
                            { scale: 2.6, rotation: -45, autoAlpha: 0 },
                            {
                                scale: 1,
                                rotation: 0,
                                autoAlpha: 1,
                                duration: 0.6,
                                ease: "power3.out",
                                overwrite: "auto",
                                onComplete: landPulse,
                            },
                        );
                    }
                    // Only the SCAN zone owns card placement/highlight. Gating
                    // this (like the focus-in pop above) stops a high-progress
                    // re-entry while scrolling UP from stranding a .card-
                    // inspected highlight on card 03; the zoom/land branches of
                    // applyFinale own everything above FLY_START.
                    if (self.progress < FLY_START) scanTick(self.progress);
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
                    if (self.direction < 0) {
                        // Ascending OUT of the finale into experiencia: the
                        // lupa must LEAVE (shrink away) like experiencia does
                        // on the way down, then re-appear popped-in on the
                        // experiencia dot once the cover clears — instead of
                        // stranding, visible-but-untracked, on the card-01
                        // alignment until the experiencia perch finally snaps
                        // in (the "stuck then sudden jump" the owner saw).
                        target = null;
                        visible = true; // so exitHide actually runs
                        exitHide("proyectos");
                    }
                }
            },
            onUpdate: (self) => applyFinale(self.progress),
            onLeave: () => {
                gsap.set(contacto, { clipPath: "none" });
                gsap.set(contactoBlocks, { autoAlpha: 1 });
                lastClip = "";
                lastBlockAlpha = -1;
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
            landed = false;
            currentKey = "";
            scanIdx = -1;
            inspect(-1);
            buddy.classList.remove("buddy-zooming");
            bob.play();
            gsap.set(buddy, {
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

/* ── Scroll speed limit ──
   Desktop wheel/trackpad scrolling is taken over and EASED toward a target
   with a hard per-frame cap, so you can never fling past the cinematic
   animations — the spark, the wipes and the snaps always get their moment.
   It stays idle (native scroll) unless a wheel gesture is in flight, so the
   chapter-nav scrollTo, the cinematic snaps, the keyboard and the scrollbar
   keep working untouched (the eased gesture ends the instant it settles, and
   ScrollTrigger only fires a snap on that settle). Touch keeps native
   momentum (no wheel events fire). */
function initSmoothScroll() {
    if (!window.matchMedia("(min-width: 1024px)").matches) return;

    let target = window.scrollY;
    let active = false;
    let lastApplied = window.scrollY; // the scroll value WE last wrote
    const maxScroll = () =>
        Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    window.addEventListener(
        "wheel",
        (e) => {
            if (e.ctrlKey) return; // leave pinch-zoom alone
            e.preventDefault();
            if (navScrolling) return; // a nav jump owns the scroll: swallow it
            if (!active) target = window.scrollY; // sync on a fresh gesture
            target = gsap.utils.clamp(0, maxScroll(), target + e.deltaY);
            active = true;
        },
        { passive: false },
    );

    const LERP = 0.1; // lower = more controlled
    const cap = () => window.innerHeight * 0.09; // hard speed ceiling / frame

    gsap.ticker.add(() => {
        if (navScrolling || !active) {
            active = false;
            lastApplied = window.scrollY; // track so we never false-trigger
            return; // idle / nav jump: leave the scroll alone
        }
        const cur = window.scrollY;
        // A programmatic scroll (chapter-nav scrollTo, a cinematic snap, the
        // keyboard or the scrollbar) moved the page since our last frame —
        // YIELD instantly. Otherwise we ease the page back to our stale
        // target, i.e. "click a nav link, it goes there, then snaps back to
        // where you were". That is the bug this guards against.
        if (Math.abs(cur - lastApplied) > 2) {
            active = false;
            target = cur;
            lastApplied = cur;
            return;
        }
        const diff = target - cur;
        if (Math.abs(diff) < 0.5) {
            active = false;
            lastApplied = cur;
            return;
        }
        const step = gsap.utils.clamp(-cap(), cap(), diff * LERP);
        window.scrollTo(0, cur + step);
        lastApplied = window.scrollY;
    });
}

/* ── Custom cursor (desktop, fine pointer) ──
   A precise dot that tracks instantly + a ring that trails with easing and
   swells over anything interactive. mix-blend keeps it legible on any tone. */
function initCustomCursor() {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (document.querySelector(".custom-cursor")) return;

    const wrap = document.createElement("div");
    wrap.className = "custom-cursor";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML = `<span class="cc-ring"></span><span class="cc-dot"></span>`;
    document.body.appendChild(wrap);
    document.documentElement.classList.add("has-custom-cursor");

    const ring = wrap.querySelector<HTMLElement>(".cc-ring");
    const dot = wrap.querySelector<HTMLElement>(".cc-dot");
    if (!ring || !dot) return;

    const rx = gsap.quickTo(ring, "x", { duration: 0.14, ease: "power3" });
    const ry = gsap.quickTo(ring, "y", { duration: 0.14, ease: "power3" });
    const dx = gsap.quickTo(dot, "x", { duration: 0.03, ease: "power2" });
    const dy = gsap.quickTo(dot, "y", { duration: 0.03, ease: "power2" });

    let shown = false;
    window.addEventListener(
        "mousemove",
        (e) => {
            if (!shown) {
                shown = true;
                wrap.classList.add("cc-visible");
            }
            rx(e.clientX);
            ry(e.clientY);
            dx(e.clientX);
            dy(e.clientY);
        },
        { passive: true },
    );

    const INTERACTIVE =
        "a, button, [data-magnetic], [data-tilt], input, textarea, select, label, [role='button'], .chapter-nav a, .lang-switch";
    document.addEventListener("mouseover", (e) => {
        if ((e.target as HTMLElement).closest(INTERACTIVE)) {
            wrap.classList.add("cc-hover");
        }
    });
    document.addEventListener("mouseout", (e) => {
        const to = (e as MouseEvent).relatedTarget as HTMLElement | null;
        if (
            (e.target as HTMLElement).closest(INTERACTIVE) &&
            !to?.closest?.(INTERACTIVE)
        ) {
            wrap.classList.remove("cc-hover");
        }
    });
    document.addEventListener("mousedown", () => wrap.classList.add("cc-down"));
    document.addEventListener("mouseup", () => wrap.classList.remove("cc-down"));
    document.documentElement.addEventListener("mouseleave", () =>
        wrap.classList.remove("cc-visible"),
    );
    document.documentElement.addEventListener("mouseenter", () => {
        if (shown) wrap.classList.add("cc-visible");
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
    initIAHold();
    initCinematicTransitions();
    initScrollCompanion();
    initSectionTitles();
    initReveals();
    initTerminal();
    initTimeline();
    initMarquees();
    initScrollSpy();
    initSmoothScroll();
    initCustomCursor();

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
