import { useEffect, useRef, useState } from "react";
import type { DesignDoc } from "@farsha/design-core";
import { paintColor, type DesignNode, type FillStyle } from "@farsha/types";

const swatchOf = (s: FillStyle) => {
  const p = s.paints[s.paints.length - 1];
  return p ? paintColor(p) : "transparent";
};

/** The "Apply style" button of the Fill section, with the list of colour styles and "Create style". */
export function StyleMenu({ doc, node }: { doc: DesignDoc; node: DesignNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const styles = doc.fillStyles();

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close, true);
    return () => window.removeEventListener("pointerdown", close, true);
  }, [open]);

  const apply = (id: string) => {
    doc.stopCapturing();
    doc.applyFillStyle(node.id, id);
    doc.stopCapturing();
    setOpen(false);
  };

  return (
    <span className="stylemenu" ref={root}>
      <button className="props__add" title="Apply style" aria-expanded={open} onClick={() => setOpen(!open)}>
        ⁞⁞
      </button>
      {open && (
        <div className="stylemenu__list" role="menu">
          <div className="stylemenu__title">Color styles</div>
          {styles.length === 0 && <p className="stylemenu__empty">No styles yet.</p>}
          {styles.map((s) => (
            <div className="stylemenu__row" key={s.id}>
              <button className="stylemenu__item" onClick={() => apply(s.id)}>
                <span className="stylemenu__swatch" style={{ background: swatchOf(s) }} />
                {s.name}
              </button>
              <button className="props__add" title="Delete style" onClick={() => doc.deleteFillStyle(s.id)}>
                −
              </button>
            </div>
          ))}
          <button
            className="stylemenu__create"
            disabled={!("fills" in node) || !node.fills?.length}
            onClick={() => {
              if (!("fills" in node) || !node.fills) return;
              doc.stopCapturing();
              doc.applyFillStyle(node.id, doc.createFillStyle(`Style ${styles.length + 1}`, node.fills));
              doc.stopCapturing();
              setOpen(false);
            }}
          >
            + Create style from fill
          </button>
        </div>
      )}
    </span>
  );
}

/** Shown instead of the fill rows while a layer uses a colour style: its name, rename, edit and detach. */
export function StylePill({ doc, node, style, editing, setEditing }: { doc: DesignDoc; node: DesignNode; style: FillStyle; editing: boolean; setEditing: (on: boolean) => void }) {
  const [renaming, setRenaming] = useState(false);
  return (
    <div className="stylepill">
      <span className="stylemenu__swatch" style={{ background: swatchOf(style) }} />
      {renaming ? (
        <input
          className="stylepill__rename"
          autoFocus
          defaultValue={style.name}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={(e) => {
            setRenaming(false);
            doc.updateFillStyle(style.id, { name: e.currentTarget.value });
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
          }}
        />
      ) : (
        <span className="stylepill__name" title="Double-click to rename" onDoubleClick={() => setRenaming(true)}>
          {style.name}
        </span>
      )}
      <button className={`seg__btn${editing ? " seg__btn--active" : ""}`} title="Edit style" onClick={() => setEditing(!editing)}>
        Edit
      </button>
      <button
        className="props__add"
        title="Detach style"
        onClick={() => {
          doc.stopCapturing();
          doc.applyFillStyle(node.id, null);
          doc.stopCapturing();
        }}
      >
        −
      </button>
    </div>
  );
}
