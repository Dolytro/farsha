import type { DesignDoc } from "@farsha/design-core";
import type { DesignNode } from "@farsha/types";
import { arcParams } from "@farsha/canvas-engine";

/** Figma's ellipse handles as fields: where the arc starts, how far it sweeps, and the inner radius (a ratio above 0 makes a ring). */
export function ArcSection({ doc, node }: { doc: DesignDoc; node: DesignNode }) {
  if (node.type !== "ELLIPSE") return null;
  const a = arcParams(node);
  const field = (label: string, title: string, value: number, onChange: (v: number) => void, min?: number, max?: number) => (
    <label className="field field--row" title={title}>
      <span className="field__label field__label--text">{label}</span>
      <input
        className="field__input"
        type="number"
        min={min}
        max={max}
        aria-label={title}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (e.target.value !== "" && Number.isFinite(v)) onChange(v);
        }}
      />
    </label>
  );
  return (
    <section className="props__section">
      <h3 className="props__heading">Arc</h3>
      <div className="props__stack">
        {field("Start", "Arc start (degrees)", Math.round(a.start * 100) / 100, (v) => doc.setStyle(node.id, { arcStart: v }))}
        {field("Sweep", "Arc sweep (degrees)", Math.round(a.sweep * 100) / 100, (v) => doc.setStyle(node.id, { arcSweep: Math.min(360, Math.max(0, v)) }), 0, 360)}
        {field("Ratio", "Arc ratio (inner radius, %)", Math.round(a.ratio * 100), (v) => doc.setStyle(node.id, { arcRatio: Math.min(0.99, Math.max(0, v / 100)) }), 0, 99)}
      </div>
    </section>
  );
}
