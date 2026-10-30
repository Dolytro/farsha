import { useEffect, useState } from "react";
import { useEditor } from "../store";
import { HexInput } from "./HexInput";

/** Colour variables and their modes: one row per variable, one column per mode (for example Light and Dark). */
export function VariablesDialog() {
  const open = useEditor((s) => s.variablesOpen);
  const setOpen = useEditor((s) => s.setVariablesOpen);
  const doc = useEditor((s) => s.doc);
  useEditor((s) => s.version);
  const [renamingMode, setRenamingMode] = useState<string | null>(null);

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
  const modes = doc.modes();
  const active = doc.activeModeId();
  const variables = doc.colorVariables();
  const run = (fn: () => void) => {
    try {
      doc.stopCapturing();
      fn();
      doc.stopCapturing();
    } catch (err) {
      useEditor.getState().showToast(err instanceof Error ? err.message : "Couldn't do that");
    }
  };

  return (
    <div className="dialog" onPointerDown={() => setOpen(false)}>
      <div className="dialog__box dialog__box--wide" role="dialog" aria-label="Variables" onPointerDown={(e) => e.stopPropagation()}>
        <div className="dialog__head">
          <strong>Variables</strong>
          <button className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>
        <div className="vars">
          <div className="vars__row vars__row--head" style={{ gridTemplateColumns: `minmax(120px, 1.4fr) repeat(${modes.length}, minmax(110px, 1fr)) 24px` }}>
            <span>Name</span>
            {modes.map((m) => (
              <span key={m.id} className="vars__mode">
                {renamingMode === m.id ? (
                  <input
                    className="stylepill__rename"
                    autoFocus
                    defaultValue={m.name}
                    onFocus={(e) => e.currentTarget.select()}
                    onBlur={(e) => {
                      setRenamingMode(null);
                      run(() => doc.renameMode(m.id, e.currentTarget.value));
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
                    }}
                  />
                ) : (
                  <button className={`vars__modebtn${m.id === active ? " vars__modebtn--active" : ""}`} title="Click to use this mode, double-click to rename" onClick={() => run(() => doc.setActiveMode(m.id))} onDoubleClick={() => setRenamingMode(m.id)}>
                    {m.name}
                  </button>
                )}
                {modes.length > 1 && (
                  <button className="props__add" title="Delete mode" onClick={() => run(() => doc.deleteMode(m.id))}>
                    −
                  </button>
                )}
              </span>
            ))}
            <button className="props__add" title="Add mode" onClick={() => run(() => void doc.addMode(""))}>
              +
            </button>
          </div>
          {variables.length === 0 && <p className="dialog__note">No variables yet. Add one, then bind a fill or stroke to it with the ◆ button.</p>}
          {variables.map((v) => (
            <div className="vars__row" key={v.id} style={{ gridTemplateColumns: `minmax(120px, 1.4fr) repeat(${modes.length}, minmax(110px, 1fr)) 24px` }}>
              <input className="dialog__input" aria-label="Variable name" defaultValue={v.name} key={v.name} onBlur={(e) => e.currentTarget.value !== v.name && run(() => doc.updateColorVariable(v.id, { name: e.currentTarget.value }))} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") e.currentTarget.blur(); }} />
              {modes.map((m) => {
                const value = v.values[m.id] ?? "#000000";
                return (
                  <span className="fill-row" key={m.id}>
                    <input className="fill-row__swatch" type="color" value={value} onChange={(e) => run(() => doc.updateColorVariable(v.id, { modeId: m.id, color: e.target.value }))} />
                    <HexInput value={value} onChange={(color) => run(() => doc.updateColorVariable(v.id, { modeId: m.id, color }))} />
                  </span>
                );
              })}
              <button className="props__add" title="Delete variable" onClick={() => run(() => doc.deleteColorVariable(v.id))}>
                −
              </button>
            </div>
          ))}
        </div>
        <button className="props__button" onClick={() => run(() => void doc.createColorVariable(`Color ${variables.length + 1}`, "#d9d9d9"))}>
          + Add color variable
        </button>
        <p className="dialog__note">The highlighted mode is the one shown on the canvas. Layers bound to a variable follow it.</p>
      </div>
    </div>
  );
}
