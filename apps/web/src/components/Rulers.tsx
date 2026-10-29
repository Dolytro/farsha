import { useEffect, useRef, useState } from "react";
import { rulerTicks, unionBox } from "@canvylo/canvas-engine";
import type { Box, RulerGuide } from "@canvylo/types";
import { useEditor } from "../store";

const SIZE = 20;
const RED = "#f24822";
const ACCENT = "#0d99ff";

type Drag = { index: number | null; guide: RulerGuide; outside: boolean };

/**
 * Figma-style rulers along the top and left of the canvas, with guides: drag out of a ruler to make one, drag a guide to
 * move it, drop it back on a ruler to delete it. Guides live on the page, so they are saved and undoable.
 */
export function Rulers() {
  const { doc, pageId, selection, viewport, viewer } = useEditor();
  useEditor((s) => s.version);
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [drag, setDrag] = useState<Drag | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const page = doc.getNode(pageId);
  const stored: RulerGuide[] = page?.type === "PAGE" ? (page.guides ?? []) : [];
  const guides = drag && drag.index !== null ? stored.map((g, i) => (i === drag.index ? drag.guide : g)) : drag ? [...stored, drag.guide] : stored;
  const { zoom } = viewport;
  const toScreen = (axis: "x" | "y", world: number) => world * zoom + (axis === "x" ? viewport.x : viewport.y);
  const toWorld = (axis: "x" | "y", screen: number) => (screen - (axis === "x" ? viewport.x : viewport.y)) / zoom;

  // Drag a new guide out of a ruler, or pick up an existing one.
  const begin = (e: React.PointerEvent, axis: "x" | "y", index: number | null) => {
    if (viewer || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = ref.current!.getBoundingClientRect();
    const at = (ev: { clientX: number; clientY: number }) => (axis === "x" ? ev.clientX - rect.left : ev.clientY - rect.top);
    const over = (ev: { clientX: number; clientY: number }) => at(ev) < SIZE || ev.clientX > rect.right || ev.clientY > rect.bottom || ev.clientX < rect.left || ev.clientY < rect.top;
    const start: RulerGuide = index !== null ? stored[index]! : { axis, position: 0 };
    let current: Drag = { index, guide: start, outside: index === null };
    const move = (ev: PointerEvent) => {
      current = { index, guide: { axis, position: Math.round(toWorld(axis, at(ev))) }, outside: over(ev) };
      setDrag(current);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDrag(null);
      const dropped = current.outside;
      if (index === null && dropped) return; // never left the ruler: nothing to add
      doc.stopCapturing();
      const next = stored.filter((_, i) => i !== index);
      if (!dropped) {
        if (index === null) next.push(current.guide);
        else next.splice(index, 0, current.guide);
      }
      doc.setStyle(pageId, { guides: next });
      doc.stopCapturing();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    move(e.nativeEvent);
  };

  const sel: Box | undefined = unionBox(selection.map((id) => doc.absoluteBox(id)).filter((b): b is Box => !!b));
  const bar = (axis: "x" | "y") => {
    const length = axis === "x" ? size.width : size.height;
    const from = toWorld(axis, 0);
    const to = toWorld(axis, length);
    return (
      <>
        {sel && (
          <rect
            className="rulers__selection"
            {...(axis === "x"
              ? { x: toScreen("x", sel.x), y: 0, width: sel.width * zoom, height: SIZE }
              : { x: 0, y: toScreen("y", sel.y), width: SIZE, height: sel.height * zoom })}
            fill={ACCENT}
            fillOpacity={0.18}
          />
        )}
        {rulerTicks(from, to, zoom).map((t) => {
          const p = toScreen(axis, t.value);
          const len = t.major ? 8 : 4;
          return (
            <g key={t.value}>
              {axis === "x" ? <line x1={p} x2={p} y1={SIZE - len} y2={SIZE} /> : <line x1={SIZE - len} x2={SIZE} y1={p} y2={p} />}
              {t.major &&
                (axis === "x" ? (
                  <text x={p + 3} y={9}>
                    {t.value}
                  </text>
                ) : (
                  <text transform={`translate(9 ${p - 3}) rotate(-90)`}>{t.value}</text>
                ))}
            </g>
          );
        })}
      </>
    );
  };

  return (
    <div ref={ref} className="rulers">
      <svg className="rulers__guides" width={size.width} height={size.height}>
        {guides.map((g, i) => {
          const p = toScreen(g.axis, g.position);
          const line = g.axis === "x" ? { x1: p, x2: p, y1: SIZE, y2: size.height } : { y1: p, y2: p, x1: SIZE, x2: size.width };
          const active = drag?.index === i || (drag?.index === null && i === guides.length - 1);
          return (
            <g key={i}>
              <line {...line} stroke={RED} strokeWidth={active ? 2 : 1} pointerEvents="none" />
              {!viewer && <line {...line} className="rulers__hit" stroke="transparent" strokeWidth={8} pointerEvents="stroke" style={{ cursor: g.axis === "x" ? "col-resize" : "row-resize" }} onPointerDown={(e) => begin(e, g.axis, i)} />}
              {active && (
                <text className="rulers__tag" x={g.axis === "x" ? p + 6 : SIZE + 6} y={g.axis === "x" ? SIZE + 14 : p - 6} fill={RED}>
                  {g.position}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <svg className="rulers__bar rulers__bar--x" width={size.width} height={SIZE} onPointerDown={(e) => begin(e, "y", null)} style={{ cursor: "row-resize" }}>
        {bar("x")}
      </svg>
      <svg className="rulers__bar rulers__bar--y" width={SIZE} height={size.height} onPointerDown={(e) => begin(e, "x", null)} style={{ cursor: "col-resize" }}>
        {bar("y")}
      </svg>
      <div className="rulers__corner" />
    </div>
  );
}
