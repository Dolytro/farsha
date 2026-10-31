import { useEditor } from "../store";
import { ColorSwatch } from "./ColorSwatch";
import { replaceSelectionColor, selectionColors } from "../colors";

/** Figma's "Selection colors": every colour used in the selection, editable in one place. */
export function SelectionColors() {
  const { doc, selection } = useEditor();
  useEditor((s) => s.version);
  const colors = selectionColors(doc, selection);
  if (colors.length === 0) return null;
  return (
    <section className="props__section">
      <h3 className="props__heading">Selection colors</h3>
      {colors.map((c) => (
        <div className="fill-row fill-row--gap" key={c.color}>
          <ColorSwatch label={`Selection color ${c.color}`} value={c.color} onChange={(color) => replaceSelectionColor(doc, selection, c.color, color)} />
          <span>{c.color.slice(1).toUpperCase()}</span>
          <span className="props__hint">{c.count > 1 ? `×${c.count}` : ""}</span>
        </div>
      ))}
    </section>
  );
}
