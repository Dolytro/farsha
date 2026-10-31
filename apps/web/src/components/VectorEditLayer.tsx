import { useEffect, useRef, useState, type RefObject } from "react";
import { insertPointAt, nearestOnPath, penGeometry, removePointAt, scalePoints, screenToWorld, translatePoints, type PenPoint, type Viewport } from "@canvylo/canvas-engine";
import { useEditor } from "../store";

const ACCENT = "#0d99ff";

type Drag = { kind: "anchor"; index: number } | { kind: "handle"; index: number; sign: 1 | -1 };

/** Edit mode of a pen path: drag anchors and handles, click the path to add a point, Alt+click / Delete to remove one. */
export function VectorEditLayer({ nodeId, svgRef, viewport }: { nodeId: string; svgRef: RefObject<SVGSVGElement | null>; viewport: Viewport }) {
  const doc = useEditor((s) => s.doc);
  useEditor((s) => s.version);
  const setEditingPath = useEditor((s) => s.setEditingPath);
  const selected = useEditor((s) => s.editingPoint);
  const setSelected = useEditor((s) => s.setEditingPoint);
  const drag = useRef<Drag | null>(null);
  const z = viewport.zoom;
  const node = doc.getNode(nodeId);
  const exit = () => setEditingPath(null);

  /** Write the points back: the box is refitted to the path, so every edit keeps the layer tight around its shape. */
  const commit = (points: PenPoint[]) => {
    const n = doc.getNode(nodeId);
    if (n?.type !== "VECTOR") return;
    const closed = !!n.penClosed;
    const geo = penGeometry(points, closed);
    if (!geo) return;
    doc.setVectorPath(nodeId, {
      x: n.x + geo.box.x,
      y: n.y + geo.box.y,
      width: geo.box.width,
      height: geo.box.height,
      viewBox: geo.viewBox,
      markup: geo.markup,
      penPoints: translatePoints(points, -geo.box.x, -geo.box.y),
      penClosed: closed,
    });
  };

  // On entering, bake any resize into the points so the points and the box agree again.
  useEffect(() => {
    const n = doc.getNode(nodeId);
    if (n?.type !== "VECTOR" || !n.penPoints) return exit();
    if (n.rotation || n.flipX || n.flipY) {
      useEditor.getState().showToast("Reset rotation and flips to edit the points");
      return exit();
    }
    const [, , vw, vh] = n.viewBox.split(/\s+/).map(Number);
    const sx = vw ? n.width / vw : 1;
    const sy = vh ? n.height / vh : 1;
    if (Math.abs(sx - 1) > 1e-6 || Math.abs(sy - 1) > 1e-6) {
      doc.stopCapturing();
      commit(scalePoints(n.penPoints, sx, sy));
      doc.stopCapturing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        exit();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selected !== null) {
        e.preventDefault();
        e.stopPropagation();
        const n = doc.getNode(nodeId);
        if (n?.type === "VECTOR" && n.penPoints) {
          doc.stopCapturing();
          commit(removePointAt(n.penPoints, selected));
          doc.stopCapturing();
          setSelected(null);
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, nodeId]);

  if (node?.type !== "VECTOR" || !node.penPoints) return null;
  const abs = doc.absoluteBox(nodeId)!;
  const points = node.penPoints;
  const local = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    const w = screenToWorld(viewport, e.clientX - r.left, e.clientY - r.top);
    const a = doc.absoluteBox(nodeId)!;
    return { x: w.x - a.x, y: w.y - a.y };
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const n = doc.getNode(nodeId);
    if (n?.type !== "VECTOR" || !n.penPoints) return;
    const p = local(e);
    const next = n.penPoints.map((pt, i) => {
      if (i !== d.index) return pt;
      return d.kind === "anchor" ? { ...pt, x: p.x, y: p.y } : { ...pt, hx: (p.x - pt.x) * d.sign, hy: (p.y - pt.y) * d.sign };
    });
    commit(next);
  };
  const end = () => {
    if (drag.current) doc.stopCapturing();
    drag.current = null;
  };

  const onBackground = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const p = local(e);
    const hit = nearestOnPath(points, !!node.penClosed, p.x, p.y, 8 / z);
    if (!hit) return exit();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    doc.stopCapturing();
    commit(insertPointAt(points, hit.segment, hit.t));
    setSelected(hit.segment + 1);
    drag.current = { kind: "anchor", index: hit.segment + 1 };
  };

  const sw = 1 / z;
  const size = 8 / z;
  return (
    <g transform={`translate(${abs.x} ${abs.y})`}>
      <g transform={`translate(${-abs.x} ${-abs.y})`}>
        <rect x={-1e7} y={-1e7} width={2e7} height={2e7} fill="transparent" onPointerDown={onBackground} onPointerMove={onMove} onPointerUp={end} />
      </g>
      <rect x={0} y={0} width={node.width} height={node.height} fill="none" stroke={ACCENT} strokeWidth={sw} strokeDasharray={`${4 / z} ${3 / z}`} pointerEvents="none" />
      {points.map((p, i) => {
        const showHandle = selected === i && (p.hx !== 0 || p.hy !== 0);
        return (
          <g key={i}>
            {showHandle &&
              ([1, -1] as const).map((sign) => (
                <g key={sign}>
                  <line x1={p.x} y1={p.y} x2={p.x + p.hx * sign} y2={p.y + p.hy * sign} stroke={ACCENT} strokeWidth={sw} pointerEvents="none" />
                  <circle
                    cx={p.x + p.hx * sign}
                    cy={p.y + p.hy * sign}
                    r={size / 2}
                    fill="#fff"
                    stroke={ACCENT}
                    strokeWidth={sw}
                    style={{ cursor: "move" }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      (e.target as Element).setPointerCapture?.(e.pointerId);
                      doc.stopCapturing();
                      drag.current = { kind: "handle", index: i, sign };
                    }}
                    onPointerMove={onMove}
                    onPointerUp={end}
                  />
                </g>
              ))}
            <rect
              data-testid="anchor"
              x={p.x - size / 2}
              y={p.y - size / 2}
              width={size}
              height={size}
              fill={selected === i ? ACCENT : "#fff"}
              stroke={ACCENT}
              strokeWidth={sw}
              style={{ cursor: "move" }}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (e.altKey) {
                  doc.stopCapturing();
                  commit(removePointAt(points, i));
                  doc.stopCapturing();
                  setSelected(null);
                  return;
                }
                (e.target as Element).setPointerCapture?.(e.pointerId);
                setSelected(i);
                doc.stopCapturing();
                drag.current = { kind: "anchor", index: i };
              }}
              onPointerMove={onMove}
              onPointerUp={end}
              onDoubleClick={(e) => {
                e.stopPropagation();
                // corner <-> smooth
                const prev = points[(i - 1 + points.length) % points.length]!;
                const next = points[(i + 1) % points.length]!;
                const smooth = p.hx !== 0 || p.hy !== 0;
                const len = Math.hypot(next.x - prev.x, next.y - prev.y) / 6;
                const tl = Math.hypot(next.x - prev.x, next.y - prev.y) || 1;
                doc.stopCapturing();
                commit(points.map((pt, j) => (j === i ? { ...pt, hx: smooth ? 0 : ((next.x - prev.x) / tl) * len, hy: smooth ? 0 : ((next.y - prev.y) / tl) * len } : pt)));
                doc.stopCapturing();
              }}
            />
          </g>
        );
      })}
    </g>
  );
}
