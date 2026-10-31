import type { DesignDoc } from "@canvylo/design-core";
import { exportSvg } from "@canvylo/canvas-engine";
import { canvasMeasure } from "./text-layout";
import { exportFileName, svgToPngBlob, type ExportFormat } from "./exporting";

/** The layers that make up a page's picture: its visible top-level layers. */
export function pageLayerIds(doc: DesignDoc, pageId: string): string[] {
  return doc.children(pageId).filter((n) => n.visible).map((n) => n.id);
}

/** Figma's Export on a page: everything on the page as one image (SVG, PNG or JPG), cropped to its content. */
export async function exportPage(doc: DesignDoc, pageId: string, format: ExportFormat, scale: number): Promise<number> {
  const out = exportSvg(doc, pageLayerIds(doc, pageId), { measure: canvasMeasure });
  if (!out) return 0;
  const blob = format === "SVG" ? new Blob([out.svg], { type: "image/svg+xml" }) : await svgToPngBlob(out.svg, out.width, out.height, scale, format === "JPG" ? "image/jpeg" : "image/png");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = exportFileName(doc.getNode(pageId)?.name ?? "Page", format, scale);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 1;
}
