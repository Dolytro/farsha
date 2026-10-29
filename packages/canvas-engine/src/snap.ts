import type { Box } from "@canvylo/types";

export interface Guide {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SnapResult {
  /** Extra movement to apply so the box sits exactly on the snapped lines. */
  dx: number;
  dy: number;
  guides: Guide[];
}

const lines = (start: number, size: number) => [start, start + size / 2, start + size];

function best(mine: number[], theirs: number[], threshold: number): number {
  let delta = 0;
  let min = threshold + 1e-9;
  for (const m of mine) {
    for (const t of theirs) {
      const d = t - m;
      if (Math.abs(d) < min) {
        min = Math.abs(d);
        delta = d;
      }
    }
  }
  return min <= threshold ? delta : 0;
}

/**
 * Snap a moving box to the left / centre / right and top / middle / bottom lines of other boxes (Figma's smart guides).
 * `threshold` is in the same units as the boxes. `extra` adds bare lines (ruler guides) to snap to. Guides join the snapped line from the moving box to every box it lines up with.
 */
export function snapMove(moving: Box, targets: Box[], threshold: number, extra: { xs?: number[]; ys?: number[] } = {}): SnapResult {
  const xs = [...targets.flatMap((t) => lines(t.x, t.width)), ...(extra.xs ?? [])];
  const ys = [...targets.flatMap((t) => lines(t.y, t.height)), ...(extra.ys ?? [])];
  const dx = best(lines(moving.x, moving.width), xs, threshold);
  const dy = best(lines(moving.y, moving.height), ys, threshold);
  const m: Box = { ...moving, x: moving.x + dx, y: moving.y + dy };

  const guides: Guide[] = [];
  const eps = 1e-6;
  for (const t of targets) {
    for (const mx of lines(m.x, m.width)) {
      for (const tx of lines(t.x, t.width)) {
        if (Math.abs(mx - tx) < eps) guides.push({ x1: tx, x2: tx, y1: Math.min(m.y, t.y), y2: Math.max(m.y + m.height, t.y + t.height) });
      }
    }
    for (const my of lines(m.y, m.height)) {
      for (const ty of lines(t.y, t.height)) {
        if (Math.abs(my - ty) < eps) guides.push({ y1: ty, y2: ty, x1: Math.min(m.x, t.x), x2: Math.max(m.x + m.width, t.x + t.width) });
      }
    }
  }
  return { dx, dy, guides };
}
