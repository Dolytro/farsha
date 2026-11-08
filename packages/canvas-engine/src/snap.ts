import type { Box } from "@farsha/types";

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

/**
 * Snap the edges being dragged by a resize handle to the left / centre / right and top / middle / bottom lines of other boxes.
 * Only the moving edges snap (an east handle moves the right edge, a north-west handle the left and top edges); the opposite edges stay put.
 * `box` and `targets` share one coordinate space. Guides mark the lines the edges ended up on.
 */
export function snapResize(box: Box, handle: string, targets: Box[], threshold: number, extra: { xs?: number[]; ys?: number[] } = {}): { box: Box; guides: Guide[] } {
  const hx = handle.includes("w") ? -1 : handle.includes("e") ? 1 : 0;
  const hy = handle.includes("n") ? -1 : handle.includes("s") ? 1 : 0;
  const xs = [...targets.flatMap((t) => lines(t.x, t.width)), ...(extra.xs ?? [])];
  const ys = [...targets.flatMap((t) => lines(t.y, t.height)), ...(extra.ys ?? [])];
  let { x, y, width, height } = box;
  if (hx) {
    const d = best([hx > 0 ? x + width : x], xs, threshold);
    if (d && hx > 0) width = Math.max(1, width + d);
    else if (d) {
      const w = Math.max(1, width - d);
      x += width - w;
      width = w;
    }
  }
  if (hy) {
    const d = best([hy > 0 ? y + height : y], ys, threshold);
    if (d && hy > 0) height = Math.max(1, height + d);
    else if (d) {
      const h = Math.max(1, height - d);
      y += height - h;
      height = h;
    }
  }
  const out: Box = { x, y, width, height };
  const guides: Guide[] = [];
  const eps = 1e-6;
  const edgesX = hx ? [hx > 0 ? x + width : x] : [];
  const edgesY = hy ? [hy > 0 ? y + height : y] : [];
  for (const t of targets) {
    for (const mx of edgesX) for (const tx of lines(t.x, t.width)) if (Math.abs(mx - tx) < eps) guides.push({ x1: tx, x2: tx, y1: Math.min(y, t.y), y2: Math.max(y + height, t.y + t.height) });
    for (const my of edgesY) for (const ty of lines(t.y, t.height)) if (Math.abs(my - ty) < eps) guides.push({ y1: ty, y2: ty, x1: Math.min(x, t.x), x2: Math.max(x + width, t.x + t.width) });
  }
  return { box: out, guides };
}
