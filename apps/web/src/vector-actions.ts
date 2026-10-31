import type { DesignDoc } from "@canvylo/design-core";
import { joinPenPaths, penGeometry, scalePoints, simplifyPenPoints, smoothPenPoints, translatePoints, type PenPoint } from "@canvylo/canvas-engine";

interface PenLayer {
  id: string;
  parentId: string;
  x: number;
  y: number;
  points: PenPoint[];
  closed: boolean;
}

/** Selected pen paths with their points in the layer's own coordinates (a resize since the last edit is applied to them). */
function penLayers(doc: DesignDoc, ids: string[]): PenLayer[] {
  const out: PenLayer[] = [];
  for (const id of ids) {
    const n = doc.getNode(id);
    if (n?.type !== "VECTOR" || !n.penPoints || n.penPoints.length < 2 || !n.parentId || n.rotation || n.flipX || n.flipY) continue;
    const [, , vw, vh] = n.viewBox.split(/\s+/).map(Number);
    const sx = vw ? n.width / vw : 1;
    const sy = vh ? n.height / vh : 1;
    out.push({ id, parentId: n.parentId, x: n.x, y: n.y, points: scalePoints(n.penPoints, sx, sy), closed: !!n.penClosed });
  }
  return out;
}

function write(doc: DesignDoc, id: string, x: number, y: number, points: PenPoint[], closed: boolean): boolean {
  const geo = penGeometry(points, closed);
  if (!geo) return false;
  doc.setVectorPath(id, {
    x: x + geo.box.x,
    y: y + geo.box.y,
    width: geo.box.width,
    height: geo.box.height,
    viewBox: geo.viewBox,
    markup: geo.markup,
    penPoints: translatePoints(points, -geo.box.x, -geo.box.y),
    penClosed: closed,
  });
  return true;
}

const NONE = "Select a path drawn with the Pen or Pencil tool (not rotated or flipped)";

/** Figma's Simplify: fewer points, same shape. Returns how many layers changed. */
export function simplifySelection(doc: DesignDoc, ids: string[]): { count: number; error?: string } {
  const layers = penLayers(doc, ids);
  if (!layers.length) return { count: 0, error: NONE };
  doc.stopCapturing();
  let count = 0;
  for (const l of layers) {
    const next = simplifyPenPoints(l.points, l.closed);
    if (next.length < l.points.length && write(doc, l.id, l.x, l.y, next, l.closed)) count++;
  }
  doc.stopCapturing();
  return count ? { count } : { count, error: "Nothing to simplify" };
}

/** Make every point of the selected paths smooth. */
export function smoothSelection(doc: DesignDoc, ids: string[]): { count: number; error?: string } {
  const layers = penLayers(doc, ids);
  if (!layers.length) return { count: 0, error: NONE };
  doc.stopCapturing();
  let count = 0;
  for (const l of layers) if (write(doc, l.id, l.x, l.y, smoothPenPoints(l.points, l.closed), l.closed)) count++;
  doc.stopCapturing();
  return { count };
}

/** Figma's Join: close a single open path, or merge two open paths of the same parent at their nearest ends. */
export function joinSelection(doc: DesignDoc, ids: string[]): { ids: string[]; error?: string } {
  const layers = penLayers(doc, ids).filter((l) => !l.closed);
  if (layers.length === 1) {
    const l = layers[0]!;
    if (l.points.length < 3) return { ids, error: "A path needs at least three points to be closed" };
    doc.stopCapturing();
    write(doc, l.id, l.x, l.y, l.points, true);
    doc.stopCapturing();
    return { ids: [l.id] };
  }
  if (layers.length === 2 && layers[0]!.parentId === layers[1]!.parentId) {
    const [a, b] = layers as [PenLayer, PenLayer];
    const shift = (l: PenLayer) => translatePoints(l.points, l.x - a.x, l.y - a.y);
    doc.stopCapturing();
    const ok = write(doc, a.id, a.x, a.y, joinPenPaths(shift(a), shift(b)), false);
    if (ok) doc.deleteNode(b.id);
    doc.stopCapturing();
    return { ids: [a.id] };
  }
  return { ids, error: "Select one open path to close it, or two open paths in the same frame to join them" };
}
