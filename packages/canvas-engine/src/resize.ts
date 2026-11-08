import type { Box } from "@farsha/types";

export type Handle = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

export interface ResizeOptions {
  /** Shift: keep the width / height ratio. */
  keepRatio?: boolean;
  /** Alt: resize from the centre, so the opposite side moves the other way. */
  fromCenter?: boolean;
}

/**
 * New box when `handle` of `box` is dragged by (dx, dy), the way Figma does it: the opposite side (or the
 * centre with Alt) stays put, Shift keeps the ratio, and a side handle with Shift scales the other axis about the centre.
 */
export function resizeBox(box: Box, handle: Handle, dx: number, dy: number, opts: ResizeOptions = {}): Box {
  const hx = handle.includes("w") ? -1 : handle.includes("e") ? 1 : 0;
  const hy = handle.includes("n") ? -1 : handle.includes("s") ? 1 : 0;
  const k = opts.fromCenter ? 2 : 1;
  let width = hx ? Math.max(1, box.width + hx * dx * k) : box.width;
  let height = hy ? Math.max(1, box.height + hy * dy * k) : box.height;

  if (opts.keepRatio && box.width > 0 && box.height > 0) {
    const sx = width / box.width;
    const sy = height / box.height;
    const s = hx && hy ? Math.max(sx, sy) : hx ? sx : sy;
    width = Math.max(1, box.width * s);
    height = Math.max(1, box.height * s);
  }

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const x = hx === 0 || opts.fromCenter ? cx - width / 2 : hx > 0 ? box.x : box.x + box.width - width;
  const y = hy === 0 || opts.fromCenter ? cy - height / 2 : hy > 0 ? box.y : box.y + box.height - height;
  return { x, y, width, height };
}

/**
 * Like `resizeBox`, but dragging a handle past the opposite side turns the box over instead of stopping at 1 px
 * (Figma's "Flip objects while resizing"). `flipX` / `flipY` say that the box is mirrored compared with the start.
 * With the ratio kept (Shift or locked proportions) the box still stops at the opposite side.
 */
export function resizeBoxFlip(box: Box, handle: Handle, dx: number, dy: number, opts: ResizeOptions = {}): { box: Box; flipX: boolean; flipY: boolean } {
  if (opts.keepRatio) return { box: resizeBox(box, handle, dx, dy, opts), flipX: false, flipY: false };
  const hx = handle.includes("w") ? -1 : handle.includes("e") ? 1 : 0;
  const hy = handle.includes("n") ? -1 : handle.includes("s") ? 1 : 0;
  const k = opts.fromCenter ? 2 : 1;
  const rawW = hx ? box.width + hx * dx * k : box.width;
  const rawH = hy ? box.height + hy * dy * k : box.height;
  const flipX = rawW < 0;
  const flipY = rawH < 0;
  const width = Math.max(1, Math.abs(rawW));
  const height = Math.max(1, Math.abs(rawH));
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const x = hx === 0 || opts.fromCenter ? cx - width / 2 : hx > 0 ? (flipX ? box.x - width : box.x) : flipX ? box.x + box.width : box.x + box.width - width;
  const y = hy === 0 || opts.fromCenter ? cy - height / 2 : hy > 0 ? (flipY ? box.y - height : box.y) : flipY ? box.y + box.height : box.y + box.height - height;
  return { box: { x, y, width, height }, flipX, flipY };
}

/**
 * Resize a turned layer by one of its handles. `dx`, `dy` are the pointer movement on the canvas; the box is the layer before it was turned
 * (its rotation is about its own centre). The size changes along the layer's own sides, and the opposite corner or edge (or the centre with Alt)
 * stays where it is on the canvas, so the layer does not slide while it grows.
 */
export function resizeRotatedBox(box: Box, handle: Handle, dx: number, dy: number, rotationDeg: number, opts: ResizeOptions = {}): Box {
  const a = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const hx = handle.includes("w") ? -1 : handle.includes("e") ? 1 : 0;
  const hy = handle.includes("n") ? -1 : handle.includes("s") ? 1 : 0;
  // the movement along the layer's own axes
  const local = resizeBox(box, handle, dx * cos + dy * sin, -dx * sin + dy * cos, opts);
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const turn = (p: { x: number; y: number }) => ({ x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos });
  const fixed = opts.fromCenter ? { x: 0, y: 0 } : { x: -hx * (box.width / 2), y: -hy * (box.height / 2) };
  const anchor = { x: centre.x + turn(fixed).x, y: centre.y + turn(fixed).y };
  const now = opts.fromCenter ? { x: 0, y: 0 } : { x: -hx * (local.width / 2), y: -hy * (local.height / 2) };
  const c1 = { x: anchor.x - turn(now).x, y: anchor.y - turn(now).y };
  return { x: c1.x - local.width / 2, y: c1.y - local.height / 2, width: local.width, height: local.height };
}
