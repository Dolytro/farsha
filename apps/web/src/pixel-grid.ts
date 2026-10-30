/** The pixel grid only appears once a pixel is big enough on screen to be worth outlining. */
export const PIXEL_GRID_MIN_ZOOM = 8;

/** The part of the page (in page coordinates) that is visible, widened a little so the grid reaches the edges. */
export function visibleWorld(view: { x: number; y: number; zoom: number }, width: number, height: number): { x: number; y: number; width: number; height: number } {
  const x = Math.floor(-view.x / view.zoom) - 1;
  const y = Math.floor(-view.y / view.zoom) - 1;
  return { x, y, width: Math.ceil(width / view.zoom) + 3, height: Math.ceil(height / view.zoom) + 3 };
}

export function showPixelGrid(enabled: boolean, zoom: number): boolean {
  return enabled && zoom >= PIXEL_GRID_MIN_ZOOM;
}
