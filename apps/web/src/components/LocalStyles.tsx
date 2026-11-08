import type { ReactNode } from "react";
import { paintColor } from "@farsha/types";
import { useEditor } from "../store";
import { groupVariables } from "../variable-groups";

interface StyleRow {
  id: string;
  name: string;
  swatch: ReactNode;
  detail: string;
}

const glyph = (text: string) => (
  <span className="fill-row__swatch" style={{ display: "grid", placeItems: "center", fontSize: 10, border: 0 }}>
    {text}
  </span>
);

/** Figma's "Styles" list on the page panel: every colour, grid, effect, stroke and text style of the file; a name like Brand/Primary puts it in the folder Brand. */
export function LocalStyles() {
  const doc = useEditor((s) => s.doc);
  useEditor((s) => s.version);
  const rows: StyleRow[] = [
    ...doc.fillStyles().map((s) => ({ id: s.id, name: s.name, detail: "", swatch: <span className="fill-row__swatch" style={{ background: s.paints[0] ? paintColor(s.paints[0]) : "transparent" }} /> })),
    ...doc.gridStyles().map((s) => ({ id: s.id, name: s.name, detail: ` · ${s.grids.length} ${s.grids.length === 1 ? "grid" : "grids"}`, swatch: glyph("#") })),
    ...doc.effectStyles().map((s) => ({ id: s.id, name: s.name, detail: ` · ${s.effects.length} ${s.effects.length === 1 ? "effect" : "effects"}`, swatch: glyph("fx") })),
    ...doc.strokeStyles().map((s) => ({ id: s.id, name: s.name, detail: ` · ${s.strokeWidth}px`, swatch: s.strokes[0] ? <span className="fill-row__swatch" style={{ background: paintColor(s.strokes[0]) }} /> : glyph("▭") })),
    ...doc.textStyles().map((s) => ({ id: s.id, name: s.name, detail: ` · ${s.fontSize}px`, swatch: glyph("Ag") })),
  ];
  if (!rows.length) return null;
  return (
    <section className="props__section">
      <h3 className="props__heading">Styles</h3>
      {groupVariables(rows).flatMap((g) => [
        ...(g.path
          ? [
              <div key={`folder-${g.path}`} className="styles__folder" style={{ fontSize: 12, fontWeight: 600, opacity: 0.75, padding: "6px 0 2px" }}>
                {g.path}
              </div>,
            ]
          : []),
        ...g.items.map(({ variable: s, leaf }) => (
          <div key={s.id} className="fill-row fill-row--gap">
            {s.swatch}
            <span className="fill-row__hex">
              {leaf}
              {s.detail}
            </span>
          </div>
        )),
      ])}
    </section>
  );
}
