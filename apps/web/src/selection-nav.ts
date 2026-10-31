import type { DesignDoc } from "@canvylo/design-core";

const pickable = (doc: DesignDoc, id: string) => {
  const n = doc.getNode(id);
  return !!n && n.visible && !n.locked;
};

/** Layers in the order the Layers panel shows them: topmost first. */
const panelOrder = (doc: DesignDoc, parentId: string) => doc.children(parentId).filter((n) => pickable(doc, n.id)).map((n) => n.id).reverse();

/** Enter: select the children of the selected layers. Layers without children stay selected. */
export function selectChildren(doc: DesignDoc, ids: string[]): string[] {
  const kids = ids.flatMap((id) => doc.children(id).filter((c) => pickable(doc, c.id)).map((c) => c.id));
  return kids.length ? kids : ids;
}

/** Shift+Enter: select the parent of the selected layers; a layer directly on the page just gets deselected. */
export function selectParent(doc: DesignDoc, ids: string[], pageId: string): string[] {
  const parents = ids.map((id) => doc.getNode(id)?.parentId).filter((p): p is string => !!p && p !== pageId && !!doc.getNode(p));
  return [...new Set(parents)];
}

/** Tab / Shift+Tab: the next (or previous) layer among the siblings of the selected layer, wrapping around. */
export function selectSibling(doc: DesignDoc, ids: string[], pageId: string, direction: 1 | -1): string[] {
  const current = ids[ids.length - 1];
  const parentId = (current ? doc.getNode(current)?.parentId : null) ?? pageId;
  const order = panelOrder(doc, parentId);
  if (!order.length) return ids;
  const at = current ? order.indexOf(current) : -1;
  const next = at < 0 ? (direction === 1 ? 0 : order.length - 1) : (at + direction + order.length) % order.length;
  return [order[next]!];
}

/** Ctrl+Shift+A: select every sibling of the selection that is not selected yet. */
export function selectInverse(doc: DesignDoc, ids: string[], pageId: string): string[] {
  const first = ids[0] ? doc.getNode(ids[0]) : undefined;
  const parentId = first?.parentId ?? pageId;
  return doc.children(parentId).filter((n) => pickable(doc, n.id) && !ids.includes(n.id)).map((n) => n.id);
}

/**
 * Figma's "Select all matching properties" (Ctrl+Alt+A): every unlocked, visible layer on the page with the same type, fills and
 * strokes as the first selected layer (and the same font, for text).
 */
export function selectMatching(doc: DesignDoc, ids: string[], pageId: string): string[] {
  const first = ids[0] ? doc.getNode(ids[0]) : undefined;
  if (!first) return ids;
  const key = (n: NonNullable<ReturnType<DesignDoc["getNode"]>>) => {
    const any = n as unknown as Record<string, unknown>;
    return JSON.stringify([n.type, any.fills ?? null, any.strokes ?? null, n.type === "TEXT" ? [any.fontFamily, any.fontSize, any.fontWeight] : null]);
  };
  const wanted = key(first);
  return doc
    .descendants(pageId)
    .filter((n) => pickable(doc, n.id) && key(n) === wanted)
    .map((n) => n.id);
}

export type SameFacet = "type" | "fill" | "stroke" | "font" | "textProps" | "instance" | "variant" | "effect" | "opacity" | "name";

/** Figma's "Select all with…": every unlocked, visible layer of the page that shares one property with the first selected layer. */
export function selectSameAs(doc: DesignDoc, ids: string[], pageId: string, facet: SameFacet): string[] {
  const first = ids[0] ? doc.getNode(ids[0]) : undefined;
  if (!first) return ids;
  const key = (n: NonNullable<ReturnType<DesignDoc["getNode"]>>): string => {
    const any = n as unknown as Record<string, unknown>;
    switch (facet) {
      case "type":
        return n.type;
      case "fill":
        return JSON.stringify(any.fills ?? null);
      case "stroke":
        return JSON.stringify([any.strokes ?? null, any.strokeWidth ?? null]);
      case "font":
        return n.type === "TEXT" ? JSON.stringify([any.fontFamily, any.fontSize, any.fontWeight]) : "";
      case "textProps":
        // every text setting except the words themselves
        return n.type === "TEXT"
          ? JSON.stringify([any.fontFamily, any.fontSize, any.fontWeight, any.lineHeight, any.letterSpacing, any.textAlign, any.textVerticalAlign, any.textCase, any.textDecoration, any.italic, any.textList, any.textDirection])
          : "";
      case "instance":
        return typeof any.componentId === "string" ? any.componentId : "";
      case "variant":
        return any.variantProps ? JSON.stringify(Object.entries(any.variantProps as Record<string, string>).sort()) : "";
      case "effect":
        return JSON.stringify(any.effects ?? null);
      case "opacity":
        return String(n.opacity);
      case "name":
        return n.name;
    }
  };
  const wanted = key(first);
  // a facet the first layer does not have (no font on a rectangle) selects nothing extra
  if ((facet === "font" || facet === "textProps") && first.type !== "TEXT") return ids;
  // an instance or variant facet the first layer does not have selects nothing else
  if ((facet === "instance" || facet === "variant") && wanted === "") return ids;
  return doc
    .descendants(pageId)
    .filter((n) => pickable(doc, n.id) && key(n) === wanted)
    .map((n) => n.id);
}
