import { useEffect, useRef, useState, type PointerEvent, type ReactElement } from "react";
import { paintColor, type Box, type DesignNode, type NodeType } from "@canvylo/types";
import { effectsFilter, hitTest, textBaseline, measure, screenToWorld, shapeGeometry, shapeMarkup, unionBox, zoomAt } from "@canvylo/canvas-engine";
import { assetUrl, isImageFile } from "../images";
import { placeImageFile } from "../place-image";
import { useEditor, type Tool } from "../store";

type Corner = "nw" | "ne" | "sw" | "se";

type Drag =
  | { kind: "pan"; sx: number; sy: number; vx: number; vy: number }
  | { kind: "move"; wx: number; wy: number; origins: Record<string, { x: number; y: number }> }
  | { kind: "resize"; id: string; corner: Corner; wx: number; wy: number; box: Box }
  | { kind: "draw"; id: string; wx: number; wy: number; px: number; py: number }
  | { kind: "marquee"; wx: number; wy: number; additive: boolean; base: string[] };

const CREATE: Partial<Record<Tool, NodeType>> = { frame: "FRAME", rect: "RECTANGLE", ellipse: "ELLIPSE", text: "TEXT" };
const NAMES: Partial<Record<Tool, string>> = { frame: "Frame", rect: "Rectangle", ellipse: "Ellipse", text: "Text" };
const ACCENT = "#0d99ff";

const solid = (color: string) => [{ type: "SOLID" as const, color, opacity: 1 }];
const fillOf = (n: DesignNode) => {
  const p = "fills" in n ? n.fills[0] : undefined;
  return p ? { color: paintColor(p), opacity: p.opacity } : { color: "none", opacity: 1 };
};
const fxUrl = (n: DesignNode) => {
  const fx = effectsFilter(n);
  return fx ? `url(#${fx.id})` : undefined;
};
const fxDefs = (n: DesignNode) => {
  const fx = effectsFilter(n);
  return fx ? <defs dangerouslySetInnerHTML={{ __html: fx.markup }} /> : null;
};

const intersects = (a: Box, b: Box) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

export function Canvas() {
  const { doc, pageId, selection, select, viewport, setViewport, tool, setTool, devMode, viewer, setMenu } = useEditor();
  const signedIn = useEditor((s) => s.drive.user !== null);
  useEditor((s) => s.version);
  const drag = useRef<Drag | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [altDown, setAltDown] = useState(false);
  const z = viewport.zoom;

  // Holding Alt shows distances between the selection and the hovered layer (Figma redlines).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Alt") return;
      e.preventDefault(); // keep the browser menu bar from stealing focus on Alt release
      setAltDown(e.type === "keydown");
    };
    const clear = () => setAltDown(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", clear);
    };
  }, []);

  const world = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    return screenToWorld(viewport, e.clientX - r.left, e.clientY - r.top);
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const w = world(e);
    const labelId = (e.target as SVGElement).dataset?.labelId;
    const hit = labelId ? doc.getNode(labelId) : hitTest(doc, pageId, w.x, w.y);
    // Like Figma: right-clicking a layer outside the selection selects it first.
    if (hit && !selection.includes(hit.id)) select([hit.id]);
    else if (!hit && !e.shiftKey) select([]);
    setMenu({ x: e.clientX, y: e.clientY, wx: w.x, wy: w.y });
  };

  const onPointerDown = (e: PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setEditing(null);
    const w = world(e);
    if (e.button === 1 || spaceDown || tool === "hand") {
      drag.current = { kind: "pan", sx: e.clientX, sy: e.clientY, vx: viewport.x, vy: viewport.y };
      return;
    }
    const el = e.target as SVGElement;
    if (devMode) {
      // Inspect only: selecting never modifies the design.
      const labelTarget = el.dataset.labelId;
      const hit = labelTarget ? doc.getNode(labelTarget) : hitTest(doc, pageId, w.x, w.y);
      select(hit ? [hit.id] : []);
      return;
    }
    const corner = el.dataset.corner as Corner | undefined;
    if (corner && selection[0]) {
      const box = doc.getNode(selection[0])!;
      doc.stopCapturing();
      drag.current = { kind: "resize", id: box.id, corner, wx: w.x, wy: w.y, box: { x: box.x, y: box.y, width: box.width, height: box.height } };
      return;
    }
    const labelId = el.dataset.labelId;
    if (tool === "select") {
      const labelHit = labelId ? doc.getNode(labelId) : undefined;
      const hit = labelHit ? (labelHit.locked ? undefined : labelHit) : hitTest(doc, pageId, w.x, w.y);
      if (!hit) {
        const base = e.shiftKey ? selection : [];
        if (!e.shiftKey) select([]);
        drag.current = { kind: "marquee", wx: w.x, wy: w.y, additive: e.shiftKey, base };
        return;
      }
      let next = selection;
      if (e.shiftKey) next = selection.includes(hit.id) ? selection.filter((i) => i !== hit.id) : [...selection, hit.id];
      else if (!selection.includes(hit.id)) next = [hit.id];
      select(next);
      if (next.includes(hit.id)) {
        doc.stopCapturing();
        const origins: Record<string, { x: number; y: number }> = {};
        for (const id of next) {
          const n = doc.getNode(id);
          if (n) origins[id] = { x: n.x, y: n.y };
        }
        drag.current = { kind: "move", wx: w.x, wy: w.y, origins };
      }
      return;
    }
    const type = CREATE[tool];
    if (!type) return;
    // Draw a new shape, positioned relative to the frame under the cursor (if any).
    const under = hitTest(doc, pageId, w.x, w.y);
    const parentFrame = under?.type === "FRAME" ? under : undefined;
    const pb = parentFrame ? (doc.absoluteBox(parentFrame.id) ?? { x: 0, y: 0 }) : { x: 0, y: 0 };
    doc.stopCapturing();
    const id = doc.createNode(type, {
      parentId: parentFrame?.id ?? pageId,
      props: {
        name: NAMES[tool],
        x: w.x - pb.x,
        y: w.y - pb.y,
        width: 1,
        height: 1,
        ...(tool === "text" ? { fills: solid("#111111") } : {}),
      },
    });
    drag.current = { kind: "draw", id, wx: w.x, wy: w.y, px: pb.x, py: pb.y };
    select([id]);
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) {
      if (tool === "select") {
        const w = world(e);
        const labelId = (e.target as SVGElement).dataset.labelId;
        setHoverId(labelId ?? hitTest(doc, pageId, w.x, w.y)?.id ?? null);
      }
      return;
    }
    if (d.kind === "pan") {
      setViewport({ ...viewport, x: d.vx + e.clientX - d.sx, y: d.vy + e.clientY - d.sy });
      return;
    }
    const w = world(e);
    const dx = w.x - d.wx;
    const dy = w.y - d.wy;
    if (d.kind === "move") {
      for (const [id, o] of Object.entries(d.origins)) doc.setPosition(id, o.x + dx, o.y + dy);
    } else if (d.kind === "resize") {
      const b = d.box;
      const box: Partial<Box> = {};
      if (d.corner.includes("w")) {
        box.width = Math.max(1, b.width - dx);
        box.x = b.x + (b.width - box.width);
      } else box.width = Math.max(1, b.width + dx);
      if (d.corner.includes("n")) {
        box.height = Math.max(1, b.height - dy);
        box.y = b.y + (b.height - box.height);
      } else box.height = Math.max(1, b.height + dy);
      doc.resizeNode(d.id, box);
    } else if (d.kind === "draw") {
      doc.resizeNode(d.id, {
        x: Math.min(d.wx, w.x) - d.px,
        y: Math.min(d.wy, w.y) - d.py,
        width: Math.max(1, Math.abs(dx)),
        height: Math.max(1, Math.abs(dy)),
      });
    } else {
      const box = { x: Math.min(d.wx, w.x), y: Math.min(d.wy, w.y), width: Math.abs(dx), height: Math.abs(dy) };
      setMarquee(box);
      const hits = doc
        .children(pageId)
        .filter((n) => n.visible && !n.locked && intersects(doc.absoluteBox(n.id)!, box))
        .map((n) => n.id);
      select(d.additive ? [...new Set([...d.base, ...hits])] : hits);
    }
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    setMarquee(null);
    if (!d || d.kind === "pan" || d.kind === "marquee") return;
    if (d.kind === "draw") {
      const n = doc.getNode(d.id)!;
      if (n.width < 4 && n.height < 4) {
        doc.resizeNode(d.id, n.type === "TEXT" ? { width: 120, height: 24 } : { width: 100, height: 100 });
      }
      setTool("select");
      if (n.type === "TEXT") setEditing(d.id);
    }
    doc.stopCapturing();
  };

  // Drop image files from the desktop or another tab onto the canvas.
  const dropFiles = (e: React.DragEvent) => [...e.dataTransfer.files].filter(isImageFile);
  const onDragOver = (e: React.DragEvent) => {
    if (viewer || devMode) return;
    if ([...e.dataTransfer.items].some((i) => i.kind === "file" && i.type.startsWith("image/"))) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };
  const onDrop = (e: React.DragEvent) => {
    if (viewer || devMode) return;
    const files = dropFiles(e);
    if (!files.length) return;
    e.preventDefault();
    const w = world(e);
    const under = hitTest(doc, pageId, w.x, w.y);
    const frame = under?.type === "FRAME" ? under : undefined;
    const origin = frame ? (doc.absoluteBox(frame.id) ?? { x: 0, y: 0 }) : { x: 0, y: 0 };
    files.forEach((file, i) => void placeImageFile(file, frame?.id ?? pageId, w.x - origin.x + i * 24, w.y - origin.y + i * 24));
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if (devMode) return;
    const w = world(e);
    const hit = hitTest(doc, pageId, w.x, w.y);
    if (hit?.type === "TEXT") {
      select([hit.id]);
      setEditing(hit.id);
    }
  };

  // React's onWheel is passive, so it cannot stop the browser from zooming the whole page on
  // Ctrl + wheel / trackpad pinch. A native non-passive listener can.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      const { viewport: v, setViewport: set } = useEditor.getState();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) set(zoomAt(v, e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.01)));
      else set({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const renderNode = (n: DesignNode): ReactElement | null => {
    if (!n.visible) return null;
    const { color } = fillOf(n);
    const transform = `translate(${n.x} ${n.y}) rotate(${n.rotation} ${n.width / 2} ${n.height / 2})`;
    const kids = doc.children(n.id).map(renderNode);
    if (n.type === "ELLIPSE") {
      return (
        <g key={n.id} transform={transform} opacity={n.opacity} filter={fxUrl(n)}>
          {fxDefs(n)}
          <g dangerouslySetInnerHTML={{ __html: shapeMarkup(n) }} />
          {kids}
        </g>
      );
    }
    if (n.type === "TEXT") {
      if (editing === n.id) return <g key={n.id} transform={transform} />;
      return (
        <g key={n.id} transform={transform} opacity={n.opacity} filter={fxUrl(n)}>
          {fxDefs(n)}
          <text
            x={n.textAlign === "CENTER" ? n.width / 2 : n.textAlign === "RIGHT" ? n.width : 0}
            textAnchor={n.textAlign === "CENTER" ? "middle" : n.textAlign === "RIGHT" ? "end" : "start"}
            y={textBaseline(n)}
            letterSpacing={n.letterSpacing || undefined}
            fill={color}
            fontFamily={n.fontFamily}
            fontSize={n.fontSize}
            fontWeight={n.fontWeight}
          >
            {n.characters}
          </text>
        </g>
      );
    }
    if (n.type === "IMAGE") {
      const href = assetUrl(doc, n.assetId);
      const clipId = `img-${n.id}`;
      return (
        <g key={n.id} transform={transform} opacity={n.opacity} filter={fxUrl(n)}>
          {fxDefs(n)}
          {href ? (
            <>
              <clipPath id={clipId} dangerouslySetInnerHTML={{ __html: shapeGeometry(n, "") }} />
              <image href={href} width={n.width} height={n.height} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />
            </>
          ) : (
            <g dangerouslySetInnerHTML={{ __html: shapeGeometry(n, ' fill="#e5e5e5"') }} />
          )}
        </g>
      );
    }
    if (n.type === "VECTOR") {
      // markup is one allow-listed shape element built by the SVG importer (see svg-import.ts)
      return (
        <g key={n.id} transform={transform} opacity={n.opacity} filter={fxUrl(n)}>
          {fxDefs(n)}
          <svg width={n.width} height={n.height} viewBox={n.viewBox} overflow="visible" dangerouslySetInnerHTML={{ __html: n.markup }} />
        </g>
      );
    }
    const isFrame = n.type === "FRAME";
    return (
      <g key={n.id} transform={transform} opacity={n.opacity} filter={fxUrl(n)}>
          {fxDefs(n)}
        <g dangerouslySetInnerHTML={{ __html: shapeMarkup(n) }} />
        {isFrame ? (
          <>
            <clipPath id={`clip-${n.id}`} dangerouslySetInnerHTML={{ __html: shapeGeometry(n, "") }} />
            <g clipPath={`url(#clip-${n.id})`}>{kids}</g>
          </>
        ) : (
          kids
        )}
      </g>
    );
  };

  const boxes = selection.map((id) => doc.absoluteBox(id)).filter((b): b is Box => !!b);
  const sel: Box | undefined = unionBox(boxes);
  const hoverBox = hoverId && !selection.includes(hoverId) ? doc.absoluteBox(hoverId) : undefined;
  // Measurements are an inspect feature: public view-only links don't get them.
  const canInspect = !viewer || (viewer === "inspect" && signedIn);
  const measurements = canInspect && altDown && sel && hoverBox ? measure(sel, hoverBox) : [];
  const RED = "#f24822";
  const hs = 8 / z;
  const sw = 1 / z;
  const editNode = editing ? doc.getNode(editing) : undefined;
  const editBox = editing ? doc.absoluteBox(editing) : undefined;

  const corners: { c: Corner; x: number; y: number }[] = sel
    ? [
        { c: "nw", x: sel.x, y: sel.y },
        { c: "ne", x: sel.x + sel.width, y: sel.y },
        { c: "sw", x: sel.x, y: sel.y + sel.height },
        { c: "se", x: sel.x + sel.width, y: sel.y + sel.height },
      ]
    : [];

  const cursor = tool === "hand" || spaceDown ? "grab" : tool !== "select" ? "crosshair" : "default";

  return (
    <main
      className="canvas"
      style={{ cursor }}
      tabIndex={0}
      onKeyDown={(e) => e.code === "Space" && setSpaceDown(true)}
      onKeyUp={(e) => e.code === "Space" && setSpaceDown(false)}
    >
      <svg
        ref={svgRef}
        className="canvas__svg"
        onPointerDown={onPointerDown}
        onContextMenu={onContextMenu}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHoverId(null)}
        onDoubleClick={onDoubleClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <g transform={`translate(${viewport.x} ${viewport.y}) scale(${z})`}>
          {doc.children(pageId).map(renderNode)}

          {doc
            .children(pageId)
            .filter((n) => n.type === "FRAME" && n.visible)
            .map((n) => (
              <text
                key={`label-${n.id}`}
                className="canvas__frame-label"
                data-label-id={n.id}
                x={n.x}
                y={n.y - 6 / z}
                fontSize={11 / z}
                fill={selection.includes(n.id) ? ACCENT : "#8c8c8c"}
              >
                {n.name}
              </text>
            ))}

          {hoverBox && <rect x={hoverBox.x} y={hoverBox.y} width={hoverBox.width} height={hoverBox.height} fill="none" stroke={altDown ? RED : ACCENT} strokeWidth={sw * 1.5} pointerEvents="none" />}

          {measurements.length > 0 && (
            <g pointerEvents="none">
              {measurements.map((m, i) => {
                const horizontal = m.y1 === m.y2;
                const tick = 4 / z;
                const label = String(m.value);
                const w = (label.length * 6.5 + 10) / z;
                const cx = (m.x1 + m.x2) / 2;
                const cy = (m.y1 + m.y2) / 2;
                return (
                  <g key={i}>
                    <line x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke={RED} strokeWidth={sw} />
                    {horizontal ? (
                      <>
                        <line x1={m.x1} y1={m.y1 - tick} x2={m.x1} y2={m.y1 + tick} stroke={RED} strokeWidth={sw} />
                        <line x1={m.x2} y1={m.y2 - tick} x2={m.x2} y2={m.y2 + tick} stroke={RED} strokeWidth={sw} />
                      </>
                    ) : (
                      <>
                        <line x1={m.x1 - tick} y1={m.y1} x2={m.x1 + tick} y2={m.y1} stroke={RED} strokeWidth={sw} />
                        <line x1={m.x2 - tick} y1={m.y2} x2={m.x2 + tick} y2={m.y2} stroke={RED} strokeWidth={sw} />
                      </>
                    )}
                    <rect x={cx - w / 2} y={cy - 9 / z} width={w} height={18 / z} rx={3 / z} fill={RED} />
                    <text x={cx} y={cy + 4 / z} textAnchor="middle" fontSize={11 / z} fill="#fff">
                      {label}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {sel && (
            <g>
              <rect x={sel.x} y={sel.y} width={sel.width} height={sel.height} fill="none" stroke={ACCENT} strokeWidth={sw} pointerEvents="none" />
              {selection.length === 1 && !devMode &&
                corners.map(({ c, x, y }) => (
                  <rect
                    key={c}
                    className="canvas__handle"
                    data-corner={c}
                    x={x - hs / 2}
                    y={y - hs / 2}
                    width={hs}
                    height={hs}
                    fill="#fff"
                    stroke={ACCENT}
                    strokeWidth={sw}
                    style={{ cursor: c === "nw" || c === "se" ? "nwse-resize" : "nesw-resize" }}
                  />
                ))}
              <g pointerEvents="none" transform={`translate(${sel.x + sel.width / 2} ${sel.y + sel.height + 14 / z})`}>
                <rect x={-34 / z} y={-9 / z} width={68 / z} height={18 / z} rx={3 / z} fill={ACCENT} />
                <text textAnchor="middle" y={4 / z} fontSize={11 / z} fill="#fff">
                  {Math.round(sel.width)} × {Math.round(sel.height)}
                </text>
              </g>
            </g>
          )}

          {marquee && <rect x={marquee.x} y={marquee.y} width={marquee.width} height={marquee.height} fill={ACCENT} fillOpacity={0.08} stroke={ACCENT} strokeWidth={sw} pointerEvents="none" />}

          {editing && editNode?.type === "TEXT" && editBox && (
            <foreignObject x={editBox.x} y={editBox.y} width={Math.max(editBox.width, 160)} height={Math.max(editBox.height, editNode.fontSize * 1.6)}>
              <input
                className="canvas__text-edit"
                autoFocus
                value={editNode.characters}
                style={{ fontSize: editNode.fontSize, fontFamily: editNode.fontFamily, fontWeight: editNode.fontWeight, letterSpacing: editNode.letterSpacing, textAlign: editNode.textAlign.toLowerCase() as "left", color: fillOf(editNode).color }}
                onPointerDown={(e) => e.stopPropagation()}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => {
                  doc.setText(editNode.id, { characters: e.target.value });
                  // Auto-width until real text measurement lands (Phase 1 text spike).
                  doc.resizeNode(editNode.id, { width: Math.max(8, e.target.value.length * (editNode.fontSize * 0.56 + editNode.letterSpacing)) });
                }}
                onBlur={() => setEditing(null)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter" || e.key === "Escape") setEditing(null);
                }}
              />
            </foreignObject>
          )}
        </g>
      </svg>
    </main>
  );
}
