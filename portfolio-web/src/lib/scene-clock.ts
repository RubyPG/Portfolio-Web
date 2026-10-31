import { animate, type EasingParam, type JSAnimation } from "animejs";

export interface SceneClockOptions {
  /** Full traversal time in milliseconds. */
  duration: number;
  onUpdate(progress: number): void;
  onComplete?(): void;
  onReverseComplete?(): void;
  ease?: EasingParam;
}

export interface SceneClock {
  progress(): number;
  /** A muted seek updates the clock without rendering or completing a scene. */
  progress(value: number, muteCallbacks?: boolean): SceneClock;
  /** Travel to a partial scene; arrival follows rendering and endpoint callbacks. */
  playTo(destination: number, onArrive?: () => void): SceneClock;
  play(): SceneClock;
  reverse(): SceneClock;
  pause(): SceneClock;
  kill(): void;
}

const clamp = (value: number) =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

/** A reversible scene clock; Anime.js owns scheduling and interpolation. */
export function createSceneClock({
  duration,
  onUpdate,
  onComplete,
  onReverseComplete,
  ease = "linear",
}: SceneClockOptions): SceneClock {
  if (!Number.isFinite(duration) || duration < 0)
    throw new RangeError("Scene duration must be finite and non-negative.");

  const state = { value: 0 };
  let value = 0;
  let animation: JSAnimation | null = null;
  let generation = 0;
  let killed = false;

  function stop() {
    generation++;
    animation?.cancel();
    animation = null;
  }

  function progress(): number;
  function progress(next: number, muteCallbacks?: boolean): SceneClock;
  function progress(next?: number, muteCallbacks = false): number | SceneClock {
    if (next === undefined) return value;
    if (killed) return clock;
    const previous = value;
    stop();
    const revision = generation;
    value = state.value = clamp(next);
    if (!muteCallbacks) {
      onUpdate(value);
      // Rendering can synchronously replace or destroy this scene.
      if (!killed && revision === generation && value !== previous) {
        if (value === 1) onComplete?.();
        else if (value === 0) onReverseComplete?.();
      }
    }
    return clock;
  }

  function run(next: number, onArrive?: () => void) {
    if (killed) return clock;
    stop();
    const destination = clamp(next);
    const revision = generation;
    if (value === destination) {
      onArrive?.();
      return clock;
    }
    let arrived = false;
    const arrive = () => {
      if (killed || arrived || revision !== generation) return;
      arrived = true;
      animation = null;
      const changed = value !== destination;
      value = state.value = destination;
      if (changed) onUpdate(value);
      if (killed || revision !== generation) return;
      if (destination === 1) onComplete?.();
      else if (destination === 0) onReverseComplete?.();
      if (killed || revision !== generation) return;
      onArrive?.();
    };
    if (duration === 0) {
      arrive();
      return clock;
    }

    animation = animate(state, {
      value: [value, destination],
      duration: duration * Math.abs(destination - value),
      ease,
      autoplay: false,
      onUpdate: () => {
        if (killed || arrived || revision !== generation) return;
        const next = clamp(state.value);
        if (next === value) return;
        value = next;
        onUpdate(value);
      },
      onComplete: arrive,
    });
    animation.play();
    return clock;
  }

  const clock: SceneClock = {
    progress,
    playTo: run,
    play: () => run(1),
    reverse: () => run(0),
    pause() {
      stop();
      return clock;
    },
    kill() {
      if (killed) return;
      killed = true;
      stop();
    },
  };
  return clock;
}
