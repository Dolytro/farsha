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
