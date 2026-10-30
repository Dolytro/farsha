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
