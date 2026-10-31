import { pencilToPenPoints } from "./pencil";
import type { PenPoint } from "./pen";

/** Points along the path, `steps` per curved segment, closed paths included back to the start. */
function sample(points: PenPoint[], closed: boolean, steps = 12): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const count = closed ? points.length : points.length - 1;
  for (let i = 0; i < count; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const flat = a.hx === 0 && a.hy === 0 && b.hx === 0 && b.hy === 0;
    const n = flat ? 1 : steps;
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const m = 1 - t;
      out.push({
        x: m * m * m * a.x + 3 * m * m * t * (a.x + a.hx) + 3 * m * t * t * (b.x - b.hx) + t * t * t * b.x,
        y: m * m * m * a.y + 3 * m * m * t * (a.y + a.hy) + 3 * m * t * t * (b.y - b.hy) + t * t * t * b.y,
      });
    }
  }
  const last = points[closed ? 0 : points.length - 1]!;
  out.push({ x: last.x, y: last.y });
  return out;
}

/** Fewer points, same shape within `tolerance` (Figma's Simplify). Corners stay sharp; the result is smoothed like a Pencil stroke. */
export function simplifyPenPoints(points: PenPoint[], closed: boolean, tolerance = 1.5): PenPoint[] {
  if (points.length < 3) return points;
  const result = pencilToPenPoints(sample(points, closed), tolerance, closed ? 0.001 : 0);
  return result.points.length >= 2 ? result.points : points;
}

/** Give every point a smooth handle (the ends of an open path stay sharp). */
export function smoothPenPoints(points: PenPoint[], closed: boolean): PenPoint[] {
  const n = points.length;
  return points.map((p, i) => {
    const prev = closed ? points[(i - 1 + n) % n] : points[i - 1];
    const next = closed ? points[(i + 1) % n] : points[i + 1];
    if (!prev || !next || n < 3) return p;
    return { ...p, hx: (next.x - prev.x) / 6, hy: (next.y - prev.y) / 6 };
  });
}

const flip = (points: PenPoint[]): PenPoint[] => [...points].reverse().map((p) => ({ ...p, hx: -p.hx, hy: -p.hy }));

/** Join two open paths at their nearest ends (Figma's Join). Both are in the same coordinate space. */
export function joinPenPaths(a: PenPoint[], b: PenPoint[]): PenPoint[] {
  const ends = (p: PenPoint[]) => [p[0]!, p[p.length - 1]!] as const;
  const [a0, a1] = ends(a);
  const [b0, b1] = ends(b);
  const d = (p: PenPoint, q: PenPoint) => Math.hypot(p.x - q.x, p.y - q.y);
  const options = [
    { cost: d(a1, b0), left: a, right: b },
    { cost: d(a1, b1), left: a, right: flip(b) },
    { cost: d(a0, b0), left: flip(a), right: b },
    { cost: d(a0, b1), left: flip(a), right: flip(b) },
  ].sort((x, y) => x.cost - y.cost)[0]!;
  const left = options.left.slice(0, -1);
  const joinA = options.left[options.left.length - 1]!;
  const joinB = options.right[0]!;
  // the two ends become one point where the path leaves along the second path's handle
  const mid: PenPoint = { x: (joinA.x + joinB.x) / 2, y: (joinA.y + joinB.y) / 2, hx: joinB.hx, hy: joinB.hy };
  return [...left, mid, ...options.right.slice(1)];
}
