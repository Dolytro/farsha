import { useState } from "react";
import type { DesignDoc } from "@canvylo/design-core";
import { EXPORT_SCALES } from "../exporting";
import { exportAs, type ExportChoice } from "../pdf-export";
import { exportPage, pageLayerIds } from "../page-export";
import { useEditor } from "../store";
import { Select } from "./Select";

const FORMATS: ExportChoice[] = ["PNG", "JPG", "SVG", "PDF"];

/** Figma's Export section: pick a scale and format, then export the selected layers. */
export function ExportSection({ doc, ids, pageId }: { doc: DesignDoc; ids: string[]; pageId?: string }) {
  const [format, setFormat] = useState<ExportChoice>("PNG");
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const names = ids.map((id) => doc.getNode(id)?.name).filter(Boolean) as string[];
  const label = pageId ? (doc.getNode(pageId)?.name ?? "page") : ids.length === 1 ? names[0] : `${ids.length} layers`;

  const run = async () => {
    const { showToast } = useEditor.getState();
    setBusy(true);
    try {
      const n = pageId && format !== "PDF" ? await exportPage(doc, pageId, format, scale) : await exportAs(doc, pageId ? pageLayerIds(doc, pageId) : ids, format, scale, label ?? "Canvylo");
      showToast(n ? (format === "PDF" ? `Choose "Save as PDF" in the print window (${n} page${n === 1 ? "" : "s"})` : `Exported ${n} ${n === 1 ? "file" : "files"}`) : "Nothing to export");
    } catch (err) {
      showToast(err instanceof Error ? `Couldn't export: ${err.message}` : "Couldn't export");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="props__section">
      <h3 className="props__heading">Export</h3>
      <div className="props__grid">
        <Select className="field__select" aria-label="Export scale" value={scale} disabled={format === "SVG" || format === "PDF"} onChange={(e) => setScale(Number(e.target.value))}>
          {EXPORT_SCALES.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </Select>
        <Select className="field__select" aria-label="Export format" value={format} onChange={(e) => setFormat(e.target.value as ExportChoice)}>
          {FORMATS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
      </div>
      <button className="props__button" disabled={busy} onClick={run}>
        Export {label}
      </button>
    </section>
  );
}
