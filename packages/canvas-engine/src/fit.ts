import type { Box } from "@farsha/types";
import type { Viewport } from "./viewport";

/** Viewport that centres `box` in a `width` × `height` screen area (Figma Shift+1 / Shift+2). */
export function fitBox(box: Box, width: number, height: number, padding = 64, maxZoom = 8): Viewport {
  const zoom = Math.min(maxZoom, Math.max(0.02, Math.min(width / (box.width + padding * 2), height / (box.height + padding * 2))));
  return {
    zoom,
    x: (width - box.width * zoom) / 2 - box.x * zoom,
    y: (height - box.height * zoom) / 2 - box.y * zoom,
  };
}

/** Zoom to an absolute level keeping the screen centre fixed (Figma Shift+0, +, -). */
export function zoomTo(v: Viewport, zoom: number, width: number, height: number): Viewport {
  const z = Math.min(32, Math.max(0.02, zoom));
  const cx = (width / 2 - v.x) / v.zoom;
  const cy = (height / 2 - v.y) / v.zoom;
  return { zoom: z, x: width / 2 - cx * z, y: height / 2 - cy * z };
}
