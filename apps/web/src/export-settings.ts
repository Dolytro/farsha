import type { DesignDoc } from "@farsha/design-core";
import { exportSvg } from "@farsha/canvas-engine";
import type { ExportSetting, ExportSettingFormat } from "@farsha/types";
import { canvasMeasure } from "./text-layout";
import { svgToPngBlob } from "./exporting";
import { exportAs } from "./pdf-export";

export const SETTING_FORMATS: ExportSettingFormat[] = ["PNG", "JPG", "WEBP", "SVG", "PDF"];
export const SETTING_SCALES = [0.5, 1, 1.5, 2, 3, 4] as const;

export const newSetting = (): ExportSetting => ({ format: "PNG", scale: 1, suffix: "" });

const EXT: Record<ExportSettingFormat, string> = { PNG: "png", JPG: "jpg", WEBP: "webp", SVG: "svg", PDF: "pdf" };
const MIME: Record<"PNG" | "JPG" | "WEBP", "image/png" | "image/jpeg" | "image/webp"> = { PNG: "image/png", JPG: "image/jpeg", WEBP: "image/webp" };

/** The file name of one export setting: the layer name, the suffix (or @2x when a scale other than 1 has no suffix), the extension. */
export function settingFileName(layerName: string, s: ExportSetting): string {
  const base = layerName.replace(/[\/:*?"<>| -]+/g, "_").replace(/^_+|_+$/g, "") || "Layer";
  const safeSuffix = (s.suffix ?? "").replace(/[\/\\:*?"<>|]/g, "");
  const suffix = safeSuffix || (s.scale !== 1 && s.format !== "SVG" && s.format !== "PDF" ? `@${s.scale}x` : "");
  return `${base}${suffix}.${EXT[s.format]}`;
}

/** Settings as they are stored: only known formats, a sane scale, a short suffix. */
export function cleanSettings(list: unknown): ExportSetting[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((s): s is ExportSetting => !!s && typeof s === "object" && SETTING_FORMATS.includes((s as ExportSetting).format))
    .map((s) => ({ format: s.format, scale: Number.isFinite(s.scale) ? Math.min(8, Math.max(0.1, s.scale)) : 1, suffix: String(s.suffix ?? "").slice(0, 40) }));
}

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Export one layer with each of its settings (one file per setting; PDF opens the print dialog). Returns how many files or pages were made. */
export async function exportWithSettings(doc: DesignDoc, id: string, settings: ExportSetting[]): Promise<number> {
  const node = doc.getNode(id);
  if (!node || node.type === "PAGE" || node.type === "DOCUMENT") return 0;
  const list = settings.length ? cleanSettings(settings) : [newSetting()];
  const out = exportSvg(doc, [id], { measure: canvasMeasure });
  if (!out) return 0;
  let made = 0;
  for (const s of list) {
    if (s.format === "PDF") made += await exportAs(doc, [id], "PDF", 1, node.name);
    else {
      const blob = s.format === "SVG" ? new Blob([out.svg], { type: "image/svg+xml" }) : await svgToPngBlob(out.svg, out.width, out.height, s.scale, MIME[s.format]);
      download(blob, settingFileName(node.name, s));
      made++;
    }
  }
  return made;
}
