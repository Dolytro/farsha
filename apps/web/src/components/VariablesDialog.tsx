import { ColorSwatch } from "./ColorSwatch";
import { useEffect, useState } from "react";
import { useEditor } from "../store";
import { HexInput } from "./HexInput";
import { fitText } from "../text-layout";
import { exportVariables, importVariables, parseVariables } from "../variable-json";

/** Colour variables and their modes: one row per variable, one column per mode (for example Light and Dark). */
export function VariablesDialog() {
  const open = useEditor((s) => s.variablesOpen);
  const setOpen = useEditor((s) => s.setVariablesOpen);
  const doc = useEditor((s) => s.doc);
  useEditor((s) => s.version);
  const [renamingMode, setRenamingMode] = useState<string | null>(null);
  const [tab, setTab] = useState<"color" | "text" | "number" | "boolean">("color");

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
  const variables = tab === "color" ? doc.colorVariables() : tab === "text" ? doc.textVariables() : doc.valueVariables(tab === "number" ? "NUMBER" : "BOOLEAN");
  const run = (fn: () => void) => {
    try {
      doc.stopCapturing();
      fn();
      // bound text layers got new characters: fit their boxes
      for (const n of doc.descendants(doc.rootId)) if (n.type === "TEXT" && n.textVariableId) fitText(doc, n.id);
      doc.stopCapturing();
    } catch (err) {
      useEditor.getState().showToast(err instanceof Error ? err.message : "Couldn't do that");
    }
  };

  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportVariables(doc), null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "variables.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importJson = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2_000_000) return useEditor.getState().showToast("That file is too big for a variables file");
    void file.text().then((text) => {
      try {
        const n = importVariables(doc, parseVariables(text));
        useEditor.getState().showToast(n === 1 ? "Imported 1 variable" : `Imported ${n} variables`);
      } catch (err) {
        useEditor.getState().showToast(err instanceof Error ? err.message : "Couldn't import that file");
      }
    });
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
        <div className="seg" role="tablist" aria-label="Variable type">
          <button className={`seg__btn${tab === "color" ? " seg__btn--active" : ""}`} role="tab" aria-selected={tab === "color"} onClick={() => setTab("color")}>
            Color
          </button>
          <button className={`seg__btn${tab === "text" ? " seg__btn--active" : ""}`} role="tab" aria-selected={tab === "text"} onClick={() => setTab("text")}>
            Text
          </button>
          <button className={`seg__btn${tab === "number" ? " seg__btn--active" : ""}`} role="tab" aria-selected={tab === "number"} onClick={() => setTab("number")}>
            Number
          </button>
          <button className={`seg__btn${tab === "boolean" ? " seg__btn--active" : ""}`} role="tab" aria-selected={tab === "boolean"} onClick={() => setTab("boolean")}>
            Boolean
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
          {variables.length === 0 && <p className="dialog__note">{tab === "color" ? "No variables yet. Add one, then bind a fill or stroke to it with the ◆ button." : tab === "text" ? "No text variables yet. Add one, then pick it in the Variable field of a text layer." : "None yet. Add one, then bind it to a property in the Variables section of the Design panel."}</p>}
          {variables.map((v) => (
            <div className="vars__row" key={v.id} style={{ gridTemplateColumns: `minmax(120px, 1.4fr) repeat(${modes.length}, minmax(110px, 1fr)) 24px` }}>
              <input className="dialog__input" aria-label="Variable name" defaultValue={v.name} key={v.name} onBlur={(e) => e.currentTarget.value !== v.name && run(() => (tab === "color" ? doc.updateColorVariable(v.id, { name: e.currentTarget.value }) : tab === "text" ? doc.updateTextVariable(v.id, { name: e.currentTarget.value }) : doc.updateValueVariable(v.id, { name: e.currentTarget.value })))} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") e.currentTarget.blur(); }} />
              {modes.map((m) => {
                const value = v.values[m.id] ?? (tab === "color" ? "#000000" : tab === "number" ? "0" : tab === "boolean" ? "false" : "");
                if (tab === "number") {
                  return (
                    <input
                      className="dialog__input"
                      type="number"
                      key={`${m.id}-${value}`}
                      aria-label={`Number in ${m.name}`}
                      defaultValue={value}
                      onBlur={(e) => e.currentTarget.value !== value && run(() => doc.updateValueVariable(v.id, { modeId: m.id, value: e.currentTarget.value }))}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                    />
                  );
                }
                if (tab === "boolean") {
                  return (
                    <label className="vars__bool" key={m.id}>
                      <input type="checkbox" aria-label={`True in ${m.name}`} checked={value === "true"} onChange={(e) => run(() => doc.updateValueVariable(v.id, { modeId: m.id, value: String(e.target.checked) }))} />
                      {value === "true" ? "True" : "False"}
                    </label>
                  );
                }
                if (tab === "text") {
                  return (
                    <input
                      className="dialog__input"
                      key={`${m.id}-${value}`}
                      aria-label={`Text in ${m.name}`}
                      defaultValue={value}
                      onBlur={(e) => e.currentTarget.value !== value && run(() => doc.updateTextVariable(v.id, { modeId: m.id, text: e.currentTarget.value }))}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                    />
                  );
                }
                return (
                  <span className="fill-row" key={m.id}>
                    <ColorSwatch value={value} onChange={(color) => run(() => doc.updateColorVariable(v.id, { modeId: m.id, color }))} />
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
        <button className="props__button" onClick={() => run(() => void (tab === "color" ? doc.createColorVariable(`Color ${variables.length + 1}`, "#d9d9d9") : tab === "text" ? doc.createTextVariable(`Text ${variables.length + 1}`, "Text") : doc.createValueVariable(tab === "number" ? "NUMBER" : "BOOLEAN", `${tab === "number" ? "Number" : "Boolean"} ${variables.length + 1}`, tab === "number" ? "0" : "true")))}>
          {tab === "color" ? "+ Add color variable" : tab === "text" ? "+ Add text variable" : tab === "number" ? "+ Add number variable" : "+ Add boolean variable"}
        </button>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="props__button" onClick={exportJson}>
            Export JSON
          </button>
          <label className="props__button" style={{ textAlign: "center", cursor: "pointer" }}>
            Import JSON
            <input type="file" accept="application/json,.json" hidden onChange={(e) => { importJson(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        </div>
        <p className="dialog__note">The highlighted mode is the one shown on the canvas. Layers bound to a variable follow it.</p>
      </div>
    </div>
  );
}
