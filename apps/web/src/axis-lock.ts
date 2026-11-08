/** Holding Shift while dragging a layer keeps it on one line (Figma): the movement along the axis the pointer has gone further on is kept, the other is dropped. */
export function lockAxis(dx: number, dy: number): { dx: number; dy: number } {
  return Math.abs(dx) >= Math.abs(dy) ? { dx, dy: 0 } : { dx: 0, dy };
}
