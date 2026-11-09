import { polygonShape, starShape } from "@farsha/canvas-engine";

export const MIN_SIDES = 3;
export const MAX_SIDES = 60;
export const DEFAULT_STAR_RATIO = 0.382;
export const MAX_SHAPE_RADIUS = 50;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** What a Polygon or Star layer is rewritten with when its side count or ratio changes: new geometry plus the numbers it was made from. */
export function polygonPatch(kind: "POLYGON" | "STAR", sides: number, ratio = DEFAULT_STAR_RATIO, radius = 0): Record<string, unknown> {
  const n = clamp(Number.isFinite(sides) ? Math.round(sides) : MIN_SIDES, MIN_SIDES, MAX_SIDES);
  const k = clamp(Number.isFinite(ratio) ? ratio : DEFAULT_STAR_RATIO, 0.05, 0.95);
  const rad = clamp(Number.isFinite(radius) ? radius : 0, 0, MAX_SHAPE_RADIUS);
  const shape = kind === "STAR" ? starShape(n, k, rad) : polygonShape(n, rad);
  return { ...shape, shapeKind: kind, shapeSides: n, shapeRadius: Math.round(rad * 100) / 100, ...(kind === "STAR" ? { starRatio: Math.round(k * 1000) / 1000 } : {}) };
}

/** The numbers stored on a new Polygon or Star layer (a triangle, or a five point star). */
export function startShapeParams(kind: "POLYGON" | "STAR"): Record<string, unknown> {
  return kind === "STAR" ? { shapeKind: "STAR", shapeSides: 5, starRatio: DEFAULT_STAR_RATIO } : { shapeKind: "POLYGON", shapeSides: 3 };
}
