import { ColorSwatch } from "./ColorSwatch";
import type { DesignDoc } from "@farsha/design-core";
import type { DesignNode, LayoutGrid } from "@farsha/types";
import { HexInput } from "./HexInput";
import { Select } from "./Select";

const LABEL: Record<LayoutGrid["type"], string> = { COLUMNS: "Columns", ROWS: "Rows", GRID: "Grid" };

// Like Figma, the first grid is a plain 10 px square grid; switch the type to get columns or rows.
const newGrid = (): LayoutGrid => ({ type: "GRID", size: 10, color: "#ff0000", opacity: 0.1, visible: true });

/** What a type means, in words. */
const HINT: Record<LayoutGrid["type"], string> = {
  GRID: "Square cells of the size below",
  COLUMNS: "Vertical columns with gutters between them",
  ROWS: "Horizontal rows with gutters between them",
};

/** Figma's Layout grid section of a frame: columns, rows or a square grid drawn over the frame as a guide. */
export function LayoutGridSection({ doc, node }: { doc: DesignDoc; node: DesignNode }) {
  if (node.type !== "FRAME") return null;
  const grids = node.layoutGrids ?? [];
  const styles = doc.gridStyles();
  const style = node.gridStyleId ? doc.getGridStyle(node.gridStyleId) : undefined;
  const set = (next: LayoutGrid[]) => doc.setStyle(node.id, { layoutGrids: next });
  const patch = (i: number, p: Partial<LayoutGrid>) => set(grids.map((g, j) => (j === i ? { ...g, ...p } : g)));
  const field = (i: number, label: string, key: "count" | "gutter" | "margin" | "size", value: number | undefined, min: number, title: string) => (
    <label className="field field--row" title={title}>
      <span className="field__label field__label--text">{label}</span>
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
      {(styles.length > 0 || grids.length > 0) && (
        <div className="fill-row fill-row--gap">
          <Select
            className="field__select field__select--wide"
            aria-label="Grid style"
            title="Grid style"
            value={style?.id ?? "NONE"}
            onChange={(e) => {
              doc.stopCapturing();
              if (e.target.value === "NEW") doc.applyGridStyle(node.id, doc.createGridStyle(`Grid style ${styles.length + 1}`, grids));
              else doc.applyGridStyle(node.id, e.target.value === "NONE" ? null : e.target.value);
              doc.stopCapturing();
            }}
          >
            <option value="NONE">No grid style</option>
            {styles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            {grids.length > 0 && !style && <option value="NEW">+ Create style from grids</option>}
          </Select>
          {style && (
            <button className="props__add" title="Delete this grid style (frames keep their grids)" onClick={() => doc.deleteGridStyle(style.id)}>
              −
            </button>
          )}
        </div>
      )}
      {grids.length === 0 && <p className="props__hint">No layout grid yet. Click + to add a 10 px grid, then change its type to Columns or Rows. Shift+G shows or hides the grids.</p>}
      {grids.map((g, i) => (
        <div className="grid-item" key={i}>
          <div className="grid-item__head">
            <Select className="field__select" aria-label="Grid type" value={g.type} onChange={(e) => {
                const type = e.target.value as LayoutGrid["type"];
                // give the new type sensible numbers so it shows at once
                patch(i, type === "GRID" ? { type, size: g.size ?? 10 } : { type, count: g.count ?? 4, gutter: g.gutter ?? 20, margin: g.margin ?? 0 });
              }}>
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
          <p className="props__hint">{HINT[g.type]}</p>
          <div className="props__stack">
            {g.type === "GRID" ? (
              field(i, "Size", "size", g.size ?? 10, 2, "Cell size in pixels")
            ) : (
              <>
                {field(i, "Count", "count", g.count ?? 4, 1, g.type === "COLUMNS" ? "Number of columns" : "Number of rows")}
                {field(i, "Gutter", "gutter", g.gutter ?? 20, 0, "Space between columns or rows, in pixels")}
                {field(i, "Margin", "margin", g.margin ?? 0, 0, "Space at both ends, in pixels")}
              </>
            )}
            <div className="fill-row">
              <ColorSwatch value={/^#[0-9a-fA-F]{6}$/.test(g.color) ? g.color : "#ff0000"} onChange={(color) => patch(i, { color })} />
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
