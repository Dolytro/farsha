/** Corner radius handles on the canvas (Figma's dots inside the corners of a rectangle or frame). */
export type Corner = 0 | 1 | 2 | 3; // top-left, top-right, bottom-right, bottom-left (the order of cornerRadii)
interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** How far a point is from a corner along the diagonal into the shape (negative outside). */
export function cornerProgress(box: Box, corner: Corner, p: { x: number; y: number }): number {
  const dx = corner === 0 || corner === 3 ? p.x - box.x : box.x + box.width - p.x;
  const dy = corner === 0 || corner === 1 ? p.y - box.y : box.y + box.height - p.y;
  return (dx + dy) / 2;
}

/** The radius after dragging from `from` to `to`: moves with the pointer, kept between 0 and half the shorter side, whole pixels. */
export function draggedRadius(box: Box, corner: Corner, startRadius: number, from: { x: number; y: number }, to: { x: number; y: number }): number {
  const max = Math.max(0, Math.min(box.width, box.height) / 2);
  const r = startRadius + cornerProgress(box, corner, to) - cornerProgress(box, corner, from);
  return Math.round(Math.min(max, Math.max(0, r)));
}

/** Where a corner's dot sits: on the diagonal, at the radius or at least `minInset` from the corner. */
export function cornerDot(box: Box, corner: Corner, radius: number, minInset: number): { x: number; y: number } {
  const d = Math.max(radius, minInset);
  return {
    x: corner === 0 || corner === 3 ? box.x + d : box.x + box.width - d,
    y: corner === 0 || corner === 1 ? box.y + d : box.y + box.height - d,
  };
}

/** The radii after one corner is set on its own (Alt-drag); the others keep their value. */
export function withCornerRadius(radii: [number, number, number, number], corner: Corner, value: number): [number, number, number, number] {
  const next = [...radii] as [number, number, number, number];
  next[corner] = value;
  return next;
}
