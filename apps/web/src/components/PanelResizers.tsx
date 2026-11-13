import { useLayoutEffect } from "react";
import { clampPanelWidth, parsePanelWidth } from "../panel-width";

type Side = "left" | "right";
const VAR: Record<Side, string> = { left: "--left-w", right: "--right-w" };
const KEY: Record<Side, string> = { left: "farsha.leftPanelW", right: "farsha.rightPanelW" };

function store(side: Side, width: number | null) {
  try {
    if (width === null) localStorage.removeItem(KEY[side]);
    else localStorage.setItem(KEY[side], String(width));
  } catch {
    /* private window: the width just won't be remembered */
  }
}

function apply(side: Side, width: number | null) {
  const root = document.documentElement.style;
  if (width === null) root.removeProperty(VAR[side]);
  else root.setProperty(VAR[side], `${width}px`);
}

/** Drag the edge of a side panel to make it wider or narrower (like Figma); double-click the edge to get the normal width back. Remembered in this browser. */
export function PanelResizers({ left, right }: { left: boolean; right: boolean }) {
  useLayoutEffect(() => {
    for (const side of ["left", "right"] as const) {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(KEY[side]);
      } catch {
        /* ignore */
      }
      apply(side, parsePanelWidth(saved));
    }
  }, []);

  const handle = (side: Side) => (
    <div
      className={`panel-resizer panel-resizer--${side}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={side === "left" ? "Resize left panel" : "Resize right panel"}
      title="Drag to resize, double-click to reset"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const el = e.currentTarget;
        el.setPointerCapture(e.pointerId);
        let last: number | null = null;
        const move = (ev: PointerEvent) => {
          const raw = side === "left" ? ev.clientX : window.innerWidth - ev.clientX;
          last = clampPanelWidth(raw, window.innerWidth);
          apply(side, last);
        };
        const up = () => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerup", up);
          el.removeEventListener("pointercancel", up);
          if (last !== null) store(side, last);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", up);
      }}
      onDoubleClick={() => {
        apply(side, null);
        store(side, null);
      }}
    />
  );

  return (
    <>
      {left && handle("left")}
      {right && handle("right")}
    </>
  );
}
