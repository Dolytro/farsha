import { useEffect, useRef, useState } from "react";
import type { DesignDoc } from "@farsha/design-core";
import { useEditor } from "../store";

/** The "Apply variable" button next to a solid colour: pick a colour variable to bind the colour to. */
export function VariableButton({ doc, onPick }: { doc: DesignDoc; onPick: (variableId: string) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const mode = doc.activeModeId();
  const variables = doc.colorVariables();

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close, true);
    return () => window.removeEventListener("pointerdown", close, true);
  }, [open]);

  return (
    <span className="stylemenu" ref={root}>
      <button className="props__add" title="Apply variable" aria-expanded={open} onClick={() => setOpen(!open)}>
        ◆
      </button>
      {open && (
        <div className="stylemenu__list" role="menu">
          <div className="stylemenu__title">Color variables</div>
          {variables.length === 0 && <p className="stylemenu__empty">No variables yet.</p>}
          {variables.map((v) => (
            <button
              key={v.id}
              className="stylemenu__item"
              onClick={() => {
                onPick(v.id);
                setOpen(false);
              }}
            >
              <span className="stylemenu__swatch" style={{ background: doc.resolveVariableValue(v, mode) }} />
              {v.name}
            </button>
          ))}
          <button
            className="stylemenu__create"
            onClick={() => {
              setOpen(false);
              useEditor.getState().setVariablesOpen(true);
            }}
          >
            Manage variables…
          </button>
        </div>
      )}
    </span>
  );
}

/** Shown instead of the colour controls while a paint is bound to a variable. */
export function VariableChip({ doc, variableId, onDetach }: { doc: DesignDoc; variableId: string; onDetach: () => void }) {
  const v = doc.getColorVariable(variableId);
  const mode = doc.activeModeId();
  return (
    <div className="stylepill">
      <span className="stylemenu__swatch" style={{ background: v ? doc.resolveVariableValue(v, mode) : "transparent" }} />
      <span className="stylepill__name">{v?.name ?? "Missing variable"}</span>
      <button className="props__add" title="Detach variable" onClick={onDetach}>
        −
      </button>
    </div>
  );
}
