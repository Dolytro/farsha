import type { DesignDoc } from "@canvylo/design-core";
import { layoutText, type Measure } from "@canvylo/canvas-engine";

let ctx: CanvasRenderingContext2D | null | undefined;

/** Real text width from the browser's canvas, so wrapping and auto sizing match what is drawn. */
export const canvasMeasure: Measure = (text, f) => {
  if (ctx === undefined) ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * (f.size * 0.56 + f.letterSpacing);
  ctx.font = `${f.weight} ${f.size}px ${f.family}`;
  return ctx.measureText(text).width + f.letterSpacing * text.length;
};

/** Apply the layer's auto-resize mode: auto width fits both sides, auto height keeps the width and fits the height. */
export function fitText(doc: DesignDoc, id: string): void {
  const n = doc.getNode(id);
  if (n?.type !== "TEXT") return;
  const mode = n.textAutoResize ?? "WIDTH_AND_HEIGHT";
  if (mode === "NONE") return;
  const layout = layoutText(n, canvasMeasure);
  const height = Math.max(1, Math.ceil(layout.height));
  if (mode === "WIDTH_AND_HEIGHT") {
    const width = Math.max(8, Math.ceil(layout.width));
    if (width !== n.width || height !== n.height) doc.resizeNode(id, { width, height });
  } else if (height !== n.height) doc.resizeNode(id, { height });
}
