import type { Box, Constraint } from '@farsha/types';

export interface ChildConstraints {
  constraintH?: Constraint;
  constraintV?: Constraint;
}

/** One axis: where a child's start and size end up when its parent changes from `from` to `to`. */
function axis(start: number, size: number, from: number, to: number, c: Constraint): { start: number; size: number } {
  const delta = to - from;
  switch (c) {
    case 'MAX':
      return { start: start + delta, size };
    case 'STRETCH':
      return { start, size: Math.max(0, size + delta) };
    case 'CENTER':
      return { start: start + delta / 2, size };
    case 'SCALE': {
      const k = from > 0 ? to / from : 1;
      return { start: start * k, size: size * k };
    }
    default:
      return { start, size };
  }
}

/**
 * New box of a child (relative to its parent) after the parent frame is resized from `from` to `to`,
 * following Figma's constraints: Left / Top (default) keep the offset, Right / Bottom keep the distance to the far edge,
 * Left & Right / Top & Bottom stretch, Center keeps the centre, Scale scales position and size.
 */
export function applyConstraints(child: Box & ChildConstraints, from: { width: number; height: number }, to: { width: number; height: number }): Box {
  const h = axis(child.x, child.width, from.width, to.width, child.constraintH ?? 'MIN');
  const v = axis(child.y, child.height, from.height, to.height, child.constraintV ?? 'MIN');
  return { x: h.start, y: v.start, width: h.size, height: v.size };
}
