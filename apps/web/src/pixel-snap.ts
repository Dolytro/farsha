import type { Box } from "@farsha/types";

/** A box with its edges on whole pixels: the left and top edges and the right and bottom edges are rounded, and the box keeps at least 1 pixel. */
export function snapBoxToPixels(box: Box): Box {
  const x = Math.round(box.x);
  const y = Math.round(box.y);
  return { x, y, width: Math.max(1, Math.round(box.x + box.width) - x), height: Math.max(1, Math.round(box.y + box.height) - y) };
}

/** The movement that puts a layer on a whole pixel: `origin` is where it started and `delta` how far it was dragged. */
export function snapMoveToPixels(origin: { x: number; y: number }, delta: { dx: number; dy: number }): { dx: number; dy: number } {
  return { dx: Math.round(origin.x + delta.dx) - origin.x, dy: Math.round(origin.y + delta.dy) - origin.y };
}
