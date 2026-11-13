export interface GradientLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** The line a linear gradient runs along on a box (the same line `gradientDef` draws, in the box's own coordinates). `angle` is in degrees. */
export function gradientLine(box: { x: number; y: number; width: number; height: number }, angle: number): GradientLine {
  const a = ((Number.isFinite(angle) ? angle : 0) * Math.PI) / 180;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dx = (Math.cos(a) * box.width) / 2;
  const dy = (Math.sin(a) * box.height) / 2;
  return { x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy };
}

/** Where a point falls along the gradient line, 0 at the start and 1 at the end, kept between the two and rounded to 1/1000. */
export function stopPositionAt(line: GradientLine, point: { x: number; y: number }): number {
  const vx = line.x2 - line.x1;
  const vy = line.y2 - line.y1;
  const len2 = vx * vx + vy * vy;
  if (len2 === 0) return 0;
  const t = ((point.x - line.x1) * vx + (point.y - line.y1) * vy) / len2;
  return Math.round(Math.min(1, Math.max(0, t)) * 1000) / 1000;
}

interface Stop {
  position: number;
  color: string;
  opacity: number;
}

function rgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1]!.length === 3 ? m[1]!.replace(/./g, (c) => c + c) : m[1]!;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** The colour and opacity a gradient has at position `t` (0 to 1), mixed between the two stops around it; a point outside the stops takes the nearest one. Null for no stops. */
export function stopAt(stops: Stop[], t: number): { color: string; opacity: number } | null {
  if (!stops.length) return null;
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  if (t <= first.position) return { color: first.color, opacity: first.opacity };
  if (t >= last.position) return { color: last.color, opacity: last.opacity };
  const hi = sorted.findIndex((s) => s.position >= t);
  const a = sorted[hi - 1]!;
  const b = sorted[hi]!;
  const k = b.position === a.position ? 0 : (t - a.position) / (b.position - a.position);
  const ca = rgb(a.color);
  const cb = rgb(b.color);
  const opacity = Math.round((a.opacity + (b.opacity - a.opacity) * k) * 1000) / 1000;
  if (!ca || !cb) return { color: k < 0.5 ? a.color : b.color, opacity };
  const hex = ca.map((v, i) => Math.round(v + (cb[i]! - v) * k).toString(16).padStart(2, "0")).join("");
  return { color: `#${hex}`, opacity };
}

/**
 * The line the colour stops of a gradient sit on, for the stops shown on the canvas: the gradient line of a linear gradient, and for a
 * radial one the radius from the middle to the right edge. Angular and diamond gradients have none (null).
 */
export function gradientAxis(paint: { type: string; angle: number }, box: { x: number; y: number; width: number; height: number }): GradientLine | null {
  if (paint.type === "GRADIENT_LINEAR") return gradientLine(box, paint.angle);
  if (paint.type === "GRADIENT_RADIAL") {
    const cy = box.y + box.height / 2;
    return { x1: box.x + box.width / 2, y1: cy, x2: box.x + box.width, y2: cy };
  }
  return null;
}
