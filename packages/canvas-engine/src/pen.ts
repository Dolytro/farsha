/**
 * Geometry of paths drawn with the Pen tool. A point is an anchor plus its outgoing handle (as an offset);
 * the incoming handle mirrors it, like dragging while placing a point in Figma.
 */

export interface PenPoint {
  x: number;
  y: number;
  /** Outgoing handle offset from the anchor; (0, 0) means a sharp corner. */
  hx: number;
  hy: number;
}

export interface PenGeometry {
  box: { x: number; y: number; width: number; height: number };
  viewBox: string;
  markup: string;
}

const r = (v: number) => String(Math.round(v * 100) / 100);
const straight = (a: PenPoint, b: PenPoint) => a.hx === 0 && a.hy === 0 && b.hx === 0 && b.hy === 0;

/** [cp1, cp2] of the cubic segment from a to b. */
const controls = (a: PenPoint, b: PenPoint): [[number, number], [number, number]] => [
  [a.x + a.hx, a.y + a.hy],
  [b.x - b.hx, b.y - b.hy],
];

/** SVG path data for the points, shifted by (-ox, -oy). Closed paths run back to the first point. */
export function penPathData(points: PenPoint[], closed: boolean, ox = 0, oy = 0): string {
  if (!points.length) return "";
  const first = points[0]!;
  let d = `M${r(first.x - ox)} ${r(first.y - oy)}`;
  const segment = (a: PenPoint, b: PenPoint) => {
    if (straight(a, b)) return ` L${r(b.x - ox)} ${r(b.y - oy)}`;
    const [c1, c2] = controls(a, b);
    return ` C${r(c1[0] - ox)} ${r(c1[1] - oy)} ${r(c2[0] - ox)} ${r(c2[1] - oy)} ${r(b.x - ox)} ${r(b.y - oy)}`;
  };
  for (let i = 1; i < points.length; i++) d += segment(points[i - 1]!, points[i]!);
  if (closed && points.length > 2) d += segment(points[points.length - 1]!, first) + " Z";
  return d;
}

/** Tight bounds of the drawn curve (curves are sampled, so handles that stick out do not enlarge the box). */
function bounds(points: PenPoint[], closed: boolean): { x: number; y: number; width: number; height: number } {
  const xs: number[] = [];
  const ys: number[] = [];
  const add = (x: number, y: number) => {
    xs.push(x);
    ys.push(y);
  };
  points.forEach((p) => add(p.x, p.y));
  const pairs: [PenPoint, PenPoint][] = [];
  for (let i = 1; i < points.length; i++) pairs.push([points[i - 1]!, points[i]!]);
  if (closed && points.length > 2) pairs.push([points[points.length - 1]!, points[0]!]);
  for (const [a, b] of pairs) {
    if (straight(a, b)) continue;
    const [c1, c2] = controls(a, b);
    for (let i = 1; i < 24; i++) {
      const t = i / 24;
      const m = 1 - t;
      add(m * m * m * a.x + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t * t * t * b.x, m * m * m * a.y + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t * t * t * b.y);
    }
  }
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

const cubic = (a: PenPoint, b: PenPoint, t: number): [number, number] => {
  const [c1, c2] = controls(a, b);
  const m = 1 - t;
  return [m * m * m * a.x + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t * t * t * b.x, m * m * m * a.y + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t * t * t * b.y];
};

const pointAt = (a: PenPoint, b: PenPoint, t: number): [number, number] => (straight(a, b) ? [a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t] : cubic(a, b, t));

export function scalePoints(points: PenPoint[], sx: number, sy: number): PenPoint[] {
  return points.map((p) => ({ x: p.x * sx, y: p.y * sy, hx: p.hx * sx, hy: p.hy * sy }));
}

export function translatePoints(points: PenPoint[], dx: number, dy: number): PenPoint[] {
  return points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
}

export interface PathHit {
  /** Index of the point the segment starts at (the segment runs to the next point, or back to the first one when closed). */
  segment: number;
  t: number;
  x: number;
  y: number;
  distance: number;
}

/** The closest spot on the path to (x, y), if it is within `tolerance`. */
export function nearestOnPath(points: PenPoint[], closed: boolean, x: number, y: number, tolerance: number): PathHit | null {
  let best: PathHit | null = null;
  const count = closed && points.length > 2 ? points.length : points.length - 1;
  for (let i = 0; i < count; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const consider = (t: number) => {
      const [px, py] = pointAt(a, b, t);
      const d = Math.hypot(px - x, py - y);
      if (d <= tolerance && (!best || d < best.distance)) best = { segment: i, t, x: px, y: py, distance: d };
    };
    if (straight(a, b)) {
      // project the point onto the segment
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      consider(len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2)));
    } else {
      for (let k = 0; k <= 32; k++) consider(k / 32);
    }
  }
  return best;
}

/** Add a point on a segment at parameter t. On a curve the new point is smooth, with a handle along the curve. */
export function insertPointAt(points: PenPoint[], segment: number, t: number): PenPoint[] {
  const a = points[segment]!;
  const b = points[(segment + 1) % points.length]!;
  const [x, y] = pointAt(a, b, t);
  let hx = 0;
  let hy = 0;
  if (!straight(a, b)) {
    const [x1, y1] = pointAt(a, b, Math.max(0, t - 0.05));
    const [x2, y2] = pointAt(a, b, Math.min(1, t + 0.05));
    const len = Math.hypot(b.x - a.x, b.y - a.y) / 3;
    const tl = Math.hypot(x2 - x1, y2 - y1) || 1;
    hx = ((x2 - x1) / tl) * len * 0.5;
    hy = ((y2 - y1) / tl) * len * 0.5;
  }
  const next = [...points];
  next.splice(segment + 1, 0, { x, y, hx, hy });
  return next;
}

/** Remove a point; a path keeps at least two. */
export function removePointAt(points: PenPoint[], index: number): PenPoint[] {
  return points.length <= 2 ? points : points.filter((_, i) => i !== index);
}

/** The VECTOR layer geometry for a finished pen path, in the same coordinates as the points. */
export function penGeometry(points: PenPoint[], closed: boolean): PenGeometry | null {
  if (points.length < 2) return null;
  const b = bounds(points, closed);
  const width = Math.max(1, b.width);
  const height = Math.max(1, b.height);
  return {
    box: { x: b.x, y: b.y, width, height },
    viewBox: `0 0 ${r(width)} ${r(height)}`,
    markup: `<path d="${penPathData(points, closed, b.x, b.y)}" vector-effect="non-scaling-stroke"/>`,
  };
}
