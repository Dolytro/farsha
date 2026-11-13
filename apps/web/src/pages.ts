import type { DesignDoc } from "@farsha/design-core";
import { copyChildren, topLevelOf } from "./clipboard";

/** "Page 2", "Page 3"...: the first number not already used. */
export function nextPageName(doc: DesignDoc): string {
  const used = new Set(doc.pages().map((p) => p.name));
  for (let n = doc.pages().length + 1; ; n++) if (!used.has(`Page ${n}`)) return `Page ${n}`;
}

/** "Page 1 copy", then "Page 1 copy 2", ...: the first name not already used. */
export function nextCopyPageName(doc: DesignDoc, name: string): string {
  const used = new Set(doc.pages().map((p) => p.name));
  if (!used.has(`${name} copy`)) return `${name} copy`;
  for (let n = 2; ; n++) if (!used.has(`${name} copy ${n}`)) return `${name} copy ${n}`;
}

/** Duplicate a page with everything on it; the copy sits right after the original. Returns the new page's id (null for a missing page). */
export function duplicatePage(doc: DesignDoc, id: string): string | null {
  const source = doc.getNode(id);
  const pages = doc.pages();
  const index = pages.findIndex((p) => p.id === id);
  if (source?.type !== "PAGE" || index < 0) return null;
  doc.stopCapturing();
  const copy = doc.createNode("PAGE", { parentId: doc.rootId, props: { name: nextCopyPageName(doc, source.name) } });
  copyChildren(doc, id, copy);
  doc.reorderNode(copy, index + 1);
  const background = doc.pageBackground(id);
  if (background) doc.setPageBackground(copy, background);
  doc.stopCapturing();
  return copy;
}

export function addPage(doc: DesignDoc): string {
  doc.stopCapturing();
  const id = doc.createNode("PAGE", { parentId: doc.rootId, props: { name: nextPageName(doc) } });
  doc.stopCapturing();
  return id;
}

/** Move a page to a new place in the page list (index 0 is the first page). Returns false when nothing moved. One undo step. */
export function movePage(doc: DesignDoc, id: string, toIndex: number): boolean {
  const pages = doc.pages();
  const from = pages.findIndex((p) => p.id === id);
  if (from < 0) return false;
  const to = Math.max(0, Math.min(pages.length - 1, Math.round(toIndex)));
  if (to === from) return false;
  doc.stopCapturing();
  doc.reorderNode(id, to);
  doc.stopCapturing();
  return true;
}

/** The page to show after deleting `id`: the previous one, else the next. Null if it is the only page. */
export function deletePage(doc: DesignDoc, id: string): string | null {
  const pages = doc.pages();
  const i = pages.findIndex((p) => p.id === id);
  if (i < 0 || pages.length < 2) return null;
  const next = (pages[i - 1] ?? pages[i + 1])!.id;
  doc.stopCapturing();
  doc.deleteNode(id);
  doc.stopCapturing();
  return next;
}

/** Page Up / Page Down: the neighbouring page, wrapping around like Figma's page list does not (stops at the ends). */
export function adjacentPage(doc: DesignDoc, id: string, dir: 1 | -1): string {
  const pages = doc.pages();
  const i = pages.findIndex((p) => p.id === id);
  return (pages[Math.min(pages.length - 1, Math.max(0, i + dir))] ?? pages[0]!).id;
}

/**
 * Right-click > Move to page: take the layers off their parent and put them on another page at the same canvas position
 * (one undo step). Layers inside an instance, page-level layers already on that page and pages themselves stay put.
 * Returns the ids that moved.
 */
export function moveToPage(doc: DesignDoc, ids: string[], pageId: string): string[] {
  if (doc.getNode(pageId)?.type !== "PAGE") return [];
  const movable = topLevelOf(doc, ids).filter((id) => {
    const n = doc.getNode(id);
    return n && n.type !== "PAGE" && n.parentId !== pageId && !("mainId" in n && n.mainId);
  });
  if (!movable.length) return [];
  doc.stopCapturing();
  for (const id of movable) {
    const box = doc.absoluteBox(id);
    doc.reparentNode(id, pageId);
    if (box) doc.setPosition(id, box.x, box.y);
  }
  doc.stopCapturing();
  return movable;
}
