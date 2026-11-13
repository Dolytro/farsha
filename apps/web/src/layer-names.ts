import type { DesignDoc } from "@farsha/design-core";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "Rectangle 1", "Rectangle 2", ...: the base name with the next number after the highest one already used for it on any page (like Figma). */
export function nextLayerName(doc: DesignDoc, base: string): string {
  const pattern = new RegExp(`^${escape(base)}(?: (\\d+))?$`);
  let highest = 0;
  for (const page of doc.pages()) {
    for (const n of doc.descendants(page.id)) {
      const m = pattern.exec(n.name);
      if (m) highest = Math.max(highest, m[1] ? Number(m[1]) : 0);
    }
  }
  return `${base} ${highest + 1}`;
}
