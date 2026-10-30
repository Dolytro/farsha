import type { DesignDoc } from "@canvylo/design-core";
import type { DesignNode } from "@canvylo/types";

const real = (doc: DesignDoc, ids: string[]): DesignNode[] =>
  ids.map((id) => doc.getNode(id)).filter((n): n is DesignNode => !!n && !!n.parentId && n.type !== "PAGE" && n.type !== "DOCUMENT");

/**
 * Figma's Rotate 90° / 180°: layers that share a parent turn around the centre of the selection (a single layer turns around
 * its own centre), and their rotation goes up by `degrees`. Returns how many layers turned.
 */
export function rotateSelectionBy(doc: DesignDoc, ids: string[], degrees: number): number {
  const nodes = real(doc, ids);
  if (!nodes.length) return 0;
  const sameParent = nodes.every((n) => n.parentId === nodes[0]!.parentId);
  const left = Math.min(...nodes.map((n) => n.x));
  const top = Math.min(...nodes.map((n) => n.y));
  const right = Math.max(...nodes.map((n) => n.x + n.width));
  const bottom = Math.max(...nodes.map((n) => n.y + n.height));
  const pivot = sameParent && nodes.length > 1 ? { x: (left + right) / 2, y: (top + bottom) / 2 } : null;
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  doc.stopCapturing();
  for (const n of nodes) {
    if (pivot) {
      const cx = n.x + n.width / 2 - pivot.x;
      const cy = n.y + n.height / 2 - pivot.y;
      const nx = pivot.x + cx * cos - cy * sin;
      const ny = pivot.y + cx * sin + cy * cos;
      doc.setPosition(n.id, Math.round((nx - n.width / 2) * 100) / 100, Math.round((ny - n.height / 2) * 100) / 100);
    }
    doc.rotateNode(n.id, n.rotation + degrees);
  }
  doc.stopCapturing();
  return nodes.length;
}

/** Remove all fills (Alt+/) or all strokes (Shift+/) of the selected layers. Returns how many layers changed. */
export function removePaint(doc: DesignDoc, ids: string[], kind: "fills" | "strokes"): number {
  let changed = 0;
  doc.stopCapturing();
  for (const n of real(doc, ids)) {
    const paints = (n as unknown as Record<string, unknown>)[kind];
    if (!Array.isArray(paints) || !paints.length) continue;
    doc.setStyle(n.id, { [kind]: [] });
    changed++;
  }
  doc.stopCapturing();
  return changed;
}

/** Figma's "Swap fill and stroke" (Shift+X): the colours of the fills and the strokes trade places. */
export function swapFillAndStroke(doc: DesignDoc, ids: string[]): number {
  let changed = 0;
  doc.stopCapturing();
  for (const n of real(doc, ids)) {
    const any = n as unknown as { fills?: unknown; strokes?: unknown };
    if (!Array.isArray(any.fills) || !Array.isArray(any.strokes) || (!any.fills.length && !any.strokes.length)) continue;
    doc.setStyle(n.id, { fills: any.strokes as never, strokes: any.fills as never });
    changed++;
  }
  doc.stopCapturing();
  return changed;
}

/** Figma's "Hide other layers": everything on the page except the selection (and what contains or is inside it) is hidden; run it again to show them. */
export function hideOtherLayers(doc: DesignDoc, ids: string[], pageId: string): boolean {
  const keep = new Set<string>();
  for (const id of ids) {
    keep.add(id);
    for (let p = doc.getNode(id)?.parentId; p && p !== pageId; p = doc.getNode(p)?.parentId) keep.add(p);
    for (const d of doc.descendants(id)) keep.add(d.id);
  }
  const others = doc.descendants(pageId).filter((n) => !keep.has(n.id));
  if (!others.length) return false;
  const hide = others.some((n) => n.visible);
  doc.stopCapturing();
  for (const n of others) if (n.visible === hide) doc.setStyle(n.id, { visible: !hide });
  doc.stopCapturing();
  return hide;
}

/** Remove the prototype links of the selected layers. Returns how many layers had any. */
export function removeInteractions(doc: DesignDoc, ids: string[]): number {
  let changed = 0;
  doc.stopCapturing();
  for (const n of real(doc, ids)) {
    if (!n.interactions?.length) continue;
    doc.setStyle(n.id, { interactions: [] });
    changed++;
  }
  doc.stopCapturing();
  return changed;
}

/** Figma's number keys: 1 = 10% opacity … 9 = 90%, 0 = 100%. */
export function setOpacityFromKey(doc: DesignDoc, ids: string[], digit: string): number {
  if (!/^[0-9]$/.test(digit)) return 0;
  const opacity = digit === "0" ? 1 : Number(digit) / 10;
  const nodes = real(doc, ids);
  doc.stopCapturing();
  for (const n of nodes) doc.setStyle(n.id, { opacity });
  doc.stopCapturing();
  return nodes.length;
}
