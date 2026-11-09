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
