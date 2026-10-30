import { useEffect, useRef, useState } from "react";
import type { DesignDoc } from "@canvylo/design-core";
import type { DesignNode, TextNode, TextStyle } from "@canvylo/types";
import { fitText } from "../text-layout";

const describe = (s: TextStyle) => `${Math.round(s.fontSize)} / ${s.fontWeight}`;

/** The "Apply style" button of the Typography section, with the list of text styles and "Create style". */
export function TextStyleMenu({ doc, node }: { doc: DesignDoc; node: DesignNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const styles = doc.textStyles();

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close, true);
    return () => window.removeEventListener("pointerdown", close, true);
  }, [open]);

  const refitUsers = (styleId: string) => {
    for (const page of doc.pages()) for (const n of doc.descendants(page.id)) if (n.type === "TEXT" && n.textStyleId === styleId) fitText(doc, n.id);
  };

  return (
    <span className="stylemenu" ref={root}>
      <button className="props__add" title="Apply text style" aria-expanded={open} onClick={() => setOpen(!open)}>
        ⁞⁞
      </button>
      {open && (
        <div className="stylemenu__list" role="menu">
          <div className="stylemenu__title">Text styles</div>
          {styles.length === 0 && <p className="stylemenu__empty">No styles yet.</p>}
          {styles.map((s) => (
            <div className="stylemenu__row" key={s.id}>
              <button
                className="stylemenu__item"
                onClick={() => {
                  doc.stopCapturing();
                  doc.applyTextStyle(node.id, s.id);
                  fitText(doc, node.id);
                  doc.stopCapturing();
                  setOpen(false);
                }}
              >
                <span>{s.name}</span>
                <span className="stylemenu__meta">{describe(s)}</span>
              </button>
              <button className="props__add" title="Delete style" onClick={() => doc.deleteTextStyle(s.id)}>
                −
              </button>
            </div>
          ))}
          <button
            className="stylemenu__create"
            disabled={node.type !== "TEXT"}
            onClick={() => {
              if (node.type !== "TEXT") return;
              const { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } = node;
              doc.stopCapturing();
              const id = doc.createTextStyle(`Text style ${styles.length + 1}`, { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing });
              doc.applyTextStyle(node.id, id);
              doc.stopCapturing();
              refitUsers(id);
              setOpen(false);
            }}
          >
            + Create style from text
          </button>
        </div>
      )}
    </span>
  );
}

/** Shown while a text layer uses a text style: its name, rename, edit and detach. */
export function TextStylePill({ doc, node, style, editing, setEditing }: { doc: DesignDoc; node: TextNode; style: TextStyle; editing: boolean; setEditing: (on: boolean) => void }) {
  const [renaming, setRenaming] = useState(false);
  return (
    <div className="stylepill">
      {renaming ? (
        <input
          className="stylepill__rename"
          autoFocus
          defaultValue={style.name}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={(e) => {
            setRenaming(false);
            doc.updateTextStyle(style.id, { name: e.currentTarget.value });
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
      <span className="stylemenu__meta">{describe(style)}</span>
      <button className={`seg__btn${editing ? " seg__btn--active" : ""}`} title="Edit style" onClick={() => setEditing(!editing)}>
        Edit
      </button>
      <button
        className="props__add"
        title="Detach style"
        onClick={() => {
          doc.stopCapturing();
          doc.applyTextStyle(node.id, null);
          doc.stopCapturing();
        }}
      >
        −
      </button>
    </div>
  );
}
