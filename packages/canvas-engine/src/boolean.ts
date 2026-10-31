import polygonClipping from "polygon-clipping";
import type { DesignDoc } from "@canvylo/design-core";
import type { DesignNode } from "@canvylo/types";

export type BooleanOp = "UNION" | "SUBTRACT" | "INTERSECT" | "EXCLUDE";

type Ring = [number, number][];
/** polygon-clipping format: a polygon is [outer ring, ...hole rings]; a shape is a list of polygons. */
type Shape = Ring[][];

export interface BooleanResult {
  /** Path data in page coordinates, one `M ... Z` per ring (use fill-rule evenodd). */
  rings: Ring[];
  box: { x: number; y: number; width: number; height: number };
  /** Path data relative to the box origin. */
  d: string;
}

const r2 = (v: number) => String(Math.round(v * 100) / 100);

/** Points of a layer's outline in its own coordinates, flattened to straight segments. */
function localOutline(n: DesignNode): Ring | null {
  if (n.type === "RECTANGLE") {
    const radius = Math.max(0, Math.min(n.cornerRadius ?? 0, n.width / 2, n.height / 2));
    if (!radius) return [[0, 0], [n.width, 0], [n.width, n.height], [0, n.height]];
    const out: Ring = [];
    const corner = (cx: number, cy: number, from: number) => {
      for (let i = 0; i <= 8; i++) {
        const a = from + (i / 8) * (Math.PI / 2);
        out.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
      }
    };
    corner(n.width - radius, radius, -Math.PI / 2);
    corner(n.width - radius, n.height - radius, 0);
    corner(radius, n.height - radius, Math.PI / 2);
    corner(radius, radius, Math.PI);
    return out;
  }
  if (n.type === "ELLIPSE") {
    return Array.from({ length: 72 }, (_, i) => {
      const a = (i / 72) * Math.PI * 2;
      return [n.width / 2 + (Math.cos(a) * n.width) / 2, n.height / 2 + (Math.sin(a) * n.height) / 2] as [number, number];
    });
  }
  if (n.type === "VECTOR") {
    const [, , vw, vh] = n.viewBox.split(/\s+/).map(Number);
    const sx = vw ? n.width / vw : 1;
    const sy = vh ? n.height / vh : 1;
    if (n.penPoints && n.penPoints.length > 2) {
      const pts: Ring = [];
      const p = n.penPoints;
      for (let i = 0; i < p.length; i++) {
        const a = p[i]!;
        const b = p[(i + 1) % p.length]!;
        const straight = a.hx === 0 && a.hy === 0 && b.hx === 0 && b.hy === 0;
        const steps = straight ? 1 : 16;
        for (let k = 0; k < steps; k++) {
          const t = k / steps;
          const m = 1 - t;
          const c1x = a.x + a.hx;
          const c1y = a.y + a.hy;
          const c2x = b.x - b.hx;
          const c2y = b.y - b.hy;
          pts.push([(m * m * m * a.x + 3 * m * m * t * c1x + 3 * m * t * t * c2x + t * t * t * b.x) * sx, (m * m * m * a.y + 3 * m * m * t * c1y + 3 * m * t * t * c2y + t * t * t * b.y) * sy]);
        }
      }
      return pts;
    }
    // polygons and stars from the shape tools
    const m = /<polygon points="([0-9eE+\-.,\s]+)"/.exec(n.markup);
    if (m) {
      const nums = m[1]!.trim().split(/[\s,]+/).map(Number);
      const pts: Ring = [];
      for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i]! * sx, nums[i + 1]! * sy]);
      return pts.length > 2 ? pts : null;
    }
  }
  return null;
}

/** Outline of a layer in page coordinates: the local outline flipped, rotated about the centre, then moved to its position. */
function pageOutline(doc: DesignDoc, n: DesignNode): Ring | null {
  const local = localOutline(n);
  const abs = doc.absoluteBox(n.id);
  if (!local || !abs) return null;
  const cx = n.width / 2;
  const cy = n.height / 2;
  const rad = ((n.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return local.map(([x, y]) => {
    const fx = n.flipX ? 2 * cx - x : x;
    const fy = n.flipY ? 2 * cy - y : y;
    const dx = fx - cx;
    const dy = fy - cy;
    return [abs.x + cx + dx * cos - dy * sin, abs.y + cy + dx * sin + dy * cos] as [number, number];
  });
}

/** Layers that can be outlined inside the given one (groups and frames are searched), bottom to top. */
function outlinable(doc: DesignDoc, id: string): DesignNode[] {
  const n = doc.getNode(id);
  if (!n) return [];
  if (n.type === "GROUP" || n.type === "FRAME") return doc.children(id).flatMap((c) => outlinable(doc, c.id));
  return localOutline(n) ? [n] : [];
}

/** Merge layers into one set of outlines without combining them (Figma's Flatten). Groups and frames contribute their shapes. */
export function flattenShapes(doc: DesignDoc, ids: string[]): BooleanResult | null {
  const rings = ids
    .flatMap((id) => outlinable(doc, id))
    .map((n) => pageOutline(doc, n))
    .filter((ring): ring is Ring => !!ring && ring.length > 2);
  if (!rings.length) return null;
  const xs = rings.flatMap((ring) => ring.map((p) => p[0]));
  const ys = rings.flatMap((ring) => ring.map((p) => p[1]));
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const box = { x, y, width: Math.max(1, Math.max(...xs) - x), height: Math.max(1, Math.max(...ys) - y) };
  const d = rings.map((ring) => `M${ring.map((p) => `${r2(p[0] - x)} ${r2(p[1] - y)}`).join(" L")} Z`).join(" ");
  return { rings, box, d };
}

/** Combine layers (listed bottom to top) with a boolean operation. Returns null when a layer cannot be outlined or the result is empty. */
export function booleanShapes(doc: DesignDoc, ids: string[], op: BooleanOp): BooleanResult | null {
  const shapes: Shape[] = [];
  for (const id of ids) {
    const n = doc.getNode(id);
    const ring = n ? pageOutline(doc, n) : null;
    if (!ring) return null;
    shapes.push([[ring]]);
  }
  if (shapes.length < 2) return null;
  const [first, ...rest] = shapes as [Shape, ...Shape[]];
  const result =
    op === "UNION" ? polygonClipping.union(first, ...rest) : op === "SUBTRACT" ? polygonClipping.difference(first, ...rest) : op === "INTERSECT" ? polygonClipping.intersection(first, ...rest) : polygonClipping.xor(first, ...rest);
  const rings = (result as Shape).flatMap((poly) => poly.map((ring) => ring.slice(0, -1) as Ring)).filter((ring) => ring.length > 2);
  if (!rings.length) return null;
  const xs = rings.flatMap((ring) => ring.map((p) => p[0]));
  const ys = rings.flatMap((ring) => ring.map((p) => p[1]));
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const box = { x, y, width: Math.max(1, Math.max(...xs) - x), height: Math.max(1, Math.max(...ys) - y) };
  const d = rings.map((ring) => `M${ring.map((p) => `${r2(p[0] - x)} ${r2(p[1] - y)}`).join(" L")} Z`).join(" ");
  return { rings, box, d };
}

