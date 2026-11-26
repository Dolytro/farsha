const r = (v: number) => String(Math.round(v * 100) / 100);

export interface ArcParams {
  start: number;
  sweep: number;
  ratio: number;
}

/** The arc settings of an ellipse layer, each kept in range: start any angle, sweep 0 to 360 (default 360), ratio 0 to 0.99. */
export function arcParams(n: { arcStart?: unknown; arcSweep?: unknown; arcRatio?: unknown }): ArcParams {
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  return {
    start: num(n.arcStart, 0),
    sweep: Math.min(360, Math.max(0, num(n.arcSweep, 360))),
    ratio: Math.min(0.99, Math.max(0, num(n.arcRatio, 0))),
  };
}

/** True when the arc settings leave a plain full ellipse. */
export function isFullEllipse(p: ArcParams): boolean {
  return p.sweep >= 360 && p.ratio === 0;
}

/**
 * The outline of an ellipse layer with an arc (a pie, a ring, or a ring sector) as one SVG path, in the layer's own coordinates.
 * Returns null for a plain full ellipse. A ring that goes all the way round uses two outlines and needs `fill-rule="evenodd"`.
 */
export function ellipsePath(width: number, height: number, p: ArcParams): { d: string; evenodd: boolean } | null {
  if (isFullEllipse(p)) return null;
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2;
  const ry = height / 2;
  const irx = rx * p.ratio;
  const iry = ry * p.ratio;
  const point = (deg: number, x: number, y: number) => `${r(cx + x * Math.cos((deg * Math.PI) / 180))} ${r(cy + y * Math.sin((deg * Math.PI) / 180))}`;
  if (p.sweep <= 0) return { d: "", evenodd: false };
  if (p.sweep >= 360) {
    // a full ring: the outer and the inner ellipse, each drawn as two half arcs
    const full = (x: number, y: number, dir: 0 | 1) => `M${point(p.start, x, y)}A${r(x)} ${r(y)} 0 1 ${dir} ${point(p.start + 180, x, y)}A${r(x)} ${r(y)} 0 1 ${dir} ${point(p.start, x, y)}Z`;
    return { d: full(rx, ry, 1) + full(irx, iry, 1), evenodd: true };
  }
  const end = p.start + p.sweep;
  const large = p.sweep > 180 ? 1 : 0;
  const outer = `M${point(p.start, rx, ry)}A${r(rx)} ${r(ry)} 0 ${large} 1 ${point(end, rx, ry)}`;
  // a pie: from the centre out to the start, round the arc, and back
  if (p.ratio === 0) return { d: `M${r(cx)} ${r(cy)}L${point(p.start, rx, ry)}A${r(rx)} ${r(ry)} 0 ${large} 1 ${point(end, rx, ry)}Z`, evenodd: false };
  return { d: `${outer}L${point(end, irx, iry)}A${r(irx)} ${r(iry)} 0 ${large} 0 ${point(p.start, irx, iry)}Z`, evenodd: false };
}

interface ArcBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A point at `angle` (degrees clockwise from 3 o'clock) on the ellipse of `box`, `fraction` of the way from the centre to the rim. */
export function arcPoint(box: ArcBox, angle: number, fraction = 1): { x: number; y: number } {
  const a = (angle * Math.PI) / 180;
  return { x: box.x + box.width / 2 + (Math.cos(a) * box.width * fraction) / 2, y: box.y + box.height / 2 + (Math.sin(a) * box.height * fraction) / 2 };
}

/** The angle (0 to 360, clockwise from 3 o'clock) of a point seen from the centre of the ellipse, and how far out it is (1 on the rim). */
export function arcAt(box: ArcBox, p: { x: number; y: number }): { angle: number; fraction: number } {
  const nx = box.width > 0 ? (p.x - box.x - box.width / 2) / (box.width / 2) : 0;
  const ny = box.height > 0 ? (p.y - box.y - box.height / 2) / (box.height / 2) : 0;
  const deg = (Math.atan2(ny, nx) * 180) / Math.PI;
  return { angle: ((deg % 360) + 360) % 360, fraction: Math.hypot(nx, ny) };
}

const mod360 = (v: number) => ((v % 360) + 360) % 360;
const round1 = (v: number) => Math.round(v * 10) / 10;

/** New arc settings after dragging the start dot to `angle`: the end stays where it is. */
export function dragArcStart(p: ArcParams, angle: number): Pick<ArcParams, "start" | "sweep"> {
  const end = p.start + p.sweep;
  const sweep = mod360(end - angle);
  return { start: round1(angle), sweep: round1(sweep === 0 && p.sweep > 0 ? 360 : sweep) };
}

/** New sweep after dragging the end dot to `angle` (a drag that lands on the start keeps a full circle if it was more than half). */
export function dragArcEnd(p: ArcParams, angle: number): number {
  const sweep = mod360(angle - p.start);
  return round1(sweep === 0 ? (p.sweep > 180 ? 360 : 0) : sweep);
}

/** The inner ratio for a point dragged along the start line: 0 at the centre, at most 0.99. */
export function dragArcRatio(fraction: number): number {
  return Math.round(Math.min(0.99, Math.max(0, fraction)) * 100) / 100;
}
