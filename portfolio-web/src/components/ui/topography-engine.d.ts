export interface TopographyController {
  setProgress(progress: number): void;
  setActive(active: boolean): void;
  destroy(): void;
}

/** User-supplied React Bits Topography with an external, reversible scene clock. */
export function createTopography(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  initialProgress?: number,
  initialActive?: boolean,
): TopographyController;
