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
