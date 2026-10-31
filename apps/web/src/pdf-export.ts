import type { DesignDoc } from "@canvylo/design-core";
import { exportSvg } from "@canvylo/canvas-engine";
import { canvasMeasure } from "./text-layout";
import { isSection, topLevelFrames } from "./section-actions";

export interface PdfPage {
  svg: string;
  width: number;
  height: number;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Print-ready HTML: one page per frame, each page exactly the size of its frame (CSS named pages), so
 * "Save as PDF" in the browser's print dialog gives a PDF with one frame per page.
 */
export function buildPrintHtml(title: string, pages: PdfPage[]): string {
  const css = pages
    .map((p, i) => `@page p${i} { size: ${Math.round(p.width)}px ${Math.round(p.height)}px; margin: 0; }\n.p${i} { page: p${i}; width: ${Math.round(p.width)}px; height: ${Math.round(p.height)}px; }`)
    .join("\n");
  const body = pages.map((p, i) => `<section class="page p${i}">${p.svg}</section>`).join("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
html, body { margin: 0; padding: 0; background: #fff; }
.page { overflow: hidden; break-after: page; }
.page:last-child { break-after: auto; }
.page svg { display: block; }
${css}
</style></head><body>${body}</body></html>`;
}

/** The frames to export: the selected frames, or every frame of the page when none are selected. */
export function framesToExport(doc: DesignDoc, pageId: string, selection: string[]): string[] {
  const picked = selection.filter((id) => doc.getNode(id)?.type === "FRAME" && !isSection(doc.getNode(id)));
  return picked.length ? picked : topLevelFrames(doc, pageId).filter((n) => n.visible).map((n) => n.id);
}

export function pdfPages(doc: DesignDoc, ids: string[]): PdfPage[] {
  return ids.flatMap((id) => {
    const out = exportSvg(doc, [id], { measure: canvasMeasure });
    return out ? [{ svg: out.svg, width: out.width, height: out.height }] : [];
  });
}

/** Open the browser's print dialog with one page per frame. Returns how many pages were prepared (0 when there is nothing to export). */
export function exportFramesToPdf(doc: DesignDoc, pageId: string, selection: string[], title: string): number {
  const pages = pdfPages(doc, framesToExport(doc, pageId, selection));
  if (!pages.length) return 0;
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const w = frame.contentWindow!;
  w.document.open();
  w.document.write(buildPrintHtml(title, pages));
  w.document.close();
  const cleanup = () => setTimeout(() => frame.remove(), 1000);
  w.addEventListener("afterprint", cleanup);
  setTimeout(() => {
    w.focus();
    w.print();
    setTimeout(cleanup, 60000);
  }, 200);
  return pages.length;
}
