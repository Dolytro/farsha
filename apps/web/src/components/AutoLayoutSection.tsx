import { useState, type ReactElement } from "react";
import type { DesignDoc } from "@farsha/design-core";
import type { DesignNode, LayoutAlign, LayoutMode, LayoutSizing } from "@farsha/types";
import { addAutoLayout, removeAutoLayout } from "../auto-layout-actions";
import { Select } from "./Select";

const PRIMARY: [LayoutAlign, string][] = [
  ["MIN", "Start"],
  ["CENTER", "Center"],
  ["MAX", "End"],
  ["SPACE_BETWEEN", "Space between"],
];
const COUNTER: [LayoutAlign, string][] = PRIMARY.slice(0, 3);

const num = (v: number | undefined) => (typeof v === "number" ? v : 0);

type LimitKey = "minWidth" | "maxWidth" | "minHeight" | "maxHeight";
const LIMITS: [LimitKey, string, string][] = [
  ["minWidth", "Min W", "Minimum width"],
  ["maxWidth", "Max W", "Maximum width"],
  ["minHeight", "Min H", "Minimum height"],
  ["maxHeight", "Max H", "Maximum height"],
];

/** Min and max width and height (Figma's size limits). An empty field means no limit. */
function SizeLimitFields({ doc, node }: { doc: DesignDoc; node: DesignNode }) {
  return (
    <div className="props__grid">
      {LIMITS.map(([key, label, title]) => {
        const value = (node as Partial<Record<LimitKey, number | null>>)[key];
        return (
          <label className="field" title={title} key={key}>
            <span className="field__label">{label}</span>
            <input
              className="field__input"
              type="number"
              min={0}
              placeholder="None"
              value={typeof value === "number" ? value : ""}
              onChange={(e) => {
                const text = e.target.value.trim();
                doc.setStyle(node.id, { [key]: text === "" || !(Number(text) >= 0) ? null : Number(text) });
              }}
            />
          </label>
        );
      })}
    </div>
  );
}

/** Resizing of a layer inside an auto layout frame (fixed, or fill the free space: Figma's "Fill container"), plus its size limits. */
export function ChildSizingSection({ doc, node }: { doc: DesignDoc; node: DesignNode }) {
  const parent = node.parentId ? doc.getNode(node.parentId) : undefined;
  const inLayout = parent?.type === "FRAME" && (parent.layoutMode === "HORIZONTAL" || parent.layoutMode === "VERTICAL");
  const isLayoutFrame = node.type === "FRAME" && (node.layoutMode === "HORIZONTAL" || node.layoutMode === "VERTICAL");
  if (!inLayout && !isLayoutFrame) return null;
  if (!inLayout) {
    // an auto layout frame on its own: only the size limits
    return (
      <section className="props__section">
        <h3 className="props__heading">Size limits</h3>
        <SizeLimitFields doc={doc} node={node} />
      </section>
    );
  }
  const row = (label: string, key: "layoutSizingH" | "layoutSizingV") => (
    <label className="field" title={`${label} resizing`}>
      <span className="field__label">{label}</span>
      <Select className="field__select" value={node[key] ?? "FIXED"} onChange={(e) => doc.setStyle(node.id, { [key]: e.target.value } as never)}>
        <option value="FIXED">Fixed</option>
        <option value="FILL">Fill container</option>
      </Select>
    </label>
  );
  return (
    <section className="props__section">
      <h3 className="props__heading">Resizing</h3>
      <div className="props__grid">
        {row("W", "layoutSizingH")}
        {row("H", "layoutSizingV")}
      </div>
      <SizeLimitFields doc={doc} node={node} />
      <label className="props__check" title="Take this layer out of the auto layout flow; it keeps the position you give it">
        <input type="checkbox" checked={node.layoutPositioning === "ABSOLUTE"} onChange={(e) => doc.setStyle(node.id, { layoutPositioning: e.target.checked ? "ABSOLUTE" : "AUTO" })} />
        Absolute position
      </label>
    </section>
  );
}

/** Padding as horizontal + vertical, or one field per side (the toggle starts on when the sides differ). */
function PaddingFields({
  node,
  set,
  field,
}: {
  node: Extract<DesignNode, { type: "FRAME" }>;
  set: (patch: Parameters<DesignDoc["setStyle"]>[1]) => void;
  field: (label: string, title: string, value: number, onChange: (v: number) => void) => ReactElement;
}) {
  const differs = num(node.paddingLeft) !== num(node.paddingRight) || num(node.paddingTop) !== num(node.paddingBottom);
  const [perSide, setPerSide] = useState(differs);
  const sides = perSide || differs;
  return (
    <>
      <div className="props__grid props__grid--gap">
        {sides ? (
          <>
            {field("T", "Top padding", num(node.paddingTop), (v) => set({ paddingTop: v }))}
            {field("R", "Right padding", num(node.paddingRight), (v) => set({ paddingRight: v }))}
            {field("B", "Bottom padding", num(node.paddingBottom), (v) => set({ paddingBottom: v }))}
            {field("L", "Left padding", num(node.paddingLeft), (v) => set({ paddingLeft: v }))}
          </>
        ) : (
          <>
            {field("↔", "Horizontal padding", num(node.paddingLeft), (v) => set({ paddingLeft: v, paddingRight: v }))}
            {field("↕", "Vertical padding", num(node.paddingTop), (v) => set({ paddingTop: v, paddingBottom: v }))}
          </>
        )}
        {field("⇿", "Gap between items", num(node.itemSpacing), (v) => set({ itemSpacing: v }))}
        <button className={`seg__btn props__corner-toggle${sides ? " seg__btn--active" : ""}`} title="Padding per side" onClick={() => setPerSide(!sides)}>
          ⌜⌝
        </button>
      </div>
    </>
  );
}

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
        <button className={`seg__btn${node.layoutWrap ? " seg__btn--active" : ""}`} title="Wrap children onto new lines (needs a fixed size in the layout direction)" onClick={() => set({ layoutWrap: !node.layoutWrap })}>
          Wrap
        </button>
        <button className={`seg__btn${node.layoutFirstOnTop ? " seg__btn--active" : ""}`} aria-label="First on top" title="Canvas stacking: the first layer is drawn on top of the others (default: the last one is)" onClick={() => set({ layoutFirstOnTop: !node.layoutFirstOnTop })}>
          First on top
        </button>
        {node.layoutWrap && field("↨", "Gap between lines", num(node.counterSpacing ?? node.itemSpacing), (v) => set({ counterSpacing: v }))}
        {node.layoutWrap && mode === "HORIZONTAL" && field("▦", "Grid columns (0 = ordinary wrap)", num(node.gridColumns ?? 0), (v) => set({ gridColumns: Math.max(0, Math.min(24, Math.round(v))) }))}
      </div>
      <PaddingFields node={node} set={set} field={field} />
      <div className="props__grid props__grid--gap">
        <Select className="field__select" title="Alignment along the layout direction" value={node.primaryAxisAlign ?? "MIN"} onChange={(e) => set({ primaryAxisAlign: e.target.value as LayoutAlign })}>
          {PRIMARY.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </Select>
        <Select className="field__select" title="Alignment across the layout direction" value={node.counterAxisAlign ?? "MIN"} onChange={(e) => set({ counterAxisAlign: e.target.value as "MIN" | "CENTER" | "MAX" | "BASELINE" })}>
          {COUNTER.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
          {mode === "HORIZONTAL" && <option value="BASELINE">Text baseline</option>}
        </Select>
        <Select className="field__select" title="Width" value={sizing(widthKey)} onChange={(e) => set({ [widthKey]: e.target.value as LayoutSizing })}>
          <option value="HUG">Hug width</option>
          <option value="FIXED">Fixed width</option>
        </Select>
        <Select className="field__select" title="Height" value={sizing(heightKey)} onChange={(e) => set({ [heightKey]: e.target.value as LayoutSizing })}>
          <option value="HUG">Hug height</option>
          <option value="FIXED">Fixed height</option>
        </Select>
      </div>
    </section>
  );
}
