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
