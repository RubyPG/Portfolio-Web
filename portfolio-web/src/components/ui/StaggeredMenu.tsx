"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { contactChannels } from "@/config/contact";
import styles from "./StaggeredMenu.module.css";

export type MenuSection = "hero" | "projects" | "stack" | "about" | "contact";

export interface StaggeredMenuProps {
  ready?: boolean;
  disabled?: boolean;
  currentSection?: string;
  onNavigate(section: MenuSection): Promise<void>;
  onOpenChange(open: boolean): void;
}

const items: { section: MenuSection; label: string; href: string }[] = [
  { section: "hero", label: "Inicio", href: "#inicio" },
  { section: "projects", label: "Proyectos", href: "#proyectos" },
  { section: "stack", label: "Mi stack", href: "#stack" },
  { section: "about", label: "Sobre mí", href: "#sobre-mi" },
  { section: "contact", label: "Contacto", href: "#contacto" },
];

type MenuControls = {
  open(): void;
  close(restoreFocus: boolean): Promise<void>;
};

/** Adapted from the supplied React Bits StaggeredMenu. See LICENSE-react-bits.md.
 * Keeps the staggered colored sheets, clipped rotating labels, rolling toggle
 * and morphing plus; scene navigation remains owned by LandingStory.
 */
export function StaggeredMenu({
  ready = true,
  disabled = false,
  currentSection = "hero",
  onNavigate,
  onOpenChange,
}: StaggeredMenuProps) {
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const controls = useRef<MenuControls | null>(null);
  const phase = useRef<"closed" | "opening" | "open" | "closing">("closed");
  const navigating = useRef(false);
  const latest = useRef({ ready, disabled, onNavigate, onOpenChange });
  const [open, setOpen] = useState(false);
  const [present, setPresent] = useState(false);
  const panelId = useId();

  useEffect(() => {
    latest.current = { ready, disabled, onNavigate, onOpenChange };
  }, [ready, disabled, onNavigate, onOpenChange]);

  useGSAP(
    (_context, contextSafe) => {
      if (!ready || !contextSafe) return;
      const scope = root.current!;
      const surface = panel.current!;
      const trigger = button.current!;
      const layers = gsap.utils.toArray<HTMLElement>(
        "[data-menu-layer]",
        scope,
      );
      const labels = surface.querySelectorAll("[data-menu-label]");
      const numbers = surface.querySelectorAll("[data-menu-number]");
      const socials = surface.querySelectorAll("[data-menu-social]");
      const text = scope.querySelector("[data-menu-toggle-text]");
      const horizontal = scope.querySelector("[data-menu-plus-h]");
      const vertical = scope.querySelector("[data-menu-plus-v]");
      const backdrop = scope.querySelector("[data-menu-backdrop]");
      const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
      let alive = true;
      let animation: gsap.core.Timeline | null = null;
      let closePromise: Promise<void> | null = null;
      let resolveClose: (() => void) | null = null;
      let focusFrame = 0;

      // CSS keeps the sheets offscreen before hydration. CSSPlugin reads that
      // translateX as pixels: clear x before animating the percentage channel.
      gsap.set([...layers, surface], { x: 0, xPercent: 100 });
      gsap.set(labels, { yPercent: 140, rotation: 10 });
      gsap.set(numbers, { opacity: 0 });
      gsap.set(socials, { y: 25, opacity: 0 });
      gsap.set(vertical, { rotation: 90 });
      gsap.set(horizontal, { rotation: 0 });
      gsap.set(text, { yPercent: 0 });
      gsap.set(backdrop, { opacity: 0 });

      const focusFirst = () => {
        if (alive && phase.current === "open" && !navigating.current)
          surface.querySelector<HTMLAnchorElement>("[data-menu-link]")?.focus();
      };
      const openMenu = contextSafe(() => {
        if (
          !latest.current.ready ||
          latest.current.disabled ||
          navigating.current ||
          phase.current !== "closed"
        )
          return;
        animation?.kill();
        phase.current = "opening";
        setPresent(true);
        setOpen(true);
        latest.current.onOpenChange(true);
        surface.scrollTop = 0;
        animation = gsap.timeline({
          paused: true,
          onComplete: () => {
            phase.current = "open";
            // React must remove the panel's inert attribute before focus moves.
            focusFrame = requestAnimationFrame(focusFirst);
          },
        });
        const fast = motion.matches;
        layers.forEach((layer, index) => {
          animation!.to(
            layer,
            {
              x: 0,
              xPercent: 0,
              duration: fast ? 0.001 : 0.5,
              ease: "power4.out",
            },
            fast ? 0 : index * 0.07,
          );
        });
        animation
          .to(
            surface,
            {
              x: 0,
              xPercent: 0,
              duration: fast ? 0.001 : 0.65,
              ease: "power4.out",
            },
            fast ? 0 : 0.15,
          )
          .to(
            labels,
            {
              yPercent: 0,
              rotation: 0,
              duration: fast ? 0.001 : 0.7,
              stagger: fast ? 0 : 0.065,
              ease: "power4.out",
            },
            fast ? 0 : 0.24,
          )
          .to(
            numbers,
            {
              opacity: 1,
              duration: fast ? 0.001 : 0.45,
              stagger: fast ? 0 : 0.065,
            },
            fast ? 0 : 0.34,
          )
          .to(
            socials,
            {
              y: 0,
              opacity: 1,
              duration: fast ? 0.001 : 0.5,
              stagger: fast ? 0 : 0.06,
              ease: "power3.out",
            },
            fast ? 0 : 0.4,
          )
          .to(
            horizontal,
            { rotation: 45, duration: fast ? 0.001 : 0.5, ease: "power4.out" },
            0,
          )
          .to(
            vertical,
            { rotation: -45, duration: fast ? 0.001 : 0.5, ease: "power4.out" },
            0,
          )
          .to(
            text,
            {
              yPercent: -75,
              duration: fast ? 0.001 : 0.68,
              ease: "power4.out",
            },
            0,
          )
          .to(backdrop, { opacity: 1, duration: fast ? 0.001 : 0.3 }, 0);
        if (fast) animation.progress(1);
        else animation.play(0);
      });

      const closeMenu = contextSafe((restoreFocus: boolean): Promise<void> => {
        if (phase.current === "closed") return Promise.resolve();
        if (phase.current === "closing")
          return closePromise ?? Promise.resolve();
        animation?.kill();
        phase.current = "closing";
        setOpen(false);
        closePromise = new Promise<void>((resolve) => {
          resolveClose = resolve;
        });
        const pending = closePromise;
        animation = gsap.timeline({
          paused: true,
          onComplete: () => {
            gsap.set(labels, { yPercent: 140, rotation: 10 });
            gsap.set(numbers, { opacity: 0 });
            gsap.set(socials, { y: 25, opacity: 0 });
            phase.current = "closed";
            setPresent(false);
            latest.current.onOpenChange(false);
            if (restoreFocus && alive && !navigating.current)
              trigger.focus({ preventScroll: true });
            resolveClose?.();
            resolveClose = null;
            closePromise = null;
          },
        });
        const duration = motion.matches ? 0.001 : 0.32;
        animation
          .to(
            [...layers, surface],
            { x: 0, xPercent: 100, duration, ease: "power3.in" },
            0,
          )
          .to(horizontal, { rotation: 0, duration, ease: "power3.inOut" }, 0)
          .to(vertical, { rotation: 90, duration, ease: "power3.inOut" }, 0)
          .to(text, { yPercent: 0, duration, ease: "power3.inOut" }, 0)
          .to(backdrop, { opacity: 0, duration }, 0);
        if (motion.matches) animation.progress(1);
        else animation.play(0);
        return pending;
      });
      controls.current = { open: openMenu, close: closeMenu };

      const preferenceChanged = () => {
        if (motion.matches) animation?.progress(1);
      };
      const blockBackdropScroll = (event: Event) => {
        if (
          phase.current !== "closed" &&
          !surface.contains(event.target as Node)
        )
          event.preventDefault();
      };
      const keyboard = (event: KeyboardEvent) => {
        if (phase.current === "closed") return;
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          void closeMenu(true);
        } else if (event.key === "Tab") {
          const focusable = [
            trigger,
            ...surface.querySelectorAll<HTMLElement>(
              "a[href],button:not(:disabled)",
            ),
          ].filter(
            (element) =>
              !element.closest("[inert]") && !element.hasAttribute("disabled"),
          );
          const first = focusable[0];
          const last = focusable.at(-1);
          if (!first || !last) return;
          if (
            event.shiftKey &&
            (document.activeElement === first ||
              !scope.contains(document.activeElement))
          ) {
            event.preventDefault();
            last.focus();
          } else if (
            !event.shiftKey &&
            (document.activeElement === last ||
              !scope.contains(document.activeElement))
          ) {
            event.preventDefault();
            first.focus();
          }
        }
      };
      scope.addEventListener("wheel", blockBackdropScroll, { passive: false });
      scope.addEventListener("touchmove", blockBackdropScroll, {
        passive: false,
      });
      scope.addEventListener("keydown", keyboard);
      motion.addEventListener("change", preferenceChanged);
      return () => {
        alive = false;
        cancelAnimationFrame(focusFrame);
        animation?.kill();
        controls.current = null;
        resolveClose?.();
        scope.removeEventListener("wheel", blockBackdropScroll);
        scope.removeEventListener("touchmove", blockBackdropScroll);
        scope.removeEventListener("keydown", keyboard);
        motion.removeEventListener("change", preferenceChanged);
      };
    },
    { scope: root, dependencies: [ready], revertOnUpdate: true },
  );

  const navigate = async (
    event: MouseEvent<HTMLAnchorElement>,
    section: MenuSection,
  ) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    if (navigating.current || disabled) return;
    navigating.current = true;
    try {
      await Promise.all([controls.current?.close(false), onNavigate(section)]);
    } finally {
      navigating.current = false;
    }
  };

  return (
    <div
      ref={root}
      className={styles.root}
      data-site-menu
      data-open={present || undefined}
      hidden={!ready}
      role={present ? "dialog" : undefined}
      aria-modal={present || undefined}
      aria-label={present ? "Navegación principal" : undefined}
    >
      <div
        className={styles.backdrop}
        data-menu-backdrop
        aria-hidden="true"
        onClick={() => {
          void controls.current?.close(true);
        }}
      />
      <div className={styles.preLayers} aria-hidden="true">
        <div className={`${styles.preLayer} ${styles.jade}`} data-menu-layer />
        <div
          className={`${styles.preLayer} ${styles.sangria}`}
          data-menu-layer
        />
      </div>
      <button
        ref={button}
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        disabled={disabled && !present}
        onClick={() => {
          if (phase.current === "closed") controls.current?.open();
          else void controls.current?.close(true);
        }}
      >
        <span className={styles.textWindow} aria-hidden="true">
          <span className={styles.textRoll} data-menu-toggle-text>
            {["Menú", "Cerrar", "Menú", "Cerrar"].map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </span>
        </span>
        <span className={styles.icon} aria-hidden="true">
          <span data-menu-plus-h />
          <span data-menu-plus-v />
        </span>
      </button>
      <aside
        ref={panel}
        id={panelId}
        className={styles.panel}
        aria-hidden={!present}
        inert={!open}
      >
        <nav aria-label="Secciones del portfolio">
          <ol className={styles.list}>
            {items.map((item, index) => (
              <li key={item.section} className={styles.item}>
                <a
                  href={item.href}
                  className={styles.link}
                  data-menu-link
                  aria-current={
                    currentSection === item.section ? "location" : undefined
                  }
                  onClick={(event) => {
                    void navigate(event, item.section);
                  }}
                >
                  <span className={styles.label} data-menu-label>
                    {item.label}
                  </span>
                  <span
                    className={styles.number}
                    data-menu-number
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <footer className={styles.footer}>
          <span className={styles.signature} data-menu-social>
            RubenPG
          </span>
          <div className={styles.socials}>
            <a
              href={contactChannels.github}
              target="_blank"
              rel="noopener noreferrer"
              data-menu-social
            >
              GitHub ↗
            </a>
            <a href={`mailto:${contactChannels.email}`} data-menu-social>
              Escríbeme ↗
            </a>
          </div>
        </footer>
      </aside>
    </div>
  );
}
