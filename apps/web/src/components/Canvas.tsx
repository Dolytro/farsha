import { duplicateNodes } from "../clipboard";
import { buildScaleUpdates } from "../scale";
import { textFontStyle, verticalTextOffset } from "@canvylo/canvas-engine";
import { PINCH_STRENGTH, WHEEL_STRENGTH, wheelZoomFactor } from "../prefs";
import { showPixelGrid, visibleWorld } from "../pixel-grid";
import { CommentsLayer } from "./CommentsLayer";
import { PenLayer } from "./PenLayer";
import { VectorEditLayer } from "./VectorEditLayer";
import { gridRects, maskMarkup } from "@canvylo/canvas-engine";
import { useEffect, useRef, useState, type PointerEvent, type ReactElement } from "react";
import { cssBlendMode, paintColor, type Box, type DesignNode, type NodeType } from "@canvylo/types";
import { layoutText, lineHeightPx, resizeBox, snapMove, type Guide, type Handle, effectsFilter, nodeTransform, arrowShape, hitTest, lineBetween, lineShape, polygonShape, starShape, isDrawnVector, vectorPaintAttrs, textBaseline, measure, screenToWorld, shapeGeometry, shapeMarkup, unionBox, zoomAt } from "@canvylo/canvas-engine";
import { assetUrl, isImageFile } from "../images";
import { placeImageFile } from "../place-image";
import { useEditor, type Tool } from "../store";
import { canvasMeasure, fitText } from "../text-layout";


type Drag =
  | { kind: "pan"; sx: number; sy: number; vx: number; vy: number }
  | { kind: "move"; wx: number; wy: number; origins: Record<string, { x: number; y: number }>; startBox?: Box; targets: Box[] }
  | { kind: "resize"; id: string; corner: Handle; wx: number; wy: number; box: Box }
  | { kind: "draw"; id: string; wx: number; wy: number; px: number; py: number }
  | { kind: "scale"; id: string; corner: Handle; wx: number; wy: number; box: Box; snapshot: DesignNode[] }
  | { kind: "rotate"; id: string; wx: number; wy: number; cx: number; cy: number; start: number; base: number }
  | { kind: "line"; id: string; wx: number; wy: number; px: number; py: number; arrow: boolean }
  | { kind: "marquee"; wx: number; wy: number; additive: boolean; base: string[] };

const CREATE: Partial<Record<Tool, NodeType>> = { section: "FRAME", frame: "FRAME", rect: "RECTANGLE", ellipse: "ELLIPSE", text: "TEXT", line: "VECTOR", arrow: "VECTOR", polygon: "VECTOR", star: "VECTOR" };
const NAMES: Partial<Record<Tool, string>> = { section: "Section", frame: "Frame", rect: "Rectangle", ellipse: "Ellipse", text: "Text", line: "Line", arrow: "Arrow", polygon: "Polygon", star: "Star" };

/** Starting geometry and paint of the vector tools: lines are stroked, polygons and stars are filled grey. */
function vectorStart(tool: Tool): Record<string, unknown> {
  const black = [{ type: "SOLID", color: "#000000", opacity: 1 }];
  const grey = [{ type: "SOLID", color: "#d9d9d9", opacity: 1 }];
  if (tool === "line") return { ...lineShape(1), fills: [], strokes: black, strokeWidth: 1 };
  if (tool === "arrow") return { ...arrowShape(1), fills: [], strokes: black, strokeWidth: 1 };
  return { ...(tool === "star" ? starShape() : polygonShape()), fills: grey, strokes: [], strokeWidth: 1 };
}
const ACCENT = "#0d99ff";

const solid = (color: string) => [{ type: "SOLID" as const, color, opacity: 1 }];
const fillOf = (n: DesignNode) => {
  const p = "fills" in n ? n.fills?.[0] : undefined;
  return p ? { color: paintColor(p), opacity: p.opacity } : { color: "none", opacity: 1 };
};
const blendStyle = (n: DesignNode) => {
  const m = cssBlendMode(n.blendMode);
  return m ? { mixBlendMode: m as "multiply" } : undefined;
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
  const editingPath = useEditor((s) => s.editingPath);
  const pixelGrid = useEditor((s) => s.pixelGrid);
  useEditor((s) => s.version);
  const drag = useRef<Drag | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [altDown, setAltDown] = useState(false);
  const z = viewport.zoom;

  // Selecting something else ends the point editing of a pen path.
  useEffect(() => {
    if (editingPath && selection[0] !== editingPath) useEditor.getState().setEditingPath(null);
  }, [editingPath, selection]);

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

  // Click target: the whole group, unless a layer inside that group is already selected (then its siblings are reachable).
  const pick = (x: number, y: number) => {
    const outer = hitTest(doc, pageId, x, y);
    const s = selection[0] ? doc.getNode(selection[0]) : undefined;
    if (outer?.type === "GROUP" && s?.parentId && s.id !== outer.id && doc.isAncestor(outer.id, s.id)) {
      let cur: DesignNode | undefined = hitTest(doc, pageId, x, y, true);
      while (cur && cur.parentId !== s.parentId) cur = cur.parentId ? doc.getNode(cur.parentId) : undefined;
      if (cur) return cur;
    }
    return outer;
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const w = world(e);
    const labelId = (e.target as SVGElement).dataset?.labelId;
    const hit = labelId ? doc.getNode(labelId) : pick(w.x, w.y);
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
    if (tool === "comment" && !viewer) {
      // the Comment tool drops a pin where you click and opens the box for the text
      useEditor.getState().setActiveComment({ draft: { x: w.x, y: w.y } });
      return;
    }
    const el = e.target as SVGElement;
    if (devMode) {
      // Inspect only: selecting never modifies the design.
      const labelTarget = el.dataset.labelId;
      const hit = labelTarget ? doc.getNode(labelTarget) : pick(w.x, w.y);
      select(hit ? [hit.id] : []);
      return;
    }
    if (el.dataset.rotate && selection[0]) {
      // Rotating: the angle between the pointer and the layer's centre decides the rotation.
      const node = doc.getNode(selection[0])!;
      const abs = doc.absoluteBox(node.id)!;
      const cx = abs.x + abs.width / 2;
      const cy = abs.y + abs.height / 2;
      doc.stopCapturing();
      drag.current = { kind: "rotate", id: node.id, wx: w.x, wy: w.y, cx, cy, start: Math.atan2(w.y - cy, w.x - cx), base: node.rotation };
      return;
    }
    const corner = el.dataset.corner as Handle | undefined;
    if (corner && selection[0]) {
      const box = doc.getNode(selection[0])!;
      doc.stopCapturing();
      if (tool === "scale") {
        // the Scale tool grows the layer and everything in it; the layers are remembered as they were so each move starts from them
        drag.current = { kind: "scale", id: box.id, corner, wx: w.x, wy: w.y, box: { x: box.x, y: box.y, width: box.width, height: box.height }, snapshot: [box, ...doc.descendants(box.id)] };
        return;
      }
      drag.current = { kind: "resize", id: box.id, corner, wx: w.x, wy: w.y, box: { x: box.x, y: box.y, width: box.width, height: box.height } };
      return;
    }
    const labelId = el.dataset.labelId;
    if ((tool === "select" || tool === "scale")) {
      const labelHit = labelId ? doc.getNode(labelId) : undefined;
      const hit = labelHit ? (labelHit.locked ? undefined : labelHit) : pick(w.x, w.y);
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
        // Figma: Alt+drag drags a copy and leaves the original where it was
        if (e.altKey && !viewer) {
          const copies = duplicateNodes(doc, next, 0, false);
          if (copies.length) {
            next = copies;
            select(copies);
          }
        }
        const origins: Record<string, { x: number; y: number }> = {};
        for (const id of next) {
          const n = doc.getNode(id);
          if (n) origins[id] = { x: n.x, y: n.y };
        }
        // Smart guides: snap to the other layers in the same parent, and to the parent frame itself.
        const first = doc.getNode(next[0]!);
        const parent = first?.parentId ? doc.getNode(first.parentId) : undefined;
        const targets = (first?.parentId ? doc.children(first.parentId) : [])
          .filter((n) => n.visible && !next.includes(n.id))
          .map((n) => doc.absoluteBox(n.id))
          .filter((b): b is Box => !!b);
        const parentBox = parent && parent.type !== "PAGE" && parent.type !== "DOCUMENT" ? doc.absoluteBox(parent.id) : undefined;
        if (parentBox) targets.push(parentBox);
        const startBox = unionBox(next.map((id) => doc.absoluteBox(id)).filter((b): b is Box => !!b));
        drag.current = { kind: "move", wx: w.x, wy: w.y, origins, startBox, targets };
      }
      return;
    }
    const type = CREATE[tool];
    if (!type) return;
    // Draw a new shape, positioned relative to the frame under the cursor (if any).
    const under = hitTest(doc, pageId, w.x, w.y);
    // sections always sit on the page itself
    const parentFrame = tool !== "section" && under?.type === "FRAME" ? under : undefined;
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
        ...(tool === "section" ? { isSection: true, clipsContent: false, fills: solid("#eceef2") } : {}),
        ...(type === "VECTOR" ? vectorStart(tool) : {}),
        ...(tool === "line" || tool === "arrow" ? { height: 0 } : {}),
      },
    });
    drag.current = tool === "line" || tool === "arrow" ? { kind: "line", id, wx: w.x, wy: w.y, px: pb.x, py: pb.y, arrow: tool === "arrow" } : { kind: "draw", id, wx: w.x, wy: w.y, px: pb.x, py: pb.y };
    select([id]);
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) {
      if ((tool === "select" || tool === "scale")) {
        const w = world(e);
        const labelId = (e.target as SVGElement).dataset.labelId;
        setHoverId(labelId ?? pick(w.x, w.y)?.id ?? null);
      }
      return;
    }
    if (d.kind === "pan") {
      setViewport({ ...viewport, x: d.vx + e.clientX - d.sx, y: d.vy + e.clientY - d.sy });
      return;
    }
    const w = world(e);
    let dx = w.x - d.wx;
    let dy = w.y - d.wy;
    if (d.kind === "move") {
      if (d.startBox && !e.ctrlKey && !e.metaKey && useEditor.getState().prefs.snapping) {
        const page = doc.getNode(pageId);
        const guideList = useEditor.getState().rulers && page?.type === "PAGE" ? (page.guides ?? []) : [];
        const snap = snapMove({ ...d.startBox, x: d.startBox.x + dx, y: d.startBox.y + dy }, d.targets, 5 / viewport.zoom, {
          xs: guideList.filter((g) => g.axis === "x").map((g) => g.position),
          ys: guideList.filter((g) => g.axis === "y").map((g) => g.position),
        });
        dx += snap.dx;
        dy += snap.dy;
        setGuides(snap.guides);
      } else setGuides([]);
      for (const [id, o] of Object.entries(d.origins)) doc.setPosition(id, o.x + dx, o.y + dy);
    } else if (d.kind === "rotate") {
      const turned = ((Math.atan2(w.y - d.cy, w.x - d.cx) - d.start) * 180) / Math.PI;
      const next = d.base + turned;
      doc.rotateNode(d.id, e.shiftKey ? Math.round(next / 15) * 15 : Math.round(next * 10) / 10);
    } else if (d.kind === "scale") {
      const next = resizeBox(d.box, d.corner, dx, dy, { keepRatio: true, fromCenter: e.altKey });
      doc.patchNodes(buildScaleUpdates(d.snapshot, next));
    } else if (d.kind === "resize") {
      // Shift keeps the ratio, Alt resizes from the centre (Figma).
      const next = resizeBox(d.box, d.corner, dx, dy, { keepRatio: e.shiftKey, fromCenter: e.altKey });
      doc.resizeNode(d.id, next);
      const node = doc.getNode(d.id);
      if (node?.type === "TEXT") {
        // Figma: dragging the width gives auto height, dragging the height gives a fixed box.
        if (next.height !== d.box.height) doc.setText(d.id, { textAutoResize: "NONE" });
        else if (next.width !== d.box.width && (node.textAutoResize ?? "WIDTH_AND_HEIGHT") === "WIDTH_AND_HEIGHT") doc.setText(d.id, { textAutoResize: "HEIGHT" });
        fitText(doc, d.id);
      }
    } else if (d.kind === "line") {
      placeLine(d, w.x, w.y, e.shiftKey);
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

  /** Stretch a Line / Arrow from its start point to (x, y); Shift snaps the angle to 15 degrees. */
  const placeLine = (d: Extract<Drag, { kind: "line" }>, x: number, y: number, snap: boolean) => {
    const l = lineBetween(d.wx, d.wy, x, y, snap);
    doc.resizeNode(d.id, { x: l.x - d.px, y: l.y - d.py, width: l.length, height: 0 });
    doc.rotateNode(d.id, l.rotation);
    doc.setVector(d.id, d.arrow ? arrowShape(l.length) : lineShape(l.length));
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    setMarquee(null);
    setGuides([]);
    if (!d || d.kind === "pan" || d.kind === "marquee") return;
    if (d.kind === "line") {
      // A plain click makes a 100 px line.
      if (doc.getNode(d.id)!.width < 4) placeLine(d, d.wx + 100, d.wy, false);
      if (!useEditor.getState().prefs.keepTool) setTool("select");
    }
    if (d.kind === "draw") {
      const n = doc.getNode(d.id)!;
      if (n.width < 4 && n.height < 4) {
        doc.resizeNode(d.id, n.type === "TEXT" ? { width: 120, height: 24 } : { width: 100, height: 100 });
      }
      // text always goes back to Move because it opens the editor
      if (n.type === "TEXT" || !useEditor.getState().prefs.keepTool) setTool("select");
      if (n.type === "TEXT") {
        // Figma: a click makes auto-width text, dragging a box makes auto-height text.
        if (n.width >= 4 || n.height >= 4) doc.setText(d.id, { textAutoResize: "HEIGHT" });
        fitText(doc, d.id);
        setEditing(d.id);
      }
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
    const deep = hitTest(doc, pageId, w.x, w.y, true);
    if (!deep) return;
    // Double-clicking a group (or a layer inside one) enters it one level, like Figma.
    const s = selection[0];
    let target: DesignNode = deep;
    if (s && s !== deep.id && doc.isAncestor(s, deep.id)) {
      while (target.parentId && target.parentId !== s) target = doc.getNode(target.parentId)!;
    } else if (!s || s === deep.id) {
      target = deep;
    }
    select([target.id]);
    if (target.type === "TEXT") setEditing(target.id);
    else if (target.type === "VECTOR" && target.penPoints && !viewer) useEditor.getState().setEditingPath(target.id);
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
      const { wheelZoom, invertZoom } = useEditor.getState().prefs;
      if (e.ctrlKey || e.metaKey || wheelZoom) set(zoomAt(v, e.clientX - r.left, e.clientY - r.top, wheelZoomFactor(e.deltaY, invertZoom, e.ctrlKey || e.metaKey ? PINCH_STRENGTH : WHEEL_STRENGTH)));
      else set({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /** Sibling layers bottom to top; a mask layer is not drawn and clips everything above it. */
  function renderChildren(list: DesignNode[]): ReactElement[] {
    const at = list.findIndex((c) => c.isMask && c.visible);
    if (at < 0) return list.map(renderNode).filter((e): e is ReactElement => !!e);
    const mask = maskMarkup(list[at]!);
    return [
      ...list.slice(0, at).map(renderNode).filter((e): e is ReactElement => !!e),
      <mask key={mask.id} id={mask.id} maskUnits="userSpaceOnUse" x={-1e6} y={-1e6} width={2e6} height={2e6} dangerouslySetInnerHTML={{ __html: mask.inner }} />,
      <g key={`masked-${list[at]!.id}`} mask={`url(#${mask.id})`}>
        {renderChildren(list.slice(at + 1))}
      </g>,
    ];
  }

  const renderNode = (n: DesignNode): ReactElement | null => {
    if (!n.visible || n.isMask) return null;
    const { color } = fillOf(n);
    const transform = nodeTransform(n);
    const kids = renderChildren(doc.children(n.id));
    if (n.type === "ELLIPSE") {
      return (
        <g key={n.id} transform={transform} opacity={n.opacity} style={blendStyle(n)} filter={fxUrl(n)}>
          {fxDefs(n)}
          <g dangerouslySetInnerHTML={{ __html: shapeMarkup(n, (id) => assetUrl(doc, id)) }} />
          {kids}
        </g>
      );
    }
    if (n.type === "TEXT") {
      if (editing === n.id) return <g key={n.id} transform={transform} />;
      return (
        <g key={n.id} transform={transform} opacity={n.opacity} style={blendStyle(n)} filter={fxUrl(n)}>
          {fxDefs(n)}
          <text
            xmlSpace="preserve"
            x={n.textAlign === "CENTER" ? n.width / 2 : n.textAlign === "RIGHT" ? n.width : 0}
            textAnchor={n.textAlign === "CENTER" ? "middle" : n.textAlign === "RIGHT" ? "end" : "start"}
            y={textBaseline(n) + verticalTextOffset(n, layoutText(n, canvasMeasure).height)}
            letterSpacing={n.letterSpacing || undefined}
            fill={color}
            fontFamily={n.fontFamily}
            fontSize={n.fontSize}
            fontWeight={n.fontWeight}
            {...textFontStyle(n)}
          >
            {layoutText(n, canvasMeasure).lines.map((line, i) => (
              <tspan key={i} x={n.textAlign === "CENTER" ? n.width / 2 : n.textAlign === "RIGHT" ? n.width : 0} dy={i ? lineHeightPx(n) : 0}>
                {line}
              </tspan>
            ))}
          </text>
        </g>
      );
    }
    if (n.type === "IMAGE") {
      const href = assetUrl(doc, n.assetId);
      const clipId = `img-${n.id}`;
      return (
        <g key={n.id} transform={transform} opacity={n.opacity} style={blendStyle(n)} filter={fxUrl(n)}>
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
        <g key={n.id} transform={transform} opacity={n.opacity} style={blendStyle(n)} filter={fxUrl(n)}>
          {fxDefs(n)}
          {isDrawnVector(n) ? (
            <svg width={n.width} height={Math.max(n.height, 0.001)} viewBox={n.viewBox} preserveAspectRatio="none" overflow="visible" dangerouslySetInnerHTML={{ __html: `<g ${vectorPaintAttrs(n)}>${n.markup}</g>` }} />
          ) : (
            <svg width={n.width} height={n.height} viewBox={n.viewBox} overflow="visible" dangerouslySetInnerHTML={{ __html: n.markup }} />
          )}
        </g>
      );
    }
    const isFrame = n.type === "FRAME";
    return (
      <g key={n.id} transform={transform} opacity={n.opacity} style={blendStyle(n)} filter={fxUrl(n)}>
          {fxDefs(n)}
        <g dangerouslySetInnerHTML={{ __html: shapeMarkup(n, (id) => assetUrl(doc, id)) }} />
        {isFrame ? (
          <>
            <clipPath id={`clip-${n.id}`} dangerouslySetInnerHTML={{ __html: shapeGeometry(n, "") }} />
            <g clipPath={`url(#clip-${n.id})`}>{kids}</g>
            {n.type === "FRAME" && !devMode && (n.layoutGrids ?? []).filter((g) => g.visible).map((g, gi) => (
              <g key={`grid-${gi}`} pointerEvents="none" fill={/^#[0-9a-fA-F]{3,8}$/.test(g.color) ? g.color : "#ff0000"} fillOpacity={Math.min(1, Math.max(0, Number(g.opacity) || 0.1))}>
                {gridRects(g, n.width, n.height).map((r, ri) => (
                  <rect key={ri} x={r.x} y={r.y} width={r.width} height={r.height} />
                ))}
              </g>
            ))}
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

  const CURSORS: Record<Handle, string> = { n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize", nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize" };
  const selNode = selection.length === 1 ? doc.getNode(selection[0]!) : undefined;
  const rotated = !!selNode && !!selNode.rotation;
  const corners: { c: Handle; x: number; y: number }[] = sel
    ? [
        { c: "nw", x: sel.x, y: sel.y },
        { c: "ne", x: sel.x + sel.width, y: sel.y },
        { c: "sw", x: sel.x, y: sel.y + sel.height },
        { c: "se", x: sel.x + sel.width, y: sel.y + sel.height },
      ]
    : [];

  const cursor = tool === "hand" || spaceDown ? "grab" : tool !== "select" && tool !== "scale" ? "crosshair" : "default";

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
          {renderChildren(doc.children(pageId))}
          {showPixelGrid(pixelGrid, z) && (() => {
            const r = svgRef.current?.getBoundingClientRect();
            const v = visibleWorld(viewport, r?.width ?? 1200, r?.height ?? 800);
            return (
              <g pointerEvents="none">
                <defs>
                  <pattern id="pixel-grid" width={1} height={1} patternUnits="userSpaceOnUse">
                    <path d="M1 0H0V1" fill="none" stroke="#0d99ff" strokeOpacity={0.25} strokeWidth={1 / z} />
                  </pattern>
                </defs>
                <rect x={v.x} y={v.y} width={v.width} height={v.height} fill="url(#pixel-grid)" />
              </g>
            );
          })()}

          {[...doc.children(pageId).filter((n) => n.type === "FRAME"), ...doc.children(pageId).filter((n) => n.type === "FRAME" && n.isSection).flatMap((s) => doc.children(s.id).filter((c) => c.type === "FRAME"))]
            .filter((n) => n.visible)
            .map((n) => {
              const abs = doc.absoluteBox(n.id) ?? n;
              return (
              <text
                key={`label-${n.id}`}
                className="canvas__frame-label"
                data-label-id={n.id}
                x={abs.x}
                y={abs.y - (n.type === "FRAME" && n.isSection ? 8 : 6) / z}
                fontSize={(n.type === "FRAME" && n.isSection ? 14 : 11) / z}
                fontWeight={n.type === "FRAME" && n.isSection ? 700 : undefined}
                fill={selection.includes(n.id) ? ACCENT : n.type === "FRAME" && n.isSection ? "#4b5563" : "#8c8c8c"}
              >
                {n.name}
              </text>
              );
            })}

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
              <g transform={rotated && selNode ? `rotate(${selNode.rotation} ${sel.x + sel.width / 2} ${sel.y + sel.height / 2})` : undefined}>
              <rect x={sel.x} y={sel.y} width={sel.width} height={sel.height} fill="none" stroke={ACCENT} strokeWidth={sw} pointerEvents="none" />
              {selection.length === 1 && !devMode && !viewer &&
                // Invisible discs just outside the corners rotate the layer (Shift snaps to 15 degrees).
                corners.map(({ c, x, y }) => (
                  <circle
                    key={`rot-${c}`}
                    data-rotate="1"
                    cx={x + (c.includes("w") ? -1 : 1) * (hs * 1.1)}
                    cy={y + (c.includes("n") ? -1 : 1) * (hs * 1.1)}
                    r={hs * 1.1}
                    fill="transparent"
                    style={{ cursor: "alias" }}
                  />
                ))}
              {selection.length === 1 && !devMode && !rotated &&
                // Invisible strips along the four sides, so every edge can be dragged like in Figma.
                ([
                  ["n", sel.x, sel.y - hs / 2, sel.width, hs],
                  ["s", sel.x, sel.y + sel.height - hs / 2, sel.width, hs],
                  ["w", sel.x - hs / 2, sel.y, hs, sel.height],
                  ["e", sel.x + sel.width - hs / 2, sel.y, hs, sel.height],
                ] as [Handle, number, number, number, number][]).map(([h, x, y, w, ht]) => (
                  <rect key={h} className="canvas__handle" data-corner={h} x={x} y={y} width={w} height={ht} fill="transparent" style={{ cursor: CURSORS[h] }} />
                ))}
              {selection.length === 1 && !devMode && !rotated &&
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
                    style={{ cursor: CURSORS[c] }}
                  />
                ))}
              </g>
              <g pointerEvents="none" transform={`translate(${sel.x + sel.width / 2} ${sel.y + sel.height + 14 / z})`}>
                <rect x={-34 / z} y={-9 / z} width={68 / z} height={18 / z} rx={3 / z} fill={ACCENT} />
                <text textAnchor="middle" y={4 / z} fontSize={11 / z} fill="#fff">
                  {Math.round(sel.width)} × {Math.round(sel.height)}
                </text>
              </g>
            </g>
          )}

          {guides.map((g, i) => (
            <line key={i} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke={RED} strokeWidth={sw} pointerEvents="none" />
          ))}
          {editingPath && !viewer && !devMode && tool === "select" && <VectorEditLayer nodeId={editingPath} svgRef={svgRef} viewport={viewport} />}
          <CommentsLayer zoom={z} />
          {tool === "pen" && !viewer && !devMode && <PenLayer svgRef={svgRef} viewport={viewport} spaceDown={spaceDown} />}
          {marquee && <rect x={marquee.x} y={marquee.y} width={marquee.width} height={marquee.height} fill={ACCENT} fillOpacity={0.08} stroke={ACCENT} strokeWidth={sw} pointerEvents="none" />}

          {editing && editNode?.type === "TEXT" && editBox && (
            <foreignObject x={editBox.x} y={editBox.y} width={Math.max(editBox.width + 24, 160)} height={Math.max(editBox.height, editNode.fontSize * 1.6) + 8}>
              <textarea
                className="canvas__text-edit"
                autoFocus
                rows={1}
                spellCheck={false}
                value={editNode.characters}
                style={{ fontSize: editNode.fontSize, fontFamily: editNode.fontFamily, fontWeight: editNode.fontWeight, letterSpacing: editNode.letterSpacing, lineHeight: `${lineHeightPx(editNode)}px`, whiteSpace: (editNode.textAutoResize ?? "WIDTH_AND_HEIGHT") === "WIDTH_AND_HEIGHT" ? "pre" : "pre-wrap", textAlign: editNode.textAlign.toLowerCase() as "left", color: fillOf(editNode).color }}
                onPointerDown={(e) => e.stopPropagation()}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => {
                  doc.setText(editNode.id, { characters: e.target.value });
                  fitText(doc, editNode.id);
                }}
                onBlur={() => setEditing(null)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Escape") setEditing(null); // Enter adds a new line, like Figma
                }}
              />
            </foreignObject>
          )}
        </g>
      </svg>
    </main>
  );
}
