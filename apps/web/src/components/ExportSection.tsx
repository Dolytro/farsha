import { useState } from "react";
import type { DesignDoc } from "@canvylo/design-core";
import { EXPORT_SCALES, exportLayers, type ExportFormat } from "../exporting";
import { useEditor } from "../store";

const FORMATS: ExportFormat[] = ["PNG", "JPG", "SVG"];

/** Figma's Export section: pick a scale and format, then export the selected layers. */
export function ExportSection({ doc, ids }: { doc: DesignDoc; ids: string[] }) {
  const [format, setFormat] = useState<ExportFormat>("PNG");
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const names = ids.map((id) => doc.getNode(id)?.name).filter(Boolean) as string[];
  const label = ids.length === 1 ? names[0] : `${ids.length} layers`;

  const run = async () => {
    const { showToast } = useEditor.getState();
    setBusy(true);
    try {
      const n = await exportLayers(doc, ids, format, scale);
      showToast(n ? `Exported ${n} ${n === 1 ? "file" : "files"}` : "Nothing to export");
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
        <select className="field__select" aria-label="Export scale" value={scale} disabled={format === "SVG"} onChange={(e) => setScale(Number(e.target.value))}>
          {EXPORT_SCALES.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>
        <select className="field__select" aria-label="Export format" value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)}>
          {FORMATS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
      <button className="props__button" disabled={busy} onClick={run}>
        Export {label}
      </button>
    </section>
  );
}
