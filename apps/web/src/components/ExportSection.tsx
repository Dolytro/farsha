import { useState } from "react";
import type { DesignDoc } from "@farsha/design-core";
import { EXPORT_SCALES } from "../exporting";
import { exportAs, type ExportChoice } from "../pdf-export";
import { exportPage, pageLayerIds } from "../page-export";
import { SETTING_FORMATS, SETTING_SCALES, exportWithSettings, newSetting } from "../export-settings";
import type { ExportSetting, ExportSettingFormat } from "@farsha/types";
import { useEditor } from "../store";
import { Select } from "./Select";

const FORMATS: ExportChoice[] = ["PNG", "JPG", "SVG", "PDF"];

/** Figma's Export section for one layer: several settings (format, scale, suffix) saved with the layer, exported together. */
function LayerExport({ doc, id }: { doc: DesignDoc; id: string }) {
  const node = doc.getNode(id);
  const [busy, setBusy] = useState(false);
  useEditor((s) => s.version);
  if (!node) return null;
  const list = node.exportSettings ?? [];
  const save = (next: ExportSetting[]) => doc.setStyle(id, { exportSettings: next.length ? next : null });
  const patch = (i: number, p: Partial<ExportSetting>) => save(list.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const run = async () => {
    const { showToast } = useEditor.getState();
    setBusy(true);
    try {
      const n = await exportWithSettings(doc, id, list);
      showToast(n ? `Exported ${n} ${n === 1 ? "file" : "files"}` : "Nothing to export");
    } catch (err) {
      showToast(err instanceof Error ? `Couldn't export: ${err.message}` : "Couldn't export");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="props__section">
      <h3 className="props__heading props__heading--row">
        Export
        <button className="props__add" title="Add export setting" aria-label="Add export setting" onClick={() => save([...list, newSetting()])}>
          +
        </button>
      </h3>
      {list.map((s, i) => (
        <div className="export-row" key={i}>
          <Select className="field__select" aria-label="Export scale" value={s.scale} disabled={s.format === "SVG" || s.format === "PDF"} onChange={(e) => patch(i, { scale: Number(e.target.value) })}>
            {SETTING_SCALES.map((x) => (
              <option key={x} value={x}>
                {x}x
              </option>
            ))}
          </Select>
          <input className="field__input export-row__suffix" aria-label="Export suffix" placeholder="Suffix" value={s.suffix} onChange={(e) => patch(i, { suffix: e.target.value })} />
          <Select className="field__select" aria-label="Export format" value={s.format} onChange={(e) => patch(i, { format: e.target.value as ExportSettingFormat })}>
            {SETTING_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
          <button className="props__add" title="Remove export setting" aria-label="Remove export setting" onClick={() => save(list.filter((_, j) => j !== i))}>
            −
          </button>
        </div>
      ))}
      <button className="props__button" disabled={busy} onClick={run}>
        Export {node.name}
      </button>
    </section>
  );
}

/** Figma's Export section: pick a scale and format, then export the selected layers. */
export function ExportSection({ doc, ids, pageId }: { doc: DesignDoc; ids: string[]; pageId?: string }) {
  // one layer: its own saved list of export settings; the page or several layers: one temporary setting
  if (!pageId && ids.length === 1) return <LayerExport doc={doc} id={ids[0]!} />;
  const [format, setFormat] = useState<ExportChoice>("PNG");
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const names = ids.map((id) => doc.getNode(id)?.name).filter(Boolean) as string[];
  const label = pageId ? (doc.getNode(pageId)?.name ?? "page") : ids.length === 1 ? names[0] : `${ids.length} layers`;

  const run = async () => {
    const { showToast } = useEditor.getState();
    setBusy(true);
    try {
      const n = pageId && format !== "PDF" ? await exportPage(doc, pageId, format, scale) : await exportAs(doc, pageId ? pageLayerIds(doc, pageId) : ids, format, scale, label ?? "Farsha");
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
