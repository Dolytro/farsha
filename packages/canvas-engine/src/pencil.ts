import type { PenPoint } from "./pen";

type Pt = { x: number; y: number };

const distToSegment = (p: Pt, a: Pt, b: Pt) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

/** Ramer-Douglas-Peucker: drop points that lie within `tolerance` of the line between the kept ones. */
export function simplifyStroke(points: Pt[], tolerance: number): Pt[] {
  if (points.length < 3) return points.slice();
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let worst = -1;
    let at = -1;
    for (let i = s + 1; i < e; i++) {
      const d = distToSegment(points[i]!, points[s]!, points[e]!);
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (worst > tolerance && at > 0) {
      keep[at] = true;
      stack.push([s, at], [at, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/**
 * Turn a freehand stroke into pen points: simplified, then given Catmull-Rom handles so the path is smooth.
 * Ends are sharp. A path that comes back to its start (within `closeDistance`) is reported as closed.
 */
export function pencilToPenPoints(raw: Pt[], tolerance = 2, closeDistance = 0): { points: PenPoint[]; closed: boolean } {
  const dedup = raw.filter((p, i) => i === 0 || Math.hypot(p.x - raw[i - 1]!.x, p.y - raw[i - 1]!.y) > 0.01);
  let pts = simplifyStroke(dedup, tolerance);
  const first = pts[0];
  const last = pts[pts.length - 1];
  const closed = !!first && !!last && pts.length > 3 && closeDistance > 0 && Math.hypot(first.x - last.x, first.y - last.y) <= closeDistance;
  if (closed) pts = pts.slice(0, -1);
  const n = pts.length;
  const points = pts.map((p, i): PenPoint => {
    const prev = closed ? pts[(i - 1 + n) % n]! : pts[i - 1];
    const next = closed ? pts[(i + 1) % n]! : pts[i + 1];
    if (!prev || !next) return { x: p.x, y: p.y, hx: 0, hy: 0 };
    return { x: p.x, y: p.y, hx: (next.x - prev.x) / 6, hy: (next.y - prev.y) / 6 };
  });
  return { points, closed };
}
