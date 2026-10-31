import type { DesignDoc } from "@farsha/design-core";

/** "Page 2", "Page 3"...: the first number not already used. */
export function nextPageName(doc: DesignDoc): string {
  const used = new Set(doc.pages().map((p) => p.name));
  for (let n = doc.pages().length + 1; ; n++) if (!used.has(`Page ${n}`)) return `Page ${n}`;
}

export function addPage(doc: DesignDoc): string {
  doc.stopCapturing();
  const id = doc.createNode("PAGE", { parentId: doc.rootId, props: { name: nextPageName(doc) } });
  doc.stopCapturing();
  return id;
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
