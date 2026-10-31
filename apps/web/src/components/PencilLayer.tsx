import { useRef, useState, type RefObject } from "react";
import { hitTest, penGeometry, pencilToPenPoints, screenToWorld, translatePoints, type Viewport } from "@farsha/canvas-engine";
import { useEditor } from "../store";

const ACCENT = "#0d99ff";

/**
 * The Pencil tool (Shift+P): drag to draw freehand. On release the stroke is simplified and smoothed into an editable pen path,
 * and a stroke that ends near its start becomes a closed shape.
 */
export function PencilLayer({ svgRef, viewport, spaceDown }: { svgRef: RefObject<SVGSVGElement | null>; viewport: Viewport; spaceDown: boolean }) {
  const [raw, setRaw] = useState<{ x: number; y: number }[]>([]);
  const drawing = useRef(false);
  const z = viewport.zoom;

  const world = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    return screenToWorld(viewport, e.clientX - r.left, e.clientY - r.top);
  };

  const finish = (stroke: { x: number; y: number }[]) => {
    const { points, closed } = pencilToPenPoints(stroke, 2 / z, 10 / z);
    const geo = penGeometry(points, closed);
    if (!geo) return;
    const s = useEditor.getState();
    const { doc, pageId } = s;
    const under = hitTest(doc, pageId, points[0]!.x, points[0]!.y);
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
        penPoints: translatePoints(points, -geo.box.x, -geo.box.y),
        penClosed: closed,
        fills: [],
        strokes: [{ type: "SOLID", color: "#000000", opacity: 1 }],
        strokeWidth: 1,
      },
    });
    doc.stopCapturing();
    s.select([id]);
  };

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || spaceDown) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawing.current = true;
    setRaw([world(e)]);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const w = world(e);
    setRaw((r) => [...r, w]);
  };
  const onUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const stroke = raw;
    setRaw([]);
    if (stroke.length > 1) finish(stroke);
  };

  return (
    <g>
      <rect x={-1e7} y={-1e7} width={2e7} height={2e7} fill="transparent" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} />
      {raw.length > 1 && <polyline points={raw.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={ACCENT} strokeWidth={1.5 / z} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />}
    </g>
  );
}
