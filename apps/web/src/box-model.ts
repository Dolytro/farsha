import type { DesignNode } from "@farsha/types";

export interface BoxModel {
  width: number;
  height: number;
  /** [top, right, bottom, left] */
  padding: [number, number, number, number];
  /** [top, right, bottom, left] */
  border: [number, number, number, number];
}

/** The CSS box model of a layer: its size, the padding of an auto layout frame and the stroke weights as borders. Null when it has neither (nothing to draw). */
export function boxModelOf(node: DesignNode): BoxModel | null {
  if (node.type !== "FRAME" && node.type !== "RECTANGLE" && node.type !== "ELLIPSE") return null;
  const any = node as unknown as { paddingTop?: number; paddingRight?: number; paddingBottom?: number; paddingLeft?: number; layoutMode?: string | null; strokes?: unknown[]; strokeWidth?: number; strokeSides?: [number, number, number, number] };
  const padding: BoxModel["padding"] = any.layoutMode ? [any.paddingTop ?? 0, any.paddingRight ?? 0, any.paddingBottom ?? 0, any.paddingLeft ?? 0] : [0, 0, 0, 0];
  const w = any.strokes?.length ? Math.max(0, any.strokeWidth ?? 0) : 0;
  const border: BoxModel["border"] = any.strokes?.length ? (any.strokeSides ?? [w, w, w, w]) : [0, 0, 0, 0];
  if (padding.every((v) => v === 0) && border.every((v) => v === 0)) return null;
  return { width: node.width, height: node.height, padding, border };
}
