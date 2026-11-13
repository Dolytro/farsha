import { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface PopMenuItem {
  label: string;
  run: () => void;
  divider?: boolean;
  shortcut?: string;
}

const MARGIN = 8;

/** A small menu opened at a point (the Pages list right-click menu, the zoom menu). Closes on Esc, an outside press, a scroll or a resize. */
export function PopMenu({ x, y, items, onClose }: { x: number; y: number; items: PopMenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    setPos({ left: Math.max(MARGIN, Math.min(x, window.innerWidth - width - MARGIN)), top: Math.max(MARGIN, Math.min(y, window.innerHeight - height - MARGIN)) });
  }, [x, y]);

  useEffect(() => {
    const close = (e?: Event) => {
      if (e?.target instanceof Node && ref.current?.contains(e.target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("pointerdown", close, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", close);
    window.addEventListener("resize", close);
    window.addEventListener("wheel", close, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", close, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("wheel", close);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="ctxmenu" role="menu" style={pos} onContextMenu={(e) => e.preventDefault()}>
      {items.map((it) => (
        <div key={it.label}>
          {it.divider && <div className="ctxmenu__sep" />}
          <button
            role="menuitem"
            className="ctxmenu__item"
            onClick={() => {
              onClose();
              it.run();
            }}
          >
            <span>{it.label}</span>
            {it.shortcut && <kbd>{it.shortcut}</kbd>}
          </button>
        </div>
      ))}
    </div>
  );
}
