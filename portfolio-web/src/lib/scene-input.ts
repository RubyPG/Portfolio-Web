type SceneDirection = -1 | 1;
type GestureRoute = "scene" | "delegate" | "native";

interface SceneInputOptions {
  element: HTMLElement;
  isBlocked(): boolean;
  isDetailOpen(): boolean;
  handlesDirection(direction: SceneDirection): boolean;
  onStep(direction: SceneDirection): void;
}

interface TouchGesture {
  identifier: number;
  x: number;
  y: number;
  consumed: boolean;
  route: GestureRoute | null;
  direction: SceneDirection | null;
}

const WHEEL_IDLE_MS = 220;
const WHEEL_THRESHOLD = 18;
const TOUCH_THRESHOLD = 24;
const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]';

/** Own one scene step per fresh gesture, without queuing input during motion. */
export function createSceneInput(options: SceneInputOptions): {
  resetGesture(): void;
  destroy(): void;
} {
  const { element } = options;
  const wheelGesture = {
    lastAt: -Infinity,
    distance: 0,
    consumed: false,
    route: "scene" as GestureRoute,
    direction: 1 as SceneDirection,
  };
  let touchGesture: TouchGesture | null = null;

  const inScene = (event: Event) =>
    !(
      event.target instanceof Element &&
      event.target.closest("[data-site-menu]")
    ) && event.composedPath().includes(element);
  const consume = (event: Event) => {
    if (event.cancelable) event.preventDefault();
    // This listener owns the gesture before nested showcase handlers see it.
    event.stopImmediatePropagation();
  };
  const editsField = (event: Event) =>
    event.target instanceof Element &&
    Boolean(event.target.closest(EDITABLE_SELECTOR));

  const wheel = (event: WheelEvent) => {
    if (
      !inScene(event) ||
      event.ctrlKey ||
      event.shiftKey ||
      Math.abs(event.deltaY) <= Math.abs(event.deltaX)
    )
      return;

    const now = performance.now();
    const direction: SceneDirection = event.deltaY > 0 ? 1 : -1;
    if (now - wheelGesture.lastAt > WHEEL_IDLE_MS) {
      wheelGesture.distance = 0;
      wheelGesture.consumed = options.isBlocked() || options.isDetailOpen();
      wheelGesture.direction = direction;
      wheelGesture.route = editsField(event)
        ? "native"
        : options.handlesDirection(direction)
          ? "scene"
          : "delegate";
    }
    wheelGesture.lastAt = now;

    if (options.isDetailOpen()) {
      wheelGesture.consumed = true;
      return;
    }
    if (options.isBlocked()) wheelGesture.consumed = true;
    if (wheelGesture.consumed) {
      consume(event);
      return;
    }
    // A gesture inside an editor belongs to that field until it ends, even
    // when its own scroll reaches an edge or the pointer leaves the field.
    if (wheelGesture.route === "native") return;
    // Ownership is chosen at gesture start, never promoted halfway through.
    if (wheelGesture.route === "delegate") {
      if (options.handlesDirection(direction)) consume(event);
      return;
    }
    consume(event);
    if (direction !== wheelGesture.direction) return;

    const unit =
      event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
          ? window.innerHeight
          : 1;
    wheelGesture.distance += Math.abs(event.deltaY) * unit;
    if (wheelGesture.distance < WHEEL_THRESHOLD) return;
    wheelGesture.consumed = true;
    options.onStep(direction);
  };

  const touchStart = (event: TouchEvent) => {
    if (!inScene(event) || event.touches.length !== 1) {
      touchGesture = null;
      return;
    }
    const touch = event.touches[0];
    touchGesture = {
      identifier: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      consumed: options.isBlocked() || options.isDetailOpen(),
      route: editsField(event) ? "native" : null,
      direction: null,
    };
  };

  const touchMove = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      touchGesture = null;
      return;
    }
    const gesture = touchGesture;
    const touch = event.touches[0];
    if (!gesture || touch.identifier !== gesture.identifier || !inScene(event))
      return;
    if (options.isDetailOpen()) {
      gesture.consumed = true;
      return;
    }
    const dx = gesture.x - touch.clientX;
    const dy = gesture.y - touch.clientY;
    if (Math.abs(dy) <= Math.abs(dx) * 1.25) return;

    if (options.isBlocked()) gesture.consumed = true;
    if (gesture.consumed) {
      consume(event);
      return;
    }
    if (gesture.route === "native") return;
    const direction: SceneDirection = dy > 0 ? 1 : -1;
    if (gesture.route === null) {
      gesture.direction = direction;
      gesture.route = options.handlesDirection(direction)
        ? "scene"
        : "delegate";
    }
    if (gesture.route === "delegate") {
      if (options.handlesDirection(direction)) consume(event);
      return;
    }
    consume(event);
    if (direction !== gesture.direction || Math.abs(dy) < TOUCH_THRESHOLD)
      return;
    gesture.consumed = true;
    options.onStep(direction);
  };

  const touchEnd = () => {
    touchGesture = null;
  };

  const key = (event: KeyboardEvent) => {
    const pageTarget =
      event.target === document.body ||
      event.target === document.documentElement;
    const bounds = pageTarget ? element.getBoundingClientRect() : null;
    const pageKeyInScene =
      bounds !== null && bounds.bottom > 0 && bounds.top < window.innerHeight;
    if (
      (!inScene(event) && !pageKeyInScene) ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      options.isDetailOpen()
    )
      return;
    const target = event.target instanceof Element ? event.target : null;
    if (
      (event.key === "Home" || event.key === "End") &&
      target?.closest('[aria-roledescription="carrusel"]')
    )
      return;
    if (editsField(event)) return;
    const space = event.key === " " || event.key === "Spacebar";
    if (
      space &&
      target?.closest(
        'button, a[href], summary, [role="button"], [role="link"]',
      )
    )
      return;

    let direction: SceneDirection;
    if (["ArrowUp", "PageUp", "Home"].includes(event.key)) direction = -1;
    else if (["ArrowDown", "PageDown", "End"].includes(event.key))
      direction = 1;
    else if (space) direction = event.shiftKey ? -1 : 1;
    else return;

    if (options.isBlocked()) {
      consume(event);
      return;
    }
    if (!options.handlesDirection(direction)) return;
    consume(event);
    if (!event.repeat) options.onStep(direction);
  };

  window.addEventListener("wheel", wheel, { capture: true, passive: false });
  window.addEventListener("touchstart", touchStart, {
    capture: true,
    passive: true,
  });
  window.addEventListener("touchmove", touchMove, {
    capture: true,
    passive: false,
  });
  window.addEventListener("touchend", touchEnd, true);
  window.addEventListener("touchcancel", touchEnd, true);
  window.addEventListener("keydown", key, true);

  return {
    resetGesture() {
      wheelGesture.lastAt = performance.now();
      wheelGesture.distance = 0;
      wheelGesture.consumed = true;
      if (touchGesture) touchGesture.consumed = true;
    },
    destroy() {
      window.removeEventListener("wheel", wheel, true);
      window.removeEventListener("touchstart", touchStart, true);
      window.removeEventListener("touchmove", touchMove, true);
      window.removeEventListener("touchend", touchEnd, true);
      window.removeEventListener("touchcancel", touchEnd, true);
      window.removeEventListener("keydown", key, true);
      touchGesture = null;
    },
  };
}
