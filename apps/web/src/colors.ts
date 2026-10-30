import type { DesignDoc } from "@canvylo/design-core";
import type { DesignNode, Paint } from "@canvylo/types";

export interface UsedColor {
  color: string;
  /** How many paints use it. */
  count: number;
}

const layersIn = (doc: DesignDoc, ids: string[]): DesignNode[] => {
  const seen = new Set<string>();
  const out: DesignNode[] = [];
  for (const id of ids) {
    const root = doc.getNode(id);
    if (!root) continue;
    for (const n of [root, ...doc.descendants(id)]) {
      if (!seen.has(n.id)) {
        seen.add(n.id);
        out.push(n);
      }
    }
  }
  return out;
};

const paintsOf = (n: DesignNode, key: "fills" | "strokes"): Paint[] => {
  const value = (n as unknown as Record<string, unknown>)[key];
  return Array.isArray(value) ? (value as Paint[]) : [];
};

/** Figma's "Selection colors": every solid colour used by the fills and strokes of the selection and what is inside it, most used first. */
export function selectionColors(doc: DesignDoc, ids: string[]): UsedColor[] {
  const counts = new Map<string, number>();
  for (const n of layersIn(doc, ids)) {
    for (const key of ["fills", "strokes"] as const) {
      for (const p of paintsOf(n, key)) {
        if (p.type !== "SOLID" || p.variableId) continue;
        const c = p.color.toLowerCase();
        counts.set(c, (counts.get(c) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()].map(([color, count]) => ({ color, count })).sort((a, b) => b.count - a.count || a.color.localeCompare(b.color));
}

/** Change one colour to another everywhere in the selection (fills and strokes). Returns how many paints changed. */
export function replaceSelectionColor(doc: DesignDoc, ids: string[], from: string, to: string): number {
  if (!/^#[0-9a-fA-F]{6}$/.test(to)) return 0;
  const target = to.toLowerCase();
  const source = from.toLowerCase();
  let changed = 0;
  doc.stopCapturing();
  for (const n of layersIn(doc, ids)) {
    for (const key of ["fills", "strokes"] as const) {
      const paints = paintsOf(n, key);
      if (!paints.some((p) => p.type === "SOLID" && !p.variableId && p.color.toLowerCase() === source)) continue;
      doc.setStyle(n.id, { [key]: paints.map((p) => (p.type === "SOLID" && !p.variableId && p.color.toLowerCase() === source ? ((changed++, { ...p, color: target }) as Paint) : p)) });
    }
  }
  doc.stopCapturing();
  return changed;
}
