import type { DesignDoc } from "@canvylo/design-core";
import type { TextAlign, TextNode } from "@canvylo/types";

export const FONTS: { label: string; stack: string }[] = [
  { label: "Inter", stack: "Inter, system-ui, sans-serif" },
  { label: "Roboto", stack: "Roboto, system-ui, sans-serif" },
  { label: "Arial", stack: "Arial, Helvetica, sans-serif" },
  { label: "Helvetica", stack: "Helvetica, Arial, sans-serif" },
  { label: "Georgia", stack: "Georgia, serif" },
  { label: "Times New Roman", stack: "'Times New Roman', Times, serif" },
  { label: "Courier New", stack: "'Courier New', monospace" },
  { label: "System UI", stack: "system-ui, sans-serif" },
];

export const WEIGHTS: [number, string][] = [
  [100, "Thin"],
  [200, "Extra Light"],
  [300, "Light"],
  [400, "Regular"],
  [500, "Medium"],
  [600, "Semi Bold"],
  [700, "Bold"],
  [800, "Extra Bold"],
  [900, "Black"],
];

const ALIGNS: [TextAlign, string, string][] = [
  ["LEFT", "⇤", "Align left"],
  ["CENTER", "↔", "Align center"],
  ["RIGHT", "⇥", "Align right"],
];

const firstFamily = (stack: string) => stack.split(",")[0]!.trim().replace(/['"]/g, "");

export function TypographySection({ doc, node }: { doc: DesignDoc; node: TextNode }) {
  const set = (patch: Parameters<DesignDoc["setText"]>[1]) => doc.setText(node.id, patch);
  const known = FONTS.find((f) => firstFamily(f.stack) === firstFamily(node.fontFamily));
  const weightKnown = WEIGHTS.some(([w]) => w === node.fontWeight);

  return (
    <section className="props__section">
      <h3 className="props__heading">Typography</h3>
      <input className="field__input field__input--wide" value={node.characters} onChange={(e) => set({ characters: e.target.value })} />
      <select className="field__select field__select--wide" value={known?.stack ?? node.fontFamily} onChange={(e) => set({ fontFamily: e.target.value })}>
        {!known && <option value={node.fontFamily}>{firstFamily(node.fontFamily)}</option>}
        {FONTS.map((f) => (
          <option key={f.label} value={f.stack}>
            {f.label}
          </option>
        ))}
      </select>
      <div className="props__grid props__grid--gap">
        <select className="field__select" value={node.fontWeight} onChange={(e) => set({ fontWeight: Number(e.target.value) })}>
          {!weightKnown && <option value={node.fontWeight}>{node.fontWeight}</option>}
          {WEIGHTS.map(([w, label]) => (
            <option key={w} value={w}>
              {label}
            </option>
          ))}
        </select>
        <label className="field">
          <span className="field__label">Size</span>
          <input className="field__input" type="number" min={1} value={node.fontSize} onChange={(e) => Number(e.target.value) > 0 && set({ fontSize: Number(e.target.value) })} />
        </label>
        <label className="field" title="Line height (empty = Auto)">
          <span className="field__label">↕</span>
          <input
            className="field__input"
            type="number"
            min={0}
            placeholder="Auto"
            value={node.lineHeight === "AUTO" ? "" : node.lineHeight}
            onChange={(e) => {
              const v = e.target.value === "" ? 0 : Number(e.target.value);
              if (!Number.isFinite(v)) return;
              set({ lineHeight: v > 0 ? v : "AUTO" });
              if (v > 0) doc.resizeNode(node.id, { height: v });
            }}
          />
        </label>
        <label className="field" title="Letter spacing (px)">
          <span className="field__label">↔</span>
          <input className="field__input" type="number" step={0.1} value={node.letterSpacing} onChange={(e) => Number.isFinite(Number(e.target.value)) && set({ letterSpacing: Number(e.target.value) })} />
        </label>
      </div>
      <div className="seg">
        {ALIGNS.map(([a, icon, title]) => (
          <button key={a} className={`seg__btn${node.textAlign === a ? " seg__btn--active" : ""}`} title={title} onClick={() => set({ textAlign: a })}>
            {icon}
          </button>
        ))}
      </div>
    </section>
  );
}
