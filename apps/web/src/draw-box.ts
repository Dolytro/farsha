import type { Box } from "@farsha/types";

/**
 * The box of a shape being drawn from `start` to `point` (Figma): Shift makes it a square, Alt draws it from the centre outwards.
 * The box may not be smaller than one pixel, so a click without movement still gives something to resize.
 */
export function drawBox(start: { x: number; y: number }, point: { x: number; y: number }, keys: { shift?: boolean; alt?: boolean } = {}): Box {
  const dx = point.x - start.x;
  const dy = point.y - start.y;
  let width = Math.abs(dx);
  let height = Math.abs(dy);
  if (keys.shift) width = height = Math.max(width, height);
  const sx = dx < 0 ? -1 : 1;
  const sy = dy < 0 ? -1 : 1;
  if (keys.alt) return { x: start.x - width, y: start.y - height, width: Math.max(1, width * 2), height: Math.max(1, height * 2) };
  return { x: sx < 0 ? start.x - width : start.x, y: sy < 0 ? start.y - height : start.y, width: Math.max(1, width), height: Math.max(1, height) };
}
