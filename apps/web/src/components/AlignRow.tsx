import { useEditor } from "../store";
import { alignSelection, distributeSelection, type AlignMode, type DistributeAxis } from "../align";

const ALIGN: [AlignMode, string, string][] = [
  ["left", "⇤", "Align left (Alt+A)"],
  ["hcenter", "⇹", "Align horizontal centers (Alt+H)"],
  ["right", "⇥", "Align right (Alt+D)"],
  ["top", "⤒", "Align top (Alt+W)"],
  ["vcenter", "⇕", "Align vertical centers (Alt+V)"],
  ["bottom", "⤓", "Align bottom (Alt+S)"],
];

const DISTRIBUTE: [DistributeAxis, string, string][] = [
  ["horizontal", "⇔", "Distribute horizontal spacing"],
  ["vertical", "⇳", "Distribute vertical spacing"],
];

export function AlignRow() {
  const { doc, selection } = useEditor();
  if (!selection.length) return null;
  return (
    <section className="props__section props__section--tight">
      <div className="seg seg--flat">
        {ALIGN.map(([mode, icon, title]) => (
          <button key={mode} className="seg__btn" title={title} onClick={() => alignSelection(doc, selection, mode)}>
            {icon}
          </button>
        ))}
        {selection.length >= 3 &&
          DISTRIBUTE.map(([axis, icon, title]) => (
            <button key={axis} className="seg__btn" title={title} onClick={() => distributeSelection(doc, selection, axis)}>
              {icon}
            </button>
          ))}
      </div>
    </section>
  );
}
