import { useEffect, useMemo, useRef, useState } from "react";
import { buildMainMenu, type MenuNode } from "../main-menu";
import { useEditor } from "../store";

function Items({ nodes, onRun, depth = 0 }: { nodes: MenuNode[]; onRun: () => void; depth?: number }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ul className={`mainmenu__list${depth ? " mainmenu__list--sub" : ""}`} role="menu">
      {nodes.map((n, i) => (
        <li key={`${n.label}-${i}`} role="none" className={n.divider ? "mainmenu__divider" : undefined}>
          <button
            role="menuitem"
            className={`mainmenu__item${open === i ? " mainmenu__item--open" : ""}${n.disabled ? " mainmenu__item--disabled" : ""}`}
            aria-haspopup={n.children ? "menu" : undefined}
            aria-disabled={n.disabled || undefined}
            onMouseEnter={() => setOpen(n.children ? i : null)}
            onClick={() => {
              if (n.children) return setOpen(open === i ? null : i);
              if (n.disabled) return;
              onRun();
              void Promise.resolve(n.run?.()).catch((err) => useEditor.getState().showToast(err instanceof Error ? `Couldn't do that: ${err.message}` : "Couldn't do that"));
            }}
          >
            <span className="mainmenu__label">{n.label}</span>
            {n.shortcut && <kbd className="mainmenu__key">{n.shortcut}</kbd>}
            {n.children && (
              <svg className="mainmenu__arrow" width="8" height="8" viewBox="0 0 8 8" aria-hidden>
                <path d="M2.5 1l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          {n.children && open === i && <Items nodes={n.children} onRun={onRun} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

/** The main menu (hamburger button in the left panel header): File, Edit, View, Object, Text, Arrange, Vector and Preferences. */
export function MainMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEditor((s) => s.selection);
  useEditor((s) => s.version);
  const nodes = useMemo(() => (open ? buildMainMenu() : []), [open, useEditor.getState().selection]);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", outside, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div className="mainmenu" ref={root}>
      <button className={`icon-btn mainmenu__button${open ? " mainmenu__button--open" : ""}`} title="Main menu" aria-label="Main menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="mainmenu__pop">
          <Items nodes={nodes} onRun={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
