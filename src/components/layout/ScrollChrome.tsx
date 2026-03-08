import React, { useEffect, useRef, useState } from "react";

const DESKTOP_MIN_WIDTH = 1024;
const MIN_THUMB_HEIGHT = 72;
const MAX_THUMB_RATIO = 0.42;
const SMOOTHING = 0.42;
const DRAG_SMOOTHING = 1;

type Measurements = {
    maxScroll: number;
    trackHeight: number;
    thumbHeight: number;
};

const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

const ScrollChrome: React.FC = () => {
    const shellRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLSpanElement>(null);
    const frameRef = useRef<number | null>(null);
    const draggingRef = useRef(false);
    const dragOffsetRef = useRef(0);
    const currentProgressRef = useRef(0);
    const targetProgressRef = useRef(0);
    const measurementsRef = useRef<Measurements>({
        maxScroll: 0,
        trackHeight: 0,
        thumbHeight: MIN_THUMB_HEIGHT,
    });

    const [enabled, setEnabled] = useState(false);
    const [interactive, setInteractive] = useState(false);
    const [visible, setVisible] = useState(false);

    const applyStyles = () => {
        const shell = shellRef.current;
        if (!shell) return;

        const { trackHeight, thumbHeight } = measurementsRef.current;
        const travel = Math.max(trackHeight - thumbHeight, 0);
        const offset = currentProgressRef.current * travel;
        const progressLabel = `${Math.round(currentProgressRef.current * 100)}%`;

        shell.style.setProperty("--scroll-thumb-size", `${thumbHeight.toFixed(2)}px`);
        shell.style.setProperty("--scroll-thumb-offset", `${offset.toFixed(2)}px`);
        shell.style.setProperty(
            "--scroll-progress",
            currentProgressRef.current.toFixed(4),
        );

        if (labelRef.current) {
            labelRef.current.textContent = progressLabel;
        }
    };

    const stopAnimation = () => {
        if (frameRef.current !== null) {
            window.cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        }
    };

    const animate = () => {
        const smoothing = draggingRef.current ? DRAG_SMOOTHING : SMOOTHING;
        const difference = targetProgressRef.current - currentProgressRef.current;

        if (Math.abs(difference) <= 0.001) {
            currentProgressRef.current = targetProgressRef.current;
            applyStyles();
            frameRef.current = null;
            return;
        }

        currentProgressRef.current += difference * smoothing;
        applyStyles();
        frameRef.current = window.requestAnimationFrame(animate);
    };

    const scheduleAnimation = () => {
        if (frameRef.current !== null) return;
        frameRef.current = window.requestAnimationFrame(animate);
    };

    const syncProgressFromWindow = (immediate = false) => {
        const { maxScroll } = measurementsRef.current;
        const nextProgress =
            maxScroll > 0 ? clamp(window.scrollY / maxScroll, 0, 1) : 0;

        targetProgressRef.current = nextProgress;

        if (
            immediate ||
            Math.abs(nextProgress - currentProgressRef.current) <= 0.02
        ) {
            currentProgressRef.current = nextProgress;
            applyStyles();
            stopAnimation();
            return;
        }

        scheduleAnimation();
    };

    const measure = () => {
        const root = document.documentElement;
        const trackHeight =
            trackRef.current?.clientHeight ?? Math.min(window.innerHeight * 0.54, 460);
        const maxScroll = Math.max(root.scrollHeight - window.innerHeight, 0);
        const rawThumbHeight =
            maxScroll > 0 ? trackHeight * (window.innerHeight / root.scrollHeight) : trackHeight;
        const thumbHeight = clamp(
            rawThumbHeight,
            MIN_THUMB_HEIGHT,
            Math.max(MIN_THUMB_HEIGHT, trackHeight * MAX_THUMB_RATIO),
        );

        measurementsRef.current = {
            maxScroll,
            trackHeight,
            thumbHeight,
        };

        setVisible(maxScroll > 32);

        if (!draggingRef.current) {
            targetProgressRef.current =
                maxScroll > 0 ? clamp(window.scrollY / maxScroll, 0, 1) : 0;
            if (Math.abs(currentProgressRef.current - targetProgressRef.current) <= 0.001) {
                currentProgressRef.current = targetProgressRef.current;
                applyStyles();
            } else {
                scheduleAnimation();
            }
        } else {
            applyStyles();
        }
    };

    const scrollToProgress = (progress: number, behavior: ScrollBehavior) => {
        const { maxScroll } = measurementsRef.current;
        const nextProgress = clamp(progress, 0, 1);
        targetProgressRef.current = nextProgress;
        currentProgressRef.current = nextProgress;
        applyStyles();

        window.scrollTo({
            top: nextProgress * maxScroll,
            behavior,
        });
    };

    const updateDragPosition = (clientY: number) => {
        const track = trackRef.current;
        if (!track) return;

        const { trackHeight, thumbHeight } = measurementsRef.current;
        const travel = Math.max(trackHeight - thumbHeight, 0);
        if (travel <= 0) return;

        const rect = track.getBoundingClientRect();
        const nextOffset = clamp(clientY - rect.top - dragOffsetRef.current, 0, travel);
        const nextProgress = nextOffset / travel;

        scrollToProgress(nextProgress, "auto");
    };

    useEffect(() => {
        if (typeof window === "undefined") return;

        const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
        const reducedMotionQuery = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        );

        const syncEnabledState = () => {
            const canUseCustomScrollbar =
                !coarsePointerQuery.matches &&
                !reducedMotionQuery.matches &&
                window.innerWidth >= DESKTOP_MIN_WIDTH;

            setEnabled(canUseCustomScrollbar);
        };

        syncEnabledState();
        window.addEventListener("resize", syncEnabledState);
        document.addEventListener("astro:page-load", syncEnabledState);
        coarsePointerQuery.addEventListener("change", syncEnabledState);
        reducedMotionQuery.addEventListener("change", syncEnabledState);

        return () => {
            window.removeEventListener("resize", syncEnabledState);
            document.removeEventListener("astro:page-load", syncEnabledState);
            coarsePointerQuery.removeEventListener("change", syncEnabledState);
            reducedMotionQuery.removeEventListener("change", syncEnabledState);
        };
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const root = document.documentElement;

        if (!enabled) {
            root.classList.remove("has-custom-scrollbar");
            stopAnimation();
            setVisible(false);
            return;
        }

        root.classList.add("has-custom-scrollbar");

        const handleScroll = () => {
            if (draggingRef.current) return;
            syncProgressFromWindow(true);
        };

        const handleResize = () => {
            measure();
        };

        const handlePointerMove = (event: PointerEvent) => {
            if (!draggingRef.current) return;
            updateDragPosition(event.clientY);
        };

        const handlePointerUp = () => {
            if (!draggingRef.current) return;

            draggingRef.current = false;
            document.body.classList.remove("scrollbar-dragging");
            setInteractive(false);
            syncProgressFromWindow();
        };

        const resizeObserver = new ResizeObserver(() => {
            measure();
        });

        resizeObserver.observe(document.documentElement);
        resizeObserver.observe(document.body);

        window.addEventListener("scroll", handleScroll, { passive: true });
        window.addEventListener("resize", handleResize);
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        document.addEventListener("astro:page-load", measure);

        const initialMeasure = window.requestAnimationFrame(() => {
            measure();
        });

        return () => {
            window.cancelAnimationFrame(initialMeasure);
            resizeObserver.disconnect();
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            document.removeEventListener("astro:page-load", measure);
            document.body.classList.remove("scrollbar-dragging");
            root.classList.remove("has-custom-scrollbar");
            stopAnimation();
            draggingRef.current = false;
        };
    }, [enabled]);

    if (!enabled) return null;

    const handleTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!visible) return;

        const track = trackRef.current;
        if (!track) return;

        const { trackHeight, thumbHeight } = measurementsRef.current;
        const travel = Math.max(trackHeight - thumbHeight, 0);
        if (travel <= 0) return;

        const rect = track.getBoundingClientRect();
        const nextOffset = clamp(
            event.clientY - rect.top - thumbHeight / 2,
            0,
            travel,
        );

        scrollToProgress(nextOffset / travel, "auto");
        setInteractive(true);
    };

    const handleThumbPointerDown = (
        event: React.PointerEvent<HTMLButtonElement>,
    ) => {
        event.preventDefault();
        event.stopPropagation();

        const thumbRect = event.currentTarget.getBoundingClientRect();
        draggingRef.current = true;
        dragOffsetRef.current = event.clientY - thumbRect.top;
        document.body.classList.add("scrollbar-dragging");
        setInteractive(true);
    };

    return (
        <div
            ref={shellRef}
            aria-hidden="true"
            className="custom-scrollbar-shell"
            data-hovered={interactive ? "true" : "false"}
            data-visible={visible ? "true" : "false"}
            onMouseEnter={() => setInteractive(true)}
            onMouseLeave={() => {
                if (!draggingRef.current) {
                    setInteractive(false);
                }
            }}
        >
            <div className="custom-scrollbar-hitbox">
                <div
                    ref={trackRef}
                    className="custom-scrollbar-rail"
                    onPointerDown={handleTrackPointerDown}
                >
                    <div className="custom-scrollbar-track-core" />
                    <div className="custom-scrollbar-halo" />

                    <button
                        type="button"
                        tabIndex={-1}
                        data-scroll-thumb="true"
                        className="custom-scrollbar-thumb"
                        onPointerDown={handleThumbPointerDown}
                    >
                        <span className="custom-scrollbar-thumb-core" />
                        <span className="custom-scrollbar-thumb-shine" />
                    </button>

                    <span ref={labelRef} className="custom-scrollbar-label">
                        0%
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ScrollChrome;
