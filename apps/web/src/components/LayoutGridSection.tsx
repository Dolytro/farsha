import type { DesignDoc } from "@canvylo/design-core";
import type { DesignNode, LayoutGrid } from "@canvylo/types";
import { HexInput } from "./HexInput";
import { Select } from "./Select";

const LABEL: Record<LayoutGrid["type"], string> = { COLUMNS: "Columns", ROWS: "Rows", GRID: "Grid" };

const newGrid = (): LayoutGrid => ({ type: "COLUMNS", count: 4, gutter: 20, margin: 20, color: "#ff0000", opacity: 0.1, visible: true });

/** Figma's Layout grid section of a frame: columns, rows or a square grid drawn over the frame as a guide. */
export function LayoutGridSection({ doc, node }: { doc: DesignDoc; node: DesignNode }) {
  if (node.type !== "FRAME") return null;
  const grids = node.layoutGrids ?? [];
  const set = (next: LayoutGrid[]) => doc.setStyle(node.id, { layoutGrids: next });
  const patch = (i: number, p: Partial<LayoutGrid>) => set(grids.map((g, j) => (j === i ? { ...g, ...p } : g)));
  const field = (i: number, label: string, key: "count" | "gutter" | "margin" | "size", value: number | undefined, min: number, title: string) => (
    <label className="field" title={title}>
      <span className="field__label">{label}</span>
      <input
        className="field__input"
        type="number"
        min={min}
        value={value ?? ""}
        onChange={(e) => Number.isFinite(Number(e.target.value)) && e.target.value !== "" && patch(i, { [key]: Math.max(min, Number(e.target.value)) })}
      />
    </label>
  );

  return (
    <section className="props__section">
      <h3 className="props__heading props__heading--row">
        Layout grid
        <button className="props__add" title="Add layout grid (Shift+G shows or hides)" onClick={() => set([...grids, newGrid()])}>
          +
        </button>
      </h3>
      {grids.map((g, i) => (
        <div className="grid-item" key={i}>
          <div className="grid-item__head">
            <Select className="field__select" aria-label="Grid type" value={g.type} onChange={(e) => patch(i, { type: e.target.value as LayoutGrid["type"], ...(e.target.value === "GRID" ? { size: g.size ?? 10 } : {}) })}>
              {(Object.keys(LABEL) as LayoutGrid["type"][]).map((t) => (
                <option key={t} value={t}>
                  {LABEL[t]}
                </option>
              ))}
            </Select>
            <button className="props__add" title={g.visible ? "Hide grid" : "Show grid"} onClick={() => patch(i, { visible: !g.visible })}>
              {g.visible ? "◉" : "○"}
            </button>
            <button className="props__add" title="Remove grid" onClick={() => set(grids.filter((_, j) => j !== i))}>
              −
            </button>
          </div>
          <div className="props__grid props__grid--gap">
            {g.type === "GRID" ? (
              field(i, "Size", "size", g.size ?? 10, 2, "Cell size (px)")
            ) : (
              <>
                {field(i, "#", "count", g.count ?? 4, 1, g.type === "COLUMNS" ? "Number of columns" : "Number of rows")}
                {field(i, "G", "gutter", g.gutter ?? 20, 0, "Gutter (px)")}
                {field(i, "M", "margin", g.margin ?? 0, 0, "Margin (px)")}
              </>
            )}
            <div className="fill-row">
              <input className="fill-row__swatch" type="color" value={/^#[0-9a-fA-F]{6}$/.test(g.color) ? g.color : "#ff0000"} onChange={(e) => patch(i, { color: e.target.value })} />
              <HexInput value={g.color} onChange={(color) => patch(i, { color })} />
              <input
                className="fill-row__pct"
                type="number"
                min={0}
                max={100}
                title="Opacity (%)"
                value={Math.round(g.opacity * 100)}
                onChange={(e) => patch(i, { opacity: Math.min(1, Math.max(0, Number(e.target.value) / 100)) })}
              />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
