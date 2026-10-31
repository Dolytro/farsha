import { paintColor } from "@farsha/types";
import { useEditor } from "../store";

/** Figma's "Styles" list on the page panel: every colour and text style of the file. */
export function LocalStyles() {
  const doc = useEditor((s) => s.doc);
  useEditor((s) => s.version);
  const fills = doc.fillStyles();
  const texts = doc.textStyles();
  if (!fills.length && !texts.length) return null;
  return (
    <section className="props__section">
      <h3 className="props__heading">Styles</h3>
      {fills.map((s) => (
        <div key={s.id} className="fill-row fill-row--gap">
          <span className="fill-row__swatch" style={{ background: s.paints[0] ? paintColor(s.paints[0]) : "transparent" }} />
          <span className="fill-row__hex">{s.name}</span>
        </div>
      ))}
      {texts.map((s) => (
        <div key={s.id} className="fill-row fill-row--gap">
          <span className="fill-row__swatch" style={{ display: "grid", placeItems: "center", fontSize: 10, border: 0 }}>
            Ag
          </span>
          <span className="fill-row__hex">
            {s.name} · {s.fontSize}px
          </span>
        </div>
      ))}
    </section>
  );
}
