export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export const screenToWorld = (v: Viewport, sx: number, sy: number) => ({
  x: (sx - v.x) / v.zoom,
  y: (sy - v.y) / v.zoom,
});

/** Zoom around a screen point, keeping that point fixed. */
export function zoomAt(v: Viewport, sx: number, sy: number, factor: number): Viewport {
  const zoom = Math.min(32, Math.max(0.02, v.zoom * factor));
  const w = screenToWorld(v, sx, sy);
  return { zoom, x: sx - w.x * zoom, y: sy - w.y * zoom };
}
