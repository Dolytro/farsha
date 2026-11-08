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
  let dx = best(lines(moving.x, moving.width), xs, threshold);
  let dy = best(lines(moving.y, moving.height), ys, threshold);
  // With no edge or centre alignment on an axis, the box can still snap to the middle of the gap between two layers
  const near = (mine: number[], theirs: number[]) => mine.some((m) => theirs.some((t) => Math.abs(t - m) <= threshold + 1e-9));
  const evenX = !near(lines(moving.x, moving.width), xs) ? equalGap(moving, targets, threshold, "x") : null;
  const evenY = !near(lines(moving.y, moving.height), ys) ? equalGap(moving, targets, threshold, "y") : null;
  if (evenX) dx = evenX.delta;
  if (evenY) dy = evenY.delta;
  const m: Box = { ...moving, x: moving.x + dx, y: moving.y + dy };

  const guides: Guide[] = [...(evenX ? evenX.guides(m) : []), ...(evenY ? evenY.guides(m) : [])];
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


/**
 * Equal spacing (Figma's red spacing guides): a box that sits between two layers snaps so the gap on its left equals the gap on its right
 * (or above and below). The layers must overlap the box across the other axis. Returns the shift to apply and a way to draw the two gaps.
 */
export function equalGap(box: Box, targets: Box[], threshold: number, axis: "x" | "y"): { delta: number; guides: (placed: Box) => Guide[] } | null {
  const pos = (b: Box) => (axis === "x" ? b.x : b.y);
  const len = (b: Box) => (axis === "x" ? b.width : b.height);
  const crossPos = (b: Box) => (axis === "x" ? b.y : b.x);
  const crossLen = (b: Box) => (axis === "x" ? b.height : b.width);
  const overlaps = (t: Box) => crossPos(t) < crossPos(box) + crossLen(box) && crossPos(box) < crossPos(t) + crossLen(t);
  const side = targets.filter(overlaps);
  const before = side.filter((t) => pos(t) + len(t) <= pos(box) + 1e-6);
  const after = side.filter((t) => pos(t) >= pos(box) + len(box) - 1e-6);
  let best: { delta: number; a: Box; b: Box } | null = null;
  for (const a of before) {
    for (const b of after) {
      const gapA = pos(box) - (pos(a) + len(a));
      const gapB = pos(b) - (pos(box) + len(box));
      const delta = (gapB - gapA) / 2;
      // the box must stay between the two layers
      if (Math.abs(delta) <= threshold && gapA + delta >= 0 && gapB - delta >= 0 && (!best || Math.abs(delta) < Math.abs(best.delta))) best = { delta, a, b };
    }
  }
  if (!best) return null;
  const { delta, a, b } = best;
  return {
    delta,
    guides: (placed) => {
      const mid = crossPos(placed) + crossLen(placed) / 2;
      const first = { from: pos(a) + len(a), to: pos(placed) };
      const second = { from: pos(placed) + len(placed), to: pos(b) };
      const seg = (s: { from: number; to: number }): Guide => (axis === "x" ? { x1: s.from, x2: s.to, y1: mid, y2: mid } : { y1: s.from, y2: s.to, x1: mid, x2: mid });
      return [seg(first), seg(second)];
    },
  };
}
