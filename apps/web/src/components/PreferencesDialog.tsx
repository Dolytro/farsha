import { useEffect } from "react";
import { UI_PRESETS, type Prefs, type UiPreset } from "../prefs";
import { Select } from "./Select";
import { useEditor } from "../store";

const SWITCHES: { key: keyof Pick<Prefs, "keepTool" | "invertZoom" | "wheelZoom" | "snapping" | "spellCheck" | "hoverHighlight" | "showDimensions" | "rightDragPan" | "renameDuplicates" | "keyboardZoomToSelection" | "ctrlClickMenu" | "smartQuotes" | "arrowRotate" | "flipWhileResizing" | "hideUiWhileChanging">; label: string; hint: string }[] = [
  { key: "keepTool", label: "Keep tool selected after use", hint: "Stay on Rectangle, Ellipse, … after drawing a layer" },
  { key: "spellCheck", label: "Check spelling in text", hint: "Underlines misspelled words while you type in a text layer" },
  { key: "hoverHighlight", label: "Highlight layers on hover", hint: "Outline the layer under the pointer" },
  { key: "showDimensions", label: "Show dimensions on objects", hint: "The width and height under the selection" },
  { key: "rightDragPan", label: "Right-click and drag to pan", hint: "A plain right click still opens the menu" },
  { key: "renameDuplicates", label: "Rename duplicated layers", hint: "Duplicating “Card 1” names the copy “Card 2”" },
  { key: "keyboardZoomToSelection", label: "Keyboard zooms into selection", hint: "+ and − centre the selection instead of the middle of the canvas" },
  { key: "ctrlClickMenu", label: "Ctrl+click opens right-click menus", hint: "Like a right click, for mice and trackpads without a right button" },
  { key: "smartQuotes", label: "Use smart quotes", hint: "Typing \" or ' in text gives curly quotes (“ ” ‘ ’)" },
  { key: "arrowRotate", label: "Use Ctrl+Alt+arrows to rotate", hint: "Left and Right turn the selection 1° (Shift: 15°)" },
  { key: "flipWhileResizing", label: "Flip objects while resizing", hint: "Drag a handle past the opposite side to turn the layer over" },
  { key: "hideUiWhileChanging", label: "Hide canvas UI during changes", hint: "No selection box, handles or size while you move, resize or rotate" },
  { key: "snapping", label: "Snap to layers and guides", hint: "While moving layers (hold Ctrl to snap off for one move)" },
  { key: "wheelZoom", label: "Use scroll wheel to zoom", hint: "Instead of panning; hold Shift is not needed, Ctrl + wheel always zooms" },
  { key: "invertZoom", label: "Invert zoom direction", hint: "Scroll up to zoom out" },
];

/** Preferences: the switches of the editor, saved in this browser. */
export function PreferencesDialog() {
  const open = useEditor((s) => s.prefsOpen);
  const setOpen = useEditor((s) => s.setPrefsOpen);
  const prefs = useEditor((s) => s.prefs);
  const setPrefs = useEditor((s) => s.setPrefs);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, setOpen]);

  if (!open) return null;
  return (
    <div className="dialog" onPointerDown={() => setOpen(false)}>
      <div className="dialog__box" role="dialog" aria-label="Preferences" onPointerDown={(e) => e.stopPropagation()}>
        <div className="dialog__head">
          <strong>Preferences</strong>
          <button className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>
        <div className="prefs__preset">
          <span className="prefs__label">Interface preset</span>
          <Select className="wide" aria-label="Interface preset" value={prefs.preset} onChange={(e) => setPrefs({ preset: e.target.value as UiPreset })}>
            {UI_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
          <small className="prefs__hint">{UI_PRESETS.find((p) => p.id === prefs.preset)?.description}</small>
        </div>
        {SWITCHES.map((s) => (
          <label className="prefs__row" key={s.key}>
            <input type="checkbox" checked={prefs[s.key]} onChange={(e) => setPrefs({ [s.key]: e.target.checked })} />
            <span>
              {s.label}
              <small className="prefs__hint">{s.hint}</small>
            </span>
          </label>
        ))}
        <div className="prefs__nudge">
          <label className="field" title="Arrow key nudge (px)">
            <span className="field__label">Nudge</span>
            <input className="field__input" type="number" min={0.1} step={0.5} value={prefs.nudge} onChange={(e) => Number(e.target.value) > 0 && setPrefs({ nudge: Number(e.target.value) })} />
          </label>
          <label className="field" title="Shift + arrow key nudge (px)">
            <span className="field__label">Big nudge</span>
            <input className="field__input" type="number" min={0.1} step={1} value={prefs.bigNudge} onChange={(e) => Number(e.target.value) > 0 && setPrefs({ bigNudge: Number(e.target.value) })} />
          </label>
        </div>
      </div>
    </div>
  );
}
