import type { DesignDoc } from "@farsha/design-core";

/** A page or layer the Actions palette can jump to. */
export interface JumpTarget {
  kind: "page" | "layer";
  /** The page id, or the layer id. */
  id: string;
  /** The page the target lives on. */
  pageId: string;
  label: string;
  /** Shown beside the label: the page name for a layer, "Page" for a page. */
  detail: string;
}

export const JUMP_MAX_PAGES = 4;
export const JUMP_MAX_LAYERS = 8;

/**
 * Pages and layers whose name contains the query (any case), pages first, then layers in page order.
 * Anything shorter than two characters finds nothing, so single letters do not flood the list.
 */
export function searchTargets(doc: DesignDoc, query: string): JumpTarget[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const pages = doc.pages();
  const out: JumpTarget[] = pages
    .filter((p) => p.name.toLowerCase().includes(q))
    .slice(0, JUMP_MAX_PAGES)
    .map((p) => ({ kind: "page", id: p.id, pageId: p.id, label: p.name, detail: "Page" }));
  let layers = 0;
  for (const page of pages) {
    for (const n of doc.descendants(page.id)) {
      if (layers >= JUMP_MAX_LAYERS) return out;
      if (!n.name.toLowerCase().includes(q)) continue;
      out.push({ kind: "layer", id: n.id, pageId: page.id, label: n.name, detail: `${page.name}` });
      layers++;
    }
  }
  return out;
}
