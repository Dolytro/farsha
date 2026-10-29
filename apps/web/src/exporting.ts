import { exportSvg } from "@canvylo/canvas-engine";
import { canvasMeasure } from "./text-layout";
import { generateCode } from "@canvylo/code-generator";
import type { DesignDoc } from "@canvylo/design-core";

const MAX_PIXELS = 8192;

/** CSS for the first of the given layers (and its children), as shown in Dev Mode. */
export function cssFor(doc: DesignDoc, ids: string[]): string | null {
  const node = ids.length ? doc.getNode(ids[0]!) : undefined;
  if (!node || node.type === "PAGE" || node.type === "DOCUMENT") return null;
  return generateCode(node, (id) => doc.children(id), "css");
}

export function svgFor(doc: DesignDoc, ids: string[]): string | null {
  return exportSvg(doc, ids, { measure: canvasMeasure })?.svg ?? null;
}

/** Rasterise an SVG string to a PNG at `scale`x, capped so the canvas stays within browser limits. */
export async function svgToPngBlob(svg: string, width: number, height: number, scale = 2): Promise<Blob> {
  const s = Math.min(scale, MAX_PIXELS / Math.max(width, height, 1));
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Couldn't render the layer"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(width * s));
    canvas.height = Math.max(1, Math.ceil(height * s));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas isn't available");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function copyAsPng(doc: DesignDoc, ids: string[]): Promise<boolean> {
  const out = exportSvg(doc, ids, { measure: canvasMeasure });
  if (!out) return false;
  const blob = await svgToPngBlob(out.svg, out.width, out.height);
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  return true;
}

export async function copyAsSvg(doc: DesignDoc, ids: string[]): Promise<boolean> {
  const svg = svgFor(doc, ids);
  if (!svg) return false;
  await navigator.clipboard.writeText(svg);
  return true;
}

export async function copyAsCss(doc: DesignDoc, ids: string[]): Promise<boolean> {
  const css = cssFor(doc, ids);
  if (!css) return false;
  await navigator.clipboard.writeText(css);
  return true;
}
