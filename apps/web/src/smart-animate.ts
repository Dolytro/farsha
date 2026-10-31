import { DesignDoc } from "@canvylo/design-core";
import { exportSvg } from "@canvylo/canvas-engine";
import type { DesignNode } from "@canvylo/types";
import { canvasMeasure } from "./text-layout";

export interface LayerPair {
  /** The layer of the destination frame that moves. */
  toId: string;
  from: { x: number; y: number; width: number; height: number; opacity: number };
  to: { x: number; y: number; width: number; height: number; opacity: number };
}

const props = (n: DesignNode) => ({ x: n.x, y: n.y, width: n.width, height: n.height, opacity: n.opacity });
const key = (n: DesignNode) => `${n.type}:${n.name}`;

/** Figma's Smart animate matching: layers with the same name and type in both frames are paired (each at most once, in order). */
export function matchLayers(doc: DesignDoc, fromFrame: string, toFrame: string): LayerPair[] {
  const pool = new Map<string, DesignNode[]>();
  for (const n of doc.descendants(fromFrame)) pool.set(key(n), [...(pool.get(key(n)) ?? []), n]);
  const pairs: LayerPair[] = [];
  for (const n of doc.descendants(toFrame)) {
    const list = pool.get(key(n));
    const was = list?.shift();
    if (!was) continue;
    const a = props(was);
    const b = props(n);
    if (JSON.stringify(a) !== JSON.stringify(b)) pairs.push({ toId: n.id, from: a, to: b });
  }
  return pairs;
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Ease in and out, like Figma's default smart animate curve. */
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * The destination frame drawn part-way through the animation: every paired layer sits between its old and new position, size and opacity.
 * `scratch` is a copy of the document that this function is free to change.
 */
export function frameAt(scratch: DesignDoc, toFrame: string, pairs: LayerPair[], progress: number, ease: (t: number) => number = easeInOut): { svg: string; width: number; height: number } | null {
  const t = ease(Math.min(1, Math.max(0, progress)));
  scratch.patchNodes(
    Object.fromEntries(
      pairs.map((p) => [p.toId, { x: mix(p.from.x, p.to.x, t), y: mix(p.from.y, p.to.y, t), width: mix(p.from.width, p.to.width, t), height: mix(p.from.height, p.to.height, t), opacity: mix(p.from.opacity, p.to.opacity, t) }]),
    ),
  );
  return exportSvg(scratch, [toFrame], { measure: canvasMeasure });
}

/** A private copy of the document to tween on. */
export const scratchCopy = (doc: DesignDoc): DesignDoc => DesignDoc.fromState(doc.encodeState());
