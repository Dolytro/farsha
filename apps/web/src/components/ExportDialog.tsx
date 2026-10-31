import { useEffect, useState } from "react";
import { EXPORT_SCALES, exportFileName } from "../exporting";
import { exportAs, type ExportChoice } from "../pdf-export";
import { topLevelFrames } from "../section-actions";
import { useEditor } from "../store";
import { Select } from "./Select";

/** File > Export… (Ctrl+Shift+E): export the selected layers, or every frame of the page when nothing is selected. */
export function ExportDialog() {
  const open = useEditor((s) => s.exportOpen);
  const setOpen = useEditor((s) => s.setExportOpen);
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const pageId = useEditor((s) => s.pageId);
  const [format, setFormat] = useState<ExportChoice>("PNG");
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, setOpen]);

  if (!open) return null;
  const ids = selection.length ? selection : topLevelFrames(doc, pageId).map((f) => f.id);
  const layers = ids.map((id) => doc.getNode(id)).filter((n): n is NonNullable<typeof n> => !!n && n.type !== "PAGE" && n.type !== "DOCUMENT");

  const run = async () => {
    const { showToast } = useEditor.getState();
    setBusy(true);
    try {
      const n = await exportAs(doc, layers.map((l) => l.id), format, scale, doc.getNode(layers[0]?.id ?? "")?.name ?? "Canvylo");
      showToast(n ? `Exported ${n} ${n === 1 ? "file" : "files"}` : "Nothing to export");
      setOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? `Couldn't export: ${err.message}` : "Couldn't export");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dialog" onPointerDown={() => setOpen(false)}>
      <div className="dialog__box" role="dialog" aria-label="Export" onPointerDown={(e) => e.stopPropagation()}>
        <div className="dialog__head">
          <strong>Export</strong>
          <button className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>
        <p className="dialog__note">{selection.length ? "The selected layers" : "Every frame on this page"} ({layers.length}). One file per layer.</p>
        <div className="props__grid">
          <Select className="field__select" aria-label="Export scale" value={scale} disabled={format === "SVG" || format === "PDF"} onChange={(e) => setScale(Number(e.target.value))}>
            {EXPORT_SCALES.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </Select>
          <Select className="field__select" aria-label="Export format" value={format} onChange={(e) => setFormat(e.target.value as ExportChoice)}>
            <option value="PNG">PNG</option>
            <option value="JPG">JPG</option>
            <option value="SVG">SVG</option>
            <option value="PDF">PDF</option>
          </Select>
        </div>
        <ul className="dialog__list">
          {layers.slice(0, 12).map((l) => (
            <li className="dialog__row" key={l.id}>
              <span className="dialog__name">{format === "PDF" ? `${l.name}.pdf` : exportFileName(l.name, format, scale)}</span>
            </li>
          ))}
          {layers.length > 12 && <li className="dialog__note">…and {layers.length - 12} more</li>}
          {layers.length === 0 && <li className="dialog__note">Nothing to export yet. Draw a frame first.</li>}
        </ul>
        <button className="props__button props__button--primary" disabled={busy || layers.length === 0} onClick={() => void run()}>
          Export {layers.length} {layers.length === 1 ? "layer" : "layers"}
        </button>
      </div>
    </div>
  );
}
