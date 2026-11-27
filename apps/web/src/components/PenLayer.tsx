import { useEffect, useRef, useState, type RefObject } from "react";
import { hitTest, penGeometry, penPathData, screenToWorld, translatePoints, type PenPoint, type Viewport } from "@farsha/canvas-engine";
import { useEditor } from "../store";
import { snapAngle } from "../angle-snap";

const ACCENT = "#0d99ff";
const CLOSE_RADIUS_PX = 8;

/**
 * The Pen tool: click to place a corner point, drag to pull out a curve handle, click the first point to close the path,
 * Enter / double-click / Esc to finish, Backspace to remove the last point. Rendered inside the canvas transform.
 */
export function PenLayer({ svgRef, viewport, spaceDown }: { svgRef: RefObject<SVGSVGElement | null>; viewport: Viewport; spaceDown: boolean }) {
  const [points, setPoints] = useState<PenPoint[]>([]);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const live = useRef<PenPoint[]>([]);
  live.current = points;
  const z = viewport.zoom;

  const world = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    return screenToWorld(viewport, e.clientX - r.left, e.clientY - r.top);
  };

  /** With Shift the next point sits on a multiple of 45 degrees from the previous one. */
  const shifted = (w: { x: number; y: number }, shift: boolean) => {
    const prev = live.current[live.current.length - 1];
    if (!shift || !prev) return w;
    const d = snapAngle(w.x - prev.x, w.y - prev.y);
    return { x: prev.x + d.dx, y: prev.y + d.dy };
  };

  /** Turn the placed points into a vector layer and go back to the Move tool. */
  const finish = (closed: boolean) => {
    // a double-click places the same point twice; drop the duplicate
    const pts = [...live.current];
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    if (last && prev && Math.hypot(last.x - prev.x, last.y - prev.y) < 0.5) pts.pop();
    live.current = [];
    setPoints([]);
    const s = useEditor.getState();
    const geo = penGeometry(pts, closed);
    if (!geo) {
      s.setTool("select");
      return;
    }
    const { doc, pageId } = s;
    const under = hitTest(doc, pageId, pts[0]!.x, pts[0]!.y);
    const frame = under?.type === "FRAME" ? under : undefined;
    const origin = frame ? (doc.absoluteBox(frame.id) ?? { x: 0, y: 0 }) : { x: 0, y: 0 };
    doc.stopCapturing();
    const id = doc.createNode("VECTOR", {
      parentId: frame?.id ?? pageId,
      props: {
        name: "Vector",
        x: geo.box.x - origin.x,
        y: geo.box.y - origin.y,
        width: geo.box.width,
        height: geo.box.height,
        viewBox: geo.viewBox,
        markup: geo.markup,
        penPoints: translatePoints(pts, -geo.box.x, -geo.box.y),
        penClosed: closed,
        fills: [],
        strokes: [{ type: "SOLID", color: "#000000", opacity: 1 }],
        strokeWidth: 1,
      },
    });
    doc.stopCapturing();
    s.select([id]);
    s.setTool("select");
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (live.current.length >= 2) finishRef.current(false);
        else {
          live.current = [];
          setPoints([]);
          if (e.key === "Escape") useEditor.getState().setTool("select");
        }
      } else if (e.key === "Backspace" && live.current.length) {
        e.preventDefault();
        e.stopPropagation();
        setPoints((p) => p.slice(0, -1));
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      // leaving the tool (another tool picked) keeps what was drawn
      if (live.current.length >= 2) finishRef.current(false);
    };
  }, []);

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || spaceDown) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const w = shifted(world(e), e.shiftKey);
    const first = points[0];
    if (first && points.length >= 2 && Math.hypot(w.x - first.x, w.y - first.y) <= CLOSE_RADIUS_PX / z) {
      finish(true);
      return;
    }
    dragging.current = true;
    setPoints((p) => [...p, { x: w.x, y: w.y, hx: 0, hy: 0 }]);
  };
  const onMove = (e: React.PointerEvent) => {
    const raw = world(e);
    if (!dragging.current) {
      setCursor(shifted(raw, e.shiftKey));
      return;
    }
    setCursor(raw);
    // Shift while pulling out a handle keeps it on a multiple of 45 degrees
    setPoints((p) => {
      if (!p.length) return p;
      const last = p[p.length - 1]!;
      const d = e.shiftKey ? snapAngle(raw.x - last.x, raw.y - last.y) : { dx: raw.x - last.x, dy: raw.y - last.y };
      return [...p.slice(0, -1), { ...last, hx: d.dx, hy: d.dy }];
    });
  };
  const onUp = () => {
    dragging.current = false;
  };

  const preview = cursor && points.length && !dragging.current ? [...points, { x: cursor.x, y: cursor.y, hx: 0, hy: 0 }] : points;
  const sw = 1 / z;
  const size = 6 / z;
  return (
    <g>
      <rect x={-1e7} y={-1e7} width={2e7} height={2e7} fill="transparent" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onDoubleClick={() => points.length >= 2 && finish(false)} />
      {points.length > 0 && <path d={penPathData(preview, false)} fill="none" stroke={ACCENT} strokeWidth={sw * 1.5} pointerEvents="none" />}
      {points.map((p, i) => (
        <g key={i} pointerEvents="none">
          {(p.hx !== 0 || p.hy !== 0) && (
            <>
              <line x1={p.x - p.hx} y1={p.y - p.hy} x2={p.x + p.hx} y2={p.y + p.hy} stroke={ACCENT} strokeWidth={sw} />
              <circle cx={p.x + p.hx} cy={p.y + p.hy} r={size / 2} fill="#fff" stroke={ACCENT} strokeWidth={sw} />
              <circle cx={p.x - p.hx} cy={p.y - p.hy} r={size / 2} fill="#fff" stroke={ACCENT} strokeWidth={sw} />
            </>
          )}
          <rect x={p.x - size / 2} y={p.y - size / 2} width={size} height={size} fill={i === 0 ? ACCENT : "#fff"} stroke={ACCENT} strokeWidth={sw} />
        </g>
      ))}
    </g>
  );
}
