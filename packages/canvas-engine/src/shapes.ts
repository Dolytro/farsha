/**
 * Markup for the shapes drawn by the Line, Arrow, Polygon and Star tools. They are VECTOR layers whose fill and stroke
 * come from the layer's own `fills` / `strokes` (see `vectorPaintAttrs`), so the markup carries geometry only.
 * Strokes use `non-scaling-stroke` so resizing a layer never changes the line width.
 */

export interface ShapeVector {
  viewBox: string;
  markup: string;
}

const r = (v: number) => String(Math.round(v * 100) / 100);
const NS = 'vector-effect="non-scaling-stroke"';
/** A zero-height box would not render, so lines use a hair-thin viewBox. */
const THIN = 0.001;

/** Points of a regular polygon (or star) filling a 100 x 100 box. `inner` is the star's inner radius ratio (0 = polygon). */
export function polygonPoints(sides: number, inner = 0): [number, number][] {
  const n = Math.max(3, Math.min(60, Math.round(sides)));
  const pts: [number, number][] = [];
  const count = inner > 0 ? n * 2 : n;
  for (let i = 0; i < count; i++) {
    const radius = inner > 0 && i % 2 === 1 ? inner : 1;
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    pts.push([Math.cos(a) * radius, Math.sin(a) * radius]);
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX || 1;
  const h = Math.max(...ys) - minY || 1;
  return pts.map(([x, y]) => [((x - minX) / w) * 100, ((y - minY) / h) * 100]);
}

/**
 * A closed outline through the points with every corner rounded: the corner is cut `radius` away from the vertex along both edges
 * (no more than half an edge) and joined by a curve that bends at the vertex.
 */
/** For every corner: where its rounding starts (on the edge to the previous point), the corner itself, and where it ends. */
function roundedCorners(points: [number, number][], radius: number): { a: [number, number]; cur: [number, number]; b: [number, number] }[] {
  const n = points.length;
  const rad = Math.max(0, radius);
  return points.map((cur, i) => {
    const prev = points[(i + n - 1) % n]!;
    const next = points[(i + 1) % n]!;
    const dPrev = Math.hypot(prev[0] - cur[0], prev[1] - cur[1]) || 1;
    const dNext = Math.hypot(next[0] - cur[0], next[1] - cur[1]) || 1;
    const t = Math.min(rad, dPrev / 2, dNext / 2);
    return {
      a: [cur[0] + ((prev[0] - cur[0]) * t) / dPrev, cur[1] + ((prev[1] - cur[1]) * t) / dPrev] as [number, number],
      cur,
      b: [cur[0] + ((next[0] - cur[0]) * t) / dNext, cur[1] + ((next[1] - cur[1]) * t) / dNext] as [number, number],
    };
  });
}

export function roundedPolygonPath(points: [number, number][], radius: number): string {
  if (points.length < 3) return "";
  const out = roundedCorners(points, radius).map(({ a, cur, b }, i) => `${i === 0 ? "M" : "L"}${r(a[0])} ${r(a[1])}Q${r(cur[0])} ${r(cur[1])} ${r(b[0])} ${r(b[1])}`);
  return `${out.join("")}Z`;
}

/** The same rounded outline as straight segments (each corner curve in `steps` pieces), for boolean operations. */
export function roundedPolygonOutline(points: [number, number][], radius: number, steps = 6): [number, number][] {
  if (points.length < 3) return [];
  const ring: [number, number][] = [];
  for (const { a, cur, b } of roundedCorners(points, radius)) {
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const m = 1 - t;
      ring.push([m * m * a[0] + 2 * m * t * cur[0] + t * t * b[0], m * m * a[1] + 2 * m * t * cur[1] + t * t * b[1]]);
    }
  }
  return ring;
}

function outline(pts: [number, number][], radius: number): string {
  return radius > 0 ? `<path d="${roundedPolygonPath(pts, radius)}" ${NS}/>` : `<polygon points="${pts.map((p) => `${r(p[0])},${r(p[1])}`).join(" ")}" ${NS}/>`;
}

export function polygonShape(sides = 3, radius = 0): ShapeVector {
  return { viewBox: "0 0 100 100", markup: outline(polygonPoints(sides), radius) };
}

export function starShape(points = 5, inner = 0.382, radius = 0): ShapeVector {
  return { viewBox: "0 0 100 100", markup: outline(polygonPoints(points, inner), radius) };
}

/** A horizontal line `length` long; the layer is rotated to point anywhere else. */
export function lineShape(length: number): ShapeVector {
  const l = r(Math.max(1, length));
  return { viewBox: `0 0 ${l} ${THIN}`, markup: `<path d="M0 0H${l}" ${NS}/>` };
}

/** A line with an open arrowhead at its end. */
export function arrowShape(length: number, head = 10): ShapeVector {
  const l = Math.max(1, length);
  const h = Math.min(head, l);
  return { viewBox: `0 0 ${r(l)} ${THIN}`, markup: `<path d="M0 0H${r(l)}M${r(l - h)} ${r(-h / 2)}L${r(l)} 0L${r(l - h)} ${r(h / 2)}" ${NS}/>` };
}

/** Position and rotation that put a line of `length` between two points, given the layer rotates around its centre. */
export function lineBetween(x1: number, y1: number, x2: number, y2: number, snap15 = false): { x: number; y: number; length: number; rotation: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (snap15) angle = Math.round(angle / 15) * 15;
  const rad = (angle * Math.PI) / 180;
  const ex = x1 + Math.cos(rad) * length;
  const ey = y1 + Math.sin(rad) * length;
  return { x: (x1 + ex) / 2 - length / 2, y: (y1 + ey) / 2, length, rotation: angle === 180 ? 180 : angle };
}
