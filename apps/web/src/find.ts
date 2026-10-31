import type { DesignDoc } from "@farsha/design-core";

export interface FindOptions {
  matchCase?: boolean;
}

const norm = (s: string, matchCase: boolean) => (matchCase ? s : s.toLowerCase());

/**
 * Layers on a page whose name or text contains the query, in document order (bottom of the stacking order first).
 * Hidden and locked layers are included: Find is how you get to them.
 */
export function findLayers(doc: DesignDoc, pageId: string, query: string, opts: FindOptions = {}): string[] {
  const q = norm(query.trim(), !!opts.matchCase);
  if (!q) return [];
  return doc
    .descendants(pageId)
    .filter((n) => norm(n.name, !!opts.matchCase).includes(q) || (n.type === "TEXT" && norm(n.characters, !!opts.matchCase).includes(q)))
    .map((n) => n.id);
}

/** Replace every occurrence of `query` in the text of the given layers (names are left alone). Returns how many layers changed. */
export function replaceInText(doc: DesignDoc, ids: string[], query: string, replacement: string, opts: FindOptions = {}): number {
  const needle = query.trim();
  if (!needle) return 0;
  const pattern = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), opts.matchCase ? "g" : "gi");
  let changed = 0;
  doc.stopCapturing();
  for (const id of ids) {
    const n = doc.getNode(id);
    if (n?.type !== "TEXT" || !pattern.test(n.characters)) continue;
    pattern.lastIndex = 0;
    doc.setText(id, { characters: n.characters.replace(pattern, () => replacement) });
    changed++;
    pattern.lastIndex = 0;
  }
  doc.stopCapturing();
  return changed;
}

/** The next index in a result list, wrapping around (direction -1 goes backwards). */
export function stepIndex(current: number, count: number, direction: 1 | -1): number {
  if (count <= 0) return -1;
  if (current < 0) return direction === 1 ? 0 : count - 1;
  return (current + direction + count) % count;
}
