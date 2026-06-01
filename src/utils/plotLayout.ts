/** Shared SVG x-mapping so nozzle contour and line plots align. */
export const PLOT_VIEW_WIDTH = 900
export const PLOT_PAD_LEFT = 40
export const PLOT_JET_WIDTH = 120
export const PLOT_PAD_RIGHT = 40

export const PLOT_NOZZLE_WIDTH =
  PLOT_VIEW_WIDTH - PLOT_PAD_LEFT - PLOT_JET_WIDTH - PLOT_PAD_RIGHT

export function axialToSvgX(x: number, L: number): number {
  if (L <= 0) return PLOT_PAD_LEFT
  return PLOT_PAD_LEFT + (x / L) * PLOT_NOZZLE_WIDTH
}
