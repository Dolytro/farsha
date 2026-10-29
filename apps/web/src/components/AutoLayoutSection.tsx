import type { DesignDoc } from "@canvylo/design-core";
import type { DesignNode, LayoutAlign, LayoutMode, LayoutSizing } from "@canvylo/types";
import { addAutoLayout, removeAutoLayout } from "../auto-layout-actions";

const PRIMARY: [LayoutAlign, string][] = [
  ["MIN", "Start"],
  ["CENTER", "Center"],
  ["MAX", "End"],
  ["SPACE_BETWEEN", "Space between"],
];
const COUNTER: [LayoutAlign, string][] = PRIMARY.slice(0, 3);

const num = (v: number | undefined) => (typeof v === "number" ? v : 0);

export function AutoLayoutSection({ doc, node, select }: { doc: DesignDoc; node: DesignNode; select: (ids: string[]) => void }) {
  if (node.type !== "FRAME") return null;
  const mode = node.layoutMode;

  if (mode !== "HORIZONTAL" && mode !== "VERTICAL") {
    return (
      <section className="props__section">
        <h3 className="props__heading props__heading--row">
          Auto layout
          <button className="props__add" title="Add auto layout (Shift+A)" onClick={() => select(addAutoLayout(doc, [node.id]))}>
            +
          </button>
        </h3>
      </section>
    );
  }

  const set = (patch: Parameters<DesignDoc["setStyle"]>[1]) => doc.setStyle(node.id, patch);
  const horizontal = mode === "HORIZONTAL";
  // Hug / fixed is stored per direction of travel; the panel shows it per width and height.
  const widthKey = horizontal ? "primarySizing" : "counterSizing";
  const heightKey = horizontal ? "counterSizing" : "primarySizing";
  const sizing = (key: "primarySizing" | "counterSizing"): LayoutSizing => node[key] ?? "HUG";
  const field = (label: string, title: string, value: number, onChange: (v: number) => void) => (
    <label className="field" title={title}>
      <span className="field__label">{label}</span>
      <input className="field__input" type="number" min={0} value={value} onChange={(e) => Number.isFinite(Number(e.target.value)) && onChange(Math.max(0, Number(e.target.value)))} />
    </label>
  );

  return (
    <section className="props__section">
      <h3 className="props__heading props__heading--row">
        Auto layout
        <button className="props__add" title="Remove auto layout" onClick={() => removeAutoLayout(doc, [node.id])}>
          −
        </button>
      </h3>
      <div className="seg seg--flat">
        {([["VERTICAL", "↓", "Vertical layout"], ["HORIZONTAL", "→", "Horizontal layout"]] as [LayoutMode, string, string][]).map(([m, icon, title]) => (
          <button key={m} className={`seg__btn${mode === m ? " seg__btn--active" : ""}`} title={title} onClick={() => set({ layoutMode: m })}>
            {icon}
          </button>
        ))}
      </div>
      <div className="props__grid props__grid--gap">
        {field("↔", "Horizontal padding", num(node.paddingLeft), (v) => set({ paddingLeft: v, paddingRight: v }))}
        {field("↕", "Vertical padding", num(node.paddingTop), (v) => set({ paddingTop: v, paddingBottom: v }))}
        {field("⇿", "Gap between items", num(node.itemSpacing), (v) => set({ itemSpacing: v }))}
      </div>
      <div className="props__grid props__grid--gap">
        <select className="field__select" title="Alignment along the layout direction" value={node.primaryAxisAlign ?? "MIN"} onChange={(e) => set({ primaryAxisAlign: e.target.value as LayoutAlign })}>
          {PRIMARY.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <select className="field__select" title="Alignment across the layout direction" value={node.counterAxisAlign ?? "MIN"} onChange={(e) => set({ counterAxisAlign: e.target.value as "MIN" | "CENTER" | "MAX" })}>
          {COUNTER.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <select className="field__select" title="Width" value={sizing(widthKey)} onChange={(e) => set({ [widthKey]: e.target.value as LayoutSizing })}>
          <option value="HUG">Hug width</option>
          <option value="FIXED">Fixed width</option>
        </select>
        <select className="field__select" title="Height" value={sizing(heightKey)} onChange={(e) => set({ [heightKey]: e.target.value as LayoutSizing })}>
          <option value="HUG">Hug height</option>
          <option value="FIXED">Fixed height</option>
        </select>
      </div>
    </section>
  );
}
